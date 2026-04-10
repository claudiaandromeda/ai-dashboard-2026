"""
Fractals Background Generator — Art Engine v2.0

Generative fractal pattern: Mandelbrot set, Julia set, or Burning Ship.
Colours are mapped from the club palette using an iteration-count gradient.
No data line or event-marker rendering.

focal_point is None — fractals fill the whole canvas with no single focus.

Used by: art_engine/backgrounds/__init__.py
"""

import colorsys
import math
import random
from typing import Optional, Tuple

from PIL import Image

# ---------------------------------------------------------------------------
# Optional NumPy acceleration
# ---------------------------------------------------------------------------

try:
    import numpy as np
    _HAS_NUMPY = True
except ImportError:
    _HAS_NUMPY = False


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
    h, l, s = colorsys.rgb_to_hls(r / 255.0, g / 255.0, b / 255.0)
    return h * 360, s * 100, l * 100


def _hsl_to_rgb(h: float, s: float, l: float) -> Tuple[int, int, int]:
    rf, gf, bf = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return (
        int(min(255, max(0, rf * 255))),
        int(min(255, max(0, gf * 255))),
        int(min(255, max(0, bf * 255))),
    )


# ---------------------------------------------------------------------------
# Gradient builder — maps [0, depth] → RGB colour list
# ---------------------------------------------------------------------------


def _build_gradient(
    primary_rgb: Tuple[int, int, int],
    secondary_rgb: Tuple[int, int, int],
    bg_rgb: Tuple[int, int, int],
    depth: int,
) -> list:
    """
    Build a palette of *depth+1* colours:
      - iteration 0..depth-1 → gradient from bg → primary → secondary → bg
      - iteration == depth (interior of set) → near-black background
    """
    gradient = []
    half = depth // 2

    def lerp_rgb(a, b, t):
        return (
            int(a[0] + (b[0] - a[0]) * t),
            int(a[1] + (b[1] - a[1]) * t),
            int(a[2] + (b[2] - a[2]) * t),
        )

    for i in range(depth):
        if i < half:
            t = i / max(1, half - 1)
            colour = lerp_rgb(bg_rgb, primary_rgb, t)
        else:
            t = (i - half) / max(1, depth - half - 1)
            colour = lerp_rgb(primary_rgb, secondary_rgb, t)
        gradient.append(colour)

    # Interior of the set → deep background colour
    interior = (
        max(0, bg_rgb[0] - 10),
        max(0, bg_rgb[1] - 10),
        max(0, bg_rgb[2] - 10),
    )
    gradient.append(interior)

    return gradient


# ---------------------------------------------------------------------------
# Pure-Python fractal iterators (fallback)
# ---------------------------------------------------------------------------


def _mandelbrot_iter(cx: float, cy: float, max_iter: int) -> int:
    zx = zy = 0.0
    for n in range(max_iter):
        zx2, zy2 = zx * zx, zy * zy
        if zx2 + zy2 > 4.0:
            return n
        zy = 2.0 * zx * zy + cy
        zx = zx2 - zy2 + cx
    return max_iter


def _julia_iter(px: float, py: float, cx: float, cy: float, max_iter: int) -> int:
    zx, zy = px, py
    for n in range(max_iter):
        zx2, zy2 = zx * zx, zy * zy
        if zx2 + zy2 > 4.0:
            return n
        zy = 2.0 * zx * zy + cy
        zx = zx2 - zy2 + cx
    return max_iter


def _burning_ship_iter(cx: float, cy: float, max_iter: int) -> int:
    zx = zy = 0.0
    for n in range(max_iter):
        zx2, zy2 = zx * zx, zy * zy
        if zx2 + zy2 > 4.0:
            return n
        zy = abs(2.0 * zx * zy) + cy
        zx = zx2 - zy2 + cx
    return max_iter


# ---------------------------------------------------------------------------
# NumPy-accelerated render path
# ---------------------------------------------------------------------------


def _render_numpy(
    width: int,
    height: int,
    fractal_type: str,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
    depth: int,
    julia_c: Tuple[float, float],
    gradient: list,
) -> Image.Image:
    """Vectorised fractal render using NumPy."""
    # Build coordinate grids
    xs = np.linspace(x_min, x_max, width, dtype=np.float64)
    ys = np.linspace(y_min, y_max, height, dtype=np.float64)
    C_real, C_imag = np.meshgrid(xs, ys)

    if fractal_type == "julia":
        Z_real = C_real.copy()
        Z_imag = C_imag.copy()
        C_real = np.full_like(C_real, julia_c[0])
        C_imag = np.full_like(C_imag, julia_c[1])
    elif fractal_type == "burning_ship":
        Z_real = np.zeros_like(C_real)
        Z_imag = np.zeros_like(C_imag)
    else:  # mandelbrot
        Z_real = np.zeros_like(C_real)
        Z_imag = np.zeros_like(C_imag)

    iteration_map = np.full((height, width), depth, dtype=np.int32)
    escaped = np.zeros((height, width), dtype=bool)

    for i in range(depth):
        mask = ~escaped
        zr2 = Z_real * Z_real
        zi2 = Z_imag * Z_imag

        # Escape test
        newly_escaped = mask & (zr2 + zi2 > 4.0)
        iteration_map[newly_escaped] = i
        escaped |= newly_escaped

        # Update Z
        if fractal_type == "burning_ship":
            new_zi = np.abs(2.0 * Z_real * Z_imag) + C_imag
        else:
            new_zi = 2.0 * Z_real * Z_imag + C_imag
        new_zr = zr2 - zi2 + C_real

        Z_real = np.where(mask, new_zr, Z_real)
        Z_imag = np.where(mask, new_zi, Z_imag)

    # Map iterations → colours
    grad_array = np.array(gradient, dtype=np.uint8)  # shape (depth+1, 3)
    indices = np.clip(iteration_map, 0, depth)
    pixel_array = grad_array[indices]  # shape (H, W, 3)

    return Image.fromarray(pixel_array, mode="RGB")


# ---------------------------------------------------------------------------
# Pure-Python render path (slow, fallback)
# ---------------------------------------------------------------------------


def _render_pure(
    width: int,
    height: int,
    fractal_type: str,
    x_min: float,
    x_max: float,
    y_min: float,
    y_max: float,
    depth: int,
    julia_c: Tuple[float, float],
    gradient: list,
) -> Image.Image:
    """Row-by-row fractal render, no NumPy."""
    img = Image.new("RGB", (width, height))
    pixels = img.load()

    x_scale = (x_max - x_min) / width
    y_scale = (y_max - y_min) / height

    jcx, jcy = julia_c

    for py in range(height):
        cy = y_min + py * y_scale
        for px in range(width):
            cx = x_min + px * x_scale
            if fractal_type == "julia":
                n = _julia_iter(cx, cy, jcx, jcy, depth)
            elif fractal_type == "burning_ship":
                n = _burning_ship_iter(cx, cy, depth)
            else:
                n = _mandelbrot_iter(cx, cy, depth)
            pixels[px, py] = gradient[min(n, depth)]

    return img


# ---------------------------------------------------------------------------
# Coordinate window per fractal type
# ---------------------------------------------------------------------------


def _default_window(fractal_type: str) -> Tuple[float, float, float, float]:
    """Return (x_min, x_max, y_min, y_max) for the full default view."""
    if fractal_type == "julia":
        return (-1.8, 1.8, -1.2, 1.2)
    elif fractal_type == "burning_ship":
        return (-2.5, 1.5, -2.0, 0.5)
    else:  # mandelbrot
        return (-2.5, 1.0, -1.25, 1.25)


# ---------------------------------------------------------------------------
# Tiling helper
# ---------------------------------------------------------------------------


def _tile_image(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    tile_w = max(1, target_w // 2)
    tile_h = max(1, target_h // 2)
    tile = img.resize((tile_w, tile_h), Image.LANCZOS)
    result = Image.new("RGB", (target_w, target_h))
    for ty in range(0, target_h, tile_h):
        for tx in range(0, target_w, tile_w):
            result.paste(tile, (tx, ty))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_fractals_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    fractal_type: str = "mandelbrot",   # "mandelbrot", "julia", "burning_ship"
    depth: int = 50,                    # max iterations (detail / quality)
    zoom: float = 1.0,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a fractal background (Mandelbrot, Julia set, or Burning Ship).

    Args:
        width:        Output image width in pixels.
        height:       Output image height in pixels.
        palette:      Colour dict with hex strings for 'primary', 'secondary',
                      'background'.
        scale:        Extra zoom multiplier applied on top of *zoom*.
        rotation:     Rotation in degrees applied after generation.
        tile:         If True, generate at half size then tile 2×2.
        seed:         RNG seed (affects Julia-set constant selection).
        fractal_type: One of "mandelbrot", "julia", "burning_ship".
        depth:        Max iteration count — higher = more detail, slower.
        zoom:         Zoom into the fractal (1.0 = default view).
        **kwargs:     Ignored; forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGB) of the requested size.
          metadata — dict with:
              focal_point    : None (fractals fill the whole canvas).
              pattern_bounds : (0, 0, width, height).
              fractal_type   : the fractal_type used.
              depth          : iteration depth used.
    """
    try:
        # ── Colours ──────────────────────────────────────────────────────────
        primary_hex   = palette.get("primary",    "#1A3A5C")
        secondary_hex = palette.get("secondary",  "#4A7FB5")
        bg_hex        = palette.get("background", "#0A0F1A")

        primary_rgb   = _hex_to_rgb(primary_hex)
        secondary_rgb = _hex_to_rgb(secondary_hex)
        bg_rgb        = _hex_to_rgb(bg_hex)

        # ── Clamp / validate params ───────────────────────────────────────────
        fractal_type = fractal_type.lower().replace("-", "_").replace(" ", "_")
        if fractal_type not in ("mandelbrot", "julia", "burning_ship"):
            fractal_type = "mandelbrot"

        depth   = max(10, min(500, int(depth)))
        zoom    = max(0.01, float(zoom))
        scale   = max(0.01, float(scale))
        total_zoom = zoom * scale

        # ── Julia constant — seeded so it's reproducible but varies with seed ─
        rng = random.Random(seed)
        # Classic interesting Julia constants; pick one via seed
        julia_constants = [
            (-0.7269,  0.1889),
            (-0.4,     0.6),
            ( 0.285,   0.01),
            (-0.8,     0.156),
            (-0.7,     0.27015),
            (-0.835,  -0.2321),
            ( 0.45,    0.1428),
            (-0.70176,-0.3842),
        ]
        julia_c = julia_constants[rng.randint(0, len(julia_constants) - 1)]

        # ── Coordinate window ─────────────────────────────────────────────────
        x_min0, x_max0, y_min0, y_max0 = _default_window(fractal_type)
        cx = (x_min0 + x_max0) / 2.0
        cy = (y_min0 + y_max0) / 2.0
        half_w = (x_max0 - x_min0) / 2.0 / total_zoom
        half_h = (y_max0 - y_min0) / 2.0 / total_zoom

        # Aspect-ratio correction so pixels stay square
        aspect = width / height
        if aspect > 1:
            half_w *= aspect
        else:
            half_h /= aspect

        x_min = cx - half_w
        x_max = cx + half_w
        y_min = cy - half_h
        y_max = cy + half_h

        # ── Gradient ──────────────────────────────────────────────────────────
        gradient = _build_gradient(primary_rgb, secondary_rgb, bg_rgb, depth)

        # ── Render dims ───────────────────────────────────────────────────────
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        # ── Render ────────────────────────────────────────────────────────────
        if _HAS_NUMPY:
            image = _render_numpy(
                render_w, render_h, fractal_type,
                x_min, x_max, y_min, y_max,
                depth, julia_c, gradient,
            )
        else:
            image = _render_pure(
                render_w, render_h, fractal_type,
                x_min, x_max, y_min, y_max,
                depth, julia_c, gradient,
            )

        # ── Tile ──────────────────────────────────────────────────────────────
        if tile:
            image = _tile_image(image, width, height)

        # ── Rotation ──────────────────────────────────────────────────────────
        if rotation % 360 != 0:
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top  = max(0, (ry - height) // 2)
            image = rotated.crop((left, top, left + width, top + height))

        # ── Ensure exact output dimensions ────────────────────────────────────
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point":    None,   # fractals fill the whole canvas
            "pattern_bounds": (0, 0, width, height),
            "fractal_type":   fractal_type,
            "depth":          depth,
            "zoom":           total_zoom,
            "julia_c":        julia_c if fractal_type == "julia" else None,
            "accelerated":    _HAS_NUMPY,
        }
        return image, metadata

    except Exception as exc:   # graceful fallback
        fallback = Image.new("RGB", (width, height), (10, 15, 26))
        metadata = {
            "focal_point":    None,
            "pattern_bounds": (0, 0, width, height),
            "fractal_type":   fractal_type,
            "depth":          depth,
            "error":          str(exc),
        }
        return fallback, metadata
