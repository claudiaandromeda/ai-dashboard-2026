"""
Camo Background Generator — Art Engine v2.0

Pure background generation: organic military/urban camouflage blobs
in team colours. No data line or event marker rendering.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import List, Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Lightweight value noise (no external dependency)
# ---------------------------------------------------------------------------

_PERM: List[int] = []


def _init_perm(seed: int) -> None:
    """Build a permutation table seeded for reproducible noise."""
    global _PERM
    rng = random.Random(seed)
    p = list(range(256))
    rng.shuffle(p)
    _PERM = p + p  # doubled so we never need to wrap


def _fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def _lerp(a: float, b: float, t: float) -> float:
    return a + t * (b - a)


def _grad(h: int, x: float, y: float) -> float:
    h &= 3
    u = x if h < 2 else y
    v = y if h < 2 else x
    return (u if h & 1 == 0 else -u) + (v if h & 2 == 0 else -v)


def _value_noise_2d(x: float, y: float) -> float:
    """Return a smooth noise value in roughly [-1, 1]."""
    xi = int(math.floor(x)) & 255
    yi = int(math.floor(y)) & 255
    xf = x - math.floor(x)
    yf = y - math.floor(y)
    u = _fade(xf)
    v = _fade(yf)
    aa = _PERM[_PERM[xi] + yi]
    ab = _PERM[_PERM[xi] + yi + 1]
    ba = _PERM[_PERM[xi + 1] + yi]
    bb = _PERM[_PERM[xi + 1] + yi + 1]
    return _lerp(
        _lerp(_grad(aa, xf, yf), _grad(ba, xf - 1, yf), u),
        _lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u),
        v,
    )


def _fbm(x: float, y: float, octaves: int = 4, lacunarity: float = 2.0,
         gain: float = 0.5) -> float:
    """Fractional Brownian Motion — layered value noise."""
    total = 0.0
    amplitude = 1.0
    frequency = 1.0
    for _ in range(octaves):
        total += _value_noise_2d(x * frequency, y * frequency) * amplitude
        frequency *= lacunarity
        amplitude *= gain
    return total


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Parse '#RRGGBB' or 'RRGGBB' to (r, g, b)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str!r}")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return r, g, b


def _luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def _blend(c1: Tuple[int, int, int], c2: Tuple[int, int, int],
           t: float) -> Tuple[int, int, int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _shift_towards(base: Tuple[int, int, int], target: Tuple[int, int, int],
                   amount: float) -> Tuple[int, int, int]:
    """Shift *base* colour partway towards *target*."""
    return _blend(base, target, amount)


def _darken(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (int(c[0] * (1 - f)), int(c[1] * (1 - f)), int(c[2] * (1 - f)))


def _lighten(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (
        min(255, int(c[0] + (255 - c[0]) * f)),
        min(255, int(c[1] + (255 - c[1]) * f)),
        min(255, int(c[2] + (255 - c[2]) * f)),
    )


# ---------------------------------------------------------------------------
# Camo variant selection and colour palette build
# ---------------------------------------------------------------------------

def _detect_variant(primary_rgb: Tuple[int, int, int]) -> str:
    """Pick urban / fire / woodland based on team primary colour."""
    r, g, b = primary_rgb
    lum = _luminance(r, g, b)

    # Dark teams → urban camo
    if lum < 60:
        return "urban"

    # Warm bright teams → fire camo
    if r > 160 and g < 120 and lum > 60:
        return "fire"

    return "woodland"


def _build_camo_colours(
    primary: Tuple[int, int, int],
    secondary: Tuple[int, int, int],
) -> List[Tuple[int, int, int]]:
    """Return 5 camo tones derived from team colours + auto-detected variant."""
    variant = _detect_variant(primary)

    if variant == "urban":
        return [
            _darken(primary, 0.6),
            _shift_towards(primary, (50, 50, 60), 0.5),
            _shift_towards(secondary, (80, 80, 90), 0.4),
            _darken(secondary, 0.5),
            (30, 30, 35),
        ]

    if variant == "fire":
        return [
            _darken(primary, 0.3),
            _shift_towards(primary, (180, 80, 20), 0.3),
            _shift_towards(secondary, (100, 50, 15), 0.5),
            _darken(primary, 0.55),
            (45, 25, 10),
        ]

    # Woodland — team primary shifted towards greens/browns
    return [
        _shift_towards(primary, (50, 70, 30), 0.45),
        _shift_towards(secondary, (80, 100, 40), 0.35),
        _darken(primary, 0.45),
        _shift_towards(primary, (70, 50, 25), 0.5),
        (25, 30, 15),
    ]


# ---------------------------------------------------------------------------
# Organic blob rendering
# ---------------------------------------------------------------------------

def _render_blob(draw: ImageDraw.Draw, cx: int, cy: int, base_r: int,
                 colour: Tuple[int, int, int], noise_seed: float) -> None:
    """Draw one organic camo blob as a noise-deformed polygon."""
    points: List[Tuple[int, int]] = []
    num_vertices = 48  # smooth curve
    for i in range(num_vertices):
        angle = 2 * math.pi * i / num_vertices
        nx = math.cos(angle) * 1.5 + noise_seed
        ny = math.sin(angle) * 1.5 + noise_seed
        deform = _fbm(nx, ny, octaves=3, lacunarity=2.2, gain=0.55)
        r = base_r * (0.6 + 0.4 * (deform + 1) / 2)  # map to 0.6–1.0
        px = cx + int(r * math.cos(angle))
        py = cy + int(r * math.sin(angle))
        points.append((px, py))
    if len(points) >= 3:
        draw.polygon(points, fill=colour)


def _generate_camo_layer(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: List[Tuple[int, int, int]],
    rng: random.Random,
    count: int,
    size_range: Tuple[int, int],
    noise_offset: float,
) -> None:
    """One pass of camo blobs at a given scale."""
    for i in range(count):
        cx = rng.randint(-size_range[1], width + size_range[1])
        cy = rng.randint(-size_range[1], height + size_range[1])
        base_r = rng.randint(size_range[0], size_range[1])
        colour = rng.choice(colours)
        _render_blob(draw, cx, cy, base_r, colour, noise_seed=noise_offset + i * 0.73)


# ---------------------------------------------------------------------------
# Tiling helpers
# ---------------------------------------------------------------------------

def _tile_image(img: Image.Image, target_width: int, target_height: int,
                tile_factor: int = 2) -> Image.Image:
    """Shrink *img* then tile it to fill target dimensions."""
    tile_w = target_width // tile_factor
    tile_h = target_height // tile_factor
    tile = img.resize((tile_w, tile_h), Image.LANCZOS)

    result = Image.new("RGB", (target_width, target_height))
    for ty in range(0, target_height, tile_h):
        for tx in range(0, target_width, tile_w):
            result.paste(tile, (tx, ty))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_camo_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a camo pattern background (no data line).

    Args:
        width:    Output image width in pixels.
        height:   Output image height in pixels.
        palette:  Colour dict with keys 'primary', 'secondary', 'accent',
                  'background'.  Values are hex strings ('#RRGGBB').
        scale:    Pattern scale 0.1–2.0. Low = tight/dense pattern;
                  high = loose/large blobs.
        rotation: Rotation in degrees (0–360) applied after generation.
        tile:     If True, generate at half size then tile 2×2.
        seed:     RNG seed for reproducibility.
        **kwargs: Ignored; kept for forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGB) of the requested size.
          metadata — dict with 'focal_point' (None) and 'pattern_bounds'.
    """
    try:
        # --- Resolve colours ---------------------------------------------------
        primary_hex = palette.get("primary", "#2D5016")
        secondary_hex = palette.get("secondary", "#A3C586")
        bg_hex = palette.get("background", "#1A1A0F")

        primary = _hex_to_rgb(primary_hex)
        secondary = _hex_to_rgb(secondary_hex)
        bg_colour = _hex_to_rgb(bg_hex)

        camo_colours = _build_camo_colours(primary, secondary)

        # --- Scale: maps 0.1–2.0 → tighter/looser blobs -----------------------
        # scale=1.0 is the baseline (original density).
        # Higher scale → larger blobs, fewer of them (looser).
        # Lower scale  → smaller blobs, more of them (tighter).
        density = 1.0 / max(0.1, scale)   # inverse: loose scale = low density
        blob_scale = max(0.1, scale)        # size multiplier

        # --- Canvas setup ------------------------------------------------------
        render_w, render_h = width, height
        if tile:
            # Render at half size, tile afterward
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGB", (render_w, render_h))
        draw = ImageDraw.Draw(image)

        # --- Noise + RNG -------------------------------------------------------
        _init_perm(seed)
        rng = random.Random(seed)

        # --- Base fill ---------------------------------------------------------
        draw.rectangle([0, 0, render_w - 1, render_h - 1], fill=bg_colour)

        # --- Layer 1: large background-mass blobs ------------------------------
        l1_size = (
            int(200 * blob_scale),
            int(420 * blob_scale),
        )
        l1_count = max(1, int(25 * density))
        _generate_camo_layer(draw, render_w, render_h, camo_colours, rng,
                             count=l1_count, size_range=l1_size, noise_offset=0.0)

        # --- Layer 2: medium blobs (mid detail) --------------------------------
        l2_size = (
            int(100 * blob_scale),
            int(260 * blob_scale),
        )
        l2_count = max(1, int(35 * density))
        _generate_camo_layer(draw, render_w, render_h, camo_colours, rng,
                             count=l2_count, size_range=l2_size, noise_offset=50.0)

        # --- Layer 3: smaller accent blobs -------------------------------------
        l3_size = (
            int(50 * blob_scale),
            int(140 * blob_scale),
        )
        l3_count = max(1, int(40 * density))
        _generate_camo_layer(draw, render_w, render_h, camo_colours, rng,
                             count=l3_count, size_range=l3_size, noise_offset=100.0)

        # --- Layer 4: fine detail blobs ----------------------------------------
        l4_size = (
            int(30 * blob_scale),
            int(80 * blob_scale),
        )
        l4_count = max(1, int(30 * density))
        _generate_camo_layer(draw, render_w, render_h, camo_colours[:3], rng,
                             count=l4_count, size_range=l4_size, noise_offset=150.0)

        # --- Post-process: soften then sharpen ---------------------------------
        image = image.filter(ImageFilter.GaussianBlur(radius=1.8))
        image = image.filter(ImageFilter.SHARPEN)

        # --- Tile (if requested) -----------------------------------------------
        if tile:
            image = _tile_image(image, width, height, tile_factor=2)

        # --- Rotation ----------------------------------------------------------
        if rotation % 360 != 0:
            # Rotate with expand so no canvas crop, then centre-crop to size
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            # Centre-crop back to requested dimensions
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top = max(0, (ry - height) // 2)
            image = rotated.crop((left, top, left + width, top + height))

        # Ensure exact output dimensions
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point": None,          # Camo has no natural focal point
            "pattern_bounds": (0, 0, width, height),
        }
        return image, metadata

    except Exception as exc:  # graceful fallback
        # Return a solid-colour image rather than crashing the pipeline
        fallback = Image.new("RGB", (width, height), (30, 40, 20))
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
