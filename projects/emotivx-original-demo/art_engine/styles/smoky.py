"""
Smoky Style — ethereal coloured smoke billowing through darkness.

Inspired by: coloured smoke in a dark room lit by lasers, nightclub fog
machines, tracer rounds in slow motion. Smoke follows the ball path,
expanding and dissipating outward. Thousands of scattered particles blur
into layered clouds. Hotspots at direction changes. Soft alpha fadeout
into black at edges.
"""

import math
import random
from typing import List, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from art_engine.styles.base import BaseStyle, Palette, DataLine


class SmokyStyle(BaseStyle):

    # ── helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _lerp_color(c1: Tuple[int, int, int], c2: Tuple[int, int, int],
                    t: float) -> Tuple[int, int, int]:
        t = max(0.0, min(1.0, t))
        return (
            int(c1[0] + (c2[0] - c1[0]) * t),
            int(c1[1] + (c2[1] - c1[1]) * t),
            int(c1[2] + (c2[2] - c1[2]) * t),
        )

    @staticmethod
    def _path_length(pts: List[Tuple[int, int]]) -> float:
        total = 0.0
        for i in range(len(pts) - 1):
            dx = pts[i + 1][0] - pts[i][0]
            dy = pts[i + 1][1] - pts[i][1]
            total += math.hypot(dx, dy)
        return total

    @staticmethod
    def _point_on_path(pts: List[Tuple[int, int]],
                       frac: float) -> Tuple[float, float, float, float]:
        """Return (x, y, nx, ny) at fractional distance along polyline.
        nx, ny is the unit normal (perpendicular) at that point."""
        if len(pts) < 2:
            return (float(pts[0][0]), float(pts[0][1]), 0.0, -1.0)
        segs: List[float] = []
        for i in range(len(pts) - 1):
            segs.append(math.hypot(pts[i + 1][0] - pts[i][0],
                                   pts[i + 1][1] - pts[i][1]))
        total = sum(segs)
        if total == 0:
            return (float(pts[0][0]), float(pts[0][1]), 0.0, -1.0)
        target = frac * total
        accum = 0.0
        for i, s in enumerate(segs):
            if accum + s >= target or i == len(segs) - 1:
                local_t = (target - accum) / s if s > 0 else 0.0
                x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * local_t
                y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * local_t
                dx = pts[i + 1][0] - pts[i][0]
                dy = pts[i + 1][1] - pts[i][1]
                length = math.hypot(dx, dy) or 1.0
                # normal is perpendicular to tangent
                nx = -dy / length
                ny = dx / length
                return (x, y, nx, ny)
            accum += s
        return (float(pts[-1][0]), float(pts[-1][1]), 0.0, -1.0)

    def _detect_hotspots(self, mapped: List[Tuple[int, int]],
                         data_lines: List[DataLine]) -> List[int]:
        """Return indices where direction changes sharply (passes/shots)."""
        hotspots = [0, len(mapped) - 1]  # always include start and end
        for i in range(1, len(mapped) - 1):
            ax = mapped[i][0] - mapped[i - 1][0]
            ay = mapped[i][1] - mapped[i - 1][1]
            bx = mapped[i + 1][0] - mapped[i][0]
            by = mapped[i + 1][1] - mapped[i][1]
            la = math.hypot(ax, ay) or 1.0
            lb = math.hypot(bx, by) or 1.0
            dot = (ax * bx + ay * by) / (la * lb)
            if dot < 0.5:  # > ~60° turn
                hotspots.append(i)
        return sorted(set(hotspots))

    # ── render methods ────────────────────────────────────────────────

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Near-black background with subtle ambient smoke haze."""
        _density = 1.0
        if render_params:
            _density = max(0.1, render_params.get('bg_density', 4000) / 4000)

        # Pure dark base
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=(4, 4, 8))

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        rng = random.Random(42)

        # Very faint ambient haze — large diffuse blobs at low alpha
        haze = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        hdraw = ImageDraw.Draw(haze)

        ambient_clouds = [
            (0.25, 0.40, int(600 * _density), primary, max(1, int(8 * _density))),
            (0.70, 0.55, int(550 * _density), primary, max(1, int(6 * _density))),
            (0.50, 0.75, int(500 * _density), secondary, max(1, int(7 * _density))),
            (0.15, 0.20, int(400 * _density), secondary, max(1, int(5 * _density))),
            (0.80, 0.30, int(450 * _density), primary, max(1, int(5 * _density))),
        ]
        for fx, fy, radius, color, alpha in ambient_clouds:
            cx = int(fx * self.WIDTH + rng.uniform(-100, 100))
            cy = int(fy * self.HEIGHT + rng.uniform(-100, 100))
            hdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(*color, alpha),
            )

        haze = haze.filter(ImageFilter.GaussianBlur(radius=80))
        composited = Image.alpha_composite(image.convert("RGBA"), haze)
        image.paste(composited.convert("RGB"))

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine],
                          palette: Palette, render_params: dict = None) -> None:
        """Smoke trail following the ball path — particle scatter + multi-blur."""
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        accent = palette.rgb("accent")

        mapped = [self.map_point(dl.x, dl.y) for dl in data_lines]
        hotspot_indices = self._detect_hotspots(mapped, data_lines)
        hotspot_pts = set(hotspot_indices)

        rng = random.Random(99)

        # Build a set of hotspot pixel positions for proximity checks
        hotspot_positions = [mapped[i] for i in hotspot_indices]

        def _dist_to_nearest_hotspot(x: float, y: float) -> float:
            if not hotspot_positions:
                return 999.0
            return min(math.hypot(x - hx, y - hy)
                       for hx, hy in hotspot_positions)

        # ── Layer 1: Wide outer smoke (large blur) ──────────────────
        outer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(outer)

        n_outer = max(100, int(3000 * _edge))
        for _ in range(n_outer):
            frac = rng.random()
            px, py, nx, ny = self._point_on_path(mapped, frac)
            # Wide perpendicular spread
            spread = rng.gauss(0, 90)
            x = px + nx * spread + rng.gauss(0, 12)
            y = py + ny * spread + rng.gauss(0, 12)

            # Density falls off with distance from path centre
            dist_from_centre = abs(spread)
            alpha = max(2, int(18 * math.exp(-dist_from_centre / 80)))

            # Colour: primary with a touch of secondary further out
            t = dist_from_centre / 150.0
            color = self._lerp_color(primary, secondary, min(1.0, t))

            r = rng.randint(2, 5)
            odraw.ellipse([int(x) - r, int(y) - r, int(x) + r, int(y) + r],
                          fill=(*color, alpha))

        outer = outer.filter(ImageFilter.GaussianBlur(radius=28))
        composited = Image.alpha_composite(image.convert("RGBA"), outer)

        # ── Layer 2: Mid-density smoke (medium blur) ────────────────
        mid = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        mdraw = ImageDraw.Draw(mid)

        n_mid = max(100, int(4000 * _edge))
        for _ in range(n_mid):
            frac = rng.random()
            px, py, nx, ny = self._point_on_path(mapped, frac)
            spread = rng.gauss(0, 45)
            x = px + nx * spread + rng.gauss(0, 6)
            y = py + ny * spread + rng.gauss(0, 6)

            dist_from_centre = abs(spread)
            base_alpha = 25 * math.exp(-dist_from_centre / 50)

            # Boost near hotspots
            hdist = _dist_to_nearest_hotspot(x, y)
            hotspot_boost = 1.0 + 1.5 * math.exp(-hdist / 60)
            alpha = max(2, int(base_alpha * hotspot_boost))

            color = primary
            r = rng.randint(1, 4)
            mdraw.ellipse([int(x) - r, int(y) - r, int(x) + r, int(y) + r],
                          fill=(*color, alpha))

        mid = mid.filter(ImageFilter.GaussianBlur(radius=15))
        composited = Image.alpha_composite(composited, mid)

        # ── Layer 3: Dense core smoke (tight blur) ──────────────────
        core = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        cdraw = ImageDraw.Draw(core)

        n_core = max(100, int(3000 * _edge))
        for _ in range(n_core):
            frac = rng.random()
            px, py, nx, ny = self._point_on_path(mapped, frac)
            spread = rng.gauss(0, 16)
            x = px + nx * spread + rng.gauss(0, 3)
            y = py + ny * spread + rng.gauss(0, 3)

            dist_from_centre = abs(spread)
            alpha = max(4, int(45 * math.exp(-dist_from_centre / 20)))

            # Brighter primary near centre
            bright = self._lerp_color(primary, (255, 255, 255), 0.25)
            r = rng.randint(1, 3)
            cdraw.ellipse([int(x) - r, int(y) - r, int(x) + r, int(y) + r],
                          fill=(*bright, alpha))

        core = core.filter(ImageFilter.GaussianBlur(radius=7))
        composited = Image.alpha_composite(composited, core)

        # ── Layer 4: Secondary colour wisp trails ───────────────────
        wisps = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        wdraw = ImageDraw.Draw(wisps)

        n_wisps = 1200
        for _ in range(n_wisps):
            frac = rng.random()
            px, py, nx, ny = self._point_on_path(mapped, frac)
            # Wisps cross the main trail at odd angles
            angle_offset = rng.gauss(0, 0.8)
            cos_a = math.cos(angle_offset)
            sin_a = math.sin(angle_offset)
            wnx = nx * cos_a - ny * sin_a
            wny = nx * sin_a + ny * cos_a
            spread = rng.gauss(0, 70)
            x = px + wnx * spread + rng.gauss(0, 15)
            y = py + wny * spread + rng.gauss(0, 15)

            dist_from_centre = abs(spread)
            alpha = max(2, int(14 * math.exp(-dist_from_centre / 60)))
            r = rng.randint(2, 5)
            wdraw.ellipse([int(x) - r, int(y) - r, int(x) + r, int(y) + r],
                          fill=(*secondary, alpha))

        wisps = wisps.filter(ImageFilter.GaussianBlur(radius=22))
        composited = Image.alpha_composite(composited, wisps)

        # ── Layer 5: Hotspot flares ─────────────────────────────────
        flares = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        fdraw = ImageDraw.Draw(flares)

        for idx in hotspot_indices:
            hx, hy = mapped[idx]
            # Dense bright cluster at the hotspot
            for _ in range(300):
                ox = rng.gauss(0, 18)
                oy = rng.gauss(0, 18)
                dist = math.hypot(ox, oy)
                alpha = max(8, int(60 * math.exp(-dist / 20)))
                bright = self._lerp_color(primary, (255, 255, 255), 0.4)
                r = rng.randint(1, 3)
                px, py = int(hx + ox), int(hy + oy)
                fdraw.ellipse([px - r, py - r, px + r, py + r],
                              fill=(*bright, alpha))

        flares = flares.filter(ImageFilter.GaussianBlur(radius=5))
        composited = Image.alpha_composite(composited, flares)

        image.paste(composited.convert("RGB"))

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine],
                      palette: Palette) -> None:
        """Soft luminous nodes — like embers floating in smoke."""
        primary = palette.rgb("primary")
        accent = palette.rgb("accent")

        seen = set()
        glow_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow_layer)

        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 14, pos[1] // 14)
            if key in seen:
                continue
            seen.add(key)

            is_key = (i == len(data_lines) - 1)
            color = accent if is_key else primary
            size = 20 if is_key else 8

            # Soft glow halo
            halo_r = size * 4
            gdraw.ellipse(
                [pos[0] - halo_r, pos[1] - halo_r,
                 pos[0] + halo_r, pos[1] + halo_r],
                fill=(*color, 12),
            )
            # Inner glow
            inner_r = size * 2
            gdraw.ellipse(
                [pos[0] - inner_r, pos[1] - inner_r,
                 pos[0] + inner_r, pos[1] + inner_r],
                fill=(*color, 30),
            )
            # Bright core
            gdraw.ellipse(
                [pos[0] - size, pos[1] - size,
                 pos[0] + size, pos[1] + size],
                fill=(*self._lerp_color(color, (255, 255, 255), 0.5), 180),
            )

        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=6))
        composited = Image.alpha_composite(image.convert("RGBA"), glow_layer)
        image.paste(composited.convert("RGB"))

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine],
                             palette: Palette) -> None:
        """Intense smoke eruption at the key moment — brightest point."""
        if not data_lines:
            return

        key = data_lines[-1]
        pos = self.map_point(key.x, key.y)
        primary = palette.rgb("primary")
        accent = palette.rgb("accent")

        rng = random.Random(77)

        eruption = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        edraw = ImageDraw.Draw(eruption)

        # Outer smoke burst — big cloud
        for _ in range(600):
            ox = rng.gauss(0, 50)
            oy = rng.gauss(0, 50)
            dist = math.hypot(ox, oy)
            alpha = max(4, int(35 * math.exp(-dist / 45)))
            color = self._lerp_color(accent, primary, min(1.0, dist / 80))
            r = rng.randint(2, 6)
            px, py = int(pos[0] + ox), int(pos[1] + oy)
            edraw.ellipse([px - r, py - r, px + r, py + r],
                          fill=(*color, alpha))

        eruption = eruption.filter(ImageFilter.GaussianBlur(radius=18))
        composited = Image.alpha_composite(image.convert("RGBA"), eruption)

        # Inner bright core
        core = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        cdraw = ImageDraw.Draw(core)

        for _ in range(400):
            ox = rng.gauss(0, 14)
            oy = rng.gauss(0, 14)
            dist = math.hypot(ox, oy)
            alpha = max(10, int(80 * math.exp(-dist / 15)))
            bright = self._lerp_color(accent, (255, 255, 255), 0.6)
            r = rng.randint(1, 3)
            px, py = int(pos[0] + ox), int(pos[1] + oy)
            cdraw.ellipse([px - r, py - r, px + r, py + r],
                          fill=(*bright, alpha))

        core = core.filter(ImageFilter.GaussianBlur(radius=5))
        composited = Image.alpha_composite(composited, core)

        # White-hot centre dot
        cdot = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        cdot_draw = ImageDraw.Draw(cdot)
        cdot_draw.ellipse(
            [pos[0] - 8, pos[1] - 8, pos[0] + 8, pos[1] + 8],
            fill=(255, 255, 255, 220),
        )
        cdot = cdot.filter(ImageFilter.GaussianBlur(radius=3))
        composited = Image.alpha_composite(composited, cdot)

        image.paste(composited.convert("RGB"))

    def post_process(self, image: Image.Image,
                     palette: Palette) -> Image.Image:
        """Subtle noise texture + heavy radial vignette into black."""
        rgba = image.convert("RGBA")

        # ── Noise texture (simulates smoke grain) ───────────────────
        arr = np.array(rgba)
        rs = np.random.RandomState(77)
        noise = rs.randint(-6, 6, arr.shape[:2], dtype=np.int16)
        for c in range(3):
            channel = arr[:, :, c].astype(np.int16) + noise
            arr[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)
        rgba = Image.fromarray(arr, "RGBA")

        # ── Heavy radial vignette — smoke fades into black ──────────
        cx, cy = self.WIDTH // 2, self.HEIGHT // 2
        max_r = int(math.hypot(cx, cy))

        vignette = Image.new("L", (self.WIDTH, self.HEIGHT), 0)
        vdraw = ImageDraw.Draw(vignette)

        # Draw concentric rings from centre outward, increasing darkness
        steps = 80
        for step in range(steps, -1, -1):
            frac = step / steps  # 1.0 at centre, 0.0 at edge
            radius = int(max_r * (step / steps))
            # Smooth cubic falloff — most of canvas visible, edges dark
            brightness = int(255 * (frac ** 1.8))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=brightness,
            )

        vignette = vignette.filter(ImageFilter.GaussianBlur(radius=40))

        # Apply vignette as alpha mask — multiply RGB by vignette
        arr = np.array(rgba)
        mask = np.array(vignette).astype(np.float32) / 255.0
        for c in range(3):
            arr[:, :, c] = (arr[:, :, c].astype(np.float32) * mask).astype(
                np.uint8
            )
        result = Image.fromarray(arr, "RGBA")

        return result
