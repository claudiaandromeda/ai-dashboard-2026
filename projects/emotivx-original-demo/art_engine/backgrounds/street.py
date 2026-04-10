"""
Street Background Generator — Art Engine v2.0

Pure background generation: brick wall with mortar lines, per-brick colour
variation, surface noise grain, and grime weathering stains.

Graffiti / spray-paint aesthetic — this is the CANVAS for graffiti art.
Data line spray effects are rendered separately by the data_renderer.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Parse '#RRGGBB' or 'RRGGBB' → (r, g, b)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str!r}")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


def _rgb_to_hex(r: int, g: int, b: int) -> str:
    return f"#{r:02x}{g:02x}{b:02x}"


def _darken(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    """Darken a colour by fraction f (0 = no change, 1 = black)."""
    return (int(c[0] * (1 - f)), int(c[1] * (1 - f)), int(c[2] * (1 - f)))


def _clamp(v: int, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, v))


def _resolve_palette_colour(palette: dict, key: str,
                             fallback_rgb: Tuple[int, int, int]) -> Tuple[int, int, int]:
    """
    Pull a colour out of the palette dict.  Accepts both hex strings and
    (r, g, b) tuples; returns (r, g, b).
    """
    val = palette.get(key)
    if val is None:
        return fallback_rgb
    if isinstance(val, (tuple, list)) and len(val) >= 3:
        return (int(val[0]), int(val[1]), int(val[2]))
    if isinstance(val, str):
        try:
            return _hex_to_rgb(val)
        except ValueError:
            return fallback_rgb
    return fallback_rgb


# ---------------------------------------------------------------------------
# Brick wall constants
# ---------------------------------------------------------------------------

_BRICK_H: int = 26      # pixels tall per brick (before scale)
_BRICK_W: int = 56      # pixels wide per brick (before scale)
_MORTAR_GAP: int = 3    # pixels of mortar between bricks


# ---------------------------------------------------------------------------
# Wall rendering internals
# ---------------------------------------------------------------------------

def _render_brick_wall(
    image: Image.Image,
    width: int,
    height: int,
    brick_base: Tuple[int, int, int],
    mortar_rgb: Tuple[int, int, int],
    brick_colors: Optional[List[Tuple[int, int, int]]],
    rng: random.Random,
    brick_h: int,
    brick_w: int,
    mortar_gap: int,
) -> None:
    """
    Render the brick grid onto *image*.

    Each brick gets:
      - A colour drawn from *brick_colors* (if supplied) or varied from *brick_base*
      - Random lightness variation (+/- 14 luma) and stain (-8 to +4 on green)
      - An optional top-edge highlight and bottom-edge shadow
    Mortar colour fills the background first so gaps show through naturally.
    """
    draw = ImageDraw.Draw(image)

    # Fill entire canvas with mortar colour first
    draw.rectangle([0, 0, width, height], fill=(*mortar_rgb, 255))

    for row_i, row_y in enumerate(range(0, height, brick_h + mortar_gap)):
        # Alternating rows are offset by half a brick width (running-bond pattern)
        offset = (brick_w // 2) if row_i % 2 else 0

        for col_x in range(-brick_w, width + brick_w, brick_w + mortar_gap):
            x = col_x + offset

            # Pick base colour for this brick
            if brick_colors:
                base = brick_colors[rng.randint(0, len(brick_colors) - 1)]
            else:
                base = brick_base

            # Per-brick luminance variation
            var = rng.randint(-14, 14)
            stain = rng.randint(-8, 4)
            brick_color: Tuple[int, int, int, int] = (
                _clamp(base[0] + var),
                _clamp(base[1] + var + stain),
                _clamp(base[2] + var),
                255,
            )

            draw.rectangle(
                [x, row_y, x + brick_w, row_y + brick_h],
                fill=brick_color,
            )

            # Top-edge highlight (55 % of bricks)
            if rng.random() > 0.45:
                hl = (
                    _clamp(brick_color[0] + 12),
                    _clamp(brick_color[1] + 12),
                    _clamp(brick_color[2] + 12),
                    255,
                )
                draw.line(
                    [(x + 1, row_y), (x + brick_w - 1, row_y)],
                    fill=hl, width=1,
                )

            # Bottom-edge shadow (35 % of bricks)
            if rng.random() > 0.65:
                sh = (
                    _clamp(brick_color[0] - 10),
                    _clamp(brick_color[1] - 10),
                    _clamp(brick_color[2] - 10),
                    255,
                )
                draw.line(
                    [(x + 1, row_y + brick_h), (x + brick_w - 1, row_y + brick_h)],
                    fill=sh, width=1,
                )


def _render_surface_noise(image: Image.Image, width: int, height: int,
                          rng: random.Random) -> None:
    """Concrete grain — fine random-dot noise across the whole wall surface."""
    noise_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    nd = ImageDraw.Draw(noise_layer)
    num_dots = width * height // 40
    for _ in range(num_dots):
        px = rng.randint(0, width - 1)
        py = rng.randint(0, height - 1)
        v = rng.randint(0, 255)
        nd.point((px, py), fill=(v, v, v, rng.randint(8, 30)))
    image.alpha_composite(noise_layer)


def _render_grime(image: Image.Image, width: int, height: int,
                  rng: random.Random) -> None:
    """
    Large soft dark patches — years of weathering, water staining, and grime.
    Gaussian-blurred after rendering for a natural soft-edged look.
    """
    grime = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grime)
    for _ in range(5):
        gx = rng.randint(0, width)
        gy = rng.randint(0, height)
        gr = rng.randint(150, 400)
        for _ in range(gr * 4):
            angle = rng.uniform(0, 2 * math.pi)
            dist = abs(rng.gauss(0, gr / 2.5))
            if dist > gr:
                continue
            px = int(gx + math.cos(angle) * dist)
            py = int(gy + math.sin(angle) * dist)
            if 0 <= px < width and 0 <= py < height:
                gd.point((px, py), fill=(0, 0, 0, rng.randint(3, 15)))
    grime_blurred = grime.filter(ImageFilter.GaussianBlur(radius=8))
    image.alpha_composite(grime_blurred)


def _render_old_faded_spray(
    image: Image.Image,
    width: int,
    height: int,
    faded_colors: List[Tuple[int, int, int]],
    rng: random.Random,
) -> None:
    """
    Ghost patches of old, heavily faded spray paint — remnants of previous
    graffiti layers. Gaussian-blurred to look weathered and aged.
    """
    old_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    od = ImageDraw.Draw(old_layer)

    # Faded spray clouds
    for _ in range(8):
        sx = rng.randint(0, width)
        sy = rng.randint(0, height)
        color = rng.choice(faded_colors)
        radius = rng.randint(60, 180)
        density = rng.randint(100, 350)
        for _ in range(density):
            angle = rng.uniform(0, 2 * math.pi)
            dist = abs(rng.gauss(0, radius / 2.5))
            if dist > radius * 1.3:
                continue
            px = int(sx + math.cos(angle) * dist)
            py = int(sy + math.sin(angle) * dist)
            norm = dist / radius
            if norm < 0.4:
                alpha = rng.randint(30, 60)
            elif norm < 0.7:
                alpha = rng.randint(15, 35)
            else:
                alpha = rng.randint(5, 20)
            if 0 <= px < width and 0 <= py < height:
                od.ellipse(
                    [px - 1, py - 1, px + 1, py + 1],
                    fill=(color[0], color[1], color[2], alpha),
                )

    # Old drip stains — faint vertical runs
    for _ in range(6):
        dx = rng.randint(0, width)
        dy = rng.randint(0, height // 2)
        color = rng.choice(faded_colors)
        drip_len = rng.randint(30, 90)
        cx_f = float(dx)
        for drip_dy in range(drip_len):
            progress = drip_dy / max(1, drip_len)
            cx_f += rng.gauss(0, 0.5)
            w = max(1, int(3 * (1 - progress * 0.65)))
            alpha = max(10, int(60 * (1 - progress * 0.7)))
            ix = int(cx_f)
            iy = dy + drip_dy
            if 0 <= ix < width and 0 <= iy < height:
                od.ellipse(
                    [ix - w, iy - 1, ix + w, iy + 1],
                    fill=(color[0], color[1], color[2], alpha),
                )

    old_blurred = old_layer.filter(ImageFilter.GaussianBlur(radius=4))
    image.alpha_composite(old_blurred)


def _apply_grunge_grain(image: Image.Image, seed: int = 42) -> Image.Image:
    """
    Heavy spray-paint grain — random luminance noise applied to every pixel.
    Heavier than other styles; this is raw, gritty urban texture.
    """
    arr = np.array(image)
    rs = np.random.RandomState(seed)
    noise = rs.randint(-22, 22, arr.shape[:2], dtype=np.int16)
    for c in range(min(arr.shape[2], 3)):
        channel = arr[:, :, c].astype(np.int16) + noise
        arr[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def _apply_vignette(image: Image.Image, width: int, height: int) -> Image.Image:
    """
    Dark vignette — heavy, like a streetlight illuminating the centre of the
    wall with darkness creeping in from the edges.
    """
    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    cx, cy = width // 2, height // 2
    max_r = int(math.hypot(cx, cy))
    inner_r = max_r // 2
    for radius in range(max_r, inner_r, -3):
        progress = (radius - inner_r) / max(1, max_r - inner_r)
        alpha = min(120, max(0, int(120 * progress)))
        vdraw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(0, 0, 0, alpha),
        )
    return Image.alpha_composite(image.convert("RGBA"), vignette)


# ---------------------------------------------------------------------------
# Tile helper
# ---------------------------------------------------------------------------

def _tile_image(image: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Tile *image* to fill (target_w × target_h)."""
    tile_w, tile_h = image.size
    tiled = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 255))
    for ty in range(0, target_h, tile_h):
        for tx in range(0, target_w, tile_w):
            tiled.paste(image, (tx, ty))
    return tiled


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_street_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    brick_colors: Optional[List[str]] = None,   # hex strings or (r,g,b) tuples
    mortar_color: Optional[str] = None,          # hex string or (r,g,b)
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Brick wall pattern with graffiti aesthetic.

    Generates a pure brick-wall canvas — mortar lines, per-brick colour
    variation, surface grain, grime patches, and ghost-faded old spray.
    No data lines, actor markers, or path rendering.

    Parameters
    ----------
    width, height : int
        Output image dimensions in pixels.
    palette : dict
        Team colour palette.  Keys used: 'background', 'primary',
        'secondary', 'accent'.  Values may be hex strings or (r,g,b) tuples.
    scale : float
        Multiplier applied to brick dimensions (default 1.0).
    rotation : int
        Degrees to rotate the final image (0 = no rotation).
    tile : bool
        If True the pattern is tiled to fill the target dimensions.
    seed : int
        RNG seed for reproducible output.
    brick_colors : list[str] | None
        Optional list of hex colours to draw bricks from.  When supplied,
        each brick is randomly assigned one of these colours (with per-brick
        luminance variation still applied).  When None the palette
        'background' colour is used as the base.
    mortar_color : str | None
        Hex colour for mortar.  Defaults to a lighter variant of the
        background colour.

    Returns
    -------
    (image, metadata) : tuple[PIL.Image.Image, dict]
        image    — RGB PIL image of the brick wall.
        metadata — dict with ``focal_point`` (always None) and
                   ``pattern_bounds``.
    """
    try:
        rng = random.Random(seed)

        # ---- Resolve palette colours ----------------------------------------
        bg_rgb = _resolve_palette_colour(palette, "background", (60, 40, 30))
        primary_rgb = _resolve_palette_colour(palette, "primary", (180, 60, 40))
        secondary_rgb = _resolve_palette_colour(palette, "secondary", (100, 70, 50))
        accent_rgb = _resolve_palette_colour(palette, "accent", (120, 80, 50))

        # Brick base colour — slightly darkened background
        brick_base = _darken(bg_rgb, 0.45)

        # Mortar colour — lighter than bricks (default: bg lightened)
        if mortar_color is not None:
            if isinstance(mortar_color, str):
                mortar_rgb: Tuple[int, int, int] = _hex_to_rgb(mortar_color)
            else:
                mortar_rgb = (int(mortar_color[0]), int(mortar_color[1]),
                              int(mortar_color[2]))
        else:
            mortar_rgb = (
                _clamp(brick_base[0] + 22),
                _clamp(brick_base[1] + 20),
                _clamp(brick_base[2] + 16),
            )

        # Resolve optional brick_colors list
        resolved_brick_colors: Optional[List[Tuple[int, int, int]]] = None
        if brick_colors:
            resolved_brick_colors = []
            for bc in brick_colors:
                if isinstance(bc, str):
                    resolved_brick_colors.append(_hex_to_rgb(bc))
                else:
                    resolved_brick_colors.append(
                        (int(bc[0]), int(bc[1]), int(bc[2]))
                    )

        # Faded colours for old-paint ghosts
        faded_colors: List[Tuple[int, int, int]] = [
            _darken(accent_rgb, 0.75),
            _darken(primary_rgb, 0.75),
            _darken(secondary_rgb, 0.70),
        ]

        # ---- Scale brick dimensions -----------------------------------------
        bh = max(8, int(_BRICK_H * scale))
        bw = max(16, int(_BRICK_W * scale))
        mg = max(1, int(_MORTAR_GAP * scale))

        # ---- Render dimensions (tile renders at native, resize later) --------
        if tile:
            # Render one "tile unit" then tile it up
            render_w = bw * 6 + mg * 6
            render_h = bh * 4 + mg * 4
        else:
            render_w, render_h = width, height

        # ---- Build RGBA canvas ----------------------------------------------
        canvas = Image.new("RGBA", (render_w, render_h), (0, 0, 0, 255))

        # Layer 1 — brick grid + mortar
        _render_brick_wall(
            canvas, render_w, render_h,
            brick_base, mortar_rgb, resolved_brick_colors,
            rng, bh, bw, mg,
        )

        # Layer 2 — surface grain (concrete texture)
        _render_surface_noise(canvas, render_w, render_h, rng)

        # Layer 3 — grime weathering patches
        _render_grime(canvas, render_w, render_h, rng)

        # Layer 4 — ghost faded old spray patches
        _render_old_faded_spray(canvas, render_w, render_h, faded_colors, rng)

        # ---- Post-process ---------------------------------------------------
        # Heavy grain noise
        canvas_rgb = canvas.convert("RGB")
        canvas_rgb = _apply_grunge_grain(canvas_rgb, seed=seed)

        # Dark vignette (streetlight feel)
        canvas_rgba = _apply_vignette(canvas_rgb, render_w, render_h)
        canvas_rgb = canvas_rgba.convert("RGB")

        # ---- Tile -----------------------------------------------------------
        if tile:
            canvas_rgb = _tile_image(canvas_rgb.convert("RGBA"),
                                     width, height).convert("RGB")

        # ---- Rotation -------------------------------------------------------
        if rotation % 360 != 0:
            rotated = canvas_rgb.rotate(rotation, expand=True,
                                        resample=Image.BICUBIC)
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top = max(0, (ry - height) // 2)
            canvas_rgb = rotated.crop((left, top, left + width, top + height))

        # ---- Ensure exact output size ---------------------------------------
        if canvas_rgb.size != (width, height):
            canvas_rgb = canvas_rgb.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "brick_size": (bw, bh),
            "mortar_gap": mg,
            "seed": seed,
        }
        return canvas_rgb, metadata

    except Exception as exc:  # graceful fallback — never crash the pipeline
        fallback = Image.new("RGB", (width, height), (50, 35, 25))
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
