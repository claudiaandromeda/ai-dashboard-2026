"""
Geometric Style — Voronoi tessellation with crystal-shatter ball path.
Inspired by: Islamic geometric patterns, stained glass windows, Voronoi diagrams.
Uses: Voronoi cells filled with team colours, ball path shatters the crystal lattice.
"""

import math
import random
from typing import List, Tuple, Optional, Set
from PIL import Image, ImageDraw
from art_engine.styles.base import BaseStyle, Palette, DataLine


# ---------------------------------------------------------------------------
# Lightweight Voronoi via brute-force nearest-seed (no scipy dependency)
# ---------------------------------------------------------------------------

def _voronoi_cells(
    seeds: List[Tuple[float, float]],
    width: int,
    height: int,
    step: int = 4,
) -> dict[int, list[Tuple[int, int]]]:
    """
    Build Voronoi cells by scanning pixels at *step* resolution.
    Returns {seed_index: [(x, y), ...]}.
    """
    cells: dict[int, list[Tuple[int, int]]] = {i: [] for i in range(len(seeds))}
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


def _cell_polygon(pixels: list[Tuple[int, int]], step: int = 4) -> list[Tuple[int, int]]:
    """
    Compute the convex hull of a set of pixel coordinates (Graham scan).
    Returns ordered polygon vertices.
    """
    if len(pixels) < 3:
        return pixels

    # Find bottom-most (then left-most) point
    start = min(pixels, key=lambda p: (p[1], p[0]))

    def polar_angle(p: Tuple[int, int]) -> float:
        return math.atan2(p[1] - start[1], p[0] - start[0])

    def cross(o: Tuple[int, int], a: Tuple[int, int], b: Tuple[int, int]) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    sorted_pts = sorted(pixels, key=lambda p: (polar_angle(p), (p[0] - start[0]) ** 2 + (p[1] - start[1]) ** 2))

    hull: list[Tuple[int, int]] = []
    for pt in sorted_pts:
        while len(hull) >= 2 and cross(hull[-2], hull[-1], pt) <= 0:
            hull.pop()
        hull.append(pt)
    return hull


def _point_to_segment_dist_sq(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float,
) -> float:
    """Squared distance from point (px,py) to segment (ax,ay)-(bx,by)."""
    dx, dy = bx - ax, by - ay
    len_sq = dx * dx + dy * dy
    if len_sq == 0:
        return (px - ax) ** 2 + (py - ay) ** 2
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / len_sq))
    proj_x = ax + t * dx
    proj_y = ay + t * dy
    return (px - proj_x) ** 2 + (py - proj_y) ** 2


# ---------------------------------------------------------------------------
# Style implementation
# ---------------------------------------------------------------------------

class GeometricStyle(BaseStyle):

    # How close a seed must be to the ball path to be "shattered" (px)
    _SHATTER_RADIUS = 70

    def _build_voronoi(
        self, data_lines: List[DataLine]
    ) -> Tuple[
        List[Tuple[float, float]],          # seeds
        dict[int, list[Tuple[int, int]]],    # cells (pixel sets)
        Set[int],                            # shattered cell indices
        List[Tuple[int, int]],               # ball path in px
    ]:
        """Generate seeds, Voronoi cells, and determine which cells are shattered."""
        rng = random.Random(77)

        # --- ball path in pixel coords ---
        path_px: List[Tuple[int, int]] = []
        for dl in data_lines:
            path_px.append(self.map_point(dl.x, dl.y))

        # --- seed points ---
        seeds: List[Tuple[float, float]] = []

        # 1. Jittered grid for even coverage
        cols, rows = 14, 14
        for r in range(rows):
            for c in range(cols):
                bx = (c + 0.5) / cols * self.WIDTH
                by = (r + 0.5) / rows * self.HEIGHT
                jx = rng.uniform(-self.WIDTH / cols * 0.38, self.WIDTH / cols * 0.38)
                jy = rng.uniform(-self.HEIGHT / rows * 0.38, self.HEIGHT / rows * 0.38)
                seeds.append((bx + jx, by + jy))

        # 2. Extra seeds along the ball path for finer tessellation near the action
        for i in range(len(path_px) - 1):
            x0, y0 = path_px[i]
            x1, y1 = path_px[i + 1]
            seg_len = math.hypot(x1 - x0, y1 - y0)
            num_extra = max(2, int(seg_len / 50))
            for t in range(1, num_extra):
                frac = t / num_extra
                mx = x0 + (x1 - x0) * frac + rng.uniform(-18, 18)
                my = y0 + (y1 - y0) * frac + rng.uniform(-18, 18)
                seeds.append((mx, my))

        # 3. Extra seeds around key moment (final point) for denser fracture
        if path_px:
            kx, ky = path_px[-1]
            for _ in range(20):
                angle = rng.uniform(0, 2 * math.pi)
                radius = rng.uniform(15, 100)
                seeds.append((kx + math.cos(angle) * radius, ky + math.sin(angle) * radius))

        # --- build cells ---
        cells = _voronoi_cells(seeds, self.WIDTH, self.HEIGHT, step=4)

        # --- determine shattered cells ---
        shattered: Set[int] = set()
        r_sq = self._SHATTER_RADIUS ** 2
        for idx, (sx, sy) in enumerate(seeds):
            for seg_i in range(len(path_px) - 1):
                ax, ay = path_px[seg_i]
                bx, by = path_px[seg_i + 1]
                if _point_to_segment_dist_sq(sx, sy, ax, ay, bx, by) < r_sq:
                    shattered.add(idx)
                    break

        return seeds, cells, shattered, path_px

    # ------------------------------------------------------------------
    # Rendering layers
    # ------------------------------------------------------------------

    def render_background(
        self, draw: ImageDraw.Draw, image: Image.Image, palette: Palette,
        render_params: dict = None,
    ) -> None:
        """Voronoi tessellation — stained-glass background."""
        _density = 1.0
        if render_params:
            _density = max(0.1, render_params.get('bg_density', 4000) / 4000)
        bg = palette.rgb("background")
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=bg)
        # Actual tessellation is drawn in render_data_lines (needs data_lines context).
        # We store nothing here; the background is a solid dark fill that will
        # be overlaid by the tessellation layer.

    def render_data_lines(
        self,
        draw: ImageDraw.Draw,
        image: Image.Image,
        data_lines: List[DataLine],
        palette: Palette,
        render_params: dict = None,
    ) -> None:
        """
        Full Voronoi tessellation + crystal-shatter ball path.
        This is the primary visual — it draws all cells AND the path.
        """
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        seeds, cells, shattered, path_px = self._build_voronoi(data_lines)

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        accent = palette.rgb("accent")
        bg = palette.rgb("background")

        rng = random.Random(99)

        # --- create overlay for alpha compositing ---
        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        # --- draw each cell ---
        for idx in range(len(seeds)):
            pixels = cells.get(idx, [])
            if len(pixels) < 3:
                continue

            hull = _cell_polygon(pixels, step=4)
            if len(hull) < 3:
                continue

            is_shattered = idx in shattered

            if is_shattered:
                # Shattered cells: bright accent fill, higher opacity
                alpha = rng.randint(140, 220)
                fill_color = (accent[0], accent[1], accent[2], alpha)
                outline_color = (255, 255, 255, 220)
            else:
                # Normal cells: team colour at low-mid opacity
                base = primary if rng.random() < 0.6 else secondary
                alpha = rng.randint(25, 90)
                fill_color = (base[0], base[1], base[2], alpha)
                outline_color = (255, 255, 255, 40)

            odraw.polygon(hull, fill=fill_color, outline=outline_color)

        # --- thin white grid lines between all cells (redraw outlines for crisp edges) ---
        for idx in range(len(seeds)):
            pixels = cells.get(idx, [])
            if len(pixels) < 3:
                continue
            hull = _cell_polygon(pixels, step=4)
            if len(hull) < 3:
                continue
            is_shattered = idx in shattered
            line_alpha = 200 if is_shattered else 35
            line_color = (255, 255, 255, line_alpha)
            # Draw edges
            for i in range(len(hull)):
                p1 = hull[i]
                p2 = hull[(i + 1) % len(hull)]
                odraw.line([p1, p2], fill=line_color, width=1)

        # --- composite tessellation onto main image ---
        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

        # --- draw ball path (the "crack through crystal") ---
        # Glow layer first
        glow_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow_layer)
        for w, a in [(max(1, int(14 * _edge)), 25), (max(1, int(10 * _edge)), 45), (max(1, int(6 * _edge)), 70)]:
            glow_col = (accent[0], accent[1], accent[2], a)
            for i in range(len(path_px) - 1):
                gdraw.line([path_px[i], path_px[i + 1]], fill=glow_col, width=w)
        image.paste(Image.alpha_composite(image.convert("RGBA"), glow_layer), (0, 0))

        # Sharp path line on top
        top_draw = ImageDraw.Draw(image)
        for i in range(len(path_px) - 1):
            progress = i / max(1, len(path_px) - 2)
            # White core that brightens toward the end
            core_alpha = int(180 + 75 * progress)
            core_alpha = min(255, core_alpha)
            top_draw.line(
                [path_px[i], path_px[i + 1]],
                fill=(255, 255, 255, core_alpha),
                width=max(1, int(3 * _edge)),
            )

    def render_actors(
        self,
        draw: ImageDraw.Draw,
        image: Image.Image,
        data_lines: List[DataLine],
        palette: Palette,
    ) -> None:
        """Small diamond markers at each event node — geometric, sharp."""
        if not data_lines:
            return

        accent = palette.rgb("accent")
        primary = palette.rgb("primary")

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 12, pos[1] // 12)
            if key in seen:
                continue
            seen.add(key)

            is_final = i == len(data_lines) - 1
            sz = 10 if not is_final else 18
            color = accent if is_final else primary

            # Rotated square (diamond)
            diamond = [
                (pos[0], pos[1] - sz),
                (pos[0] + sz, pos[1]),
                (pos[0], pos[1] + sz),
                (pos[0] - sz, pos[1]),
            ]
            odraw.polygon(diamond, fill=(*color, 220), outline=(255, 255, 255, 240))

            # Inner diamond for final moment
            if is_final:
                inner_sz = int(sz * 0.5)
                inner = [
                    (pos[0], pos[1] - inner_sz),
                    (pos[0] + inner_sz, pos[1]),
                    (pos[0], pos[1] + inner_sz),
                    (pos[0] - inner_sz, pos[1]),
                ]
                odraw.polygon(inner, fill=(255, 255, 255, 255))

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    def render_moment_marker(
        self,
        draw: ImageDraw.Draw,
        image: Image.Image,
        data_lines: List[DataLine],
        palette: Palette,
    ) -> None:
        """Radiating geometric fracture lines from the key moment — crystal shatter burst."""
        if not data_lines:
            return

        key = data_lines[-1]
        pos = self.map_point(key.x, key.y)
        accent = palette.rgb("accent")

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        rng = random.Random(33)
        num_rays = 24
        for r in range(num_rays):
            angle = (2 * math.pi * r) / num_rays + rng.uniform(-0.06, 0.06)
            inner_r = 22
            outer_r = rng.randint(60, 160)

            x1 = pos[0] + int(math.cos(angle) * inner_r)
            y1 = pos[1] + int(math.sin(angle) * inner_r)
            x2 = pos[0] + int(math.cos(angle) * outer_r)
            y2 = pos[1] + int(math.sin(angle) * outer_r)

            alpha = rng.randint(120, 220)
            odraw.line(
                [(x1, y1), (x2, y2)],
                fill=(accent[0], accent[1], accent[2], alpha),
                width=2,
            )

            # Small tick at the end of each ray
            perp = angle + math.pi / 2
            tick = rng.randint(6, 14)
            t1 = (x2 + int(math.cos(perp) * tick), y2 + int(math.sin(perp) * tick))
            t2 = (x2 - int(math.cos(perp) * tick), y2 - int(math.sin(perp) * tick))
            odraw.line([t1, t2], fill=(255, 255, 255, alpha), width=1)

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """Subtle corner vignette — no blur, keep edges sharp."""
        vignette = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)

        cx, cy = self.WIDTH // 2, self.HEIGHT // 2
        max_r = int(math.hypot(cx, cy))
        # Only darken the outer 40% — keep the tessellation crisp in the centre
        fade_start = int(max_r * 0.6)
        for radius in range(max_r, fade_start, -3):
            alpha = int(100 * ((radius - fade_start) / (max_r - fade_start)))
            alpha = min(100, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(0, 0, 0, alpha),
            )

        image = Image.alpha_composite(image.convert("RGBA"), vignette)
        return image
