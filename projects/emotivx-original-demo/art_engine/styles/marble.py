"""
Marble Style — real Italian marble: polished stone with organic veining.
Inspired by: Calacatta, Statuario, Arabescato marbles.
Uses: fractal noise stone grain, recursive branching veins, dataline as main vein,
Gaussian-blurred depth layers, vignette for polished stone curvature.
"""

import math
import random
from typing import List, Tuple
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from art_engine.styles.base import BaseStyle, Palette, DataLine


# ---------------------------------------------------------------------------
# Fractal noise (no external deps)
# ---------------------------------------------------------------------------

def _perlin_noise(width: int, height: int, scale: float = 64.0,
                  octaves: int = 4, seed: int = 0) -> np.ndarray:
    """Value-noise fractal noise, returns float32 array in [0, 1]."""
    rng = np.random.RandomState(seed)
    result = np.zeros((height, width), dtype=np.float32)
    amplitude = 1.0
    total_amp = 0.0

    for octave in range(octaves):
        freq = 2 ** octave
        amp = amplitude / freq
        total_amp += amp

        grid_h = max(2, int(height / (scale / freq)) + 2)
        grid_w = max(2, int(width / (scale / freq)) + 2)
        grid = rng.rand(grid_h, grid_w).astype(np.float32)

        ys = np.linspace(0, grid_h - 1, height, dtype=np.float32)
        xs = np.linspace(0, grid_w - 1, width, dtype=np.float32)
        xv, yv = np.meshgrid(xs, ys)

        x0 = np.floor(xv).astype(np.int32)
        y0 = np.floor(yv).astype(np.int32)
        x1 = np.minimum(x0 + 1, grid_w - 1)
        y1 = np.minimum(y0 + 1, grid_h - 1)

        fx = xv - x0.astype(np.float32)
        fy = yv - y0.astype(np.float32)

        # Smoothstep
        fx = fx * fx * (3 - 2 * fx)
        fy = fy * fy * (3 - 2 * fy)

        top = grid[y0, x0] * (1 - fx) + grid[y0, x1] * fx
        bot = grid[y1, x0] * (1 - fx) + grid[y1, x1] * fx
        layer = top * (1 - fy) + bot * fy

        result += layer * amp

    result /= total_amp
    return result


# ---------------------------------------------------------------------------
# Vein geometry helpers
# ---------------------------------------------------------------------------

def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _wobble_path(points: List[Tuple[float, float]], amplitude: float,
                 segments_per_leg: int, rng: random.Random) -> List[Tuple[float, float]]:
    """Subdivide a polyline and add smooth wobble for organic feel."""
    if len(points) < 2:
        return points
    result = [points[0]]
    for i in range(len(points) - 1):
        x0, y0 = points[i]
        x1, y1 = points[i + 1]
        dx, dy = x1 - x0, y1 - y0
        length = math.sqrt(dx * dx + dy * dy)
        if length < 1e-6:
            continue
        # Normal direction for wobble
        nx, ny = -dy / length, dx / length
        for s in range(1, segments_per_leg + 1):
            t = s / segments_per_leg
            # Sine-based wobble with random phase
            phase = rng.uniform(0, math.pi * 2)
            wobble = math.sin(t * math.pi * 2 + phase) * amplitude * rng.uniform(0.3, 1.0)
            px = _lerp(x0, x1, t) + nx * wobble
            py = _lerp(y0, y1, t) + ny * wobble
            result.append((px, py))
    return result


def _branch_veins(trunk: List[Tuple[float, float]], depth: int, max_depth: int,
                  rng: random.Random, canvas_w: int, canvas_h: int,
                  branch_prob: float = 0.35) -> List[dict]:
    """Recursively generate branching veins off a trunk path.

    Returns list of dicts: {'points': [...], 'depth': int}
    """
    branches = []
    if depth >= max_depth or len(trunk) < 3:
        return branches

    num_candidates = max(1, len(trunk) // 4)
    indices = sorted(rng.sample(range(1, len(trunk) - 1),
                                min(num_candidates, len(trunk) - 2)))

    for idx in indices:
        if rng.random() > branch_prob:
            continue

        px, py = trunk[idx]
        # Direction of trunk at this point
        bx, by = trunk[min(idx + 1, len(trunk) - 1)]
        ax, ay = trunk[max(idx - 1, 0)]
        trunk_dx = bx - ax
        trunk_dy = by - ay
        trunk_len = math.sqrt(trunk_dx ** 2 + trunk_dy ** 2)
        if trunk_len < 1e-6:
            continue
        trunk_dx /= trunk_len
        trunk_dy /= trunk_len

        # Branch at acute angle (15-45 degrees) to the trunk
        side = rng.choice([-1, 1])
        angle = rng.uniform(math.radians(15), math.radians(45)) * side
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        branch_dx = trunk_dx * cos_a - trunk_dy * sin_a
        branch_dy = trunk_dx * sin_a + trunk_dy * cos_a

        # Branch length decreases with depth
        base_len = rng.uniform(80, 280) / (1.0 + depth * 0.7)
        num_segs = rng.randint(3, 6)

        branch_pts = [(px, py)]
        cx, cy = px, py
        for s in range(num_segs):
            seg_len = base_len / num_segs
            # Slight curve: rotate direction a little each segment
            curve = rng.uniform(-0.15, 0.15)
            cos_c, sin_c = math.cos(curve), math.sin(curve)
            branch_dx, branch_dy = (
                branch_dx * cos_c - branch_dy * sin_c,
                branch_dx * sin_c + branch_dy * cos_c,
            )
            cx += branch_dx * seg_len
            cy += branch_dy * seg_len
            # Clamp to canvas
            cx = max(0, min(canvas_w - 1, cx))
            cy = max(0, min(canvas_h - 1, cy))
            branch_pts.append((cx, cy))

        # Add wobble to branch
        branch_pts = _wobble_path(branch_pts, amplitude=4.0 / (1 + depth),
                                  segments_per_leg=4, rng=rng)
        branches.append({'points': branch_pts, 'depth': depth + 1})

        # Recurse
        sub = _branch_veins(branch_pts, depth + 1, max_depth, rng,
                            canvas_w, canvas_h, branch_prob * 0.6)
        branches.extend(sub)

    return branches


def _draw_vein_line(draw: ImageDraw.Draw, points: List[Tuple[float, float]],
                    color: Tuple[int, ...], width: int) -> None:
    """Draw a smooth polyline as connected segments."""
    for i in range(len(points) - 1):
        p1 = (int(points[i][0]), int(points[i][1]))
        p2 = (int(points[i + 1][0]), int(points[i + 1][1]))
        draw.line([p1, p2], fill=color, width=width)


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _desaturate(rgb: Tuple[int, int, int], factor: float = 0.4) -> Tuple[int, int, int]:
    """Desaturate an RGB colour toward stone-like tones."""
    r, g, b = [c / 255.0 for c in rgb]
    h, s, v = __import__('colorsys').rgb_to_hsv(r, g, b)
    s *= (1 - factor)
    r2, g2, b2 = __import__('colorsys').hsv_to_rgb(h, s, v)
    return (int(r2 * 255), int(g2 * 255), int(b2 * 255))


def _blend(c1: Tuple[int, int, int], c2: Tuple[int, int, int],
           t: float) -> Tuple[int, int, int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


# ---------------------------------------------------------------------------
# MarbleStyle
# ---------------------------------------------------------------------------

class MarbleStyle(BaseStyle):

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Polished stone base — team-tinted with fractal grain."""
        self._bg_density = 1.0
        if render_params:
            self._bg_density = max(0.1, render_params.get('bg_density', 4000) / 4000)
        w, h = self.WIDTH, self.HEIGHT

        primary_rgb = palette.rgb("primary")
        stone_base = _desaturate(primary_rgb, 0.55)  # desaturated team colour

        # Lighter and darker stone shades for gradient
        stone_light = _blend(stone_base, (245, 240, 235), 0.65)  # push toward cream
        stone_dark = _blend(stone_base, (60, 55, 50), 0.35)

        # Vertical gradient: lighter top, darker bottom (like a lit slab)
        ys = np.linspace(0, 1, h, dtype=np.float32)
        grad = ys[:, np.newaxis]  # (h, 1)
        gradient = np.zeros((h, w, 3), dtype=np.float32)
        for c in range(3):
            gradient[:, :, c] = stone_light[c] * (1 - grad * 0.25) + stone_dark[c] * (grad * 0.25)

        # Fractal noise grain for stone surface texture
        grain1 = _perlin_noise(w, h, scale=180.0, octaves=5, seed=7)
        grain2 = _perlin_noise(w, h, scale=40.0, octaves=3, seed=19)
        grain3 = _perlin_noise(w, h, scale=12.0, octaves=2, seed=41)  # fine grain

        # Combine: large-scale variation + medium texture + fine grain
        combined = grain1 * 0.5 + grain2 * 0.3 + grain3 * 0.2
        # Map to subtle luminosity modulation — density controls grain intensity
        _d = self._bg_density
        lum = 0.88 + 0.12 * combined * _d
        gradient *= lum[:, :, np.newaxis]

        # Very subtle marble-sine pattern in the stone itself (background veining hint)
        sine_vein = np.sin(grain1 * 10.0 + grain2 * 5.0 + np.linspace(0, 4, w)[np.newaxis, :])
        sine_vein = (sine_vein + 1.0) / 2.0
        sine_vein = np.power(sine_vein, 6.0)  # sharpen to thin lines
        # Apply as very faint darkening
        gradient *= (1.0 - sine_vein[:, :, np.newaxis] * 0.06 * _d)

        bg = np.clip(gradient, 0, 255).astype(np.uint8)
        image.paste(Image.fromarray(bg, "RGB"))

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """The dataline IS the main marble vein. Secondary and tertiary veins branch off."""
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        w, h = self.WIDTH, self.HEIGHT
        rng = random.Random(42)

        primary_rgb = palette.rgb("primary")
        dark_vein = palette.darker("primary", 0.5)
        white_hl = (255, 255, 255)
        stone_base = _desaturate(primary_rgb, 0.55)

        # Map dataline to pixel coords — this is the MAIN VEIN path
        raw_points = [self.map_point(dl.x, dl.y) for dl in data_lines]
        main_path = _wobble_path(
            [(float(p[0]), float(p[1])) for p in raw_points],
            amplitude=12.0, segments_per_leg=8, rng=rng
        )

        # Generate branch veins recursively
        branches = _branch_veins(main_path, depth=0, max_depth=3, rng=rng,
                                 canvas_w=w, canvas_h=h, branch_prob=0.45)

        # ----- Layer 1: Deep blurred veins for subsurface depth -----
        deep_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        deep_draw = ImageDraw.Draw(deep_layer)

        # Draw main vein deep shadow
        deep_color = (*dark_vein, 35)
        _draw_vein_line(deep_draw, main_path, deep_color, width=max(1, int(28 * _edge)))

        # Deep branches
        for branch in branches:
            alpha = max(10, 30 - branch['depth'] * 10)
            bw = max(6, 18 - branch['depth'] * 5)
            _draw_vein_line(deep_draw, branch['points'], (*dark_vein, alpha), width=bw)

        deep_layer = deep_layer.filter(ImageFilter.GaussianBlur(radius=18))
        image.paste(
            Image.alpha_composite(image.convert("RGBA"), deep_layer).convert("RGB")
        )

        # ----- Layer 2: Mid-depth veins (slightly blurred) -----
        mid_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        mid_draw = ImageDraw.Draw(mid_layer)

        # Main vein mid layer
        mid_vein_color = _blend(dark_vein, stone_base, 0.3)
        _draw_vein_line(mid_draw, main_path, (*mid_vein_color, 70), width=max(1, int(14 * _edge)))

        # Branch veins mid layer — secondaries only
        for branch in branches:
            if branch['depth'] > 2:
                continue
            alpha = max(20, 55 - branch['depth'] * 18)
            bw = max(3, 10 - branch['depth'] * 3)
            col = _blend(dark_vein, stone_base, 0.2 + branch['depth'] * 0.15)
            _draw_vein_line(mid_draw, branch['points'], (*col, alpha), width=bw)

        mid_layer = mid_layer.filter(ImageFilter.GaussianBlur(radius=6))
        image.paste(
            Image.alpha_composite(image.convert("RGBA"), mid_layer).convert("RGB")
        )

        # ----- Layer 3: Sharp surface veins -----
        sharp_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sharp_draw = ImageDraw.Draw(sharp_layer)

        # Main vein — crisp, prominent
        _draw_vein_line(sharp_draw, main_path, (*dark_vein, 160), width=max(1, int(6 * _edge)))

        # White highlight alongside main vein (offset slightly)
        highlight_path = [(x + 3, y - 3) for x, y in main_path]
        _draw_vein_line(sharp_draw, highlight_path, (*white_hl, 50), width=2)

        # Secondary veins
        for branch in branches:
            if branch['depth'] > 1:
                continue
            alpha = max(60, 120 - branch['depth'] * 40)
            bw = max(2, 4 - branch['depth'])
            _draw_vein_line(sharp_draw, branch['points'], (*dark_vein, alpha), width=bw)
            # Faint white edge on secondaries
            hl = [(x + 2, y - 2) for x, y in branch['points']]
            _draw_vein_line(sharp_draw, hl, (*white_hl, 25), width=1)

        # Tertiary veins — very thin, translucent
        for branch in branches:
            if branch['depth'] < 2:
                continue
            alpha = max(15, 50 - branch['depth'] * 15)
            _draw_vein_line(sharp_draw, branch['points'], (*dark_vein, alpha), width=1)

        # Very light blur just to anti-alias
        sharp_layer = sharp_layer.filter(ImageFilter.GaussianBlur(radius=1))
        image.paste(
            Image.alpha_composite(image.convert("RGBA"), sharp_layer).convert("RGB")
        )

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """Polished stone inlay markers — subtle, embedded in the marble."""
        primary = palette.rgb("primary")
        dark = palette.darker("primary", 0.4)
        lighter = palette.lighter("primary", 0.45)

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 12, pos[1] // 12)
            if key in seen:
                continue
            seen.add(key)

            is_key = (i == len(data_lines) - 1)
            size = 18 if is_key else 10

            # Draw on RGBA layer for translucency
            marker = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
            md = ImageDraw.Draw(marker)

            # Outer: dark stone ring
            md.ellipse(
                [pos[0] - size - 2, pos[1] - size - 2,
                 pos[0] + size + 2, pos[1] + size + 2],
                fill=(*dark, 140 if is_key else 90)
            )
            # Inner: lighter polished fill
            md.ellipse(
                [pos[0] - size, pos[1] - size,
                 pos[0] + size, pos[1] + size],
                fill=(*lighter, 180 if is_key else 120)
            )
            # Highlight gleam
            hl_size = max(2, size // 3)
            hl_x = pos[0] - size // 3
            hl_y = pos[1] - size // 3
            md.ellipse(
                [hl_x, hl_y, hl_x + hl_size, hl_y + hl_size],
                fill=(255, 255, 255, 100 if is_key else 60)
            )

            image.paste(
                Image.alpha_composite(image.convert("RGBA"), marker).convert("RGB")
            )

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """Key moment: a radiating crack pattern in the marble, like an impact."""
        if not data_lines:
            return

        key = data_lines[-1]
        pos = self.map_point(key.x, key.y)
        dark_vein = palette.darker("primary", 0.5)
        white = (255, 255, 255)

        layer = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        rng = random.Random(99)

        # Radiating crack lines from the impact point
        num_cracks = rng.randint(8, 14)
        for _ in range(num_cracks):
            angle = rng.uniform(0, math.pi * 2)
            length = rng.uniform(40, 130)
            num_segs = rng.randint(3, 6)
            cx, cy = float(pos[0]), float(pos[1])
            pts = [(cx, cy)]
            dx = math.cos(angle)
            dy = math.sin(angle)
            for s in range(num_segs):
                seg_len = length / num_segs
                # Slight random deviation
                dev = rng.uniform(-0.3, 0.3)
                cos_d, sin_d = math.cos(dev), math.sin(dev)
                dx, dy = dx * cos_d - dy * sin_d, dx * sin_d + dy * cos_d
                cx += dx * seg_len
                cy += dy * seg_len
                pts.append((cx, cy))

            alpha = rng.randint(80, 180)
            width = rng.randint(1, 3)
            _draw_vein_line(ld, pts, (*dark_vein, alpha), width=width)
            # White highlight along crack
            hl_pts = [(x + 1, y - 1) for x, y in pts]
            _draw_vein_line(ld, hl_pts, (*white, alpha // 3), width=1)

        # Central stone inlay circle
        r = 20
        ld.ellipse(
            [pos[0] - r - 3, pos[1] - r - 3, pos[0] + r + 3, pos[1] + r + 3],
            fill=(*dark_vein, 160),
        )
        ld.ellipse(
            [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
            fill=(*palette.rgb("accent"), 200),
        )
        # Gleam
        ld.ellipse(
            [pos[0] - r // 2, pos[1] - r // 2,
             pos[0] - r // 2 + 8, pos[1] - r // 2 + 8],
            fill=(255, 255, 255, 120),
        )

        image.paste(
            Image.alpha_composite(image.convert("RGBA"), layer).convert("RGB")
        )

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """Polished stone vignette + fine grain overlay."""
        w, h = self.WIDTH, self.HEIGHT
        rgba = image.convert("RGBA")

        # --- Fine stone grain noise overlay ---
        grain = _perlin_noise(w, h, scale=8.0, octaves=2, seed=73)
        # Convert to very subtle brightness variation
        grain_arr = np.array(rgba, dtype=np.float32)
        grain_mod = 0.97 + 0.06 * grain  # very subtle
        grain_arr[:, :, 0] *= grain_mod
        grain_arr[:, :, 1] *= grain_mod
        grain_arr[:, :, 2] *= grain_mod
        grain_arr = np.clip(grain_arr, 0, 255).astype(np.uint8)
        rgba = Image.fromarray(grain_arr, "RGBA")

        # --- Vignette: edge darkening for polished stone curvature ---
        vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)

        cx, cy = w // 2, h // 2
        max_r = int(math.sqrt(cx * cx + cy * cy))
        start_r = int(max_r * 0.45)  # vignette starts earlier for heavy edge darkening

        for radius in range(max_r, start_r, -4):
            t = (radius - start_r) / (max_r - start_r)
            alpha = int(90 * t * t)  # quadratic ramp for smooth falloff
            alpha = min(90, max(0, alpha))
            vdraw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(20, 15, 10, alpha)  # warm dark tone
            )

        result = Image.alpha_composite(rgba, vignette)
        return result
