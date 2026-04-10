"""
Tron Background Generator — Art Engine v2.0

Sci-fi digital grid with neon glow: perpendicular grid lines, glowing
intersections, and a dark "digital void" background.  Think Tron Legacy —
cyan neon lines cutting through near-black space.

No focal point by default (the grid fills the whole canvas uniformly).

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import Tuple

from PIL import Image, ImageDraw, ImageFilter

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


def _brighten(rgb: Tuple[int, int, int], factor: float) -> Tuple[int, int, int]:
    """Brighten an RGB colour by multiplying each channel, clamped to 255."""
    return tuple(min(255, int(c * factor)) for c in rgb)  # type: ignore[return-value]


def _blend(a: Tuple[int, int, int], b: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    """Linear blend: a*(1-t) + b*t."""
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))  # type: ignore[return-value]


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
# Core Tron grid renderer
# ---------------------------------------------------------------------------


def _render_tron_grid(
    width: int,
    height: int,
    bg_rgb: Tuple[int, int, int],
    neon_rgb: Tuple[int, int, int],
    accent_rgb: Tuple[int, int, int],
    grid_density: int,
    neon_glow: bool,
    rng: random.Random,
) -> Image.Image:
    """
    Render the full Tron-style grid onto a new image and return it.

    Layers (bottom → top):
      1. Dark background fill
      2. Glow layer (blurred wide lines) — if neon_glow
      3. Crisp grid lines on top
      4. Bright intersection nodes
    """
    # ── Background ──────────────────────────────────────────────────────────
    base = Image.new("RGB", (width, height), bg_rgb)

    # ── Compute grid geometry ────────────────────────────────────────────────
    # grid_density = number of cells per dimension; lines = density + 1
    cell_w = width / grid_density
    cell_h = height / grid_density

    h_lines = [int(j * cell_h) for j in range(grid_density + 1)]
    v_lines = [int(i * cell_w) for i in range(grid_density + 1)]

    # ── Glow layer (blurred, wide, semi-transparent lines) ───────────────────
    if neon_glow:
        glow_layer = Image.new("RGB", (width, height), (0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_layer)

        glow_w = max(4, int(cell_w * 0.18))
        glow_col = _brighten(neon_rgb, 0.55)  # dimmer for glow base

        for y in h_lines:
            glow_draw.line([(0, y), (width, y)], fill=glow_col, width=glow_w)
        for x in v_lines:
            glow_draw.line([(x, 0), (x, height)], fill=glow_col, width=glow_w)

        # Gaussian blur creates the neon bloom
        glow_radius = max(3, int(cell_w * 0.35))
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=glow_radius))

        # Composite: screen blend (lighten base with glow)
        base = Image.blend(base, glow_layer, alpha=0.75)

    # ── Crisp grid lines ─────────────────────────────────────────────────────
    line_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    line_draw = ImageDraw.Draw(line_layer)

    line_w = max(1, int(cell_w * 0.05))
    line_alpha = 220

    for y in h_lines:
        line_draw.line([(0, y), (width, y)], fill=(*neon_rgb, line_alpha), width=line_w)
    for x in v_lines:
        line_draw.line([(x, 0), (x, height)], fill=(*neon_rgb, line_alpha), width=line_w)

    base = base.convert("RGBA")
    base = Image.alpha_composite(base, line_layer)
    base = base.convert("RGB")

    # ── Intersection nodes ───────────────────────────────────────────────────
    node_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    node_draw = ImageDraw.Draw(node_layer)

    node_r = max(2, int(min(cell_w, cell_h) * 0.08))
    node_bright = _brighten(neon_rgb, 2.2)   # near-white neon
    accent_bright = _brighten(accent_rgb, 1.8)

    for y in h_lines:
        for x in v_lines:
            # Randomly accent a small fraction of nodes with the secondary colour
            col = accent_bright if rng.random() < 0.12 else node_bright
            node_draw.ellipse(
                [x - node_r, y - node_r, x + node_r, y + node_r],
                fill=(*col, 240),
            )

    base = base.convert("RGBA")
    base = Image.alpha_composite(base, node_layer)

    # ── Subtle scanline vignette (optional depth cue) ────────────────────────
    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    margin = int(min(width, height) * 0.35)
    for step in range(margin, 0, -max(1, margin // 20)):
        alpha = int(80 * (1 - step / margin))
        vdraw.rectangle([margin - step, margin - step,
                         width - (margin - step), height - (margin - step)],
                        outline=(0, 0, 0, alpha), width=2)
    base = Image.alpha_composite(base, vignette)

    return base.convert("RGB")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_tron_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    grid_density: int = 20,
    neon_glow: bool = True,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a Tron-style digital grid background.

    The grid is built in multiple passes:
      • Dark background (digital void)
      • Blurred glow lines for neon bloom
      • Crisp neon grid lines on top
      • Bright node dots at every intersection

    Args:
        width:        Output image width in pixels.
        height:       Output image height in pixels.
        palette:      Colour dict with hex-string values for 'primary',
                      'secondary', and 'background'.  'primary' drives the
                      neon line colour; 'secondary' accents random nodes;
                      'background' is the dark void fill (defaults to
                      near-black #050a10 if palette background is too bright).
        scale:        Grid density multiplier.  scale > 1 → finer grid.
        rotation:     Rotation in degrees (0–360) applied after generation.
        tile:         If True, generate at half size then tile 2×2.
        seed:         RNG seed for reproducible node accent placement.
        grid_density: Base number of grid cells per dimension (before scale).
        neon_glow:    If True, apply Gaussian-blur glow to lines.
        **kwargs:     Ignored; kept for forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGB) of the requested size.
          metadata — dict containing:
              focal_point    : None (grid fills canvas uniformly).
              pattern_bounds : (0, 0, width, height).
    """
    try:
        # ── Resolve colours ──────────────────────────────────────────────────
        primary_hex   = palette.get("primary",    "#00E5FF")   # Tron cyan default
        secondary_hex = palette.get("secondary",  "#0080FF")   # blue accent default
        bg_hex        = palette.get("background", "#050A10")   # near-black default

        neon_rgb   = _hex_to_rgb(primary_hex)
        accent_rgb = _hex_to_rgb(secondary_hex)
        bg_rgb     = _hex_to_rgb(bg_hex)

        # Enforce dark background — if provided bg is very light, darken it
        bg_brightness = sum(bg_rgb) / 3
        if bg_brightness > 60:
            bg_rgb = tuple(min(c, 40) for c in bg_rgb)  # type: ignore[assignment]

        # ── Effective grid density with scale ────────────────────────────────
        effective_density = max(4, int(grid_density * max(0.1, scale)))

        # ── Canvas setup ─────────────────────────────────────────────────────
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        rng = random.Random(seed + 777)

        image = _render_tron_grid(
            width=render_w,
            height=render_h,
            bg_rgb=bg_rgb,
            neon_rgb=neon_rgb,
            accent_rgb=accent_rgb,
            grid_density=effective_density,
            neon_glow=neon_glow,
            rng=rng,
        )

        # ── Tile ─────────────────────────────────────────────────────────────
        if tile:
            image = _tile_image(image, width, height, tile_factor=2)

        # ── Rotation ─────────────────────────────────────────────────────────
        if rotation % 360 != 0:
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top  = max(0, (ry - height) // 2)
            image = rotated.crop((left, top, left + width, top + height))

        # ── Ensure exact output dimensions ───────────────────────────────────
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point":    None,                        # Grid is uniform; no single focus
            "pattern_bounds": (0, 0, width, height),
        }
        return image, metadata

    except Exception as exc:  # graceful fallback
        fallback = Image.new("RGB", (width, height), (5, 10, 16))
        metadata = {
            "focal_point":    None,
            "pattern_bounds": (0, 0, width, height),
            "error":          str(exc),
        }
        return fallback, metadata
