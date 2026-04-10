"""
Street Style — SPRAY PAINT STREET ART

Aesthetic: gritty, urban, raw, rebellious. Spray can on concrete/brick.
Inspired by: Banksy, Shoreditch graffiti, throw-up tags, stencil art.

Visual language:
  - Fat cap broad strokes with gaussian edge falloff
  - Skinny cap fine detail lines and tag marks
  - Drips running DOWN from heavy spray areas (gravity, paint pooling)
  - Stencil-cut sharp edges mixed with freehand soft spray
  - Overspray dots scattered around main strokes
  - Concrete/brick wall texture underneath (noise + mortar grid)
  - Paint pooling at the bottom of drip accumulation zones
  - Black outlines, team colour primary spray, white highlights
"""

import math
import random
from typing import List, Tuple, Optional
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from art_engine.styles.base import BaseStyle, Palette, DataLine


class StreetStyle(BaseStyle):

    # ── constants ────────────────────────────────────────────────────

    _BRICK_H = 26
    _BRICK_W = 56
    _MORTAR_GAP = 3

    # ── spray paint primitives ──────────────────────────────────────

    def _fat_cap_spray(self, layer: Image.Image, cx: int, cy: int,
                       color: tuple, radius: int, density: int,
                       rng: random.Random) -> None:
        """
        Fat cap spray cloud — dense core, soft gaussian falloff, overspray halo.
        Renders onto an RGBA layer for later gaussian-blur compositing.
        """
        draw = ImageDraw.Draw(layer)
        for _ in range(density):
            angle = rng.uniform(0, 2 * math.pi)
            # Gaussian distribution centred on the nozzle
            dist = abs(rng.gauss(0, radius / 2.5))
            if dist > radius * 1.3:
                continue
            px = int(cx + math.cos(angle) * dist)
            py = int(cy + math.sin(angle) * dist)

            # Core vs halo dot sizing
            in_core = dist < radius * 0.45
            dot_r = rng.randint(2, 4) if in_core else rng.randint(1, 2)

            # Alpha: dense centre, fading to edges
            norm = dist / radius
            if norm < 0.4:
                alpha = rng.randint(180, 240)
            elif norm < 0.7:
                alpha = rng.randint(100, 170)
            else:
                alpha = rng.randint(30, 90)

            draw.ellipse(
                [px - dot_r, py - dot_r, px + dot_r, py + dot_r],
                fill=(color[0], color[1], color[2], alpha)
            )

        # Overspray halo — sparse dots beyond the main radius
        overspray_count = density // 5
        for _ in range(overspray_count):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(radius * 0.8, radius * 1.8)
            px = int(cx + math.cos(angle) * dist)
            py = int(cy + math.sin(angle) * dist)
            alpha = rng.randint(15, 55)
            r = 1
            draw.ellipse(
                [px - r, py - r, px + r, py + r],
                fill=(color[0], color[1], color[2], alpha)
            )

    def _skinny_cap_line(self, draw: ImageDraw.Draw,
                         p1: Tuple[int, int], p2: Tuple[int, int],
                         color: tuple, width: int,
                         rng: random.Random) -> None:
        """Skinny cap fine detail line — tight, scratchy, slightly wobbly."""
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = math.hypot(dx, dy)
        steps = max(2, int(length / 3))
        wobble = max(0.8, width * 0.12)
        prev = p1
        for s in range(1, steps + 1):
            t = s / steps
            nx = int(p1[0] + dx * t + rng.gauss(0, wobble))
            ny = int(p1[1] + dy * t + rng.gauss(0, wobble))
            draw.line([prev, (nx, ny)], fill=color, width=width)
            prev = (nx, ny)

    def _fat_cap_stroke(self, layer: Image.Image,
                        p1: Tuple[int, int], p2: Tuple[int, int],
                        color: tuple, width: int,
                        rng: random.Random) -> None:
        """
        Fat cap spray stroke along a line — the main confident motion.
        Steps along the segment spraying fat clouds that overlap.
        """
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = math.hypot(dx, dy)
        step_size = max(3, width // 3)
        steps = max(2, int(length / step_size))
        for s in range(steps + 1):
            t = s / max(1, steps)
            # Slight hand wobble
            jx = rng.gauss(0, width * 0.08)
            jy = rng.gauss(0, width * 0.08)
            px = int(p1[0] + dx * t + jx)
            py = int(p1[1] + dy * t + jy)
            # Vary pressure along stroke: heavier in middle
            pressure = 0.7 + 0.3 * math.sin(t * math.pi)
            r = int(width * pressure)
            density = int(r * 2.5)
            self._fat_cap_spray(layer, px, py, color, r, density, rng)

    def _drip(self, draw: ImageDraw.Draw, x: int, y: int,
              color: tuple, length: int, rng: random.Random,
              width_start: int = 4) -> None:
        """
        Paint drip running DOWN from a spray point.
        Thins out as it descends, wobbles slightly, accumulates a blob at the end.
        """
        cx = float(x)
        for dy in range(length):
            progress = dy / max(1, length)
            cx += rng.gauss(0, 0.5)
            # Drip thins as it runs down
            w = max(1, int(width_start * (1 - progress * 0.65)))
            # Alpha fades towards tip
            alpha = max(25, int(220 * (1 - progress * 0.7)))
            ix = int(cx)
            iy = y + dy
            draw.ellipse(
                [ix - w, iy - 1, ix + w, iy + 1],
                fill=(color[0], color[1], color[2], alpha)
            )
        # Terminal blob — paint pools at the bottom of the drip
        blob_r = max(2, width_start - 1)
        blob_y = y + length
        blob_x = int(cx)
        alpha = rng.randint(140, 210)
        draw.ellipse(
            [blob_x - blob_r, blob_y - blob_r,
             blob_x + blob_r, blob_y + blob_r],
            fill=(color[0], color[1], color[2], alpha)
        )

    def _drip_pool(self, draw: ImageDraw.Draw, x: int, y: int,
                   color: tuple, width: int, rng: random.Random) -> None:
        """
        Paint pool accumulation — where multiple drips collect at the bottom.
        Horizontal elliptical blob with slight irregularity.
        """
        for _ in range(width * 3):
            ox = rng.gauss(0, width * 0.6)
            oy = rng.gauss(0, width * 0.2)
            r = rng.randint(1, 3)
            alpha = rng.randint(120, 220)
            px = int(x + ox)
            py = int(y + oy)
            draw.ellipse(
                [px - r, py - r, px + r, py + r],
                fill=(color[0], color[1], color[2], alpha)
            )

    def _overspray_scatter(self, draw: ImageDraw.Draw, cx: int, cy: int,
                           color: tuple, spread: int, count: int,
                           rng: random.Random) -> None:
        """Random overspray dots scattered around a point — the mist that escapes."""
        for _ in range(count):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(spread * 0.3, spread)
            px = int(cx + math.cos(angle) * dist)
            py = int(cy + math.sin(angle) * dist)
            r = 1 if rng.random() > 0.3 else rng.randint(1, 2)
            alpha = rng.randint(20, 80)
            draw.ellipse(
                [px - r, py - r, px + r, py + r],
                fill=(color[0], color[1], color[2], alpha)
            )

    def _stencil_rect(self, draw: ImageDraw.Draw,
                      cx: int, cy: int, w: int, h: int,
                      color: tuple, rng: random.Random) -> None:
        """
        Stencil-cut sharp-edged rectangle — crisp geometric against soft spray.
        Filled solid with a slight inner spray texture.
        """
        x1, y1 = cx - w // 2, cy - h // 2
        x2, y2 = cx + w // 2, cy + h // 2
        draw.rectangle([x1, y1, x2, y2], fill=color)
        # Inner texture — lighter spray hits
        lighter = (
            min(255, color[0] + 40),
            min(255, color[1] + 40),
            min(255, color[2] + 40),
        )
        for _ in range(w * h // 20):
            px = rng.randint(x1 + 2, x2 - 2)
            py = rng.randint(y1 + 2, y2 - 2)
            alpha = rng.randint(30, 90)
            draw.point((px, py), fill=(*lighter, alpha))

    def _stencil_circle(self, draw: ImageDraw.Draw,
                        cx: int, cy: int, radius: int,
                        color: tuple) -> None:
        """Stencil-cut sharp circle — crisp edge, flat fill."""
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=color
        )

    def _rough_outline(self, draw: ImageDraw.Draw,
                       points: List[Tuple[int, int]], color: tuple,
                       width: int, rng: random.Random) -> None:
        """Hand-drawn imperfect outline — slightly wobbly connected segments."""
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i + 1]
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            length = math.hypot(dx, dy)
            steps = max(2, int(length / 5))
            prev = p1
            for s in range(1, steps + 1):
                t = s / steps
                nx = int(p1[0] + dx * t + rng.gauss(0, 1.2))
                ny = int(p1[1] + dy * t + rng.gauss(0, 1.2))
                draw.line([prev, (nx, ny)], fill=color, width=width)
                prev = (nx, ny)

    def _stencil_star(self, draw: ImageDraw.Draw,
                      cx: int, cy: int, size: int,
                      color: tuple, rng: random.Random) -> None:
        """Stencil-cut star with sharp polygon fill + overspray inside."""
        points = []
        for i in range(10):
            angle = (2 * math.pi * i / 10) - math.pi / 2
            r = size if i % 2 == 0 else size * 0.42
            points.append((cx + int(math.cos(angle) * r),
                           cy + int(math.sin(angle) * r)))
        draw.polygon(points, fill=color)
        # Inner overspray texture
        lighter = tuple(min(255, c + 50) for c in color[:3])
        for _ in range(size * 2):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(0, size * 0.35)
            px = int(cx + math.cos(angle) * dist)
            py = int(cy + math.sin(angle) * dist)
            draw.point((px, py), fill=(*lighter, rng.randint(40, 100)))

    def _stencil_chevron(self, draw: ImageDraw.Draw,
                         cx: int, cy: int, angle: float,
                         size: int, color: tuple,
                         rng: random.Random) -> None:
        """Stencil-cut chevron/arrow pointing in direction of travel."""
        tip_x = cx + int(math.cos(angle) * size)
        tip_y = cy + int(math.sin(angle) * size)
        spread = 2.6
        left_a = angle + spread
        right_a = angle - spread
        left_x = cx + int(math.cos(left_a) * size * 0.55)
        left_y = cy + int(math.sin(left_a) * size * 0.55)
        right_x = cx + int(math.cos(right_a) * size * 0.55)
        right_y = cy + int(math.sin(right_a) * size * 0.55)
        pts = [(tip_x, tip_y), (left_x, left_y), (cx, cy), (right_x, right_y)]
        draw.polygon(pts, fill=color)

    def _tag_scrawl(self, draw: ImageDraw.Draw,
                    x: int, y: int, color: tuple, size: int,
                    rng: random.Random) -> None:
        """Quick freehand tag scrawl — secondary graffiti marks."""
        points = [(x, y)]
        for _ in range(rng.randint(4, 8)):
            last = points[-1]
            nx = last[0] + rng.randint(-size, size)
            ny = last[1] + rng.randint(-size // 2, size // 2)
            points.append((nx, ny))
        self._rough_outline(draw, points, color, rng.randint(2, 4), rng)

    # ── wall texture generation ─────────────────────────────────────

    def _render_wall(self, image: Image.Image, palette: Palette,
                     rng: random.Random) -> None:
        """
        Concrete/brick wall base layer with mortar grid, per-brick colour
        variation, surface cracks, and grime staining.
        """
        draw = ImageDraw.Draw(image)
        bg = palette.darker("background", 0.45)

        # Mortar colour — lighter than bricks
        mortar = (
            min(255, bg[0] + 22),
            min(255, bg[1] + 20),
            min(255, bg[2] + 16),
            255
        )
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=mortar)

        # Bricks with colour variation
        for row_i, row_y in enumerate(range(0, self.HEIGHT,
                                            self._BRICK_H + self._MORTAR_GAP)):
            offset = (self._BRICK_W // 2) if row_i % 2 else 0
            for col_x in range(-self._BRICK_W, self.WIDTH + self._BRICK_W,
                               self._BRICK_W + self._MORTAR_GAP):
                x = col_x + offset
                var = rng.randint(-14, 14)
                stain = rng.randint(-8, 4)
                brick_color = (
                    max(0, min(255, bg[0] + var)),
                    max(0, min(255, bg[1] + var + stain)),
                    max(0, min(255, bg[2] + var)),
                    255
                )
                draw.rectangle(
                    [x, row_y, x + self._BRICK_W, row_y + self._BRICK_H],
                    fill=brick_color
                )
                # Top edge highlight on some bricks
                if rng.random() > 0.55:
                    hl = tuple(min(255, c + 12) for c in brick_color[:3]) + (255,)
                    draw.line([(x + 1, row_y), (x + self._BRICK_W - 1, row_y)],
                              fill=hl, width=1)
                # Bottom edge shadow on some bricks
                if rng.random() > 0.65:
                    sh = tuple(max(0, c - 10) for c in brick_color[:3]) + (255,)
                    draw.line(
                        [(x + 1, row_y + self._BRICK_H),
                         (x + self._BRICK_W - 1, row_y + self._BRICK_H)],
                        fill=sh, width=1
                    )

        # Surface noise — concrete grain (random dot noise across entire surface)
        noise_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        nd = ImageDraw.Draw(noise_layer)
        for _ in range(self.WIDTH * self.HEIGHT // 40):
            px = rng.randint(0, self.WIDTH - 1)
            py = rng.randint(0, self.HEIGHT - 1)
            v = rng.randint(0, 255)
            nd.point((px, py), fill=(v, v, v, rng.randint(8, 30)))
        image.alpha_composite(noise_layer)

        # Grime patches — large soft dark areas (years of weathering)
        grime = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        gd = ImageDraw.Draw(grime)
        for _ in range(5):
            gx = rng.randint(0, self.WIDTH)
            gy = rng.randint(0, self.HEIGHT)
            gr = rng.randint(150, 400)
            for _ in range(gr * 4):
                angle = rng.uniform(0, 2 * math.pi)
                dist = abs(rng.gauss(0, gr / 2.5))
                if dist > gr:
                    continue
                px = int(gx + math.cos(angle) * dist)
                py = int(gy + math.sin(angle) * dist)
                gd.point((px, py), fill=(0, 0, 0, rng.randint(3, 15)))
        grime_blurred = grime.filter(ImageFilter.GaussianBlur(radius=8))
        image.alpha_composite(grime_blurred)

    def _render_old_paint(self, image: Image.Image, palette: Palette,
                          rng: random.Random) -> None:
        """Faded old spray patches on the wall — ghosts of previous graffiti."""
        old_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        accent_faded = palette.darker("accent", 0.75)
        primary_faded = palette.darker("primary", 0.75)
        secondary_faded = palette.darker("secondary", 0.7)
        faded_colors = [accent_faded, primary_faded, secondary_faded]

        for _ in range(8):
            sx = rng.randint(0, self.WIDTH)
            sy = rng.randint(0, self.HEIGHT)
            color = rng.choice(faded_colors)
            self._fat_cap_spray(old_layer, sx, sy, color,
                                rng.randint(60, 180), rng.randint(100, 350), rng)

        # Old drip stains
        old_draw = ImageDraw.Draw(old_layer)
        for _ in range(6):
            dx = rng.randint(0, self.WIDTH)
            dy = rng.randint(0, self.HEIGHT // 2)
            color = rng.choice(faded_colors)
            self._drip(old_draw, dx, dy, color, rng.randint(30, 90), rng,
                       width_start=3)

        # Blur to make it look old and faded
        old_blurred = old_layer.filter(ImageFilter.GaussianBlur(radius=4))
        image.alpha_composite(old_blurred)

    # ── background ──────────────────────────────────────────────────

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Brick wall with mortar, grime, noise grain, and old faded spray patches."""
        self._bg_density = 1.0
        if render_params:
            self._bg_density = max(0.1, render_params.get('bg_density', 4000) / 4000)
        rng = random.Random(99)
        self._render_wall(image, palette, rng)
        self._render_old_paint(image, palette, rng)

    # ── data lines (the main spray stroke) ──────────────────────────

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """
        The ball path as the MAIN confident spray stroke.
        Fat cap primary colour, black outline underneath, white highlights on top.
        Drips, overspray, stencils, and tag scrawls.
        """
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        rng = random.Random(hash(tuple((dl.x, dl.y) for dl in data_lines)))

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        accent = palette.rgb("accent")
        white = (255, 255, 255)
        black = (20, 20, 20)

        mapped = [self.map_point(dl.x, dl.y) for dl in data_lines]

        # ── Layer 1: Black outline shadow (offset down-right) ──
        outline_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        outline_draw = ImageDraw.Draw(outline_layer)
        for i in range(len(mapped) - 1):
            p1 = (mapped[i][0] + 4, mapped[i][1] + 4)
            p2 = (mapped[i + 1][0] + 4, mapped[i + 1][1] + 4)
            self._skinny_cap_line(outline_draw, p1, p2, (*black, 200), max(1, int(14 * _edge)), rng)
        outline_blurred = outline_layer.filter(ImageFilter.GaussianBlur(radius=2))
        image.alpha_composite(outline_blurred)

        # ── Layer 2: Main fat cap spray stroke — primary team colour ──
        main_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        for i in range(len(mapped) - 1):
            p1, p2 = mapped[i], mapped[i + 1]
            # Stroke gets wider mid-path (arm sweeping motion)
            progress = i / max(1, len(mapped) - 2)
            width = max(1, int((16 + int(8 * math.sin(progress * math.pi))) * _edge))
            self._fat_cap_stroke(main_layer, p1, p2, primary, width, rng)

        # Gaussian blur for authentic spray softness
        main_blurred = main_layer.filter(ImageFilter.GaussianBlur(radius=1.5))
        image.alpha_composite(main_blurred)

        # ── Layer 3: White highlight stroke (thin, offset up-left) ──
        highlight_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        hl_draw = ImageDraw.Draw(highlight_layer)
        for i in range(len(mapped) - 1):
            p1 = (mapped[i][0] - 3, mapped[i][1] - 3)
            p2 = (mapped[i + 1][0] - 3, mapped[i + 1][1] - 3)
            self._skinny_cap_line(hl_draw, p1, p2, (*white, 100), 3, rng)
        hl_blurred = highlight_layer.filter(ImageFilter.GaussianBlur(radius=1))
        image.alpha_composite(hl_blurred)

        # ── Layer 4: Black crisp outline on top ──
        for i in range(len(mapped) - 1):
            p1, p2 = mapped[i], mapped[i + 1]
            self._rough_outline(draw, [p1, p2], (*black, 180), 4, rng)

        # ── Drips running DOWN from thick spray areas ──
        for i in range(len(mapped) - 1):
            p1, p2 = mapped[i], mapped[i + 1]
            seg_len = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
            num_drips = rng.randint(2, max(3, int(seg_len / 60)))
            for _ in range(num_drips):
                t = rng.uniform(0.05, 0.95)
                dx = int(p1[0] + (p2[0] - p1[0]) * t)
                dy = int(p1[1] + (p2[1] - p1[1]) * t)
                drip_color = primary if rng.random() > 0.2 else accent
                drip_len = rng.randint(35, 130)
                self._drip(draw, dx, dy, drip_color, drip_len, rng,
                           width_start=rng.randint(3, 5))

        # Drip pool accumulation at the lowest drip points
        lowest_y = max(pt[1] for pt in mapped)
        pool_y = lowest_y + rng.randint(60, 130)
        if pool_y < self.HEIGHT - 50:
            for pt in mapped:
                if pt[1] > lowest_y - 50 and rng.random() > 0.4:
                    self._drip_pool(draw, pt[0] + rng.randint(-20, 20),
                                    pool_y + rng.randint(-10, 10),
                                    primary, rng.randint(12, 25), rng)

        # ── Overspray scatter around the path ──
        for pt in mapped:
            self._overspray_scatter(draw, pt[0], pt[1], primary,
                                    rng.randint(60, 150), rng.randint(15, 40), rng)
            # Some white overspray too
            self._overspray_scatter(draw, pt[0], pt[1], white,
                                    rng.randint(40, 100), rng.randint(5, 15), rng)

        # ── Secondary tag scrawls in contrasting colour ──
        num_tags = rng.randint(2, 4)
        for _ in range(num_tags):
            idx = rng.randint(0, len(mapped) - 1)
            tx = mapped[idx][0] + rng.randint(-80, 80)
            ty = mapped[idx][1] + rng.randint(-60, 60)
            tag_color = secondary if rng.random() > 0.3 else accent
            self._tag_scrawl(draw, tx, ty, (*tag_color, 180),
                             rng.randint(15, 35), rng)

        # ── Stencil shapes along the path (sharp vs soft contrast) ──
        for i in range(len(mapped) - 1):
            if rng.random() > 0.45:
                continue
            p1, p2 = mapped[i], mapped[i + 1]
            mid_x = (p1[0] + p2[0]) // 2 + rng.randint(-25, 25)
            mid_y = (p1[1] + p2[1]) // 2 + rng.randint(-25, 25)
            angle = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
            stencil_color = (*secondary, 220) if rng.random() > 0.5 else (*accent, 220)

            choice = rng.randint(0, 2)
            if choice == 0:
                self._stencil_chevron(draw, mid_x, mid_y, angle,
                                      rng.randint(20, 35), stencil_color, rng)
            elif choice == 1:
                self._stencil_star(draw, mid_x, mid_y,
                                   rng.randint(14, 24), stencil_color, rng)
            else:
                self._stencil_rect(draw, mid_x, mid_y,
                                   rng.randint(20, 40), rng.randint(16, 30),
                                   stencil_color, rng)

    # ── actors ──────────────────────────────────────────────────────

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """
        Stencil-cut spray paint markers at actor positions.
        Final position gets a bold crosshair target. Others get spray rings.
        """
        rng = random.Random(77)
        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        accent = palette.rgb("accent")
        black = (20, 20, 20)

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 18, pos[1] // 18)
            if key in seen:
                continue
            seen.add(key)

            is_final = (i == len(data_lines) - 1)
            color = primary if is_final else secondary
            radius = 30 if is_final else 16

            # Black outline ring
            self._stencil_circle(draw, pos[0] + 2, pos[1] + 2,
                                 radius + 3, (*black, 120))

            # Spray ring — fat cap ring
            ring_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
            ring_draw = ImageDraw.Draw(ring_layer)
            ring_density = 500 if is_final else 250
            for _ in range(ring_density):
                angle = rng.uniform(0, 2 * math.pi)
                dist = rng.gauss(radius, 2.5)
                px = int(pos[0] + math.cos(angle) * dist)
                py = int(pos[1] + math.sin(angle) * dist)
                dot_r = rng.randint(1, 2)
                ring_draw.ellipse(
                    [px - dot_r, py - dot_r, px + dot_r, py + dot_r],
                    fill=(*color, rng.randint(160, 240))
                )
            image.alpha_composite(ring_layer)

            # Inner fill — fat cap spray cloud
            inner_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
            self._fat_cap_spray(inner_layer, pos[0], pos[1], color,
                                radius - 4, radius * 10, rng)
            inner_blurred = inner_layer.filter(ImageFilter.GaussianBlur(radius=1))
            image.alpha_composite(inner_blurred)

            # Crosshair target on final position
            if is_final:
                ch = radius + 14
                self._rough_outline(draw,
                                    [(pos[0] - ch, pos[1]), (pos[0] + ch, pos[1])],
                                    (*accent, 230), 3, rng)
                self._rough_outline(draw,
                                    [(pos[0], pos[1] - ch), (pos[0], pos[1] + ch)],
                                    (*accent, 230), 3, rng)
                # Outer target circle
                self._rough_outline(
                    draw,
                    [(int(pos[0] + math.cos(a / 30 * 2 * math.pi) * (ch - 2)),
                      int(pos[1] + math.sin(a / 30 * 2 * math.pi) * (ch - 2)))
                     for a in range(31)],
                    (*accent, 180), 2, rng
                )

    # ── moment marker ───────────────────────────────────────────────

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """
        Massive spray-paint explosion at the KEY moment.
        Multi-colour burst, radial drips with pooling, stencil star,
        big splatter dots, white flash.
        """
        if not data_lines:
            return

        rng = random.Random(12345)
        key = data_lines[-1]
        pos = self.map_point(key.x, key.y)

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")
        accent = palette.rgb("accent")
        white = (255, 255, 255)
        black = (20, 20, 20)
        colours = [primary, secondary, accent]

        # ── Layer 1: Large spray burst (multiple overlapping fat cap clouds) ──
        burst_layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        for color in colours:
            r = rng.randint(70, 110)
            self._fat_cap_spray(burst_layer, pos[0], pos[1], color,
                                r, rng.randint(600, 1000), rng)
        # White flash at dead centre
        self._fat_cap_spray(burst_layer, pos[0], pos[1], white,
                            30, 300, rng)
        burst_blurred = burst_layer.filter(ImageFilter.GaussianBlur(radius=2))
        image.alpha_composite(burst_blurred)

        # ── Layer 2: Radial drips (gravity pulls them all down) ──
        num_drips = 12
        for d in range(num_drips):
            angle = (2 * math.pi * d / num_drips) + rng.uniform(-0.3, 0.3)
            start_dist = rng.randint(25, 50)
            sx = int(pos[0] + math.cos(angle) * start_dist)
            sy = int(pos[1] + math.sin(angle) * start_dist)
            color = colours[d % len(colours)]
            drip_len = rng.randint(50, 160)
            self._drip(draw, sx, sy, color, drip_len, rng,
                       width_start=rng.randint(3, 6))
            # Pool at bottom of drip
            if rng.random() > 0.5:
                self._drip_pool(draw, sx, sy + drip_len,
                                color, rng.randint(8, 15), rng)

        # ── Layer 3: Stencil star at centre ──
        self._stencil_star(draw, pos[0], pos[1], 45, (*primary, 240), rng)
        # Black outline star on top
        star_pts = []
        for i in range(10):
            angle = (2 * math.pi * i / 10) - math.pi / 2
            r = 45 if i % 2 == 0 else 19
            star_pts.append((pos[0] + int(math.cos(angle) * r),
                             pos[1] + int(math.sin(angle) * r)))
        star_pts.append(star_pts[0])
        self._rough_outline(draw, star_pts, (*black, 200), 3, rng)

        # ── Layer 4: Big splatter dots ──
        for _ in range(50):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(35, 170)
            sx = int(pos[0] + math.cos(angle) * dist)
            sy = int(pos[1] + math.sin(angle) * dist)
            r = rng.randint(3, 12)
            color = colours[rng.randint(0, 2)]
            alpha = rng.randint(140, 255)
            draw.ellipse([sx - r, sy - r, sx + r, sy + r],
                         fill=(*color, alpha))

        # ── White highlight overspray on top ──
        self._overspray_scatter(draw, pos[0], pos[1], white,
                                120, 30, rng)

    # ── post-process ────────────────────────────────────────────────

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """
        Final compositing:
        - Heavy grain noise (spray paint on textured wall)
        - Dark vignette (spotlight feel, like a wall under a streetlight)
        - Subtle overall blur to blend spray layers
        """
        # Convert to array for grain
        arr = np.array(image)

        # Heavy grain noise — heavier than other styles, this is raw
        rs = np.random.RandomState(42)
        noise = rs.randint(-22, 22, arr.shape[:2], dtype=np.int16)
        for c in range(min(arr.shape[2], 3)):
            channel = arr[:, :, c].astype(np.int16) + noise
            arr[:, :, c] = np.clip(channel, 0, 255).astype(np.uint8)

        image = Image.fromarray(arr)

        # Dark vignette — heavy, like a streetlight illuminating the centre
        vignette = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)
        cx, cy = self.WIDTH // 2, self.HEIGHT // 2
        max_r = int(math.hypot(cx, cy))
        inner_r = max_r // 2
        for radius in range(max_r, inner_r, -3):
            progress = (radius - inner_r) / (max_r - inner_r)
            alpha = int(120 * progress)
            alpha = min(120, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(0, 0, 0, alpha)
            )

        image = Image.alpha_composite(image.convert("RGBA"), vignette)
        return image
