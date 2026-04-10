"""
Spider Web Background Generator — Art Engine v2.0

Pure background generation: radial spokes + concentric rings forming an
organic spider-web pattern centred on the canvas (or a supplied focal point).
No data line or event marker rendering.

Natural focal point: centre of web → metadata["focal_point"] is always set.

Used by: art_engine/backgrounds/__init__.py
"""

import colorsys
import math
import random
from typing import Optional, Tuple

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------


def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Parse '#RRGGBB' or 'RRGGBB' → (r, g, b)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str!r}")
    return (
        int(hex_str[0:2], 16),
        int(hex_str[2:4], 16),
        int(hex_str[4:6], 16),
    )


def _rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """(r,g,b) 0-255 → (h 0-360, s 0-100, l 0-100)."""
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    return h * 360, s * 100, l * 100


def _hsl_to_rgb(h: float, s: float, l: float) -> Tuple[int, int, int]:
    """(h 0-360, s 0-100, l 0-100) → (r,g,b) 0-255."""
    rf, gf, bf = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return (
        int(min(255, max(0, rf * 255))),
        int(min(255, max(0, gf * 255))),
        int(min(255, max(0, bf * 255))),
    )


# ---------------------------------------------------------------------------
# Tiling helper
# ---------------------------------------------------------------------------


def _tile_image(img: Image.Image, target_w: int, target_h: int,
                tile_factor: int = 2) -> Image.Image:
    """Downscale *img* then tile it to fill the target dimensions."""
    tile_w = max(1, target_w // tile_factor)
    tile_h = max(1, target_h // tile_factor)
    tile = img.resize((tile_w, tile_h), Image.LANCZOS)
    result = Image.new("RGB", (target_w, target_h))
    for ty in range(0, target_h, tile_h):
        for tx in range(0, target_w, tile_w):
            result.paste(tile, (tx, ty))
    return result


# ---------------------------------------------------------------------------
# Core web renderer
# ---------------------------------------------------------------------------


def _render_web(
    image: Image.Image,
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    cx_px: int,
    cy_px: int,
    primary_hsl: Tuple[float, float, float],
    secondary_hsl: Tuple[float, float, float],
    rng: random.Random,
    density: float,
    strand_thickness: float,
    secondary_accent: float,
) -> None:
    """
    Render radial spokes + concentric rings on *draw*.

    Args:
        density:          Controls spoke/ring count (maps from web_complexity).
        strand_thickness: Line-width multiplier for web threads.
        secondary_accent: 0.0–1.0 blend of secondary colour into cells.
    """
    h, s_base, l_base = primary_hsl
    sec_h = secondary_hsl[0]

    # ── Number of spokes + rings ────────────────────────────────────────────
    num_spokes = max(8, int(math.sqrt(density) * 1.2))
    num_rings = max(4, int(math.sqrt(density) * 0.6))
    max_radius = math.sqrt(width ** 2 + height ** 2) * 0.7

    # ── Organic spoke angles ────────────────────────────────────────────────
    base_step = 2 * math.pi / num_spokes
    spoke_angles = []
    for i in range(num_spokes):
        angle = i * base_step + rng.uniform(-base_step * 0.25, base_step * 0.25)
        spoke_angles.append(angle)

    # ── Organic ring radii ──────────────────────────────────────────────────
    ring_radii = []
    for i in range(num_rings):
        base_r = max_radius * ((i + 1) / num_rings)
        jitter = rng.uniform(-max_radius * 0.02, max_radius * 0.02)
        ring_radii.append(base_r + jitter)

    # ── Thread style ────────────────────────────────────────────────────────
    thread_alpha = max(30, int(80))          # fixed visibility
    thread_l = 18 + 50 * 0.15              # ~25.5 lightness

    # ── Fill triangular cells between spokes and rings ──────────────────────
    for si in range(num_spokes):
        a1 = spoke_angles[si]
        a2 = spoke_angles[(si + 1) % num_spokes]
        for ri in range(num_rings):
            r1 = ring_radii[ri - 1] if ri > 0 else 0
            r2 = ring_radii[ri]

            pts = [
                (cx_px + math.cos(a1) * r1, cy_px + math.sin(a1) * r1),
                (cx_px + math.cos(a1) * r2, cy_px + math.sin(a1) * r2),
                (cx_px + math.cos(a2) * r2, cy_px + math.sin(a2) * r2),
                (cx_px + math.cos(a2) * r1, cy_px + math.sin(a2) * r1),
            ]
            poly = [(int(x), int(y)) for x, y in pts]

            cell_l = rng.uniform(8, 20)
            cell_s = rng.uniform(50, 85)
            use_sec = rng.random() < secondary_accent * 0.3
            cell_h = sec_h if use_sec else h
            cell_rgb = _hsl_to_rgb(cell_h, cell_s, cell_l)
            draw.polygon(poly, fill=cell_rgb)

    # ── Concentric rings (silk threads) ─────────────────────────────────────
    line_w = max(1, int(strand_thickness))
    for rad in ring_radii:
        steps = max(60, num_spokes * 4)
        ring_pts = []
        for si in range(steps + 1):
            angle = (si / steps) * 2 * math.pi
            wobble = rng.uniform(0.96, 1.04)
            rx = cx_px + math.cos(angle) * rad * wobble
            ry = cy_px + math.sin(angle) * rad * wobble
            ring_pts.append((int(rx), int(ry)))
        thread_rgb = _hsl_to_rgb(h, 40, thread_l + rng.uniform(-3, 3))
        if len(ring_pts) >= 2:
            draw.line(ring_pts, fill=(*thread_rgb, thread_alpha), width=line_w)

    # ── Radial spokes ───────────────────────────────────────────────────────
    for angle in spoke_angles:
        spoke_pts = []
        for rad in [0] + ring_radii:
            wobble = rng.uniform(0.97, 1.03)
            sx = cx_px + math.cos(angle) * rad * wobble
            sy = cy_px + math.sin(angle) * rad * wobble
            spoke_pts.append((int(sx), int(sy)))
        thread_rgb = _hsl_to_rgb(h, 40, thread_l + rng.uniform(-3, 3))
        if len(spoke_pts) >= 2:
            draw.line(spoke_pts, fill=(*thread_rgb, thread_alpha), width=line_w)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_spider_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    web_complexity: int = 5,
    strand_thickness: float = 1.0,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a spider-web background (no data line or path overlays).

    The web radiates from the canvas centre, giving a natural focal point.

    Args:
        width:            Output image width in pixels.
        height:           Output image height in pixels.
        palette:          Colour dict with hex-string values for keys
                          'primary', 'secondary', 'background'.
        scale:            Web complexity multiplier (0.1–2.0).  Maps onto
                          internal density together with *web_complexity*.
        rotation:         Rotation in degrees (0–360) applied after generation.
        tile:             If True, generate at half size then tile 2×2.
        seed:             RNG seed for reproducibility.
        web_complexity:   Pattern-specific complexity 1-10 (spokes / rings).
        strand_thickness: Line-width multiplier for silk threads (≥ 0.5).
        **kwargs:         Ignored; kept for forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGB) of the requested size.
          metadata — dict containing:
              focal_point    : (cx, cy) — centre of the web (natural focus).
              pattern_bounds : (0, 0, width, height).
    """
    try:
        # ── Resolve colours ─────────────────────────────────────────────────
        primary_hex = palette.get("primary", "#1A3A5C")
        secondary_hex = palette.get("secondary", "#4A7FB5")
        bg_hex = palette.get("background", "#0A0F1A")

        primary_rgb = _hex_to_rgb(primary_hex)
        secondary_rgb = _hex_to_rgb(secondary_hex)
        bg_rgb = _hex_to_rgb(bg_hex)

        primary_hsl = _rgb_to_hsl(*primary_rgb)
        secondary_hsl = _rgb_to_hsl(*secondary_rgb)

        # ── Density from web_complexity + scale ──────────────────────────────
        # web_complexity 1-10 → density 10-1000, multiplied by scale
        raw_density = web_complexity * 20.0  # 20..200 for complexity 1..10
        density = max(10.0, raw_density * max(0.1, scale))

        # ── Canvas setup ─────────────────────────────────────────────────────
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGBA", (render_w, render_h), (*bg_rgb, 255))
        draw = ImageDraw.Draw(image, "RGBA")

        rng = random.Random(seed + 99)

        # ── Web centre = canvas centre ───────────────────────────────────────
        cx_px = render_w // 2
        cy_px = render_h // 2

        # Secondary accent from palette if provided, else 0
        secondary_accent = float(kwargs.get("secondary_accent", 0)) / 100.0

        _render_web(
            image=image,
            draw=draw,
            width=render_w,
            height=render_h,
            cx_px=cx_px,
            cy_px=cy_px,
            primary_hsl=primary_hsl,
            secondary_hsl=secondary_hsl,
            rng=rng,
            density=density,
            strand_thickness=max(0.5, strand_thickness),
            secondary_accent=secondary_accent,
        )

        # ── Flatten RGBA → RGB ───────────────────────────────────────────────
        flat = Image.new("RGB", image.size, bg_rgb)
        flat.paste(image, mask=image.split()[3])
        image = flat

        # ── Tile ─────────────────────────────────────────────────────────────
        if tile:
            image = _tile_image(image, width, height, tile_factor=2)

        # ── Rotation ─────────────────────────────────────────────────────────
        if rotation % 360 != 0:
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top = max(0, (ry - height) // 2)
            image = rotated.crop((left, top, left + width, top + height))

        # ── Ensure exact output dimensions ───────────────────────────────────
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        # Focal point: natural centre of the spider web
        focal_x = width // 2
        focal_y = height // 2

        metadata = {
            "focal_point": (focal_x, focal_y),   # Spider web has a definite centre
            "pattern_bounds": (0, 0, width, height),
        }
        return image, metadata

    except Exception as exc:  # graceful fallback
        fallback = Image.new("RGB", (width, height), (10, 15, 26))
        metadata = {
            "focal_point": (width // 2, height // 2),
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
