"""
Broken Glass Background Generator — Art Engine v2.0

Pure background generation: Delaunay triangulation with sharp angular shards.
Impact points (goals/shots) get denser, smaller fragments radiating outward.
Bold white/bright edge lines simulate glass fracture cracks.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random as rng_mod
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw
from scipy.spatial import Delaunay


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
# Delaunay triangulation with impact density
# ---------------------------------------------------------------------------

def _make_impact_delaunay(
    width: int,
    height: int,
    density: int,
    seed: int = 42,
    impact_points: Optional[List[Tuple[float, float]]] = None
) -> Tuple[Delaunay, np.ndarray]:
    """
    Delaunay triangulation with extra density near impact points.

    Impact points = goal/shot locations (normalised 0-1 coords).
    Creates smaller, denser shards near impacts — like glass cracking from force.

    Args:
        width, height: Canvas dimensions
        density: Base number of points
        seed: RNG seed
        impact_points: List of (x_norm, y_norm) impact locations

    Returns:
        (Delaunay object, points array)
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

    # Add extra density near impact points (goals/shots)
    if impact_points:
        extra_count = max(20, density // 4)
        for ix, iy in impact_points:
            px, py = ix * width, iy * height
            for _ in range(extra_count):
                # Radial distribution — denser near centre
                angle = rng.uniform(0, 2 * math.pi)
                dist = rng.exponential(scale=min(width, height) * 0.08)
                ex = px + math.cos(angle) * dist
                ey = py + math.sin(angle) * dist
                if -50 <= ex <= width + 50 and -50 <= ey <= height + 50:
                    points.append([ex, ey])

    points_arr = np.array(points)
    return Delaunay(points_arr), points_arr


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

def generate_broken_glass_background(
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
    Generate broken glass background (no data line).

    Args:
        width:    Output image width in pixels.
        height:   Output image height in pixels.
        palette:  Colour dict with keys 'primary', 'secondary', 'accent',
                  'background'. Values are hex strings ('#RRGGBB').
        pattern_density: Pattern density 0-100 (50 = default).
                  Higher values = more/smaller shards.
                  Lower values = fewer/larger shards.
        scale:    Pattern size multiplier 0.1–2.0.
                  1.0 = default size.
                  < 1.0 = smaller pattern elements.
                  > 1.0 = larger pattern elements.
        rotation: Rotation in degrees (0–360) applied after generation.
        tile:     If True, generate at half size then tile 2×2.
        seed:     RNG seed for reproducibility.
        edge_visibility: 0-100, controls crack line prominence.
        gradient: Gradient style: "none", "radial", "linear-v", "linear-h".
        secondary_accent: 0-100, blends secondary colour into some cells.
        impact_points: Optional list of (x_norm, y_norm) impact locations
                      for denser fractures. If None, uniform density.
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
        # Higher pattern_density = more/smaller shards
        density_factor = pattern_density / 50.0  # normalize to 1.0 at default
        base_density = 4000
        density = int(base_density * density_factor)
        density = max(400, min(8000, density))

        # Scale affects shard size independent of count (handled by Delaunay)

        # --- Canvas setup ------------------------------------------------------
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGBA", (render_w, render_h), (*bg_colour, 255))
        draw = ImageDraw.Draw(image, "RGBA")

        # --- RNG ---------------------------------------------------------------
        r = rng_mod.Random(seed + 99)

        # --- Delaunay generation -----------------------------------------------
        tri, pts = _make_impact_delaunay(
            render_w, render_h, density, seed, impact_points
        )

        # Cell colour ranges
        min_l, max_l = 8, 25
        min_s, max_s = 45, 90

        # Edge styling — broken glass has prominent bright crack lines
        edge_alpha = max(40, int(edge_visibility * 2.55))  # Minimum visible edges
        crack_l = min(45, 15 + edge_visibility * 0.3)  # Brighter edges = more visible cracks
        accent_t = secondary_accent / 100.0

        # --- Render each triangle ----------------------------------------------
        for simplex in tri.simplices:
            verts = pts[simplex]
            cx = np.mean(verts[:, 0])
            cy = np.mean(verts[:, 1])

            # Skip triangles far outside canvas
            if cx < -50 or cx > render_w + 50 or cy < -50 or cy > render_h + 50:
                continue

            # Proximity to impact → lighter, more saturated
            # (like light refracting through cracked glass)
            impact_boost = 0
            if impact_points:
                for ix, iy in impact_points:
                    dist = math.sqrt((cx / render_w - ix)**2 + (cy / render_h - iy)**2)
                    impact_boost = max(impact_boost, max(0, 1.0 - dist * 4) * 8)

            cell_l = r.uniform(min_l, max_l) + impact_boost
            cell_s = r.uniform(min_s, max_s)

            use_secondary = r.random() < accent_t * 0.3
            cell_h = sec_h if use_secondary else h

            cell_rgb = _hsl_to_rgb(cell_h, cell_s, min(35, cell_l))
            poly = [(int(v[0]), int(v[1])) for v in verts]

            # Fill triangle
            draw.polygon(poly, fill=cell_rgb)

            # Crack lines — bright, sharp edges
            crack_rgb = _hsl_to_rgb(h, max(20, cell_s * 0.5), crack_l)
            draw.polygon(poly, outline=(*crack_rgb, edge_alpha))

            # Double-draw edges for thickness on high visibility
            if edge_visibility > 50:
                draw.line(poly + [poly[0]], fill=(*crack_rgb, edge_alpha), width=2)

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
