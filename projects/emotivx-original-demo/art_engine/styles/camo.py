"""
Camo Style — real military/urban camouflage in team colours.

Generates organic blob shapes using layered ellipse clusters with
smooth value-noise boundaries. Team colour analysis selects between
urban (dark teams), fire (bright teams), and woodland (default) variants.
Ball path rendered as a tactical dashed line with directional arrows.
"""

import math
import random
from typing import List, Tuple
from PIL import Image, ImageDraw, ImageFilter
from art_engine.styles.base import BaseStyle, Palette, DataLine

# ---------------------------------------------------------------------------
# Lightweight value noise (no external dependency)
# ---------------------------------------------------------------------------

_PERM: List[int] = []


def _init_perm(seed: int) -> None:
    """Build a permutation table seeded for reproducible noise."""
    global _PERM
    rng = random.Random(seed)
    p = list(range(256))
    rng.shuffle(p)
    _PERM = p + p  # doubled so we never need to wrap


def _fade(t: float) -> float:
    return t * t * t * (t * (t * 6 - 15) + 10)


def _lerp(a: float, b: float, t: float) -> float:
    return a + t * (b - a)


def _grad(h: int, x: float, y: float) -> float:
    h &= 3
    u = x if h < 2 else y
    v = y if h < 2 else x
    return (u if h & 1 == 0 else -u) + (v if h & 2 == 0 else -v)


def value_noise_2d(x: float, y: float) -> float:
    """Return a smooth noise value in roughly [-1, 1]."""
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


def fbm(x: float, y: float, octaves: int = 4, lacunarity: float = 2.0,
        gain: float = 0.5) -> float:
    """Fractional Brownian Motion — layered value noise."""
    total = 0.0
    amplitude = 1.0
    frequency = 1.0
    for _ in range(octaves):
        total += value_noise_2d(x * frequency, y * frequency) * amplitude
        frequency *= lacunarity
        amplitude *= gain
    return total


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _luminance(r: int, g: int, b: int) -> float:
    return 0.299 * r + 0.587 * g + 0.114 * b


def _blend(c1: Tuple[int, int, int], c2: Tuple[int, int, int],
           t: float) -> Tuple[int, int, int]:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _shift_towards(base: Tuple[int, int, int], target: Tuple[int, int, int],
                   amount: float) -> Tuple[int, int, int]:
    """Shift *base* colour partway towards *target*."""
    return _blend(base, target, amount)


def _darken(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (int(c[0] * (1 - f)), int(c[1] * (1 - f)), int(c[2] * (1 - f)))


def _lighten(c: Tuple[int, int, int], f: float) -> Tuple[int, int, int]:
    return (
        min(255, int(c[0] + (255 - c[0]) * f)),
        min(255, int(c[1] + (255 - c[1]) * f)),
        min(255, int(c[2] + (255 - c[2]) * f)),
    )


# ---------------------------------------------------------------------------
# Camo variant selection
# ---------------------------------------------------------------------------

def _detect_variant(palette: Palette) -> str:
    """Pick urban / fire / woodland based on team primary colour."""
    r, g, b = palette.hex_to_rgb(palette.primary)
    lum = _luminance(r, g, b)

    # Dark teams → urban camo
    if lum < 60:
        return "urban"

    # Warm bright teams → fire camo
    if r > 160 and g < 120 and lum > 60:
        return "fire"

    return "woodland"


def _build_camo_colours(palette: Palette) -> List[Tuple[int, int, int]]:
    """Return 5 camo tones derived from team colours + variant."""
    primary = palette.rgb("primary")
    secondary = palette.rgb("secondary")
    variant = _detect_variant(palette)

    if variant == "urban":
        # Grays, blacks, dark blues
        return [
            _darken(primary, 0.6),
            _shift_towards(primary, (50, 50, 60), 0.5),
            _shift_towards(secondary, (80, 80, 90), 0.4),
            _darken(secondary, 0.5),
            (30, 30, 35),
        ]

    if variant == "fire":
        # Reds, oranges, dark browns
        return [
            _darken(primary, 0.3),
            _shift_towards(primary, (180, 80, 20), 0.3),
            _shift_towards(secondary, (100, 50, 15), 0.5),
            _darken(primary, 0.55),
            (45, 25, 10),
        ]

    # Woodland — team primary shifted towards greens/browns
    return [
        _shift_towards(primary, (50, 70, 30), 0.45),
        _shift_towards(secondary, (80, 100, 40), 0.35),
        _darken(primary, 0.45),
        _shift_towards(primary, (70, 50, 25), 0.5),
        (25, 30, 15),
    ]


# ---------------------------------------------------------------------------
# Organic blob rendering
# ---------------------------------------------------------------------------

def _render_blob(draw: ImageDraw.Draw, cx: int, cy: int, base_r: int,
                 colour: Tuple[int, int, int], rng: random.Random,
                 noise_seed: float) -> None:
    """Draw one organic camo blob as a noise-deformed polygon."""
    points: List[Tuple[int, int]] = []
    num_vertices = 48  # smooth curve
    for i in range(num_vertices):
        angle = 2 * math.pi * i / num_vertices
        # Noise-based radius deformation
        nx = math.cos(angle) * 1.5 + noise_seed
        ny = math.sin(angle) * 1.5 + noise_seed
        deform = fbm(nx, ny, octaves=3, lacunarity=2.2, gain=0.55)
        r = base_r * (0.6 + 0.4 * (deform + 1) / 2)  # map to 0.6–1.0
        px = cx + int(r * math.cos(angle))
        py = cy + int(r * math.sin(angle))
        points.append((px, py))
    if len(points) >= 3:
        draw.polygon(points, fill=colour)


def _generate_camo_layer(draw: ImageDraw.Draw, width: int, height: int,
                         colours: List[Tuple[int, int, int]],
                         rng: random.Random, count: int,
                         size_range: Tuple[int, int],
                         noise_offset: float) -> None:
    """One pass of camo blobs at a given scale."""
    for i in range(count):
        cx = rng.randint(-size_range[1], width + size_range[1])
        cy = rng.randint(-size_range[1], height + size_range[1])
        base_r = rng.randint(size_range[0], size_range[1])
        colour = rng.choice(colours)
        _render_blob(draw, cx, cy, base_r, colour, rng,
                     noise_seed=noise_offset + i * 0.73)


# ---------------------------------------------------------------------------
# Tactical line helpers
# ---------------------------------------------------------------------------

def _draw_dashed_line(draw: ImageDraw.Draw,
                      p1: Tuple[int, int], p2: Tuple[int, int],
                      colour: Tuple[int, int, int], width: int,
                      dash_len: int = 28, gap_len: int = 14) -> None:
    """Draw a dashed line segment between two points."""
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = math.sqrt(dx * dx + dy * dy)
    if length < 1:
        return
    ux, uy = dx / length, dy / length
    drawn = 0.0
    on = True
    while drawn < length:
        seg = dash_len if on else gap_len
        seg = min(seg, length - drawn)
        if on:
            sx = int(p1[0] + ux * drawn)
            sy = int(p1[1] + uy * drawn)
            ex = int(p1[0] + ux * (drawn + seg))
            ey = int(p1[1] + uy * (drawn + seg))
            draw.line([(sx, sy), (ex, ey)], fill=colour, width=width)
        drawn += seg
        on = not on


def _draw_arrow(draw: ImageDraw.Draw,
                p1: Tuple[int, int], p2: Tuple[int, int],
                colour: Tuple[int, int, int], size: int = 18) -> None:
    """Draw a small directional arrowhead at the midpoint of a segment."""
    mx = (p1[0] + p2[0]) // 2
    my = (p1[1] + p2[1]) // 2
    dx = p2[0] - p1[0]
    dy = p2[1] - p1[1]
    length = math.sqrt(dx * dx + dy * dy)
    if length < 1:
        return
    ux, uy = dx / length, dy / length
    # Perpendicular
    px, py = -uy, ux
    tip = (int(mx + ux * size), int(my + uy * size))
    left = (int(mx - ux * size * 0.5 + px * size * 0.55),
            int(my - uy * size * 0.5 + py * size * 0.55))
    right = (int(mx - ux * size * 0.5 - px * size * 0.55),
             int(my - uy * size * 0.5 - py * size * 0.55))
    draw.polygon([tip, left, right], fill=colour)


# ---------------------------------------------------------------------------
# CamoStyle
# ---------------------------------------------------------------------------

class CamoStyle(BaseStyle):

    def render_background(self, draw: ImageDraw.Draw, image: Image.Image,
                          palette: Palette, render_params: dict = None) -> None:
        """Multi-layer organic camouflage in team-derived tones."""
        _density = 1.0
        if render_params:
            _density = max(0.1, render_params.get('bg_density', 4000) / 4000)

        seed = hash(palette.primary) % 100000
        _init_perm(seed)
        rng = random.Random(seed)

        camo_colours = _build_camo_colours(palette)

        # Base fill — darkest tone
        draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=camo_colours[-1])

        # Layer 1: very large blobs (background mass)
        _generate_camo_layer(draw, self.WIDTH, self.HEIGHT, camo_colours, rng,
                             count=max(1, int(25 * _density)), size_range=(200, 420), noise_offset=0.0)

        # Layer 2: medium blobs (mid detail)
        _generate_camo_layer(draw, self.WIDTH, self.HEIGHT, camo_colours, rng,
                             count=max(1, int(35 * _density)), size_range=(100, 260), noise_offset=50.0)

        # Layer 3: smaller accent blobs
        _generate_camo_layer(draw, self.WIDTH, self.HEIGHT, camo_colours, rng,
                             count=max(1, int(40 * _density)), size_range=(50, 140), noise_offset=100.0)

        # Layer 4: fine detail blobs
        _generate_camo_layer(draw, self.WIDTH, self.HEIGHT, camo_colours[:3], rng,
                             count=max(1, int(30 * _density)), size_range=(30, 80), noise_offset=150.0)

    def render_data_lines(self, draw: ImageDraw.Draw, image: Image.Image,
                          data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """Tactical dashed line with directional arrows — like a battle plan on a map."""
        if len(data_lines) < 2:
            return

        _edge = 1.0
        if render_params:
            _edge = max(0.2, render_params.get('edge_vis', 50) / 50)

        # Bright contrasting colour for the tactical line
        accent = palette.rgb("accent")
        accent_lum = _luminance(*accent)
        # If accent is too dark to pop, lighten it
        line_colour = _lighten(accent, 0.3) if accent_lum < 120 else accent
        outline_colour = _darken(line_colour, 0.7)

        points = [self.map_point(dl.x, dl.y) for dl in data_lines]

        # Dark outline pass (wider, behind the main line)
        for i in range(len(points) - 1):
            _draw_dashed_line(draw, points[i], points[i + 1],
                              outline_colour, width=max(1, int(8 * _edge)), dash_len=30, gap_len=16)

        # Bright tactical dashed line
        for i in range(len(points) - 1):
            _draw_dashed_line(draw, points[i], points[i + 1],
                              line_colour, width=max(1, int(5 * _edge)), dash_len=30, gap_len=16)

        # Directional arrows at every 2nd segment
        for i in range(0, len(points) - 1, 2):
            _draw_arrow(draw, points[i], points[i + 1],
                        line_colour, size=20)

        # Waypoint dots at each data point
        for i, pt in enumerate(points):
            is_end = (i == 0 or i == len(points) - 1)
            r = 8 if is_end else 5
            draw.ellipse([pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r],
                         fill=line_colour, outline=outline_colour, width=2)

    def render_actors(self, draw: ImageDraw.Draw, image: Image.Image,
                      data_lines: List[DataLine], palette: Palette) -> None:
        """Stencil-style squad markers at actor positions."""
        seen = set()
        accent = palette.rgb("accent")
        primary = palette.rgb("primary")

        for i, dl in enumerate(data_lines):
            pos = self.map_point(dl.x, dl.y)
            key = (pos[0] // 20, pos[1] // 20)
            if key in seen:
                continue
            seen.add(key)

            is_final = (i == len(data_lines) - 1)
            radius = 28 if is_final else 16

            # Black stencil outline
            draw.ellipse(
                [pos[0] - radius - 3, pos[1] - radius - 3,
                 pos[0] + radius + 3, pos[1] + radius + 3],
                fill=(0, 0, 0),
            )
            fill = primary if is_final else palette.rgb("secondary")
            draw.ellipse(
                [pos[0] - radius, pos[1] - radius,
                 pos[0] + radius, pos[1] + radius],
                fill=fill,
            )

            # Cross-hair on final position
            if is_final:
                ch = radius + 14
                draw.line([(pos[0] - ch, pos[1]), (pos[0] + ch, pos[1])],
                          fill=accent, width=2)
                draw.line([(pos[0], pos[1] - ch), (pos[0], pos[1] + ch)],
                          fill=accent, width=2)

    def render_moment_marker(self, draw: ImageDraw.Draw, image: Image.Image,
                             data_lines: List[DataLine], palette: Palette) -> None:
        """Target reticle at the key moment."""
        if not data_lines:
            return

        pos = self.map_point(data_lines[-1].x, data_lines[-1].y)
        accent = palette.rgb("accent")

        for r in [55, 75, 95]:
            draw.ellipse(
                [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
                outline=accent, width=2,
            )

        # Tick marks at cardinal directions on outer ring
        for angle in [0, math.pi / 2, math.pi, 3 * math.pi / 2]:
            ix = pos[0] + int(88 * math.cos(angle))
            iy = pos[1] + int(88 * math.sin(angle))
            ox = pos[0] + int(102 * math.cos(angle))
            oy = pos[1] + int(102 * math.sin(angle))
            draw.line([(ix, iy), (ox, oy)], fill=accent, width=3)

    def post_process(self, image: Image.Image, palette: Palette) -> Image.Image:
        """Light blur to soften blob edges, then sharpen for crispness."""
        image = image.filter(ImageFilter.GaussianBlur(radius=1.8))
        image = image.filter(ImageFilter.SHARPEN)
        return image
