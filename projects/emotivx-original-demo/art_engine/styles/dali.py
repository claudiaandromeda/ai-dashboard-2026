"""
Dalí Style — surrealist melting, warping, dreamlike art.
Inspired by: Salvador Dalí's melting clocks, vast desert landscapes, perspective distortion.
Uses: sine-wave warped data lines, elongated melting ellipses at waypoints,
long impossible shadows, warm amber-gold palette, horizon reflection, dreamlike haze.
"""

import math
import random
from typing import List, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from art_engine.styles.base import BaseStyle, Palette, DataLine


class DaliStyle(BaseStyle):

    # Vanishing point for perspective distortion (slightly right of centre, high up)
    VP_X = 0.55
    VP_Y = 0.18

    # Horizon line at ~70% from top
    HORIZON_Y = 0.70

    def _warm_shift(self, rgb: Tuple[int, int, int], strength: float = 0.3) -> Tuple[int, int, int]:
        """Shift an RGB colour toward gold/amber tones."""
        r, g, b = rgb
        amber = (218, 165, 50)
        return (
            int(r + (amber[0] - r) * strength),
            int(g + (amber[1] - g) * strength),
            int(b + (amber[2] - b) * strength),
        )

    def _lerp_color(self, c1: Tuple[int, ...], c2: Tuple[int, ...],
                    t: float) -> Tuple[int, ...]:
        """Linear interpolation between two colours."""
        return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

    def _sine_warp(self, x: float, y: float, seq: int, amplitude: float = 0.02,
                   freq: float = 3.0) -> Tuple[float, float]:
        """Apply sine-wave distortion — melting warp effect."""
        phase = seq * 0.7
        wx = x + amplitude * math.sin(freq * y * math.pi + phase)
        wy = y + amplitude * 0.6 * math.sin(freq * x * math.pi + phase * 1.3)
        return (wx, wy)

    def _perspective_distort(self, x: float, y: float,
                             strength: float = 0.15) -> Tuple[float, float]:
        """Pull coordinates toward the vanishing point for surreal depth."""
        dx = self.VP_X - x
        dy = self.VP_Y - y
        dist = math.sqrt(dx * dx + dy * dy)
        pull = strength * (1.0 - min(1.0, dist * 1.2))
        return (x + dx * pull, y + dy * pull)

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Desert-like vast empty space — warm gradient sky and ground."""
        self._bg_density = 1.0
        if render_params:
            self._bg_density = max(0.1, render_params.get('bg_density', 4000) / 4000)
        horizon_px = int(self.HORIZON_Y * self.HEIGHT)

        # Sky gradient: deep amber-brown at top → warm peach at horizon
        sky_top = self._warm_shift(palette.darker("primary", 0.5), 0.6)
        sky_bottom = (235, 200, 145)

        for y in range(horizon_px):
            t = y / max(1, horizon_px)
            color = self._lerp_color(sky_top, sky_bottom, t)
            draw.line([(0, y), (self.WIDTH, y)], fill=color)

        # Ground gradient: warm sand → dark amber
        ground_top = (210, 180, 120)
        ground_bottom = self._warm_shift(palette.darker("primary", 0.6), 0.5)

        for y in range(horizon_px, self.HEIGHT):
            t = (y - horizon_px) / max(1, self.HEIGHT - horizon_px)
            color = self._lerp_color(ground_top, ground_bottom, t)
            draw.line([(0, y), (self.WIDTH, y)], fill=color)

        # Thin horizon line — elegant, Dalí-esque
        hz_color = self._warm_shift(palette.rgb("accent"), 0.4)
        draw.line([(0, horizon_px), (self.WIDTH, horizon_px)],
                  fill=hz_color, width=2)

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """Melting, sine-warped data line with elongated waypoint objects."""
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        rng = random.Random(hash(tuple((dl.x, dl.y) for dl in data_lines)))

        primary_warm = self._warm_shift(palette.rgb("primary"), 0.25)
        secondary_warm = self._warm_shift(palette.rgb("secondary"), 0.2)
        accent_warm = self._warm_shift(palette.rgb("accent"), 0.15)
        colours = [primary_warm, secondary_warm, accent_warm]

        # --- Build warped path points ---
        warped_points: List[Tuple[int, int]] = []
        for i, dl in enumerate(data_lines):
            wx, wy = self._sine_warp(dl.x, dl.y, i, amplitude=0.025, freq=2.5)
            wx, wy = self._perspective_distort(wx, wy, strength=0.12)
            warped_points.append(self.map_point(wx, wy))

        # --- Draw the melting data line ---
        # Interpolate between waypoints with sub-steps for smooth curves
        smooth_path: List[Tuple[int, int]] = []
        for i in range(len(warped_points) - 1):
            p1, p2 = warped_points[i], warped_points[i + 1]
            steps = max(20, int(math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3))
            for s in range(steps + 1):
                t = s / steps
                # Sine wobble on the interpolated path itself (melting effect)
                wobble_x = 4 * math.sin(t * math.pi * 3 + i * 1.5)
                wobble_y = 3 * math.sin(t * math.pi * 2.5 + i * 0.9)
                sx = p1[0] + (p2[0] - p1[0]) * t + wobble_x
                sy = p1[1] + (p2[1] - p1[1]) * t + wobble_y
                smooth_path.append((int(sx), int(sy)))

        # Draw the smooth path as thin elegant lines
        for j in range(len(smooth_path) - 1):
            progress = j / max(1, len(smooth_path) - 2)
            color = self._lerp_color(colours[0], colours[1], progress)
            # Thin line that gently varies in width — like a pen stroke
            width = max(1, int((2 + 2 * math.sin(progress * math.pi)) * _edge))
            draw.line([smooth_path[j], smooth_path[j + 1]], fill=color, width=width)

        # --- Long impossible shadows from each waypoint ---
        shadow_color = (40, 30, 20, 60)
        shadow_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow_layer)

        for i, pt in enumerate(warped_points):
            # Shadows stretch toward bottom-right at extreme length
            shadow_len = rng.uniform(120, 300)
            shadow_angle = math.pi * 0.3 + rng.uniform(-0.1, 0.1)  # ~55 degrees
            end_x = int(pt[0] + math.cos(shadow_angle) * shadow_len)
            end_y = int(pt[1] + math.sin(shadow_angle) * shadow_len)

            # Thin tapered shadow line
            steps = max(10, int(shadow_len / 3))
            for s in range(steps):
                t = s / steps
                sx = int(pt[0] + (end_x - pt[0]) * t)
                sy = int(pt[1] + (end_y - pt[1]) * t)
                alpha = int(60 * (1.0 - t))
                w = max(1, int(3 * (1.0 - t)))
                if s > 0:
                    prev_t = (s - 1) / steps
                    px = int(pt[0] + (end_x - pt[0]) * prev_t)
                    py = int(pt[1] + (end_y - pt[1]) * prev_t)
                    sdraw.line([(px, py), (sx, sy)],
                               fill=(40, 30, 20, alpha), width=w)

        image.paste(Image.alpha_composite(image.convert("RGBA"), shadow_layer).convert("RGB"))

        # --- Elongated melting ellipses at waypoints (surreal clock-face objects) ---
        for i, pt in enumerate(warped_points):
            color = colours[i % len(colours)]
            # Elongated vertically — like a melting clock drooping
            stretch = rng.uniform(2.0, 4.0)
            base_r = rng.randint(12, 24)
            rx = base_r
            ry = int(base_r * stretch)

            # Slight rotation via skewed bounding box
            skew = rng.uniform(-8, 8)
            bbox = [
                pt[0] - rx + int(skew), pt[1] - ry,
                pt[0] + rx + int(skew), pt[1] + ry,
            ]

            # Gradient fill: team colour → amber → dark (using concentric ellipses)
            dark = self._warm_shift(palette.darker("primary", 0.4), 0.5)
            for step in range(8, 0, -1):
                t = step / 8
                fill = self._lerp_color(dark, color, t)
                shrink_x = int(rx * (1 - t) * 0.3)
                shrink_y = int(ry * (1 - t) * 0.3)
                draw.ellipse([
                    bbox[0] + shrink_x, bbox[1] + shrink_y,
                    bbox[2] - shrink_x, bbox[3] - shrink_y,
                ], fill=fill, outline=None)

            # Thin outline — elegant Dalí line
            draw.ellipse(bbox, fill=None,
                         outline=self._warm_shift(palette.rgb("accent"), 0.3),
                         width=1)

            # Dripping tendril below each ellipse (melting downward)
            drip_length = rng.randint(30, 80)
            drip_x = pt[0] + int(skew * 0.5)
            drip_start_y = bbox[3]
            prev = (drip_x, drip_start_y)
            for d in range(drip_length):
                dt = d / drip_length
                dx = drip_x + int(5 * math.sin(dt * math.pi * 2 + i))
                dy = drip_start_y + d * 2
                alpha_factor = 1.0 - dt
                drip_color = self._lerp_color(color, (40, 30, 20),
                                              1.0 - alpha_factor)
                w = max(1, int(2 * alpha_factor))
                draw.line([prev, (dx, dy)], fill=drip_color, width=w)
                prev = (dx, dy)

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """Surreal distorted markers at actor positions — elongated, dream-like."""
        rng = random.Random(77)
        primary = self._warm_shift(palette.rgb("primary"), 0.2)
        accent = self._warm_shift(palette.rgb("accent"), 0.2)

        seen = set()
        for i, dl in enumerate(data_lines):
            # Apply same warping as data lines for consistency
            wx, wy = self._sine_warp(dl.x, dl.y, i, amplitude=0.015, freq=2.5)
            wx, wy = self._perspective_distort(wx, wy, strength=0.08)
            pos = self.map_point(wx, wy)
            key = (pos[0] // 20, pos[1] // 20)
            if key in seen:
                continue
            seen.add(key)

            is_key = (i == len(data_lines) - 1)
            color = primary if is_key else accent

            # Small elongated diamond shapes — surreal, strange
            size = 14 if is_key else 8
            stretch = rng.uniform(1.5, 3.0)
            points = [
                (pos[0], pos[1] - int(size * stretch)),  # top (elongated)
                (pos[0] + size, pos[1]),                  # right
                (pos[0], pos[1] + int(size * stretch)),   # bottom (elongated)
                (pos[0] - size, pos[1]),                  # left
            ]
            draw.polygon(points, fill=color,
                         outline=self._warm_shift(palette.rgb("secondary"), 0.3))

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """Surreal focal burst — concentric melting rings radiating from key moment."""
        if not data_lines:
            return

        key_dl = data_lines[-1]
        wx, wy = self._sine_warp(key_dl.x, key_dl.y, len(data_lines),
                                 amplitude=0.02, freq=2.5)
        wx, wy = self._perspective_distort(wx, wy, strength=0.1)
        pos = self.map_point(wx, wy)

        primary = self._warm_shift(palette.rgb("primary"), 0.2)
        accent = self._warm_shift(palette.rgb("accent"), 0.15)

        # Concentric elongated rings — like ripples in a melting mirror
        for ring in range(8, 0, -1):
            t = ring / 8
            radius_x = int(20 + ring * 18)
            radius_y = int(20 + ring * 28)  # vertically elongated
            alpha = int(180 * t)
            color = self._lerp_color(primary, accent, t)
            color_with_alpha = color + (alpha,)

            # Use overlay layer for transparency
            ring_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
            ring_draw = ImageDraw.Draw(ring_layer)
            ring_draw.ellipse([
                pos[0] - radius_x, pos[1] - radius_y,
                pos[0] + radius_x, pos[1] + radius_y,
            ], fill=None, outline=color_with_alpha, width=2)
            image.paste(Image.alpha_composite(image.convert("RGBA"),
                                              ring_layer).convert("RGB"))

        # Central melting blob
        draw.ellipse([pos[0] - 15, pos[1] - 25, pos[0] + 15, pos[1] + 25],
                     fill=primary,
                     outline=accent, width=2)

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """Horizon reflection, warm noise haze, and soft vignette."""
        image = image.convert("RGBA")
        w, h = self.WIDTH, self.HEIGHT
        horizon_px = int(self.HORIZON_Y * h)

        # --- Reflection below horizon: flip upper portion, fade it ---
        upper = image.crop((0, horizon_px - int(h * 0.25), w, horizon_px))
        reflected = upper.transpose(Image.FLIP_TOP_BOTTOM)
        # Fade the reflection
        fade = Image.new("RGBA", reflected.size, (0, 0, 0, 0))
        fade_draw = ImageDraw.Draw(fade)
        for y in range(reflected.height):
            alpha = int(140 * (1.0 - y / max(1, reflected.height)))
            fade_draw.line([(0, y), (w, y)], fill=(0, 0, 0, 255 - alpha))

        reflected = Image.composite(
            Image.new("RGBA", reflected.size, (0, 0, 0, 0)),
            reflected, fade.split()[3]
        )
        # Paste reflection just below horizon
        paste_y = min(horizon_px + 5, h - reflected.height)
        if paste_y + reflected.height <= h:
            image.paste(
                Image.alpha_composite(
                    image.crop((0, paste_y, w, paste_y + reflected.height)),
                    reflected
                ),
                (0, paste_y)
            )

        # --- Warm noise texture for dreamlike haze ---
        arr = np.array(image)
        noise = np.random.RandomState(42).randint(-8, 8,
                                                  (h, w), dtype=np.int16)
        for c in range(3):
            channel = arr[:, :, c].astype(np.int16) + noise
            arr[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)
        image = Image.fromarray(arr, "RGBA")

        # --- Soft warm vignette ---
        vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)
        cx, cy = w // 2, h // 2
        max_r = int(math.sqrt(cx * cx + cy * cy))
        for radius in range(max_r, max_r // 3, -4):
            alpha = int(70 * ((radius - max_r // 3) / (max_r * 2 / 3)))
            alpha = min(70, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(50, 35, 15, alpha)
            )

        image = Image.alpha_composite(image, vignette)

        # Gentle blur for dreamlike softness
        image = image.filter(ImageFilter.GaussianBlur(radius=0.8))

        return image
