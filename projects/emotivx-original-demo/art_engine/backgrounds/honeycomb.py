"""
Honeycomb Background Generator — Art Engine v2.0

Pure background generation: hexagonal grid with data-driven cell effects.
Impact points (goals/shots) cause hex cells to "crack" (split into triangles).

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random as rng_mod
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw


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
# Hexagonal grid generation
# ---------------------------------------------------------------------------

def _generate_hex_grid(
    width: int,
    height: int,
    density: int,
    seed: int = 42,
    scale: float = 1.0
) -> Tuple[List[Tuple[int, int, List[Tuple[float, float]]]], float]:
    """
    Generate a hexagonal grid of cell centres.

    Args:
        width, height: Canvas dimensions
        density: Number of cells (affects grid resolution)
        seed: RNG seed
        scale: Size multiplier for hexagons (1.0 = default)

    Returns:
        (cells, hex_w) where:
          cells — list of (cx, cy, [(vx, vy), ...]) tuples (centre + 6 vertices)
          hex_w — hexagon width for sizing calculations
    """
    r = rng_mod.Random(seed + 42)

    # Hex dimensions from density
    cols = max(4, int(math.sqrt(density) * 1.2))
    hex_w = (width / cols) * scale  # Apply scale to hex size
    hex_h = hex_w * 0.866  # sqrt(3)/2 ratio
    rows = int(height / hex_h) + 2

    cells = []
    for row in range(-1, rows + 1):
        for col in range(-1, cols + 2):
            cx = col * hex_w + (hex_w * 0.5 if row % 2 else 0)
            cy = row * hex_h

            # Slight organic jitter
            jitter = hex_w * 0.03
            cx += r.uniform(-jitter, jitter)
            cy += r.uniform(-jitter, jitter)

            # 6 vertices of the hexagon
            verts = []
            for i in range(6):
                angle = math.pi / 6 + i * math.pi / 3  # Flat-top hex
                vx = cx + (hex_w * 0.52) * math.cos(angle)
                vy = cy + (hex_w * 0.52) * math.sin(angle)
                verts.append((vx, vy))
            cells.append((cx, cy, verts))

    return cells, hex_w


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
        cy_c, cx_c = height / 2, width / 2
        max_dist = math.sqrt(cx_c**2 + cy_c**2)
        for y_px in range(height):
            for x_px in range(0, width, 4):
                dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                grad_arr[y_px, x_px:min(x_px+4, width), 3] = dist * 0.3 * 255
    elif gradient_style == "linear-v":
        for y_px in range(height):
            grad_arr[y_px, :, 3] = abs(y_px / max(1, height-1) - 0.5) * 0.25 * 255
    elif gradient_style == "linear-h":
        for x_px in range(width):
            grad_arr[:, x_px, 3] = abs(x_px / max(1, width-1) - 0.5) * 0.25 * 255

    grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))

    img_arr = np.array(image, dtype=np.float32)
    g_arr = np.array(grad, dtype=np.float32)
    img_arr[:, :, :3] *= (1.0 - g_arr[:, :, 3:4] / 255.0)
    return Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_honeycomb_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    edge_visibility: float = 50.0,
    gradient: str = "none",
    secondary_accent: float = 0.0,
    impact_points: Optional[List[Tuple[float, float]]] = None,
    pattern_density: float = 50.0,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate honeycomb hexagonal grid background (no data line).

    Args:
        width:    Output image width in pixels.
        height:   Output image height in pixels.
        palette:  Colour dict with keys 'primary', 'secondary', 'accent',
                  'background'. Values are hex strings ('#RRGGBB').
        pattern_density: Pattern density 0-100 (50 = default).
                  Higher values = more/smaller hexagons.
                  Lower values = fewer/larger hexagons.
        scale:    Pattern size multiplier 0.1–2.0.
                  1.0 = default size.
                  < 1.0 = smaller pattern elements.
                  > 1.0 = larger pattern elements.
        rotation: Rotation in degrees (0–360) applied after generation.
        tile:     If True, generate at half size then tile 2×2.
        seed:     RNG seed for reproducibility.
        edge_visibility: 0-100, controls hex edge prominence.
        gradient: Gradient style: "none", "radial", "linear-v", "linear-h".
        secondary_accent: 0-100, blends secondary colour into some cells.
        impact_points: Optional list of (x_norm, y_norm) impact locations
                      for cracked cells. If None, all cells are intact.
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

        h, s_base, l_base = _rgb_to_hsl(*primary_rgb)
        sec_h, sec_s, sec_l = _rgb_to_hsl(*secondary_rgb)

        # --- Density from pattern_density param --------------------------------
        # pattern_density=50 → density~4000 (baseline)
        # Higher pattern_density = more/smaller hexagons
        density_factor = pattern_density / 50.0  # normalize to 1.0 at default
        base_density = 4000
        density = int(base_density * density_factor)
        density = max(400, min(8000, density))

        # Scale affects hex cell size independent of count (handled by hex grid)

        # --- Canvas setup ------------------------------------------------------
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGBA", (render_w, render_h), (*bg_colour, 255))
        draw = ImageDraw.Draw(image, "RGBA")

        # --- RNG ---------------------------------------------------------------
        r = rng_mod.Random(seed + 99)

        # --- Hex grid generation -----------------------------------------------
        cells, hex_w = _generate_hex_grid(render_w, render_h, density, seed, scale)

        # Edge styling
        edge_alpha = max(20, int(edge_visibility * 2.55))
        edge_l = 12 + edge_visibility * 0.2
        accent_t = secondary_accent / 100.0

        # --- Render each hexagonal cell ----------------------------------------
        for cx, cy, verts in cells:
            # Skip cells fully outside canvas
            if cx < -hex_w or cx > render_w + hex_w or cy < -hex_w or cy > render_h + hex_w:
                continue

            # Impact proximity — cells near goal/shot crack into triangles
            impact_dist = float("inf")
            if impact_points:
                for ix, iy in impact_points:
                    d = math.sqrt((cx / render_w - ix)**2 + (cy / render_h - iy)**2)
                    impact_dist = min(impact_dist, d)

            cracked = impact_dist < 0.12  # Cells within 12% of impact crack open
            impact_boost = max(0, (1.0 - impact_dist * 5)) * 10 if impact_points else 0

            cell_l = r.uniform(8, 22) + impact_boost
            cell_s = r.uniform(50, 88)
            use_sec = r.random() < accent_t * 0.3
            cell_h = sec_h if use_sec else h

            poly = [(int(v[0]), int(v[1])) for v in verts]

            if cracked and len(verts) == 6:
                # Split hex into 6 triangles from centre — cracked glass effect
                cxi, cyi = int(cx), int(cy)
                for ti in range(6):
                    v1 = poly[ti]
                    v2 = poly[(ti + 1) % 6]
                    tri_poly = [v1, v2, (cxi, cyi)]

                    # Each triangle gets slightly different shade
                    tri_l = min(40, cell_l + r.uniform(-4, 6))
                    tri_s = cell_s + r.uniform(-10, 10)
                    tri_rgb = _hsl_to_rgb(cell_h, max(30, tri_s), tri_l)
                    draw.polygon(tri_poly, fill=tri_rgb)

                    # Crack lines between triangles
                    crack_rgb = _hsl_to_rgb(h, 30, min(50, edge_l + 15))
                    draw.line([v1, (cxi, cyi)], fill=(*crack_rgb, min(255, edge_alpha + 40)), width=1)
            else:
                # Normal hex cell
                cell_rgb = _hsl_to_rgb(cell_h, cell_s, min(30, cell_l))
                draw.polygon(poly, fill=cell_rgb)

            # Hex edge outlines
            edge_rgb = _hsl_to_rgb(h, max(20, cell_s * 0.5), edge_l)
            draw.polygon(poly, outline=(*edge_rgb, edge_alpha))

        # --- Gradient overlay --------------------------------------------------
        image = _apply_gradient(image, gradient, render_w, render_h)

        # Convert to RGB
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
        fallback = Image.new("RGB", (width, height), (26, 10, 10))
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
