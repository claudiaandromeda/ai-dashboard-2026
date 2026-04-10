"""
Classic Style — vintage 1960s sports poster / retro football programme.
Inspired by: FA Cup final programmes, vintage Olympic posters, Art Deco print.
Uses: halftone dot overlay, sunburst behind goal, Perlin paper texture,
      geometric Art Deco border, limited palette (primary + cream + gold + brown).
"""

import math
import random
from typing import List, Tuple
from PIL import Image, ImageDraw
from art_engine.styles.base import BaseStyle, Palette, DataLine
from art_engine.api_generate import GOAL_FOCAL_X, GOAL_FOCAL_Y


# ---------------------------------------------------------------------------
# Perlin noise (simplified 2D — no external dependency)
# ---------------------------------------------------------------------------

def _perlin_permutation(seed: int = 42) -> List[int]:
    """Generate a permutation table for Perlin noise."""
    rng = random.Random(seed)
    p = list(range(256))
    rng.shuffle(p)
    return p + p  # duplicate for overflow


_PERM = _perlin_permutation()


def _fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def _lerp(a: float, b: float, t: float) -> float:
    return a + t * (b - a)


def _grad(h: int, x: float, y: float) -> float:
    h = h & 3
    if h == 0:
        return x + y
    if h == 1:
        return -x + y
    if h == 2:
        return x - y
    return -x - y


def _perlin2d(x: float, y: float) -> float:
    """Return Perlin noise value in [-1, 1]."""
    xi = int(math.floor(x)) & 255
    yi = int(math.floor(y)) & 255
    xf = x - math.floor(x)
    yf = y - math.floor(y)
    u = _fade(xf)
    v = _fade(yf)
    aa = _PERM[_PERM[xi] + yi]
    ab = _PERM[_PERM[xi] + yi + 1]
    ba = _PERM[_PERM[xi + 1] + yi]
    bb = _PERM[_PERM[xi + 1] + yi + 1]
    return _lerp(
        _lerp(_grad(aa, xf, yf), _grad(ba, xf - 1, yf), u),
        _lerp(_grad(ab, xf, yf - 1), _grad(bb, xf - 1, yf - 1), u),
        v,
    )


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

_CREAM = (245, 235, 215)
_GOLD = (200, 170, 90)
_DARK_BROWN = (55, 35, 20)
_WARM_WHITE = (250, 242, 228)


def _quantize_to_palette(
    r: int, g: int, b: int,
    tones: List[Tuple[int, int, int]],
) -> Tuple[int, int, int]:
    """Snap an RGB colour to the nearest tone in a limited palette."""
    best = tones[0]
    best_d = float("inf")
    for t in tones:
        d = (r - t[0]) ** 2 + (g - t[1]) ** 2 + (b - t[2]) ** 2
        if d < best_d:
            best_d = d
            best = t
    return best


def _blend(c1: Tuple[int, int, int], c2: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    """Linear blend between two RGB colours, t in [0,1]."""
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


# ---------------------------------------------------------------------------
# Style implementation
# ---------------------------------------------------------------------------

class ClassicStyle(BaseStyle):

    # Generous border margin for the Art Deco frame
    _BORDER = 0.06  # fraction of canvas

    def _limited_palette(self, palette: Palette) -> List[Tuple[int, int, int]]:
        """Build the 5-tone vintage palette: primary, cream, gold, dark brown, warm white."""
        return [
            palette.rgb("primary"),
            _CREAM,
            _GOLD,
            _DARK_BROWN,
            _WARM_WHITE,
        ]

    # ------------------------------------------------------------------
    # Paper texture
    # ------------------------------------------------------------------

    def _paper_texture(self, image: Image.Image) -> None:
        """Apply warm Perlin-noise paper texture (yellowed grain)."""
        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        pixels = overlay.load()

        scale = 5.0  # noise frequency
        rng = random.Random(12)
        for y in range(0, self.HEIGHT, 2):
            for x in range(0, self.WIDTH, 2):
                n = _perlin2d(x / self.WIDTH * scale, y / self.HEIGHT * scale)
                n = (n + 1) / 2  # normalise to 0-1

                # Fine grain jitter
                jitter = rng.randint(-8, 8)

                # Subtle grain — light/dark variation only, not a colour overlay
                val = int(n * 20 + jitter)
                a = max(0, min(30, abs(val) + 5))  # much more subtle
                c = (255, 255, 255, a) if val > 0 else (0, 0, 0, a)
                pixels[x, y] = c
                # Fill the 2×2 block
                if x + 1 < self.WIDTH:
                    pixels[x + 1, y] = c
                if y + 1 < self.HEIGHT:
                    pixels[x, y + 1] = c
                    if x + 1 < self.WIDTH:
                        pixels[x + 1, y + 1] = c

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    # ------------------------------------------------------------------
    # Art Deco border
    # ------------------------------------------------------------------

    def _art_deco_border(self, draw: ImageDraw.Draw, image: Image.Image, palette: Palette) -> None:
        """Draw a geometric Art Deco frame with team-colour accents."""
        primary = palette.rgb("primary")
        bw = int(self._BORDER * self.WIDTH)
        bh = int(self._BORDER * self.HEIGHT)

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        # Outer frame — subtle blend with primary (no harsh black when tiled)
        border_color = _blend(primary, _DARK_BROWN, 0.7)  # 70% primary, 30% dark brown
        odraw.rectangle(
            [0, 0, self.WIDTH - 1, self.HEIGHT - 1],
            outline=(*border_color, 120), width=6,  # More transparent, thinner
        )
        # Inner frame — team primary
        odraw.rectangle(
            [bw, bh, self.WIDTH - bw, self.HEIGHT - bh],
            outline=(*primary, 220), width=4,
        )
        # Second inner line — gold
        inset = 14
        odraw.rectangle(
            [bw + inset, bh + inset,
             self.WIDTH - bw - inset, self.HEIGHT - bh - inset],
            outline=(*_GOLD, 200), width=2,
        )

        # Corner ornaments — Art Deco chevrons
        corner_size = int(bw * 1.2)
        corners = [
            (bw, bh),                                           # top-left
            (self.WIDTH - bw, bh),                              # top-right
            (bw, self.HEIGHT - bh),                             # bottom-left
            (self.WIDTH - bw, self.HEIGHT - bh),                # bottom-right
        ]
        for ci, (cx, cy) in enumerate(corners):
            # Direction multipliers
            dx = 1 if ci % 2 == 0 else -1
            dy = 1 if ci < 2 else -1
            for layer in range(3):
                offset = layer * 12
                s = corner_size - offset
                pts = [
                    (cx, cy + dy * offset),
                    (cx + dx * s, cy + dy * offset),
                    (cx + dx * offset, cy + dy * s),
                ]
                alpha = 200 - layer * 50
                color = primary if layer == 0 else _GOLD
                odraw.line(
                    [pts[1], pts[0], pts[2]],
                    fill=(*color, alpha), width=2,
                )

        # Horizontal accent bars (top and bottom)
        bar_y_top = bh // 2
        bar_y_bot = self.HEIGHT - bh // 2
        for bar_y in [bar_y_top, bar_y_bot]:
            odraw.line(
                [(bw * 2, bar_y), (self.WIDTH - bw * 2, bar_y)],
                fill=(*_GOLD, 180), width=3,
            )
            # Small diamond in centre of bar
            mid_x = self.WIDTH // 2
            d = 8
            diamond = [(mid_x, bar_y - d), (mid_x + d, bar_y),
                       (mid_x, bar_y + d), (mid_x - d, bar_y)]
            odraw.polygon(diamond, fill=(*primary, 220))

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    # ------------------------------------------------------------------
    # Typography composition guides
    # ------------------------------------------------------------------

    def _typography_guides(self, draw: ImageDraw.Draw, image: Image.Image, palette: Palette) -> None:
        """Draw faint guide boxes where GOAL / match text would sit."""
        bw = int(self._BORDER * self.WIDTH)
        bh = int(self._BORDER * self.HEIGHT)

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        # Top title block
        title_top = bh + 30
        title_bot = bh + 140
        odraw.rectangle(
            [bw + 40, title_top, self.WIDTH - bw - 40, title_bot],
            outline=(*_GOLD, 50), width=1,
        )
        # Faint centre line for text alignment
        mid_y = (title_top + title_bot) // 2
        odraw.line(
            [(bw + 80, mid_y), (self.WIDTH - bw - 80, mid_y)],
            fill=(*_GOLD, 30), width=1,
        )

        # Bottom info block
        info_top = self.HEIGHT - bh - 130
        info_bot = self.HEIGHT - bh - 30
        odraw.rectangle(
            [bw + 40, info_top, self.WIDTH - bw - 40, info_bot],
            outline=(*_GOLD, 50), width=1,
        )

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    # ------------------------------------------------------------------
    # Halftone overlay
    # ------------------------------------------------------------------

    def _halftone_overlay(self, image: Image.Image, palette: Palette) -> None:
        """
        Convert the image to a halftone dot pattern — varying circle radius
        based on local brightness, like old newspaper/programme print.
        """
        dot_spacing = 10  # px between dot centres
        max_radius = dot_spacing * 0.48

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        # Sample the current image brightness
        grey = image.convert("L")
        grey_px = grey.load()

        for cy in range(0, self.HEIGHT, dot_spacing):
            for cx in range(0, self.WIDTH, dot_spacing):
                # Average brightness in a small area
                sx = min(cx, self.WIDTH - 1)
                sy = min(cy, self.HEIGHT - 1)
                brightness = grey_px[sx, sy] / 255.0  # 0=black, 1=white

                # In halftone: darker areas get bigger dots
                radius = max_radius * (1.0 - brightness)
                if radius < 0.8:
                    continue

                r = int(radius)
                odraw.ellipse(
                    [cx - r, cy - r, cx + r, cy + r],
                    fill=(*_DARK_BROWN, 55),
                )

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    # ------------------------------------------------------------------
    # Radial sunburst
    # ------------------------------------------------------------------

    def _sunburst(self, image: Image.Image, goal_pos: Tuple[int, int], palette: Palette) -> None:
        """Radial sunburst behind the goal point — vintage Japanese-flag style."""
        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        primary = palette.rgb("primary")
        cx, cy = goal_pos
        num_rays = 36
        max_r = int(self.WIDTH * 0.55)

        for i in range(num_rays):
            angle1 = (2 * math.pi * i) / num_rays
            angle2 = (2 * math.pi * (i + 0.5)) / num_rays

            # Alternating rays: primary colour, then cream
            if i % 2 == 0:
                color = (*primary, 35)
            else:
                color = (*_CREAM, 20)

            # Build triangle fan from centre
            x1 = cx + int(math.cos(angle1) * max_r)
            y1 = cy + int(math.sin(angle1) * max_r)
            x2 = cx + int(math.cos(angle2) * max_r)
            y2 = cy + int(math.sin(angle2) * max_r)

            odraw.polygon([(cx, cy), (x1, y1), (x2, y2)], fill=color)

        # Soft fade: radial gradient mask so rays fade out at the edges
        mask = Image.new("L", (self.WIDTH, self.HEIGHT), 0)
        mdraw = ImageDraw.Draw(mask)
        for r in range(max_r, 0, -4):
            alpha = int(255 * (r / max_r) ** 0.5)
            mdraw.ellipse(
                [cx - r, cy - r, cx + r, cy + r],
                fill=alpha,
            )
        overlay.putalpha(Image.composite(
            overlay.getchannel("A"), Image.new("L", (self.WIDTH, self.HEIGHT), 0), mask
        ))

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    # ==================================================================
    # Main rendering methods (BaseStyle interface)
    # ==================================================================

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image, palette: Palette, render_params: dict = None) -> None:
        """
        Vintage poster background — team primary as the dominant colour,
        with a warm paper texture overlay and vignette to give the aged feel.
        Secondary colour used as a subtle gradient highlight.
        """
        _density = 1.0
        if render_params:
            _density = max(0.1, render_params.get('bg_density', 4000) / 4000)

        primary = palette.rgb("primary")
        secondary = palette.rgb("secondary")

        # Base fill — team primary colour
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=primary)

        # Art focal point — set dynamically by api_generate from the actual goal position
        # in the scaled data path. Gradient always centres where the data actually is.
        focal_x = getattr(self, '_focal_x', GOAL_FOCAL_X)
        focal_y = getattr(self, '_focal_y', GOAL_FOCAL_Y)
        cx, cy = int(self.WIDTH * focal_x), int(self.HEIGHT * focal_y)
        max_r = int(math.hypot(cx, cy))
        grad = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(grad)
        for radius in range(max_r, 0, -6):
            frac = radius / max_r  # 1.0 at edge → 0.0 at centre
            # Lighten toward centre using secondary colour blend
            r = int(primary[0] + (secondary[0] - primary[0]) * (1.0 - frac) * 0.25)
            g = int(primary[1] + (secondary[1] - primary[1]) * (1.0 - frac) * 0.25)
            b = int(primary[2] + (secondary[2] - primary[2]) * (1.0 - frac) * 0.25)
            a = int(120 * (1.0 - frac) * _density)  # transparent at edge, opaque at centre
            gdraw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                          fill=(r, g, b, a))
        image.paste(Image.alpha_composite(image.convert("RGBA"), grad), (0, 0))

        # Paper/grain texture overlay (very subtle — just adds aged tactile feel)
        self._paper_texture(image)

        # Dark vignette at edges (uses darker shade of primary)
        pr, pg, pb = primary
        dark = (max(0, pr - 40), max(0, pg - 40), max(0, pb - 40))
        vignette = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        vdraw = ImageDraw.Draw(vignette)
        fade_start = int(max_r * 0.55)
        for radius in range(max_r, fade_start, -4):
            frac = (radius - fade_start) / (max_r - fade_start)
            a = int(100 * frac * _density)
            vdraw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                          fill=(*dark, a))
        image.paste(Image.alpha_composite(image.convert("RGBA"), vignette), (0, 0))

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """
        The data line drawn as a thick confident brush stroke.
        Thick line with rough edges and colour from the limited palette.
        """
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        primary = palette.rgb("primary")
        tones = self._limited_palette(palette)

        # Build pixel path
        path_px: List[Tuple[int, int]] = []
        for dl in data_lines:
            path_px.append(self.map_point(dl.x, dl.y))

        # --- Sunburst behind the goal point ---
        # Same focal point as the gradient — both follow the goal event.
        focal_x = getattr(self, '_focal_x', GOAL_FOCAL_X)
        focal_y = getattr(self, '_focal_y', GOAL_FOCAL_Y)
        goal_px = (int(self.WIDTH * focal_x), int(self.HEIGHT * focal_y))
        self._sunburst(image, goal_px, palette)

        # --- Brush stroke ---
        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        rng = random.Random(55)

        for i in range(len(path_px) - 1):
            p1 = path_px[i]
            p2 = path_px[i + 1]
            progress = i / max(1, len(path_px) - 2)

            # Colour: dark brown → team primary as we approach the goal
            stroke_color = _blend(_DARK_BROWN, primary, progress)
            stroke_color = _quantize_to_palette(*stroke_color, tones)

            # Width: thick, tapering from 14 down to 8, then swelling to 16 at the end
            base_width = int(12 * _edge)
            if progress < 0.8:
                width = max(1, int(base_width - progress * 4 * _edge))
            else:
                width = max(1, int(base_width + (progress - 0.8) * 30 * _edge))

            # Subdivide for brush-like texture (slight jitter)
            segments = 16
            prev = p1
            for s in range(1, segments + 1):
                t = s / segments
                mx = int(p1[0] + (p2[0] - p1[0]) * t)
                my = int(p1[1] + (p2[1] - p1[1]) * t)
                # Small perpendicular jitter for brush texture
                if 0 < s < segments:
                    mx += rng.randint(-2, 2)
                    my += rng.randint(-2, 2)
                odraw.line(
                    [prev, (mx, my)],
                    fill=(*stroke_color, 230),
                    width=width,
                )
                prev = (mx, my)

            # Slightly offset shadow stroke for depth
            shadow_offset = 3
            prev = p1
            for s in range(1, segments + 1):
                t = s / segments
                mx = int(p1[0] + (p2[0] - p1[0]) * t) + shadow_offset
                my = int(p1[1] + (p2[1] - p1[1]) * t) + shadow_offset
                odraw.line(
                    [prev, (mx, my)],
                    fill=(*_DARK_BROWN, 40),
                    width=width + 2,
                )
                prev = (mx, my)

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """Vintage-styled event markers — solid circles with cream outlines."""
        if not data_lines:
            return

        primary = palette.rgb("primary")

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        seen = set()
        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 14, pos[1] // 14)
            if key in seen:
                continue
            seen.add(key)

            is_final = i == len(data_lines) - 1
            radius = 16 if is_final else 9

            if is_final:
                # Goal marker — large, gold fill, dark outline
                odraw.ellipse(
                    [pos[0] - radius - 4, pos[1] - radius - 4,
                     pos[0] + radius + 4, pos[1] + radius + 4],
                    fill=(*_DARK_BROWN, 80),
                )
                odraw.ellipse(
                    [pos[0] - radius, pos[1] - radius,
                     pos[0] + radius, pos[1] + radius],
                    fill=(*_GOLD, 255),
                    outline=(*_DARK_BROWN, 255), width=3,
                )
            else:
                # Event dots — primary fill, cream outline
                odraw.ellipse(
                    [pos[0] - radius, pos[1] - radius,
                     pos[0] + radius, pos[1] + radius],
                    fill=(*primary, 200),
                    outline=(*_CREAM, 220), width=2,
                )

            # Sequence number (small, dark)
            try:
                from PIL import ImageFont
                font = ImageFont.load_default()
                text = str(dl.sequence)
                bbox = font.getbbox(text)
                tw = bbox[2] - bbox[0]
                th = bbox[3] - bbox[1]
                txt_color = _DARK_BROWN if is_final else _CREAM
                odraw.text(
                    (pos[0] - tw // 2, pos[1] - th // 2),
                    text, fill=(*txt_color, 240), font=font,
                )
            except Exception:
                pass

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """Concentric vintage rings around the goal moment with gold accents."""
        if not data_lines:
            return

        key = data_lines[-1]
        pos = self.map_point(key.x, key.y)
        primary = palette.rgb("primary")

        overlay = Image.new("RGBA", (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        # Concentric rings — alternating primary and gold, fading outward
        ring_radii = [30, 45, 65, 90]
        ring_colors = [primary, _GOLD, primary, _GOLD]
        for r, color in zip(ring_radii, ring_colors):
            alpha = int(200 - (r / 90) * 130)
            odraw.ellipse(
                [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
                outline=(*color, alpha), width=3,
            )

        # Cross-hair lines (vintage targeting)
        cross_len = 50
        for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            inner = 25
            outer = inner + cross_len
            odraw.line(
                [(pos[0] + dx * inner, pos[1] + dy * inner),
                 (pos[0] + dx * outer, pos[1] + dy * outer)],
                fill=(*_GOLD, 140), width=2,
            )

        image.paste(Image.alpha_composite(image.convert("RGBA"), overlay), (0, 0))

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """
        Final compositing: Art Deco border, halftone overlay, typography guides.
        Applied last so they sit on top of everything.
        """
        # Art Deco geometric border
        self._art_deco_border(ImageDraw.Draw(image), image, palette)

        # Typography composition guides
        self._typography_guides(ImageDraw.Draw(image), image, palette)

        # Halftone dot pattern (old print technique)
        self._halftone_overlay(image, palette)

        return image
