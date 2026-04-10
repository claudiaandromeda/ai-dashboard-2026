"""
Geometric Background Generator — Art Engine v2.0

Pure background generation: Voronoi tessellation with crystal-lattice
aesthetics in team colours. Inspired by Islamic geometric patterns and
stained-glass windows.

No data line, path, or event marker rendering — pure pattern only.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import List, Optional, Set, Tuple

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


def _darken(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (int(c[0] * (1 - f)), int(c[1] * (1 - f)), int(c[2] * (1 - f)))


def _lighten(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (
        min(255, int(c[0] + (255 - c[0]) * f)),
        min(255, int(c[1] + (255 - c[1]) * f)),
        min(255, int(c[2] + (255 - c[2]) * f)),
    )


def _blend(
    c1: Tuple[int, int, int], c2: Tuple[int, int, int], t: float
) -> Tuple[int, int, int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


# ---------------------------------------------------------------------------
# Lightweight Voronoi via brute-force nearest-seed (no scipy dependency)
# ---------------------------------------------------------------------------

def _voronoi_cells(
    seeds: List[Tuple[float, float]],
    width: int,
    height: int,
    step: int = 4,
) -> dict:
    """
    Build Voronoi cells by scanning pixels at *step* resolution.
    Returns {seed_index: [(x, y), ...]}.
    """
    cells: dict = {i: [] for i in range(len(seeds))}
    for py in range(0, height, step):
        for px in range(0, width, step):
            best_idx = 0
            best_dist = float("inf")
            for idx, (sx, sy) in enumerate(seeds):
                d = (px - sx) ** 2 + (py - sy) ** 2
                if d < best_dist:
                    best_dist = d
                    best_idx = idx
            cells[best_idx].append((px, py))
    return cells


def _cell_polygon(
    pixels: List[Tuple[int, int]], step: int = 4
) -> List[Tuple[int, int]]:
    """
    Compute the convex hull of a set of pixel coordinates (Graham scan).
    Returns ordered polygon vertices.
    """
    if len(pixels) < 3:
        return pixels

    start = min(pixels, key=lambda p: (p[1], p[0]))

    def polar_angle(p: Tuple[int, int]) -> float:
        return math.atan2(p[1] - start[1], p[0] - start[0])

    def cross(
        o: Tuple[int, int], a: Tuple[int, int], b: Tuple[int, int]
    ) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    sorted_pts = sorted(
        pixels,
        key=lambda p: (
            polar_angle(p),
            (p[0] - start[0]) ** 2 + (p[1] - start[1]) ** 2,
        ),
    )

    hull: List[Tuple[int, int]] = []
    for pt in sorted_pts:
        while len(hull) >= 2 and cross(hull[-2], hull[-1], pt) <= 0:
            hull.pop()
        hull.append(pt)
    return hull


# ---------------------------------------------------------------------------
# Tessellation rendering
# ---------------------------------------------------------------------------

def _build_seeds(
    width: int,
    height: int,
    cols: int,
    rows: int,
    rng: random.Random,
    cluster_count: int = 0,
) -> List[Tuple[float, float]]:
    """
    Generate jittered grid seeds for Voronoi tessellation.

    Args:
        width, height: Canvas dimensions.
        cols, rows:    Grid dimensions — higher values = more, smaller cells.
        rng:           Seeded RNG for reproducibility.
        cluster_count: Extra random accent clusters for visual interest.
    """
    seeds: List[Tuple[float, float]] = []

    # Jittered grid — evenly covers the canvas
    for r in range(rows):
        for c in range(cols):
            bx = (c + 0.5) / cols * width
            by = (r + 0.5) / rows * height
            jx = rng.uniform(-width / cols * 0.38, width / cols * 0.38)
            jy = rng.uniform(-height / rows * 0.38, height / rows * 0.38)
            seeds.append((bx + jx, by + jy))

    # Optional accent clusters — denser local patches for visual variety
    for _ in range(cluster_count):
        cx = rng.uniform(0, width)
        cy = rng.uniform(0, height)
        for _ in range(8):
            angle = rng.uniform(0, 2 * math.pi)
            r = rng.uniform(20, min(width, height) * 0.12)
            seeds.append((
                cx + math.cos(angle) * r,
                cy + math.sin(angle) * r,
            ))

    return seeds


def _render_tessellation(
    image: Image.Image,
    seeds: List[Tuple[float, float]],
    cells: dict,
    primary: Tuple[int, int, int],
    secondary: Tuple[int, int, int],
    accent: Tuple[int, int, int],
    rng: random.Random,
) -> None:
    """
    Draw all Voronoi cells with team-colour fill and white grid edges.
    Uses alpha compositing for a stained-glass aesthetic.
    """
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    # --- fill pass ---
    for idx in range(len(seeds)):
        pixels = cells.get(idx, [])
        if len(pixels) < 3:
            continue
        hull = _cell_polygon(pixels)
        if len(hull) < 3:
            continue

        r = rng.random()
        alpha = rng.randint(30, 100)

        if r < 0.55:
            base = primary
        elif r < 0.85:
            base = secondary
        else:
            # Occasional accent cell for highlights
            base = accent
            alpha = rng.randint(50, 140)

        # Slight per-cell lightness variation — keeps pattern from looking flat
        variation = rng.uniform(-0.12, 0.12)
        if variation > 0:
            cell_colour = _lighten(base, variation)
        else:
            cell_colour = _darken(base, -variation)

        odraw.polygon(hull, fill=(*cell_colour, alpha))

    # --- edge pass — thin white grid lines for crystal-lattice look ---
    for idx in range(len(seeds)):
        pixels = cells.get(idx, [])
        if len(pixels) < 3:
            continue
        hull = _cell_polygon(pixels)
        if len(hull) < 3:
            continue

        # Cells at canvas border get slightly brighter edges for definition
        is_edge = any(
            x <= 4 or x >= image.width - 4 or y <= 4 or y >= image.height - 4
            for x, y in hull
        )
        edge_alpha = 50 if is_edge else 35
        line_colour = (255, 255, 255, edge_alpha)

        for i in range(len(hull)):
            odraw.line([hull[i], hull[(i + 1) % len(hull)]], fill=line_colour, width=1)

    # Composite tessellation onto the base image
    image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))


# ---------------------------------------------------------------------------
# Tiling helpers
# ---------------------------------------------------------------------------

def _tile_image(
    img: Image.Image, target_width: int, target_height: int, tile_factor: int = 2
) -> Image.Image:
    """Shrink *img* then tile it to fill target dimensions."""
    tile_w = max(64, target_width // tile_factor)
    tile_h = max(64, target_height // tile_factor)
    tile = img.resize((tile_w, tile_h), Image.LANCZOS)

    result = Image.new("RGB", (target_width, target_height))
    for ty in range(0, target_height, tile_h):
        for tx in range(0, target_width, tile_w):
            result.paste(tile, (tx, ty))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_geometric_background(
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
    Generate a Voronoi tessellation background (no data line).

    Args:
        width:    Output image width in pixels.
        height:   Output image height in pixels.
        palette:  Colour dict with keys 'primary', 'secondary', 'accent',
                  'background'. Values are hex strings ('#RRGGBB').
        scale:    Pattern density 0.1–2.0.
                    1.0 = default grid (14×14 seeds).
                    < 1.0 = denser / smaller cells.
                    > 1.0 = sparser / larger cells.
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
        # --- Resolve colours -----------------------------------------------
        primary_hex = palette.get("primary", "#1A3A6B")
        secondary_hex = palette.get("secondary", "#4A7AB5")
        accent_hex = palette.get("accent", "#E8C84A")
        bg_hex = palette.get("background", "#0A0E1A")

        primary = _hex_to_rgb(primary_hex)
        secondary = _hex_to_rgb(secondary_hex)
        accent = _hex_to_rgb(accent_hex)
        bg_colour = _hex_to_rgb(bg_hex)

        # --- Scale → grid dimensions ----------------------------------------
        # scale=1.0 → 14×14 seeds (baseline)
        # scale=2.0 → ~10×10  (larger cells, sparser)
        # scale=0.5 → ~20×20  (smaller cells, denser)
        base_grid = 14
        effective_grid = max(4, int(round(base_grid / max(0.1, scale))))
        cols = effective_grid
        rows = max(4, int(round(effective_grid * height / width)))

        # Accent clusters: more at default/low scale (denser patterns look richer)
        cluster_count = max(0, int(3 / max(0.1, scale)))

        # --- Canvas setup --------------------------------------------------
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGB", (render_w, render_h))
        draw = ImageDraw.Draw(image)

        # --- RNG -----------------------------------------------------------
        rng = random.Random(seed)

        # --- Base fill -----------------------------------------------------
        draw.rectangle([0, 0, render_w - 1, render_h - 1], fill=bg_colour)

        # --- Voronoi -------------------------------------------------------
        seeds = _build_seeds(
            render_w, render_h, cols, rows, rng, cluster_count=cluster_count
        )
        cells = _voronoi_cells(seeds, render_w, render_h, step=4)

        _render_tessellation(image, seeds, cells, primary, secondary, accent, rng)

        # --- Subtle vignette (no blur — keep edges sharp) -------------------
        vignette = Image.new("RGBA", (render_w, render_h), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)
        cx, cy = render_w // 2, render_h // 2
        max_r = int(math.hypot(cx, cy))
        fade_start = int(max_r * 0.6)
        for radius in range(max_r, fade_start, -3):
            alpha = int(90 * ((radius - fade_start) / (max_r - fade_start)))
            alpha = min(90, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(0, 0, 0, alpha),
            )
        image = Image.alpha_composite(image.convert("RGBA"), vignette).convert("RGB")

        # --- Tile (if requested) -------------------------------------------
        if tile:
            image = _tile_image(image, width, height, tile_factor=2)

        # --- Rotation ------------------------------------------------------
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

    except Exception as exc:  # graceful fallback — never crash the pipeline
        fallback = Image.new("RGB", (width, height), (10, 14, 26))
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "error": str(exc),
        }
        return fallback, metadata
