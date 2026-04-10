"""
Futuristic Style — Spiderweb

A radial spiderweb emanates from the goal point (final shot location).
Concentric rings widen from the centre like real spider silk.
Radial spokes connect rings to the centre.
The dataline (ball path) is a FLY caught in the web — silk distorts around it.
Silk threads are thin, slightly translucent, in the team primary colour.
Dewdrops: small bright dots at intersections, like morning dew catching light.
Background: pure black with a subtle radial glow from the web centre.
"""

import math
import random
from typing import List, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from art_engine.styles.base import BaseStyle, Palette, DataLine


class FuturisticStyle(BaseStyle):

    # ── web geometry helpers ─────────────────────────────────────────

    def _build_web(
        self,
        centre: Tuple[int, int],
        data_lines: List[DataLine],
        rng: random.Random,
    ) -> dict:
        """
        Build the full web geometry: spokes, rings, intersection grid,
        distortion from ball path, broken threads near impact.

        Returns a dict with:
          spokes     – list of angles (radians)
          rings      – list of radii (px)
          grid       – grid[ring_idx][spoke_idx] = (x, y) after distortion
          broken     – set of (ring_idx, spoke_idx) pairs for broken threads
          path_pts   – mapped ball-path points
        """
        cx, cy = centre
        num_spokes = rng.randint(18, 24)
        num_rings = rng.randint(14, 20)

        # Maximum radius — reach to the furthest canvas edge
        max_radius = int(math.sqrt(
            max(cx, self.WIDTH - cx) ** 2 + max(cy, self.HEIGHT - cy) ** 2
        ))

        # ── Spoke angles (irregular spacing) ─────────────────────────
        base_angles = [i * (2 * math.pi / num_spokes) for i in range(num_spokes)]
        spokes = [a + rng.uniform(-0.08, 0.08) for a in base_angles]
        spokes.sort()

        # ── Ring radii (logarithmic spacing — tight centre, wider outside) ──
        rings = []
        for i in range(1, num_rings + 1):
            t = i / num_rings
            # Log spacing: tight near centre, wider at edges
            r = int(max_radius * (math.log(1 + t * (math.e - 1))))
            # Add slight irregularity per ring
            r += rng.randint(-8, 8)
            rings.append(max(12, r))

        # ── Build ideal (undistorted) intersection grid ──────────────
        grid: List[List[Tuple[int, int]]] = []
        for ri, radius in enumerate(rings):
            ring_pts = []
            for si, angle in enumerate(spokes):
                # Per-intersection organic jitter
                jx = rng.randint(-4, 4)
                jy = rng.randint(-4, 4)
                x = cx + int(radius * math.cos(angle)) + jx
                y = cy + int(radius * math.sin(angle)) + jy
                ring_pts.append((x, y))
            grid.append(ring_pts)

        # ── Map the ball path ────────────────────────────────────────
        path_pts = [self.map_point(dl.x, dl.y) for dl in data_lines]

        # ── Distort web near the ball path ("fly caught in web") ─────
        distort_radius = 110  # px — how far the ball path influences silk
        distort_strength = 0.45  # 0-1, how much intersections pull toward path

        for ri in range(len(grid)):
            for si in range(len(grid[ri])):
                gx, gy = grid[ri][si]
                # Find closest point on the ball path
                min_dist = float("inf")
                closest_px, closest_py = gx, gy
                for pi in range(len(path_pts) - 1):
                    px, py = self._closest_point_on_segment(
                        gx, gy, path_pts[pi], path_pts[pi + 1]
                    )
                    d = math.sqrt((gx - px) ** 2 + (gy - py) ** 2)
                    if d < min_dist:
                        min_dist = d
                        closest_px, closest_py = px, py

                if min_dist < distort_radius:
                    # Pull toward the path — stronger when closer
                    factor = distort_strength * (1 - min_dist / distort_radius) ** 2
                    nx = int(gx + (closest_px - gx) * factor)
                    ny = int(gy + (closest_py - gy) * factor)
                    grid[ri][si] = (nx, ny)

        # ── Broken threads near impact point (final data_line) ───────
        broken = set()
        if path_pts:
            impact = path_pts[-1]
            break_radius = 60
            for ri in range(len(grid)):
                for si in range(len(grid[ri])):
                    gx, gy = grid[ri][si]
                    d = math.sqrt((gx - impact[0]) ** 2 + (gy - impact[1]) ** 2)
                    if d < break_radius and rng.random() < 0.45:
                        broken.add((ri, si))

        return {
            "spokes": spokes,
            "rings": rings,
            "grid": grid,
            "broken": broken,
            "path_pts": path_pts,
            "centre": centre,
        }

    @staticmethod
    def _closest_point_on_segment(
        px: int, py: int,
        a: Tuple[int, int], b: Tuple[int, int],
    ) -> Tuple[int, int]:
        """Return closest point on segment a→b to point (px, py)."""
        ax, ay = a
        bx, by = b
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return a
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return (int(ax + t * dx), int(ay + t * dy))

    # ── silk drawing ─────────────────────────────────────────────────

    def _silk_line(
        self,
        draw: ImageDraw.Draw,
        p1: Tuple[int, int],
        p2: Tuple[int, int],
        color: Tuple[int, int, int],
        alpha: int = 70,
        width: int = 1,
    ) -> None:
        """Draw a thin, slightly translucent silk thread."""
        r, g, b = color
        # Faint outer glow
        draw.line([p1, p2], fill=(r, g, b, max(1, alpha // 4)), width=width + 2)
        # Core silk
        draw.line([p1, p2], fill=(r, g, b, alpha), width=width)

    def _dewdrop(
        self,
        draw: ImageDraw.Draw,
        x: int, y: int,
        color: Tuple[int, int, int],
        rng: random.Random,
    ) -> None:
        """Draw a small bright dewdrop at an intersection."""
        r, g, b = color
        bright_r = min(255, r + 140)
        bright_g = min(255, g + 140)
        bright_b = min(255, b + 140)
        # Outer glow
        gr = rng.randint(4, 7)
        draw.ellipse(
            [x - gr, y - gr, x + gr, y + gr],
            fill=(bright_r, bright_g, bright_b, 25),
        )
        # Bright core
        cr = rng.randint(1, 3)
        draw.ellipse(
            [x - cr, y - cr, x + cr, y + cr],
            fill=(bright_r, bright_g, bright_b, 200),
        )
        # White hot pixel
        draw.point((x, y), fill=(255, 255, 255, 230))

    # ── background ───────────────────────────────────────────────────

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Background from palette primary with subtle radial glow from web centre."""
        self._bg_density = 1.0
        if render_params:
            self._bg_density = max(0.1, render_params.get('bg_density', 4000) / 4000)
        bg = palette.rgb("primary")
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=bg)

    # ── data lines (the web + the caught fly) ────────────────────────

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """
        Render the full spiderweb and the ball path as a fly caught in the web.
        """
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)
        _density = getattr(self, '_bg_density', 1.0)

        rng = random.Random(42)
        primary = palette.rgb("primary")
        accent = palette.rgb("accent")

        # Web centre = final shot location (the goal epicentre)
        final_dl = data_lines[-1]
        centre = self.map_point(final_dl.x, final_dl.y)

        web = self._build_web(centre, data_lines, rng)
        grid = web["grid"]
        spokes = web["spokes"]
        rings = web["rings"]
        broken = web["broken"]
        path_pts = web["path_pts"]
        cx, cy = centre

        # ── Radial glow from centre ──────────────────────────────────
        glow_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        glow_draw = ImageDraw.Draw(glow_layer)
        max_glow_r = int(350 * _density)
        for step in range(max_glow_r, 0, -5):
            alpha = max(1, int(18 * (1 - step / max_glow_r)))
            glow_draw.ellipse(
                [cx - step, cy - step, cx + step, cy + step],
                fill=(primary[0], primary[1], primary[2], alpha),
            )
        image.paste(Image.alpha_composite(image.convert("RGBA"), glow_layer), (0, 0))

        # ── Draw radial spokes (centre to outermost ring) ────────────
        spoke_alpha_base = int(55 * _density)
        for si, angle in enumerate(spokes):
            # Draw spoke as segments through each ring
            prev = (cx, cy)
            for ri in range(len(grid)):
                if (ri, si) in broken:
                    # Broken thread — draw a short dangling stub from previous point
                    gx, gy = grid[ri][si]
                    mid_x = (prev[0] + gx) // 2 + rng.randint(-6, 6)
                    mid_y = (prev[1] + gy) // 2 + rng.randint(-6, 6)
                    self._silk_line(draw, prev, (mid_x, mid_y), primary,
                                    alpha=spoke_alpha_base // 2, width=1)
                    prev = grid[ri][si]
                    continue
                pt = grid[ri][si]
                # Fade alpha with distance from centre
                dist = math.sqrt((pt[0] - cx) ** 2 + (pt[1] - cy) ** 2)
                max_dist = max(rings) if rings else 1
                fade = max(0.3, 1.0 - 0.5 * (dist / max_dist))
                alpha = int(spoke_alpha_base * fade)
                self._silk_line(draw, prev, pt, primary, alpha=alpha, width=1)
                prev = pt

        # ── Draw concentric rings (connecting intersections per ring) ─
        ring_alpha_base = 65
        for ri in range(len(grid)):
            for si in range(len(grid[ri])):
                next_si = (si + 1) % len(grid[ri])
                if (ri, si) in broken or (ri, next_si) in broken:
                    continue
                p1 = grid[ri][si]
                p2 = grid[ri][next_si]
                # Fade outer rings
                dist = rings[ri] if ri < len(rings) else 0
                max_dist = max(rings) if rings else 1
                fade = max(0.3, 1.0 - 0.4 * (dist / max_dist))
                alpha = int(ring_alpha_base * fade)
                self._silk_line(draw, p1, p2, primary, alpha=alpha, width=1)

        # ── Dewdrops at intersections (~30% of them) ─────────────────
        dew_rng = random.Random(123)
        for ri in range(len(grid)):
            for si in range(len(grid[ri])):
                if (ri, si) in broken:
                    continue
                if dew_rng.random() < 0.30:
                    gx, gy = grid[ri][si]
                    self._dewdrop(draw, gx, gy, primary, dew_rng)

        # ── Ball path — the fly caught in the web ────────────────────
        self._draw_fly_path(draw, path_pts, palette, rng)

    def _draw_fly_path(
        self,
        draw: ImageDraw.Draw,
        path_pts: List[Tuple[int, int]],
        palette: Palette,
        rng: random.Random,
    ) -> None:
        """Draw the ball path as a trapped fly — sticky, distorted silk wrapping."""
        if len(path_pts) < 2:
            return

        accent = palette.rgb("accent")
        secondary = palette.rgb("secondary")

        # Main path — thicker, brighter, slightly different colour
        for i in range(len(path_pts) - 1):
            p1, p2 = path_pts[i], path_pts[i + 1]
            progress = i / max(1, len(path_pts) - 2)
            # Colour shift from secondary → accent along path
            r = int(secondary[0] + (accent[0] - secondary[0]) * progress)
            g = int(secondary[1] + (accent[1] - secondary[1]) * progress)
            b = int(secondary[2] + (accent[2] - secondary[2]) * progress)
            # Glow
            draw.line([p1, p2], fill=(r, g, b, 20), width=max(1, int(12 * _edge)))
            draw.line([p1, p2], fill=(r, g, b, 50), width=max(1, int(6 * _edge)))
            # Core
            draw.line([p1, p2], fill=(r, g, b, 180), width=max(1, int(2 * _edge)))
            # Bright centre
            bright = (min(255, r + 100), min(255, g + 100), min(255, b + 100))
            draw.line([p1, p2], fill=(*bright, 140), width=1)

        # Sticky wrapping threads — short silk strands attaching path to nearby web
        for i in range(len(path_pts)):
            px, py = path_pts[i]
            for _ in range(rng.randint(1, 3)):
                angle = rng.uniform(0, 2 * math.pi)
                length = rng.randint(12, 40)
                ex = px + int(math.cos(angle) * length)
                ey = py + int(math.sin(angle) * length)
                self._silk_line(draw, (px, py), (ex, ey),
                                accent, alpha=35, width=1)

    # ── actors ───────────────────────────────────────────────────────

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """
        Small web-node markers for actors — caught in the web like wrapped insects.
        """
        rng = random.Random(77)
        primary = palette.rgb("primary")
        accent = palette.rgb("accent")

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 20, pos[1] // 20)
            if key in seen:
                continue
            seen.add(key)

            is_final = (i == len(data_lines) - 1)
            color = accent if is_final else primary

            if is_final:
                # Impact point — wrapped prey, larger
                r, g, b = color
                # Tangled silk wrap
                for _ in range(8):
                    angle = rng.uniform(0, 2 * math.pi)
                    length = rng.randint(8, 22)
                    ex = pos[0] + int(math.cos(angle) * length)
                    ey = pos[1] + int(math.sin(angle) * length)
                    self._silk_line(draw, pos, (ex, ey), color, alpha=80, width=1)
                # Bright centre
                bright = (min(255, r + 160), min(255, g + 160), min(255, b + 160))
                draw.ellipse(
                    [pos[0] - 4, pos[1] - 4, pos[0] + 4, pos[1] + 4],
                    fill=(*bright, 230),
                )
            else:
                # Small silk-node marker
                r, g, b = color
                dot_r = 2
                draw.ellipse(
                    [pos[0] - dot_r, pos[1] - dot_r,
                     pos[0] + dot_r, pos[1] + dot_r],
                    fill=(r, g, b, 120),
                )
                # Tiny cross
                draw.line([(pos[0] - 4, pos[1]), (pos[0] + 4, pos[1])],
                          fill=(r, g, b, 60), width=1)
                draw.line([(pos[0], pos[1] - 4), (pos[0], pos[1] + 4)],
                          fill=(r, g, b, 60), width=1)

    # ── moment marker ────────────────────────────────────────────────

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """
        Impact burst at the goal epicentre — shattered web threads, bright flash.
        """
        if not data_lines:
            return

        rng = random.Random(999)
        key_dl = data_lines[-1]
        pos = self.map_point(key_dl.x, key_dl.y)
        primary = palette.rgb("primary")
        accent = palette.rgb("accent")
        px, py = pos

        # ── Shattered silk — radial burst lines ──
        num_shatter = rng.randint(12, 20)
        for _ in range(num_shatter):
            angle = rng.uniform(0, 2 * math.pi)
            inner_r = rng.randint(5, 15)
            outer_r = rng.randint(30, 80)
            p1 = (px + int(math.cos(angle) * inner_r),
                  py + int(math.sin(angle) * inner_r))
            p2 = (px + int(math.cos(angle) * outer_r),
                  py + int(math.sin(angle) * outer_r))
            alpha = rng.randint(50, 140)
            self._silk_line(draw, p1, p2, primary, alpha=alpha, width=1)

        # ── Bright flash at epicentre ──
        bright = (min(255, primary[0] + 180),
                  min(255, primary[1] + 180),
                  min(255, primary[2] + 180))
        for r in [16, 10, 6, 3]:
            a = int(60 + (16 - r) * 12)
            draw.ellipse(
                [px - r, py - r, px + r, py + r],
                fill=(*bright, a),
            )

        # White-hot centre
        draw.ellipse(
            [px - 2, py - 2, px + 2, py + 2],
            fill=(255, 255, 255, 250),
        )

        # ── Concentric shockwave rings (broken/fading) ──
        for ring_r in range(20, 100, 15):
            a = max(10, int(80 * (1 - ring_r / 100)))
            # Draw as dashed arc for organic feel
            segments = rng.randint(4, 8)
            arc_len = 360 // segments - rng.randint(5, 20)
            offset = rng.randint(0, 30)
            for s in range(segments):
                start = offset + s * (360 // segments)
                draw.arc(
                    [px - ring_r, py - ring_r, px + ring_r, py + ring_r],
                    start, start + arc_len,
                    fill=(accent[0], accent[1], accent[2], a),
                    width=1,
                )

    # ── post-process ─────────────────────────────────────────────────

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """
        Subtle bloom for silk glow + very light vignette.
        No scanlines or digital noise — this is organic, not digital.
        """
        # ── Bloom: soft glow diffusion ──
        glow = image.copy().filter(ImageFilter.GaussianBlur(radius=6))
        image = ImageChops.add(image, glow, scale=3, offset=0)

        # ── Subtle vignette (darken edges) ──
        arr = np.array(image)
        h, w = arr.shape[:2]
        cy, cx = h / 2, w / 2
        max_r = math.sqrt(cx ** 2 + cy ** 2)

        Y, X = np.ogrid[:h, :w]
        dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
        vignette = np.clip(1.0 - 0.35 * (dist / max_r) ** 2, 0.4, 1.0).astype(np.float32)

        for c in range(min(arr.shape[2], 3)):
            arr[:, :, c] = np.clip(
                arr[:, :, c].astype(np.float32) * vignette,
                0, 255,
            ).astype(np.uint8)

        return Image.fromarray(arr)
