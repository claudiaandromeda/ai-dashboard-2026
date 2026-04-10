"""
Jackson Style — violent drip painting, real Pollock energy.
Chaotic layered drips, gravity-pulled paint, Bezier curves, splatter pools,
thin connecting threads. The ball path is the main artery of paint flow;
everything else is chaos built around it.
"""

import math
import random
from typing import List, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from art_engine.styles.base import BaseStyle, Palette, DataLine


def _cubic_bezier(p0, p1, p2, p3, steps: int) -> List[Tuple[float, float]]:
    """Evaluate a cubic Bezier curve, returning `steps` points."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1.0 - t
        x = (u**3 * p0[0] + 3 * u**2 * t * p1[0] +
             3 * u * t**2 * p2[0] + t**3 * p3[0])
        y = (u**3 * p0[1] + 3 * u**2 * t * p1[1] +
             3 * u * t**2 * p2[1] + t**3 * p3[1])
        pts.append((x, y))
    return pts


def _perp(dx: float, dy: float) -> Tuple[float, float]:
    """Unit perpendicular vector."""
    length = math.hypot(dx, dy) or 1.0
    return (-dy / length, dx / length)


class JacksonStyle(BaseStyle):
    """Pollock-style drip painting. Violent, physical, emotional."""

    # --------------- helpers ---------------

    def _make_rng(self, data_lines: List[DataLine]) -> random.Random:
        seed = hash(tuple((dl.x, dl.y, dl.sequence) for dl in data_lines))
        return random.Random(seed)

    def _build_colours(self, palette: Palette):
        """Return (primary_rgba, secondary_rgba, black, accent) with full alpha,
        plus helpers for making translucent variants."""
        return {
            "primary": palette.rgb("primary"),
            "secondary": palette.rgb("secondary"),
            "accent": palette.rgb("accent"),
            "black": (20, 20, 20),
            "white_fleck": (220, 215, 200),
        }

    def _rgba(self, rgb: Tuple[int, int, int], alpha: int = 255) -> Tuple[int, ...]:
        return (*rgb, alpha)

    # --------------- Bezier drip generation ---------------

    def _bezier_drip(self, start: Tuple[float, float], end: Tuple[float, float],
                     rng: random.Random, chaos: float = 1.0,
                     gravity: float = 0.0) -> List[Tuple[float, float]]:
        """Generate a flowing Bezier drip between two points.
        `chaos` controls how wild the control points are.
        `gravity` biases the curve downward (simulates paint weight)."""
        dx = end[0] - start[0]
        dy = end[1] - start[1]
        dist = math.hypot(dx, dy) or 1.0
        spread = dist * 0.4 * chaos

        cp1 = (
            start[0] + dx * 0.33 + rng.uniform(-spread, spread),
            start[1] + dy * 0.33 + rng.uniform(-spread, spread) + gravity * dist * 0.15,
        )
        cp2 = (
            start[0] + dx * 0.66 + rng.uniform(-spread, spread),
            start[1] + dy * 0.66 + rng.uniform(-spread, spread) + gravity * dist * 0.25,
        )

        steps = max(20, int(dist / 3))
        return _cubic_bezier(start, cp1, cp2, end, steps)

    def _freeform_drip(self, origin: Tuple[float, float], rng: random.Random,
                       length: float, angle: float,
                       gravity: float = 1.0) -> List[Tuple[float, float]]:
        """Generate a free-form drip that flows from `origin` at `angle`,
        pulled downward by gravity."""
        end = (
            origin[0] + math.cos(angle) * length,
            origin[1] + math.sin(angle) * length + gravity * length * 0.4,
        )
        return self._bezier_drip(origin, end, rng, chaos=1.5, gravity=gravity)

    # --------------- variable-width stroke ---------------

    def _draw_variable_stroke(self, draw: ImageDraw.Draw, points: List[Tuple[float, float]],
                              color: Tuple[int, ...], base_width: float,
                              rng: random.Random, taper: bool = True):
        """Draw a stroke with variable width — thick pools, thin stretched paint."""
        n = len(points)
        if n < 2:
            return

        for i in range(n - 1):
            t = i / max(1, n - 2)
            # Width undulates: thicker at start/end (pooling), thinner in middle
            if taper:
                width_factor = 1.0 - 0.6 * math.sin(t * math.pi)
                width_factor *= rng.uniform(0.7, 1.3)
            else:
                width_factor = rng.uniform(0.6, 1.4)

            w = max(1, int(base_width * width_factor))
            p1 = (int(points[i][0]), int(points[i][1]))
            p2 = (int(points[i + 1][0]), int(points[i + 1][1]))
            draw.line([p1, p2], fill=color, width=w)

            # At thick points, draw a small circle for the paint-pool effect
            if w >= base_width * 1.1 and rng.random() < 0.3:
                r = w // 2 + 1
                draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=color)

    # --------------- splatter helpers ---------------

    def _splatter_dots(self, draw: ImageDraw.Draw, center: Tuple[float, float],
                       color: Tuple[int, ...], rng: random.Random,
                       count: int = 12, radius: float = 80.0):
        """Spray random paint dots around a center point."""
        for _ in range(count):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(5, radius) ** rng.uniform(0.6, 1.0)  # cluster near center
            x = center[0] + math.cos(angle) * dist
            y = center[1] + math.sin(angle) * dist
            r = rng.uniform(1, max(2, radius * 0.06))
            alpha = rng.randint(140, 255)
            c = (*color[:3], alpha) if len(color) < 4 else (*color[:3], alpha)
            draw.ellipse([int(x - r), int(y - r), int(x + r), int(y + r)], fill=c)

    def _thin_threads(self, draw: ImageDraw.Draw, start: Tuple[float, float],
                      rng: random.Random, color: Tuple[int, ...],
                      count: int = 4, max_len: float = 200):
        """Thin connecting threads — the web between drips."""
        for _ in range(count):
            angle = rng.uniform(0, 2 * math.pi)
            length = rng.uniform(40, max_len)
            pts = self._freeform_drip(start, rng, length, angle, gravity=rng.uniform(0.2, 1.0))
            alpha = rng.randint(80, 200)
            c = (*color[:3], alpha)
            self._draw_variable_stroke(draw, pts, c, base_width=rng.uniform(1, 2.5), rng=rng, taper=False)

    # =============== RENDER METHODS ===============

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Canvas fill from palette primary — the base colour IS the hoodie colour."""
        self._bg_density = 1.0
        if render_params:
            self._bg_density = max(0.1, render_params.get('bg_density', 4000) / 4000)

        bg = palette.rgb("primary")
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=bg)

        # Subtle grain — intensity scales with density
        _d = self._bg_density
        arr = np.array(image)
        rs = np.random.RandomState(42)
        noise = rs.randint(int(-6 * _d), max(1, int(6 * _d)), (self.HEIGHT, self.WIDTH), dtype=np.int16)
        for c in range(3):
            channel = arr[:, :, c].astype(np.int16) + noise
            arr[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)
        image.paste(Image.fromarray(arr))

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """The heart of the painting. Multiple layered passes of drip painting."""
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)
        self._edge_factor = _edge

        rng = self._make_rng(data_lines)
        colours = self._build_colours(palette)
        mapped = [self.map_point(dl.x, dl.y) for dl in data_lines]
        mapped_f = [(float(p[0]), float(p[1])) for p in mapped]

        # We paint in layers, back to front — just like Pollock worked.

        # ── LAYER 1: Background web of black connecting threads ──
        self._render_black_web(draw, mapped_f, colours, rng)

        # ── LAYER 2: Secondary colour drip passes (2-3 passes at varied angles) ──
        self._render_secondary_drips(draw, mapped_f, colours, rng)

        # ── LAYER 3: Primary colour — the MAIN ARTERY drip line ──
        self._render_main_artery(draw, mapped_f, colours, rng)

        # ── LAYER 4: Accent splatters and flicks ──
        self._render_accent_splatters(draw, mapped_f, colours, rng)

        # ── LAYER 5: Fine white flecks (paint dust) ──
        self._render_white_flecks(draw, mapped_f, colours, rng)

    def _render_black_web(self, draw: ImageDraw.Draw,
                          points: List[Tuple[float, float]],
                          colours: dict, rng: random.Random):
        """Layer 1: thin black threads connecting the painting — the web."""
        black = colours["black"]
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i + 1]
            mid = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
            # Threads from along each segment
            for _ in range(rng.randint(4, 8)):
                t = rng.uniform(0.0, 1.0)
                origin = (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
                offset = rng.uniform(-80, 80)
                origin = (origin[0] + offset, origin[1] + offset * 0.5)
                self._thin_threads(draw, origin, rng, black,
                                   count=rng.randint(1, 3), max_len=rng.uniform(100, 350))

        # Extra web threads across the whole canvas from random data points
        for pt in points:
            if rng.random() < 0.5:
                self._thin_threads(draw, pt, rng, black,
                                   count=rng.randint(2, 5), max_len=rng.uniform(150, 500))

    def _render_secondary_drips(self, draw: ImageDraw.Draw,
                                points: List[Tuple[float, float]],
                                colours: dict, rng: random.Random):
        """Layer 2: Secondary colour drip passes at oblique angles."""
        secondary = colours["secondary"]

        for pass_num in range(rng.randint(2, 3)):
            angle_bias = rng.uniform(-0.8, 0.8)
            for i in range(len(points) - 1):
                p1, p2 = points[i], points[i + 1]
                dist = math.hypot(p2[0] - p1[0], p2[1] - p1[1])

                # Offset the drip from the main path
                px, py = _perp(p2[0] - p1[0], p2[1] - p1[1])
                offset_mag = rng.uniform(30, 120) * (1 if pass_num % 2 == 0 else -1)
                start = (p1[0] + px * offset_mag, p1[1] + py * offset_mag)
                end = (p2[0] + px * offset_mag * 0.7, p2[1] + py * offset_mag * 0.7)

                drip = self._bezier_drip(start, end, rng, chaos=1.2,
                                         gravity=rng.uniform(0.3, 1.5))
                alpha = rng.randint(120, 230)
                c = self._rgba(secondary, alpha)
                w = rng.uniform(3, 10)
                self._draw_variable_stroke(draw, drip, c, base_width=w, rng=rng)

                # Splatter along this drip
                if rng.random() < 0.6:
                    mid_idx = len(drip) // 2
                    self._splatter_dots(draw, drip[mid_idx], secondary, rng,
                                        count=rng.randint(5, 15), radius=rng.uniform(30, 80))

    def _render_main_artery(self, draw: ImageDraw.Draw,
                            points: List[Tuple[float, float]],
                            colours: dict, rng: random.Random):
        """Layer 3: The THICKEST drip line — the main artery following the ball path.
        This is the dominant visual element."""
        primary = colours["primary"]

        # Build one continuous Bezier path through all data points
        all_pts: List[Tuple[float, float]] = []
        for i in range(len(points) - 1):
            drip = self._bezier_drip(points[i], points[i + 1], rng,
                                     chaos=0.6, gravity=0.3)
            if all_pts and drip:
                all_pts.extend(drip[1:])  # avoid duplicating junction points
            else:
                all_pts.extend(drip)

        # Draw the main artery with thick, variable width
        self._draw_variable_stroke(draw, all_pts, self._rgba(primary, 240),
                                   base_width=max(1, int(18 * self._edge_factor)), rng=rng, taper=True)

        # Paint pools at each data point (where the brush paused)
        for pt in points:
            pool_r = rng.randint(12, 28)
            alpha = rng.randint(180, 250)
            c = self._rgba(primary, alpha)
            draw.ellipse([int(pt[0] - pool_r), int(pt[1] - pool_r),
                          int(pt[0] + pool_r), int(pt[1] + pool_r)], fill=c)

        # Gravity drips hanging down from the main artery
        for i, pt in enumerate(all_pts):
            if rng.random() < 0.03:  # sparse gravity drips
                drip_len = rng.uniform(40, 180)
                angle = math.pi / 2 + rng.uniform(-0.2, 0.2)  # mostly downward
                drip = self._freeform_drip(pt, rng, drip_len, angle, gravity=1.5)
                alpha = rng.randint(150, 240)
                w = rng.uniform(2, 6)
                self._draw_variable_stroke(draw, drip, self._rgba(primary, alpha),
                                           base_width=w, rng=rng, taper=True)

        # Side flings — paint momentum flings sideways
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i + 1]
            seg_angle = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
            for _ in range(rng.randint(2, 5)):
                t = rng.uniform(0.1, 0.9)
                origin = (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
                fling_angle = seg_angle + rng.choice([-1, 1]) * (math.pi / 2 + rng.uniform(-0.5, 0.5))
                fling_len = rng.uniform(30, 150)
                drip = self._freeform_drip(origin, rng, fling_len, fling_angle, gravity=0.5)
                alpha = rng.randint(130, 220)
                w = rng.uniform(1.5, 5)
                self._draw_variable_stroke(draw, drip, self._rgba(primary, alpha),
                                           base_width=w, rng=rng, taper=True)

    def _render_accent_splatters(self, draw: ImageDraw.Draw,
                                 points: List[Tuple[float, float]],
                                 colours: dict, rng: random.Random):
        """Layer 4: Accent colour splatters — flicked and flung."""
        accent = colours["accent"]
        for pt in points:
            # Splatter bursts at each data point
            self._splatter_dots(draw, pt, accent, rng,
                                count=rng.randint(15, 35), radius=rng.uniform(60, 160))

        # Random splatters across the painting area
        for _ in range(rng.randint(8, 20)):
            rx = rng.uniform(self.WIDTH * 0.1, self.WIDTH * 0.9)
            ry = rng.uniform(self.HEIGHT * 0.1, self.HEIGHT * 0.9)
            self._splatter_dots(draw, (rx, ry), accent, rng,
                                count=rng.randint(5, 20), radius=rng.uniform(20, 60))

        # Short flung drips
        for _ in range(rng.randint(6, 15)):
            idx = rng.randint(0, len(points) - 1)
            origin = points[idx]
            angle = rng.uniform(0, 2 * math.pi)
            length = rng.uniform(40, 180)
            drip = self._freeform_drip(origin, rng, length, angle, gravity=rng.uniform(0, 1))
            alpha = rng.randint(160, 255)
            c = self._rgba(accent, alpha)
            self._draw_variable_stroke(draw, drip, c, base_width=rng.uniform(2, 6),
                                       rng=rng, taper=True)

    def _render_white_flecks(self, draw: ImageDraw.Draw,
                             points: List[Tuple[float, float]],
                             colours: dict, rng: random.Random):
        """Layer 5: Fine white/cream flecks — paint dust and dried spray."""
        fleck = colours["white_fleck"]
        for _ in range(rng.randint(40, 100)):
            rx = rng.uniform(self.WIDTH * 0.05, self.WIDTH * 0.95)
            ry = rng.uniform(self.HEIGHT * 0.05, self.HEIGHT * 0.95)
            r = rng.uniform(0.5, 3)
            alpha = rng.randint(60, 160)
            c = self._rgba(fleck, alpha)
            draw.ellipse([int(rx - r), int(ry - r), int(rx + r), int(ry + r)], fill=c)

    # =============== ACTORS ===============

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """Chaotic paint-ring splatters at actor positions — but organic, not geometric."""
        rng = self._make_rng(data_lines)
        colours = self._build_colours(palette)
        primary = colours["primary"]
        accent = colours["accent"]

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 20, pos[1] // 20)
            if key in seen:
                continue
            seen.add(key)

            is_key = (i == len(data_lines) - 1)
            color = primary if is_key else accent
            size = 35 if is_key else 18

            # Splattered ring — irregular paint flung in a rough circle
            fpos = (float(pos[0]), float(pos[1]))
            num_arcs = rng.randint(10, 22)
            for _ in range(num_arcs):
                angle = rng.uniform(0, 2 * math.pi)
                r = size + rng.uniform(-8, 8)
                x = fpos[0] + math.cos(angle) * r
                y = fpos[1] + math.sin(angle) * r
                dot_r = rng.uniform(2, 6)
                alpha = rng.randint(150, 255)
                c = self._rgba(color, alpha)
                draw.ellipse([int(x - dot_r), int(y - dot_r),
                              int(x + dot_r), int(y + dot_r)], fill=c)

            # Short drip hanging down from each actor position
            if rng.random() < 0.7:
                drip = self._freeform_drip(fpos, rng, rng.uniform(20, 60),
                                           math.pi / 2 + rng.uniform(-0.3, 0.3),
                                           gravity=1.2)
                self._draw_variable_stroke(draw, drip, self._rgba(color, 180),
                                           base_width=rng.uniform(1.5, 3.5), rng=rng)

    # =============== MOMENT MARKER ===============

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """Explosive splatter burst at the key moment — the climax of the painting."""
        if not data_lines:
            return

        key = data_lines[-1]
        pos = (float(self.map_x(key.x)), float(self.map_y(key.y)))
        rng = self._make_rng(data_lines)
        colours = self._build_colours(palette)
        primary = colours["primary"]
        secondary = colours["secondary"]
        accent = colours["accent"]
        all_colours = [primary, secondary, accent]

        # Large explosive splatter
        for _ in range(80):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(5, 180) ** rng.uniform(0.5, 1.0)
            x = pos[0] + math.cos(angle) * dist
            y = pos[1] + math.sin(angle) * dist
            r = rng.uniform(2, 14)
            color = all_colours[rng.randint(0, len(all_colours) - 1)]
            alpha = rng.randint(160, 255)
            c = self._rgba(color, alpha)
            draw.ellipse([int(x - r), int(y - r), int(x + r), int(y + r)], fill=c)

        # Flung drip lines radiating from the impact
        for _ in range(rng.randint(10, 20)):
            angle = rng.uniform(0, 2 * math.pi)
            length = rng.uniform(60, 250)
            drip = self._freeform_drip(pos, rng, length, angle, gravity=rng.uniform(0.3, 1.5))
            color = all_colours[rng.randint(0, len(all_colours) - 1)]
            alpha = rng.randint(140, 240)
            c = self._rgba(color, alpha)
            self._draw_variable_stroke(draw, drip, c,
                                       base_width=rng.uniform(3, 8), rng=rng, taper=True)

        # Central pool — thick paint blob at impact
        pool_r = rng.randint(18, 35)
        c = self._rgba(primary, 230)
        draw.ellipse([int(pos[0] - pool_r), int(pos[1] - pool_r),
                      int(pos[0] + pool_r), int(pos[1] + pool_r)], fill=c)

    # =============== POST PROCESSING ===============

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """Dark vignette and subtle blur for depth."""
        image = image.convert("RGBA")

        # Dark vignette — edges fade to black
        vignette = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)
        cx, cy = self.WIDTH // 2, self.HEIGHT // 2
        max_r = int(math.sqrt(cx * cx + cy * cy))
        for radius in range(max_r, max_r // 3, -4):
            progress = (radius - max_r // 3) / (max_r - max_r // 3)
            alpha = int(100 * progress)
            alpha = min(100, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(0, 0, 0, alpha)
            )

        image = Image.alpha_composite(image, vignette)

        # Very subtle blur to blend hard pixel edges (simulates paint bleed)
        image = image.filter(ImageFilter.GaussianBlur(radius=0.6))

        return image


# Alias so both names work
JacksonRenderer = JacksonStyle
