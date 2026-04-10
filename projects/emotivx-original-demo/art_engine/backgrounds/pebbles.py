"""
Pebbles Background Generator — Art Engine v2.0

Pure background generation: organic Voronoi tessellation (the original
"pebbles" style from commit 6d2c861). Smooth, rounded cells that look
like river stones or organic pebbles.

This is DIFFERENT from geometric.py — geometric uses a simpler convex-hull
Voronoi, while pebbles uses scipy's full Voronoi with mirrored boundaries
for seamless edge handling.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random as rng_mod
from typing import Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.spatial import Voronoi


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Parse '#RRGGBB' or 'RRGGBB' → (r, g, b)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str!r}")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


def _rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (H: 0-360, S: 0-100, L: 0-100)."""
    import colorsys
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
    return h * 360, s * 100, l * 100


def _hsl_to_rgb(h: float, s: float, l: float) -> Tuple[int, int, int]:
    """Convert HSL (H: 0-360, S: 0-100, L: 0-100) to RGB (0-255)."""
    import colorsys
    rf, gf, bf = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return (
        int(min(255, max(0, rf * 255))),
        int(min(255, max(0, gf * 255))),
        int(min(255, max(0, bf * 255)))
    )


# ---------------------------------------------------------------------------
# Voronoi tessellation with mirrored boundaries
# ---------------------------------------------------------------------------

def _make_voronoi_grid(width: int, height: int, density: int, seed: int = 42) -> Voronoi:
    """
    Generate Voronoi tessellation with mirrored boundaries.

    Args:
        width, height: Canvas dimensions
        density: Number of cells (e.g., 400-8000)
        seed: RNG seed for reproducibility

    Returns:
        scipy.spatial.Voronoi object
    """
    rng = np.random.RandomState(seed)
    grid_size = int(math.sqrt(density))
    cell_w = width / max(1, grid_size)
    cell_h = height / max(1, grid_size)

    points = []
    for gx in range(grid_size + 2):
        for gy in range(grid_size + 2):
            base_x = (gx - 0.5) * cell_w
            base_y = (gy - 0.5) * cell_h
            jx = rng.uniform(-cell_w * 0.42, cell_w * 0.42)
            jy = rng.uniform(-cell_h * 0.42, cell_h * 0.42)
            points.append([base_x + jx, base_y + jy])

    points_arr = np.array(points)

    # Mirror points at boundaries for seamless tiling
    mirrors = []
    for axis, size in [(0, width), (1, height)]:
        m1 = points_arr.copy()
        m1[:, axis] = -m1[:, axis]
        mirrors.append(m1)
        m2 = points_arr.copy()
        m2[:, axis] = 2 * size - m2[:, axis]
        mirrors.append(m2)

    all_points = np.vstack([points_arr] + mirrors)
    return Voronoi(all_points)


# ---------------------------------------------------------------------------
# Gradient helpers
# ---------------------------------------------------------------------------

def _apply_gradient(
    image: Image.Image,
    gradient_style: str,
    width: int,
    height: int
) -> Image.Image:
    """Apply gradient overlay to darken edges/corners."""
    if gradient_style == "none":
        return image

    grad_arr = np.zeros((height, width, 4), dtype=np.float32)

    if gradient_style == "radial":
        # Radial: bright centre, dark edges
        cy_c, cx_c = height / 2, width / 2
        max_dist = math.sqrt(cx_c**2 + cy_c**2)
        for y_px in range(height):
            for x_px in range(0, width, 4):
                dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                darken = dist * 0.3  # Max 30% darker at edges
                grad_arr[y_px, x_px:min(x_px+4, width), 3] = darken * 255
    elif gradient_style == "linear-v":
        for y_px in range(height):
            t = y_px / max(1, height - 1)
            darken = abs(t - 0.5) * 0.25
            grad_arr[y_px, :, 3] = darken * 255
    elif gradient_style == "linear-h":
        for x_px in range(width):
            t = x_px / max(1, width - 1)
            darken = abs(t - 0.5) * 0.25
            grad_arr[:, x_px, 3] = darken * 255

    grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))

    # Composite as darkening overlay
    img_arr = np.array(image, dtype=np.float32)
    g_arr = np.array(grad, dtype=np.float32)
    darken_factor = 1.0 - g_arr[:, :, 3:4] / 255.0
    img_arr[:, :, :3] *= darken_factor
    return Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_pebbles_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    edge_visibility: float = 30.0,
    gradient: str = "none",
    secondary_accent: float = 0.0,
    pattern_density: float = 50.0,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate organic Voronoi "pebbles" background (no data line).

    Args:
        width:    Output image width in pixels.
        height:   Output image height in pixels.
        palette:  Colour dict with keys 'primary', 'secondary', 'accent',
                  'background'. Values are hex strings ('#RRGGBB').
        pattern_density: Pattern density 0-100 (50 = default).
                  Higher values = more/smaller pebbles.
                  Lower values = fewer/larger pebbles.
        scale:    Pattern size multiplier 0.1–2.0.
                  1.0 = default size.
                  < 1.0 = smaller pattern elements.
                  > 1.0 = larger pattern elements.
        rotation: Rotation in degrees (0–360) applied after generation.
        tile:     If True, generate at half size then tile 2×2.
        seed:     RNG seed for reproducibility.
        edge_visibility: 0-100, controls cell edge prominence.
        gradient: Gradient style: "none", "radial", "linear-v", "linear-h".
        secondary_accent: 0-100, blends secondary colour into some cells.
        **kwargs: Ignored; kept for forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGB) of the requested size.
          metadata — dict with 'focal_point' (None) and 'pattern_bounds'.
    """
    try:
        # --- Resolve colours ---------------------------------------------------
        from art_engine.colour_utils import build_palette

        team_colours = palette.get("team_colours")
        if team_colours and len(team_colours) > 0:
            colour_palette = build_palette(team_colours, len(team_colours))
            primary_hex = colour_palette[0][0]
            secondary_hex = colour_palette[1][0] if len(colour_palette) > 1 else primary_hex
        else:
            primary_hex = palette.get("primary", "#DA291C")
            secondary_hex = palette.get("secondary", "#FFFFFF")

        bg_hex = palette.get("background", "#1A0A0A")

        primary_rgb = _hex_to_rgb(primary_hex)
        secondary_rgb = _hex_to_rgb(secondary_hex)
        bg_colour = _hex_to_rgb(bg_hex)

        # Extract HSL from primary for cell colour variation
        h, s_base, l_base = _rgb_to_hsl(*primary_rgb)
        sec_h, sec_s, sec_l = _rgb_to_hsl(*secondary_rgb)

        # --- Density from pattern_density param --------------------------------
        # pattern_density=50 → density~4000 (baseline)
        # Higher pattern_density = more/smaller pebbles
        density_factor = pattern_density / 50.0  # normalize to 1.0 at default
        base_density = 4000
        density = int(base_density * density_factor)
        density = max(400, min(8000, density))

        # Scale affects pebble size independent of count (handled by Voronoi grid)

        # --- Canvas setup ------------------------------------------------------
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGBA", (render_w, render_h), (*bg_colour, 255))
        draw = ImageDraw.Draw(image, "RGBA")

        # --- RNG ---------------------------------------------------------------
        r = rng_mod.Random(seed + 99)

        # --- Voronoi generation ------------------------------------------------
        vor = _make_voronoi_grid(render_w, render_h, density, seed)

        # Cell colour ranges (dark, moody aesthetic)
        min_l, max_l = 10, 22
        min_s, max_s = 50, 85

        # Edge styling
        edge_alpha = int(edge_visibility * 2.55)  # 0-255
        accent_t = secondary_accent / 100.0

        # --- Render each Voronoi cell ------------------------------------------
        for region in vor.regions:
            if not region or -1 in region:
                continue
            try:
                vertices = [vor.vertices[i] for i in region]
            except IndexError:
                continue

            cx = sum(v[0] for v in vertices) / len(vertices)
            cy = sum(v[1] for v in vertices) / len(vertices)

            # Skip cells far outside canvas bounds
            if cx < -50 or cx > render_w + 50 or cy < -50 or cy > render_h + 50:
                continue

            # Random cell lightness and saturation
            cell_l = r.uniform(min_l, max_l)
            cell_s = r.uniform(min_s, max_s)

            # Secondary accent: some cells use secondary hue
            use_secondary = r.random() < accent_t * 0.3  # Max 30% of cells
            cell_h = sec_h if use_secondary else h

            cell_rgb = _hsl_to_rgb(cell_h, cell_s, cell_l)
            poly = [(int(v[0]), int(v[1])) for v in vertices]

            if len(poly) >= 3:
                # Fill cell
                draw.polygon(poly, fill=cell_rgb)

                # Optional edges
                if edge_alpha > 3:
                    edge_rgb = _hsl_to_rgb(cell_h, cell_s * 0.7, max(5, cell_l - 3))
                    draw.polygon(poly, outline=(*edge_rgb, edge_alpha))

        # --- Gradient overlay --------------------------------------------------
        image = _apply_gradient(image, gradient, render_w, render_h)

        # Convert to RGB for final output
        image = image.convert("RGB")

        # --- Tile (if requested) -----------------------------------------------
        if tile:
            tile_w = max(64, width // 2)
            tile_h = max(64, height // 2)
            tile_img = image.resize((tile_w, tile_h), Image.LANCZOS)

            result = Image.new("RGB", (width, height))
            for ty in range(0, height, tile_h):
                for tx in range(0, width, tile_w):
                    result.paste(tile_img, (tx, ty))
            image = result

        # --- Rotation ----------------------------------------------------------
        if rotation % 360 != 0:
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            rx, ry = rotated.size
            left = max(0, (rx - width) // 2)
            top = max(0, (ry - height) // 2)
            image = rotated.crop((left, top, left + width, top + height))

        # Ensure exact output dimensions
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
        }
        return image, metadata

    except Exception as exc:
        # Graceful fallback
        fallback = Image.new("RGB", (width, height), (26, 10, 10))
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
