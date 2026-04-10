"""
Line Effects — 6 visual treatments for the data line (trajectory path).

Each effect takes a list of (x, y) pixel coordinates, a team colour, canvas size,
and an intensity float, and returns an RGBA PIL Image on transparent background.

Available effects: default, laser, flame, lightning, ink, dotted
"""

import math
import random
from typing import List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Type aliases
Point = Tuple[int, int]
Color = Tuple[int, int, int]

EFFECTS = ["default", "laser", "flame", "lightning", "ink", "dotted"]


def get_line_effect(name: str):
    """Return the effect function by name."""
    registry = {
        "default": effect_default,
        "laser": effect_laser,
        "flame": effect_flame,
        "lightning": effect_lightning,
        "ink": effect_ink,
        "dotted": effect_dotted,
    }
    if name not in registry:
        raise ValueError(f"Unknown line effect '{name}'. Available: {list(registry.keys())}")
    return registry[name]


def render_line_effect(
    name: str,
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Convenience: render a named effect and return the RGBA image."""
    fn = get_line_effect(name)
    return fn(points, color, canvas_size, intensity)


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _segment_length(p1: Point, p2: Point) -> float:
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])


def _lerp_color(c1: Color, c2: Color, t: float) -> Color:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _interpolate_points(points: List[Point], spacing: float = 2.0) -> List[Point]:
    """Resample a polyline so points are approximately `spacing` pixels apart."""
    if len(points) < 2:
        return list(points)
    out = [points[0]]
    for i in range(1, len(points)):
        p0 = out[-1]
        p1 = points[i]
        d = _segment_length(p0, p1)
        if d < 1:
            continue
        n = max(1, int(d / spacing))
        for j in range(1, n + 1):
            t = j / n
            out.append((int(p0[0] + (p1[0] - p0[0]) * t),
                         int(p0[1] + (p1[1] - p0[1]) * t)))
    return out


def _normal_at(points: List[Point], idx: int) -> Tuple[float, float]:
    """Return the unit normal (perpendicular) at a point on the polyline."""
    if idx == 0:
        dx = points[1][0] - points[0][0]
        dy = points[1][1] - points[0][1]
    elif idx >= len(points) - 1:
        dx = points[-1][0] - points[-2][0]
        dy = points[-1][1] - points[-2][1]
    else:
        dx = points[idx + 1][0] - points[idx - 1][0]
        dy = points[idx + 1][1] - points[idx - 1][1]
    length = math.hypot(dx, dy)
    if length < 1e-6:
        return (0.0, -1.0)
    return (-dy / length, dx / length)


def _angle_at(points: List[Point], idx: int) -> float:
    """Return the turning angle (radians) at a point. 0 for endpoints."""
    if idx <= 0 or idx >= len(points) - 1:
        return 0.0
    v1x = points[idx][0] - points[idx - 1][0]
    v1y = points[idx][1] - points[idx - 1][1]
    v2x = points[idx + 1][0] - points[idx][0]
    v2y = points[idx + 1][1] - points[idx][1]
    dot = v1x * v2x + v1y * v2y
    m1 = math.hypot(v1x, v1y)
    m2 = math.hypot(v2x, v2y)
    if m1 < 1e-6 or m2 < 1e-6:
        return 0.0
    cos_a = max(-1.0, min(1.0, dot / (m1 * m2)))
    return math.acos(cos_a)


# ---------------------------------------------------------------------------
# 1. DEFAULT — Flowing ribbon with glow aura
# ---------------------------------------------------------------------------

def _bezier_smooth(points: List[Point], num_output: int = 200) -> List[Tuple[float, float]]:
    """Smooth a polyline using cubic bezier-spline interpolation (centripetal Catmull-Rom)."""
    if len(points) < 2:
        return [(float(p[0]), float(p[1])) for p in points]
    if len(points) == 2:
        out = []
        for i in range(num_output):
            t = i / (num_output - 1)
            out.append((
                points[0][0] + (points[1][0] - points[0][0]) * t,
                points[0][1] + (points[1][1] - points[0][1]) * t,
            ))
        return out

    # Pad endpoints so the spline passes through first and last point
    pts = [points[0]] + list(points) + [points[-1]]
    segments = len(pts) - 3  # number of curve segments
    per_seg = max(2, num_output // segments)

    result = []
    for i in range(segments):
        p0, p1, p2, p3 = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
        for j in range(per_seg):
            t = j / per_seg
            t2 = t * t
            t3 = t2 * t
            # Catmull-Rom basis
            x = 0.5 * (
                (2 * p1[0])
                + (-p0[0] + p2[0]) * t
                + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2
                + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
            )
            y = 0.5 * (
                (2 * p1[1])
                + (-p0[1] + p2[1]) * t
                + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2
                + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
            )
            result.append((x, y))
    # Add the final point
    result.append((float(pts[-2][0]), float(pts[-2][1])))
    return result


def _ribbon_width_at(t: float, original_points: List[Point], smooth_pts: List[Tuple[float, float]],
                     idx: int, intensity: float) -> float:
    """Compute ribbon half-width: thicker near key events (original input points), thinner between."""
    base_min = 1.5 * intensity
    base_max = 5.0 * intensity

    # Find distance to nearest original input point (mapped to smooth curve)
    n_orig = len(original_points)
    n_smooth = len(smooth_pts)
    min_dist = float("inf")
    sx, sy = smooth_pts[idx]
    for op in original_points:
        d = math.hypot(sx - op[0], sy - op[1])
        if d < min_dist:
            min_dist = d

    # Proximity factor: closer to key event → thicker
    proximity = max(0.0, 1.0 - min_dist / 60.0)
    w = base_min + (base_max - base_min) * proximity

    # Gentle sinusoidal breathing for organic feel
    w += 0.8 * intensity * math.sin(t * math.pi * 4)

    return max(base_min, w)


def effect_default(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Flowing ribbon — bezier-smooth path, variable width, colour gradient, soft glow aura."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    # --- Smooth the path with Catmull-Rom spline ---
    smooth = _bezier_smooth(points, num_output=max(100, len(points) * 40))
    n = len(smooth)

    # --- Compute normals for the smooth curve ---
    normals = []
    for i in range(n):
        if i == 0:
            dx, dy = smooth[1][0] - smooth[0][0], smooth[1][1] - smooth[0][1]
        elif i == n - 1:
            dx, dy = smooth[-1][0] - smooth[-2][0], smooth[-1][1] - smooth[-2][1]
        else:
            dx, dy = smooth[i + 1][0] - smooth[i - 1][0], smooth[i + 1][1] - smooth[i - 1][1]
        length = math.hypot(dx, dy)
        if length < 1e-6:
            normals.append((0.0, -1.0))
        else:
            normals.append((-dy / length, dx / length))

    # --- Colour gradient: lighter start → saturated team colour at end ---
    light_color = (
        min(255, color[0] + 100),
        min(255, color[1] + 100),
        min(255, color[2] + 100),
    )

    # --- Layer 1: Soft glow aura (wide, blurred) ---
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")
    glow_alpha = int(45 * intensity)
    # Draw glow as a thick line along the smooth path
    glow_pts = [(int(round(p[0])), int(round(p[1]))) for p in smooth]
    # Draw in segments with colour gradient for the glow too
    seg_step = max(1, n // 80)
    for i in range(0, n - 1, seg_step):
        j = min(i + seg_step, n - 1)
        t = i / max(1, n - 1)
        gc = _lerp_color(light_color, color, t)
        d_glow.line(
            [glow_pts[i], glow_pts[j]],
            fill=(*gc, glow_alpha),
            width=int(18 * intensity),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(8 * intensity)))
    img = Image.alpha_composite(img, glow)

    # --- Layer 2: Ribbon body (variable-width polygon) ---
    ribbon = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_ribbon = ImageDraw.Draw(ribbon, "RGBA")

    # Build upper and lower edges of the ribbon
    upper_edge = []
    lower_edge = []
    widths = []
    for i in range(n):
        t = i / max(1, n - 1)
        hw = _ribbon_width_at(t, points, smooth, i, intensity)
        widths.append(hw)
        nx, ny = normals[i]
        upper_edge.append((smooth[i][0] + nx * hw, smooth[i][1] + ny * hw))
        lower_edge.append((smooth[i][0] - nx * hw, smooth[i][1] - ny * hw))

    # Draw ribbon as gradient-filled segments (quad strips)
    seg_count = max(1, n // 3)
    for seg in range(seg_count):
        i_start = seg * (n - 1) // seg_count
        i_end = min((seg + 1) * (n - 1) // seg_count, n - 1)
        if i_start >= i_end:
            continue
        t = i_start / max(1, n - 1)
        seg_color = _lerp_color(light_color, color, t)
        # Alpha varies: slightly transparent at edges of path, solid in the middle
        alpha = int(180 + 60 * t * intensity)
        alpha = min(240, alpha)

        # Build quad polygon for this segment
        top_pts = [(int(round(upper_edge[k][0])), int(round(upper_edge[k][1])))
                   for k in range(i_start, i_end + 1)]
        bot_pts = [(int(round(lower_edge[k][0])), int(round(lower_edge[k][1])))
                   for k in range(i_start, i_end + 1)]
        poly = top_pts + list(reversed(bot_pts))
        if len(poly) >= 3:
            d_ribbon.polygon(poly, fill=(*seg_color, alpha))

    # Slight smoothing to remove polygon seams
    ribbon = ribbon.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, ribbon)

    # --- Layer 3: Bright centre-line highlight ---
    highlight = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_hl = ImageDraw.Draw(highlight, "RGBA")
    for i in range(n - 1):
        t = i / max(1, n - 1)
        # White-ish highlight fading from bright to team colour
        hl_color = _lerp_color((255, 255, 255), light_color, t * 0.7)
        hl_alpha = int((120 - 40 * t) * intensity)
        d_hl.line(
            [(int(round(smooth[i][0])), int(round(smooth[i][1]))),
             (int(round(smooth[i + 1][0])), int(round(smooth[i + 1][1])))],
            fill=(*hl_color, hl_alpha),
            width=max(1, int(1.5 * intensity)),
        )
    highlight = highlight.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, highlight)

    return img


# ---------------------------------------------------------------------------
# 2. LASER — Sci-fi laser beam with lens flares and sparks
# ---------------------------------------------------------------------------

def _radial_gradient_circle(
    draw: ImageDraw.ImageDraw,
    centre: Point,
    radius: float,
    color: Tuple[int, int, int, int],
    steps: int = 12,
) -> None:
    """Draw a filled circle with radial alpha falloff (bright centre -> transparent edge)."""
    for s in range(steps, 0, -1):
        t = s / steps
        r = radius * t
        a = int(color[3] * (1.0 - (1.0 - 1.0 / steps * (steps - s + 1)) ** 0.6))
        if r < 0.5:
            continue
        draw.ellipse(
            [centre[0] - r, centre[1] - r, centre[0] + r, centre[1] + r],
            fill=(color[0], color[1], color[2], a),
        )


def effect_laser(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Sci-fi laser beam — razor-thin white core, team-colour glow halo,
    outer diffuse bloom, chromatic aberration, lens flares at bends,
    and spark particles at corners.  Star Wars blaster bolt aesthetic."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(42)
    w, h = canvas_size

    # Straight segments between the original points (lasers don't curve)
    def _draw_segments(draw, pts, fill, width):
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i + 1]], fill=fill, width=width)

    bright = (min(255, color[0] + 80), min(255, color[1] + 80), min(255, color[2] + 80))

    # ------------------------------------------------------------------
    # Layer 1: Outer diffuse bloom (wide, low alpha, heavy blur 20-30px)
    # ------------------------------------------------------------------
    bloom = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_bloom = ImageDraw.Draw(bloom, "RGBA")
    bloom_alpha = max(1, int(40 * intensity))
    _draw_segments(d_bloom, points, (*color, bloom_alpha), max(4, int(18 * intensity)))
    bloom = bloom.filter(ImageFilter.GaussianBlur(radius=max(1, int(25 * intensity))))
    img = Image.alpha_composite(img, bloom)

    # ------------------------------------------------------------------
    # Layer 2: Team-colour glow halo (gaussian blur 8-12px)
    # ------------------------------------------------------------------
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")
    glow_alpha = max(1, int(160 * intensity))
    _draw_segments(d_glow, points, (*bright, glow_alpha), max(3, int(6 * intensity)))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(1, int(10 * intensity))))
    img = Image.alpha_composite(img, glow)

    # ------------------------------------------------------------------
    # Layer 3: Chromatic aberration — offset red and blue channels 1-2px
    # ------------------------------------------------------------------
    ca_offset = max(1, int(2 * intensity))
    ca_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_ca = ImageDraw.Draw(ca_layer, "RGBA")
    ca_alpha = max(1, int(70 * intensity))
    # Red channel shifted one direction
    red_pts = [(p[0] - ca_offset, p[1] + ca_offset) for p in points]
    _draw_segments(d_ca, red_pts, (255, 60, 60, ca_alpha), max(2, int(4 * intensity)))
    # Blue channel shifted the other
    blue_pts = [(p[0] + ca_offset, p[1] - ca_offset) for p in points]
    _draw_segments(d_ca, blue_pts, (60, 60, 255, ca_alpha), max(2, int(4 * intensity)))
    ca_layer = ca_layer.filter(ImageFilter.GaussianBlur(radius=max(1, int(3 * intensity))))
    img = Image.alpha_composite(img, ca_layer)

    # ------------------------------------------------------------------
    # Layer 4: Razor-thin bright white core (1-2px)
    # ------------------------------------------------------------------
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    core_alpha = min(255, max(1, int(245 * intensity)))
    _draw_segments(d_core, points, (255, 255, 255, core_alpha), max(1, min(2, int(2 * intensity))))
    img = Image.alpha_composite(img, core)

    # ------------------------------------------------------------------
    # Layer 5: Lens flares at direction changes (radial gradient dots)
    # ------------------------------------------------------------------
    flare_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_flare = ImageDraw.Draw(flare_layer, "RGBA")
    for i in range(1, len(points) - 1):
        angle = _angle_at(points, i)
        if angle > 0.15:
            pt = points[i]
            strength = min(1.0, angle / math.pi)
            flare_r = int((8 + 12 * strength) * intensity)
            flare_a = min(255, int((140 + 100 * strength) * intensity))

            # Radial gradient glow disc
            _radial_gradient_circle(
                d_flare, pt, flare_r,
                (255, 255, 255, flare_a), steps=16,
            )
            # Cross-hair spikes (horiz + vert + diagonals)
            spike_len = int(flare_r * 2.5)
            spike_a = min(255, int(flare_a * 0.7))
            for dx, dy in [(1, 0), (0, 1), (0.7, 0.7), (0.7, -0.7)]:
                d_flare.line(
                    [(pt[0] - int(dx * spike_len), pt[1] - int(dy * spike_len)),
                     (pt[0] + int(dx * spike_len), pt[1] + int(dy * spike_len))],
                    fill=(255, 255, 255, spike_a), width=1,
                )
            # Coloured flare ring
            ring_r = int(flare_r * 0.6)
            ring_a = min(255, int(flare_a * 0.5))
            _radial_gradient_circle(
                d_flare, pt, ring_r,
                (*bright, ring_a), steps=10,
            )
    flare_layer = flare_layer.filter(ImageFilter.GaussianBlur(radius=max(1, int(2 * intensity))))
    img = Image.alpha_composite(img, flare_layer)

    # ------------------------------------------------------------------
    # Layer 6: Sparks / particles at corners where laser bends
    # ------------------------------------------------------------------
    sparks = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_sparks = ImageDraw.Draw(sparks, "RGBA")
    for i in range(1, len(points) - 1):
        angle = _angle_at(points, i)
        if angle > 0.15:
            pt = points[i]
            strength = min(1.0, angle / math.pi)
            n_sparks = int((6 + 14 * strength) * intensity)

            # Bisector direction (sparks spray outward from bend)
            v1x = points[i][0] - points[i - 1][0]
            v1y = points[i][1] - points[i - 1][1]
            v2x = points[i + 1][0] - points[i][0]
            v2y = points[i + 1][1] - points[i][1]
            m1 = math.hypot(v1x, v1y) or 1
            m2 = math.hypot(v2x, v2y) or 1
            bx = -(v1x / m1 + v2x / m2)
            by = -(v1y / m1 + v2y / m2)
            bm = math.hypot(bx, by) or 1
            bx, by = bx / bm, by / bm

            for _ in range(n_sparks):
                # Spray in a cone around the bisector
                spread = rng.gauss(0, 0.7)
                cos_s, sin_s = math.cos(spread), math.sin(spread)
                sx_dir = bx * cos_s - by * sin_s
                sy_dir = bx * sin_s + by * cos_s
                dist = rng.uniform(6, 35) * intensity * strength
                sx = max(0, min(w - 1, pt[0] + int(sx_dir * dist + rng.gauss(0, 2))))
                sy = max(0, min(h - 1, pt[1] + int(sy_dir * dist + rng.gauss(0, 2))))
                r = rng.uniform(0.5, 2.0) * intensity
                sa = min(255, int(rng.uniform(120, 255) * intensity * strength))
                spark_color = rng.choice([
                    (255, 255, 255, sa),
                    (255, 240, 200, sa),
                    (*bright, sa),
                ])
                d_sparks.ellipse([sx - r, sy - r, sx + r, sy + r], fill=spark_color)
                # Spark streak trailing back toward bend
                tail_len = rng.uniform(2, 8) * intensity
                tx = sx - int(sx_dir * tail_len)
                ty = sy - int(sy_dir * tail_len)
                d_sparks.line([(tx, ty), (sx, sy)],
                              fill=(255, 255, 255, max(1, sa // 2)), width=1)
    sparks = sparks.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, sparks)

    # ------------------------------------------------------------------
    # Layer 7: Hot endpoint caps (start / end of beam)
    # ------------------------------------------------------------------
    caps = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_caps = ImageDraw.Draw(caps, "RGBA")
    for ep in [points[0], points[-1]]:
        cap_r = max(3, int(5 * intensity))
        _radial_gradient_circle(
            d_caps, ep, cap_r,
            (255, 255, 255, min(255, int(200 * intensity))), steps=10,
        )
        _radial_gradient_circle(
            d_caps, ep, int(cap_r * 2),
            (*color, min(255, int(80 * intensity))), steps=8,
        )
    caps = caps.filter(ImageFilter.GaussianBlur(radius=max(1, int(2 * intensity))))
    img = Image.alpha_composite(img, caps)

    return img


# ---------------------------------------------------------------------------
# 3. FLAME — Fire trail along the path
# ---------------------------------------------------------------------------

def effect_flame(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Fire trail — warm orange-red gradient with wispy flame tendrils and embers."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(42)  # Deterministic

    # Fire colours: team colour → orange → yellow → white at tip
    fire_base = color
    fire_mid = (255, 140, 20)
    fire_hot = (255, 220, 60)
    fire_white = (255, 255, 220)

    resampled = _interpolate_points(points, spacing=3)
    n = len(resampled)

    # Base fire glow (wide, blurred, orange)
    base = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_base = ImageDraw.Draw(base, "RGBA")
    for i in range(n - 1):
        t = i / max(1, n - 2)
        c = _lerp_color(fire_base, fire_mid, t)
        alpha = int(100 * intensity)
        d_base.line(
            [resampled[i], resampled[i + 1]],
            fill=(*c, alpha),
            width=int(10 * intensity),
        )
    base = base.filter(ImageFilter.GaussianBlur(radius=int(6 * intensity)))
    img = Image.alpha_composite(img, base)

    # Core flame line
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    for i in range(n - 1):
        t = i / max(1, n - 2)
        c = _lerp_color(fire_mid, fire_hot, t)
        alpha = int(200 * intensity)
        d_core.line(
            [resampled[i], resampled[i + 1]],
            fill=(*c, alpha),
            width=max(2, int(4 * intensity)),
        )
    core = core.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, core)

    # Flame tendrils extending upward
    tendrils = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_tendrils = ImageDraw.Draw(tendrils, "RGBA")
    for i in range(0, n, max(1, int(4 / intensity))):
        nx, ny = _normal_at(resampled, i)
        t = i / max(1, n - 1)
        # Tendrils go upward (negative y) with some randomness
        tendril_len = rng.uniform(8, 25) * intensity
        # Bias upward
        tx = resampled[i][0] + int(nx * tendril_len * 0.5 + rng.uniform(-3, 3))
        ty = resampled[i][1] - int(abs(ny * tendril_len) + rng.uniform(5, 15) * intensity)
        c = _lerp_color(fire_mid, fire_hot, rng.random())
        alpha = int(rng.uniform(80, 160) * intensity)
        d_tendrils.line(
            [resampled[i], (tx, ty)],
            fill=(*c, alpha),
            width=max(1, int(2 * intensity)),
        )
        # Wispy tip
        tip_ty = ty - int(rng.uniform(3, 10) * intensity)
        tip_c = _lerp_color(fire_hot, fire_white, rng.random() * 0.5)
        d_tendrils.line(
            [(tx, ty), (tx + rng.randint(-2, 2), tip_ty)],
            fill=(*tip_c, int(alpha * 0.5)),
            width=1,
        )
    tendrils = tendrils.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, tendrils)

    # Particle embers floating up
    embers = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_embers = ImageDraw.Draw(embers, "RGBA")
    for i in range(0, n, max(1, int(8 / intensity))):
        for _ in range(rng.randint(1, 3)):
            ex = resampled[i][0] + rng.randint(-15, 15)
            ey = resampled[i][1] - rng.randint(10, int(40 * intensity))
            r = rng.uniform(1, 3) * intensity
            c = _lerp_color(fire_hot, fire_white, rng.random())
            alpha = int(rng.uniform(100, 220) * intensity)
            d_embers.ellipse(
                [ex - r, ey - r, ex + r, ey + r],
                fill=(*c, alpha),
            )
    embers = embers.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, embers)

    return img


# ---------------------------------------------------------------------------
# 4. LIGHTNING — Jagged electrical arc
# ---------------------------------------------------------------------------

def effect_lightning(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Jagged electrical arc — main bolt with zigzag offsets and branch bolts."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(99)

    def _jitter_path(pts: List[Point], magnitude: float) -> List[Point]:
        """Add random zigzag offsets perpendicular to the path."""
        resampled = _interpolate_points(pts, spacing=6)
        jittered = [resampled[0]]
        for i in range(1, len(resampled) - 1):
            nx, ny = _normal_at(resampled, i)
            offset = rng.uniform(-magnitude, magnitude)
            jittered.append((
                int(resampled[i][0] + nx * offset),
                int(resampled[i][1] + ny * offset),
            ))
        jittered.append(resampled[-1])
        return jittered

    # Outer glow
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")
    main_bolt = _jitter_path(points, 12 * intensity)
    glow_alpha = int(50 * intensity)
    d_glow.line(main_bolt, fill=(*color, glow_alpha), width=int(10 * intensity), joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(6 * intensity)))
    img = Image.alpha_composite(img, glow)

    # Colour layer
    mid = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_mid = ImageDraw.Draw(mid, "RGBA")
    bolt2 = _jitter_path(points, 8 * intensity)
    mid_alpha = int(160 * intensity)
    bright = (min(255, color[0] + 100), min(255, color[1] + 100), min(255, color[2] + 100))
    d_mid.line(bolt2, fill=(*bright, mid_alpha), width=max(2, int(3 * intensity)), joint="curve")
    mid = mid.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, mid)

    # White-hot core
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    bolt_core = _jitter_path(points, 4 * intensity)
    core_alpha = int(230 * intensity)
    d_core.line(bolt_core, fill=(255, 255, 255, core_alpha), width=max(1, int(2 * intensity)), joint="curve")
    img = Image.alpha_composite(img, core)

    # Branch bolts forking off at random points
    branches = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_branches = ImageDraw.Draw(branches, "RGBA")
    resampled = _interpolate_points(points, spacing=15)
    for i in range(len(resampled)):
        if rng.random() < 0.25 * intensity:
            # Fork a branch
            nx, ny = _normal_at(resampled, i)
            sign = rng.choice([-1, 1])
            branch_len = rng.uniform(20, 60) * intensity
            segments = rng.randint(3, 6)
            branch_pts = [resampled[i]]
            for s in range(segments):
                t = (s + 1) / segments
                bx = resampled[i][0] + int(sign * nx * branch_len * t + rng.uniform(-8, 8))
                by = resampled[i][1] + int(sign * ny * branch_len * t + rng.uniform(-8, 8))
                branch_pts.append((bx, by))

            ba = int(rng.uniform(80, 160) * intensity)
            d_branches.line(branch_pts, fill=(*bright, ba), width=1, joint="curve")
            # White centre for branches
            d_branches.line(branch_pts, fill=(255, 255, 255, int(ba * 0.5)), width=1, joint="curve")

    branches = branches.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, branches)

    return img


# ---------------------------------------------------------------------------
# 5. INK — Brush stroke / calligraphy
# ---------------------------------------------------------------------------

def effect_ink(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Calligraphy ink brush — variable-width stroke with pressure simulation,
    ink splatter at direction changes, dry brush texture, and ink pooling at waypoints."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(77)

    # Desaturate the team colour slightly for authentic ink look
    avg = (color[0] + color[1] + color[2]) / 3.0
    desat = 0.3
    ink_color = (
        int(color[0] * (1 - desat) + avg * desat),
        int(color[1] * (1 - desat) + avg * desat),
        int(color[2] * (1 - desat) + avg * desat),
    )

    resampled = _interpolate_points(points, spacing=2)
    n = len(resampled)
    if n < 2:
        return img

    # --- Pressure simulation: width profile per point ---
    # Each original segment gets a press-then-lift cycle (thick at start, thin at end).
    # Curvature also thins the stroke (sharper turns = thinner).
    max_w = 10 * intensity
    min_w = 1.5 * intensity

    # Map resampled points to their nearest original-segment start index
    seg_starts = []
    ri = 0
    for si in range(len(points)):
        best_dist = float("inf")
        best_ri = ri
        for rj in range(ri, min(ri + n, n)):
            d = _segment_length(resampled[rj], points[si])
            if d < best_dist:
                best_dist = d
                best_ri = rj
            elif d > best_dist + 5:
                break
        seg_starts.append(best_ri)
        ri = best_ri

    widths = []
    for i in range(n):
        # Find which original segment this resampled point belongs to
        seg_idx = 0
        for s in range(len(seg_starts) - 1):
            if i >= seg_starts[s]:
                seg_idx = s
        seg_begin = seg_starts[seg_idx]
        seg_end = seg_starts[seg_idx + 1] if seg_idx + 1 < len(seg_starts) else n - 1
        seg_len = max(1, seg_end - seg_begin)
        t_seg = (i - seg_begin) / seg_len  # 0 = press, 1 = lift
        pressure = 1.0 - t_seg ** 0.6  # ease-out: wide at start, thin at end

        angle = _angle_at(resampled, i)
        curve_factor = 1.0 - 0.6 * (angle / math.pi)

        w = min_w + (max_w - min_w) * pressure * curve_factor
        w += rng.gauss(0, 0.4 * intensity)  # organic wobble
        widths.append(max(min_w, min(max_w, w)))

    # --- Dry brush texture mask (streaks where ink ran low) ---
    dry_brush = np.ones((canvas_size[1], canvas_size[0]), dtype=np.float32)
    for _ in range(int(8 * intensity)):
        y0 = rng.randint(0, canvas_size[1] - 1)
        streak_h = rng.randint(1, 3)
        streak_alpha = rng.uniform(0.0, 0.5)
        x_start = rng.randint(0, canvas_size[0] // 2)
        x_end = rng.randint(x_start, canvas_size[0])
        for dy in range(streak_h):
            yy = min(canvas_size[1] - 1, y0 + dy)
            dry_brush[yy, x_start:x_end] *= streak_alpha

    # --- Main calligraphy stroke (polygon-based variable width) ---
    stroke = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_stroke = ImageDraw.Draw(stroke, "RGBA")

    for i in range(n - 1):
        nx0, ny0 = _normal_at(resampled, i)
        nx1, ny1 = _normal_at(resampled, i + 1)
        w0 = widths[i] / 2
        w1 = widths[i + 1] / 2
        x0, y0 = resampled[i]
        x1, y1 = resampled[i + 1]

        # Quad polygon: left offset → right offset (reversed) for smooth width
        poly = [
            (x0 + nx0 * w0, y0 + ny0 * w0),
            (x1 + nx1 * w1, y1 + ny1 * w1),
            (x1 - nx1 * w1, y1 - ny1 * w1),
            (x0 - nx0 * w0, y0 - ny0 * w0),
        ]

        darkness = rng.uniform(0.80, 1.0)
        c = (int(ink_color[0] * darkness),
             int(ink_color[1] * darkness),
             int(ink_color[2] * darkness))
        a = int(min(255, (210 + rng.uniform(0, 45)) * intensity))
        d_stroke.polygon(poly, fill=(*c, a))

    # Apply dry brush mask: modulate stroke alpha by streak texture
    stroke_arr = np.array(stroke, dtype=np.float32)
    stroke_arr[:, :, 3] *= dry_brush
    stroke = Image.fromarray(stroke_arr.astype(np.uint8), "RGBA")

    # Slight blur for paper texture bleed (edges not perfectly sharp)
    stroke = stroke.filter(ImageFilter.GaussianBlur(radius=0.8))
    img = Image.alpha_composite(img, stroke)

    # --- Paper texture bleed: irregular edge dots ---
    bleed = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_bleed = ImageDraw.Draw(bleed, "RGBA")
    for i in range(0, n, max(1, int(2 / max(0.3, intensity)))):
        nx, ny = _normal_at(resampled, i)
        w = widths[i]
        for _ in range(rng.randint(1, 4)):
            side = rng.choice([-1, 1])
            offset = side * (w / 2 + rng.gauss(0, w * 0.3))
            bx = resampled[i][0] + int(nx * offset + rng.gauss(0, 0.8))
            by = resampled[i][1] + int(ny * offset + rng.gauss(0, 0.8))
            r = rng.uniform(0.3, 1.2) * intensity
            ba = int(rng.uniform(30, 90) * intensity)
            d_bleed.ellipse(
                [bx - r, by - r, bx + r, by + r],
                fill=(*ink_color, ba),
            )
    bleed = bleed.filter(ImageFilter.GaussianBlur(radius=0.5))
    img = Image.alpha_composite(img, bleed)

    # --- Ink pooling at original waypoints (darker, wider blobs) ---
    pool = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_pool = ImageDraw.Draw(pool, "RGBA")
    pool_color = (max(0, ink_color[0] - 40),
                  max(0, ink_color[1] - 40),
                  max(0, ink_color[2] - 40))
    for pt in points:
        pr = rng.uniform(4, 8) * intensity
        pa = int(rng.uniform(140, 220) * intensity)
        d_pool.ellipse(
            [pt[0] - pr, pt[1] - pr, pt[0] + pr, pt[1] + pr],
            fill=(*pool_color, pa),
        )
        # Inner darker core
        cr = pr * 0.5
        ca = int(min(255, pa * 1.3))
        d_pool.ellipse(
            [pt[0] - cr, pt[1] - cr, pt[0] + cr, pt[1] + cr],
            fill=(*pool_color, ca),
        )
    pool = pool.filter(ImageFilter.GaussianBlur(radius=2))
    img = Image.alpha_composite(img, pool)

    # --- Ink splatter at direction changes (brush flick) ---
    splatter = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_splatter = ImageDraw.Draw(splatter, "RGBA")
    coarse = _interpolate_points(points, spacing=8)
    for i in range(len(coarse)):
        angle = _angle_at(coarse, i)
        if angle < 0.3:
            continue
        n_drops = int(rng.uniform(3, 10) * intensity * (angle / math.pi))
        if 0 < i < len(coarse) - 1:
            dx = coarse[i + 1][0] - coarse[i - 1][0]
            dy = coarse[i + 1][1] - coarse[i - 1][1]
        else:
            dx, dy = rng.gauss(0, 1), rng.gauss(0, 1)
        fl = math.hypot(dx, dy)
        if fl > 0:
            dx, dy = dx / fl, dy / fl
        for _ in range(n_drops):
            spread = rng.uniform(5, 30) * intensity
            sx = coarse[i][0] + int(dx * rng.gauss(0, spread) + rng.gauss(0, spread * 0.5))
            sy = coarse[i][1] + int(dy * rng.gauss(0, spread) + rng.gauss(0, spread * 0.5))
            r = rng.uniform(0.5, 2.5) * intensity
            sa = int(rng.uniform(120, 240) * intensity)
            d_splatter.ellipse(
                [sx - r, sy - r, sx + r, sy + r],
                fill=(*ink_color, sa),
            )
    # Drops at brush entry and exit
    for endpoint in [resampled[0], resampled[-1]]:
        for _ in range(int(5 * intensity)):
            sx = endpoint[0] + int(rng.gauss(0, 12 * intensity))
            sy = endpoint[1] + int(rng.gauss(0, 12 * intensity))
            r = rng.uniform(0.8, 3) * intensity
            sa = int(rng.uniform(100, 210) * intensity)
            d_splatter.ellipse(
                [sx - r, sy - r, sx + r, sy + r],
                fill=(*ink_color, sa),
            )
    img = Image.alpha_composite(img, splatter)

    return img


# ---------------------------------------------------------------------------
# 6. DOTTED — Constellation star map
# ---------------------------------------------------------------------------

def effect_dotted(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Constellation star map — waypoints as stars with sparkle crosses, dotted connecting
    lines, soft glow halos, and scattered background star field."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(137)

    bright_color = (min(255, color[0] + 80), min(255, color[1] + 80), min(255, color[2] + 80))

    # --- Classify star sizes: first & last are "key" (big), rest are "minor" (small) ---
    key_indices = {0, len(points) - 1}
    # Also mark any point with a sharp turn as key (shot direction change / goal moment)
    for i in range(1, len(points) - 1):
        angle = _angle_at(points, i)
        if angle > 0.5:
            key_indices.add(i)

    # --- Layer 1: Background star field — tiny random dots scattered near the path ---
    field = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_field = ImageDraw.Draw(field, "RGBA")

    # Build a bounding band around the path to scatter stars in
    resampled_dense = _interpolate_points(points, spacing=8)
    scatter_range = int(60 * intensity)
    num_bg_stars = int(120 * intensity)
    for _ in range(num_bg_stars):
        anchor = resampled_dense[rng.randint(0, len(resampled_dense) - 1)]
        sx = anchor[0] + rng.randint(-scatter_range, scatter_range)
        sy = anchor[1] + rng.randint(-scatter_range, scatter_range)
        # Clamp to canvas
        sx = max(0, min(canvas_size[0] - 1, sx))
        sy = max(0, min(canvas_size[1] - 1, sy))
        r = rng.uniform(0.3, 1.2) * intensity
        alpha = int(rng.uniform(40, 130) * intensity)
        # Mostly team colour, occasionally white twinkle
        if rng.random() < 0.15:
            sc = (255, 255, 255)
            alpha = int(alpha * 1.3)
        else:
            sc = bright_color
        d_field.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(*sc, min(255, alpha)))
    img = Image.alpha_composite(img, field)

    # --- Layer 2: Dotted connecting lines between consecutive stars ---
    dotline = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_dotline = ImageDraw.Draw(dotline, "RGBA")

    dot_radius = max(1.0, 1.3 * intensity)
    dot_spacing = max(5, int(8 / max(0.3, intensity)))
    dot_alpha = int(min(255, 130 * intensity))

    for seg_i in range(len(points) - 1):
        p0 = points[seg_i]
        p1 = points[seg_i + 1]
        seg_len = _segment_length(p0, p1)
        if seg_len < 1:
            continue
        n_dots = max(2, int(seg_len / dot_spacing))
        for j in range(1, n_dots):  # skip first (drawn as star), include up-to but not last
            t = j / n_dots
            dx = p0[0] + (p1[0] - p0[0]) * t
            dy = p0[1] + (p1[1] - p0[1]) * t
            d_dotline.ellipse(
                [dx - dot_radius, dy - dot_radius, dx + dot_radius, dy + dot_radius],
                fill=(*color, dot_alpha),
            )
    img = Image.alpha_composite(img, dotline)

    # --- Layer 3: Star glow halos (soft radial gradient per waypoint) ---
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")

    for i, pt in enumerate(points):
        is_key = i in key_indices
        glow_r = (18 if is_key else 10) * intensity
        glow_alpha_max = int((60 if is_key else 35) * intensity)
        # Draw concentric rings to approximate a radial gradient
        rings = 8
        for ring in range(rings, 0, -1):
            frac = ring / rings
            r = glow_r * frac
            a = int(glow_alpha_max * (1.0 - frac) * 0.7)
            if a < 1:
                continue
            d_glow.ellipse(
                [pt[0] - r, pt[1] - r, pt[0] + r, pt[1] + r],
                fill=(*color, min(255, a)),
            )

    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(5 * intensity)))
    img = Image.alpha_composite(img, glow)

    # --- Layer 4: Star bodies & 4-point sparkle crosses ---
    stars = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_stars = ImageDraw.Draw(stars, "RGBA")

    for i, pt in enumerate(points):
        is_key = i in key_indices
        star_r = (5.5 if is_key else 3.0) * intensity
        spike_len = (16 if is_key else 8) * intensity
        star_alpha = int(min(255, (240 if is_key else 200) * intensity))

        # Solid star disc — team colour
        d_stars.ellipse(
            [pt[0] - star_r, pt[1] - star_r, pt[0] + star_r, pt[1] + star_r],
            fill=(*bright_color, star_alpha),
        )

        # Bright white centre
        cr = star_r * 0.45
        d_stars.ellipse(
            [pt[0] - cr, pt[1] - cr, pt[0] + cr, pt[1] + cr],
            fill=(255, 255, 255, min(255, int(220 * intensity))),
        )

        # 4-point sparkle cross (white spikes)
        spike_alpha = int(min(255, (180 if is_key else 120) * intensity))
        # Vertical spike
        d_stars.line(
            [(pt[0], pt[1] - spike_len), (pt[0], pt[1] + spike_len)],
            fill=(255, 255, 255, spike_alpha),
            width=1,
        )
        # Horizontal spike
        d_stars.line(
            [(pt[0] - spike_len, pt[1]), (pt[0] + spike_len, pt[1])],
            fill=(255, 255, 255, spike_alpha),
            width=1,
        )

        # Shorter diagonal spikes for key stars
        if is_key:
            diag_len = spike_len * 0.5
            diag_alpha = int(spike_alpha * 0.5)
            offsets = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
            for ox, oy in offsets:
                d_stars.line(
                    [(pt[0], pt[1]),
                     (int(pt[0] + ox * diag_len), int(pt[1] + oy * diag_len))],
                    fill=(255, 255, 255, diag_alpha),
                    width=1,
                )

    stars = stars.filter(ImageFilter.GaussianBlur(radius=0.5))
    img = Image.alpha_composite(img, stars)

    return img
