"""
Art Engine v2.0 — Line Effects
================================
Visual effects rendered as transparent RGBA layers, ready for compositing.

Public API (new v2 signature):
    render_laser_effect(path, width, height, colors, intensity, **kwargs) -> Image
    render_flame_effect(path, width, height, colors, intensity, **kwargs) -> Image
    render_lightning_effect(path, width, height, colors, intensity, **kwargs) -> Image
    render_ink_effect(path, width, height, colors, intensity, **kwargs) -> Image
    render_spray_effect(path, width, height, colors, intensity, **kwargs) -> Image

Common arguments:
    path      : list of (x, y, event_type) tuples — coords in **normalized 0.0–1.0** space.
    width     : output image width in pixels.
    height    : output image height in pixels.
    colors    : dict with at least a 'primary' key: {'primary': (R, G, B), ...}
    intensity : float 0.0–100.0 (maps internally to 0.0–2.0 multiplier).

Each function returns a PIL Image in RGBA mode on a transparent background.
"""

from __future__ import annotations

import math
import random
from typing import List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
Point = Tuple[int, int]          # pixel coords
Color = Tuple[int, int, int]     # (R, G, B)
NormPoint = Tuple[float, float]  # normalized 0.0-1.0

EFFECTS = ["laser", "flame", "lightning", "ink", "spray"]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _intensity_scale(intensity: float) -> float:
    """Map 0–100 intensity to 0.0–2.0 multiplier used by internal renderers."""
    return max(0.0, min(2.0, intensity / 50.0))


def _extract_color(colors: dict) -> Color:
    """Pull the primary RGB triple from a colors dict."""
    primary = colors.get("primary", (200, 60, 60))
    if isinstance(primary, (list, tuple)) and len(primary) >= 3:
        return (int(primary[0]), int(primary[1]), int(primary[2]))
    return (200, 60, 60)


def _denormalize_path(path: list, width: int, height: int) -> List[Point]:
    """Convert normalized (0.0-1.0) path coords to pixel coords.

    Accepts tuples of length 2+ (extras like event_type are ignored).
    """
    return [(int(p[0] * width), int(p[1] * height)) for p in path]


def _segment_length(p1: Point, p2: Point) -> float:
    return math.hypot(p2[0] - p1[0], p2[1] - p1[1])


def _lerp_color(c1: Color, c2: Color, t: float) -> Color:
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _interpolate_points(points: List[Point], spacing: float = 2.0) -> List[Point]:
    """Resample a polyline so points are ~`spacing` pixels apart."""
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
            out.append((
                int(p0[0] + (p1[0] - p0[0]) * t),
                int(p0[1] + (p1[1] - p0[1]) * t),
            ))
    return out


def _normal_at(points: List[Point], idx: int) -> Tuple[float, float]:
    """Unit normal (perpendicular) at a point on the polyline."""
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
    """Turning angle (radians) at a point. 0 for endpoints."""
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


def _radial_gradient_circle(
    draw: ImageDraw.ImageDraw,
    centre: Point,
    radius: float,
    color: Tuple[int, int, int, int],
    steps: int = 12,
) -> None:
    """Filled circle with radial alpha falloff (bright centre → transparent edge)."""
    for s in range(steps, 0, -1):
        frac = s / steps
        r = radius * frac
        a = int(color[3] * (1.0 - (1.0 - frac) ** 0.6))
        if r < 0.5:
            continue
        draw.ellipse(
            [centre[0] - r, centre[1] - r, centre[0] + r, centre[1] + r],
            fill=(color[0], color[1], color[2], a),
        )


# ---------------------------------------------------------------------------
# 1. LASER — 4-layer neon glow
# ---------------------------------------------------------------------------

def _render_laser_internal(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Internal pixel-coord implementation.  4 glow layers + lens flares + sparks."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(42)
    w, h = canvas_size
    bright = (min(255, color[0] + 80), min(255, color[1] + 80), min(255, color[2] + 80))

    def _draw_segments(draw, pts, fill, width):
        for i in range(len(pts) - 1):
            draw.line([pts[i], pts[i + 1]], fill=fill, width=width)

    # Layer 1: Outer diffuse bloom
    bloom = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_bloom = ImageDraw.Draw(bloom, "RGBA")
    _draw_segments(d_bloom, points, (*color, max(1, int(40 * intensity))),
                   max(4, int(18 * intensity)))
    bloom = bloom.filter(ImageFilter.GaussianBlur(radius=max(1, int(25 * intensity))))
    img = Image.alpha_composite(img, bloom)

    # Layer 2: Team-colour glow halo
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")
    _draw_segments(d_glow, points, (*bright, max(1, int(160 * intensity))),
                   max(3, int(6 * intensity)))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(1, int(10 * intensity))))
    img = Image.alpha_composite(img, glow)

    # Layer 3: Chromatic aberration
    ca_offset = max(1, int(2 * intensity))
    ca_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_ca = ImageDraw.Draw(ca_layer, "RGBA")
    ca_alpha = max(1, int(70 * intensity))
    _draw_segments(d_ca, [(p[0] - ca_offset, p[1] + ca_offset) for p in points],
                   (255, 60, 60, ca_alpha), max(2, int(4 * intensity)))
    _draw_segments(d_ca, [(p[0] + ca_offset, p[1] - ca_offset) for p in points],
                   (60, 60, 255, ca_alpha), max(2, int(4 * intensity)))
    ca_layer = ca_layer.filter(ImageFilter.GaussianBlur(radius=max(1, int(3 * intensity))))
    img = Image.alpha_composite(img, ca_layer)

    # Layer 4: Razor-thin white core
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    _draw_segments(d_core, points, (255, 255, 255, min(255, max(1, int(245 * intensity)))),
                   max(1, min(2, int(2 * intensity))))
    img = Image.alpha_composite(img, core)

    # Lens flares at direction changes
    flare_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_flare = ImageDraw.Draw(flare_layer, "RGBA")
    for i in range(1, len(points) - 1):
        angle = _angle_at(points, i)
        if angle > 0.15:
            pt = points[i]
            strength = min(1.0, angle / math.pi)
            flare_r = int((8 + 12 * strength) * intensity)
            flare_a = min(255, int((140 + 100 * strength) * intensity))
            _radial_gradient_circle(d_flare, pt, flare_r,
                                    (255, 255, 255, flare_a), steps=16)
            spike_len = int(flare_r * 2.5)
            spike_a = min(255, int(flare_a * 0.7))
            for dx, dy in [(1, 0), (0, 1), (0.7, 0.7), (0.7, -0.7)]:
                d_flare.line(
                    [(pt[0] - int(dx * spike_len), pt[1] - int(dy * spike_len)),
                     (pt[0] + int(dx * spike_len), pt[1] + int(dy * spike_len))],
                    fill=(255, 255, 255, spike_a), width=1,
                )
            _radial_gradient_circle(d_flare, pt, int(flare_r * 0.6),
                                    (*bright, min(255, int(flare_a * 0.5))), steps=10)
    flare_layer = flare_layer.filter(ImageFilter.GaussianBlur(radius=max(1, int(2 * intensity))))
    img = Image.alpha_composite(img, flare_layer)

    # Sparks at corners
    sparks = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_sparks = ImageDraw.Draw(sparks, "RGBA")
    for i in range(1, len(points) - 1):
        angle = _angle_at(points, i)
        if angle > 0.15:
            pt = points[i]
            strength = min(1.0, angle / math.pi)
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
            for _ in range(int((6 + 14 * strength) * intensity)):
                spread = rng.gauss(0, 0.7)
                cos_s, sin_s = math.cos(spread), math.sin(spread)
                sx_dir = bx * cos_s - by * sin_s
                sy_dir = bx * sin_s + by * cos_s
                dist = rng.uniform(6, 35) * intensity * strength
                sx = max(0, min(w - 1, pt[0] + int(sx_dir * dist + rng.gauss(0, 2))))
                sy = max(0, min(h - 1, pt[1] + int(sy_dir * dist + rng.gauss(0, 2))))
                r = rng.uniform(0.5, 2.0) * intensity
                sa = min(255, int(rng.uniform(120, 255) * intensity * strength))
                d_sparks.ellipse([sx - r, sy - r, sx + r, sy + r],
                                 fill=rng.choice([(255, 255, 255, sa),
                                                  (255, 240, 200, sa),
                                                  (*bright, sa)]))
    sparks = sparks.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, sparks)

    # Hot endpoint caps
    caps = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_caps = ImageDraw.Draw(caps, "RGBA")
    for ep in [points[0], points[-1]]:
        cap_r = max(3, int(5 * intensity))
        _radial_gradient_circle(d_caps, ep, cap_r,
                                (255, 255, 255, min(255, int(200 * intensity))), steps=10)
        _radial_gradient_circle(d_caps, ep, int(cap_r * 2),
                                (*color, min(255, int(80 * intensity))), steps=8)
    caps = caps.filter(ImageFilter.GaussianBlur(radius=max(1, int(2 * intensity))))
    img = Image.alpha_composite(img, caps)

    return img


def render_laser_effect(
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    4-layer neon laser beam along path.

    Returns a transparent RGBA Image (width × height) with the laser composited on it.

    Args:
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)
    """
    color = _extract_color(colors)
    pixel_path = _denormalize_path(path, width, height)
    scale = _intensity_scale(intensity)
    return _render_laser_internal(pixel_path, color, (width, height), scale)


# ---------------------------------------------------------------------------
# 2. FLAME — Heat gradient + embers
# ---------------------------------------------------------------------------

def _render_flame_internal(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Internal pixel-coord implementation for flame effect."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(42)

    fire_base  = color
    fire_mid   = (255, 140, 20)
    fire_hot   = (255, 220, 60)
    fire_white = (255, 255, 220)

    resampled = _interpolate_points(points, spacing=3)
    n = len(resampled)

    # Base fire glow
    base = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_base = ImageDraw.Draw(base, "RGBA")
    for i in range(n - 1):
        t = i / max(1, n - 2)
        c = _lerp_color(fire_base, fire_mid, t)
        d_base.line([resampled[i], resampled[i + 1]],
                    fill=(*c, int(100 * intensity)), width=int(10 * intensity))
    base = base.filter(ImageFilter.GaussianBlur(radius=int(6 * intensity)))
    img = Image.alpha_composite(img, base)

    # Core flame line
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    for i in range(n - 1):
        t = i / max(1, n - 2)
        c = _lerp_color(fire_mid, fire_hot, t)
        d_core.line([resampled[i], resampled[i + 1]],
                    fill=(*c, int(200 * intensity)), width=max(2, int(4 * intensity)))
    core = core.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, core)

    # Flame tendrils
    tendrils = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_tendrils = ImageDraw.Draw(tendrils, "RGBA")
    step = max(1, int(4 / max(0.01, intensity)))
    for i in range(0, n, step):
        nx, ny = _normal_at(resampled, i)
        tendril_len = rng.uniform(8, 25) * intensity
        tx = resampled[i][0] + int(nx * tendril_len * 0.5 + rng.uniform(-3, 3))
        ty = resampled[i][1] - int(abs(ny * tendril_len) + rng.uniform(5, 15) * intensity)
        c = _lerp_color(fire_mid, fire_hot, rng.random())
        alpha = int(rng.uniform(80, 160) * intensity)
        d_tendrils.line([resampled[i], (tx, ty)], fill=(*c, alpha),
                        width=max(1, int(2 * intensity)))
        tip_ty = ty - int(rng.uniform(3, 10) * intensity)
        tip_c = _lerp_color(fire_hot, fire_white, rng.random() * 0.5)
        d_tendrils.line([(tx, ty), (tx + rng.randint(-2, 2), tip_ty)],
                        fill=(*tip_c, int(alpha * 0.5)), width=1)
    tendrils = tendrils.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, tendrils)

    # Particle embers
    embers = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_embers = ImageDraw.Draw(embers, "RGBA")
    ember_step = max(1, int(8 / max(0.01, intensity)))
    for i in range(0, n, ember_step):
        for _ in range(rng.randint(1, 3)):
            ex = resampled[i][0] + rng.randint(-15, 15)
            ey = resampled[i][1] - rng.randint(10, int(40 * intensity))
            r = rng.uniform(1, 3) * intensity
            c = _lerp_color(fire_hot, fire_white, rng.random())
            d_embers.ellipse([ex - r, ey - r, ex + r, ey + r],
                             fill=(*c, int(rng.uniform(100, 220) * intensity)))
    embers = embers.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, embers)

    return img


def render_flame_effect(
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    Heat gradient fire trail with tendrils and floating embers along path.

    Returns a transparent RGBA Image (width × height).

    Args:
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)
    """
    color = _extract_color(colors)
    pixel_path = _denormalize_path(path, width, height)
    scale = _intensity_scale(intensity)
    return _render_flame_internal(pixel_path, color, (width, height), scale)


# ---------------------------------------------------------------------------
# 3. LIGHTNING — Jagged bolts
# ---------------------------------------------------------------------------

def _render_lightning_internal(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Internal pixel-coord implementation for lightning effect."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(99)
    bright = (min(255, color[0] + 100), min(255, color[1] + 100), min(255, color[2] + 100))

    def _jitter_path(pts, magnitude):
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
    d_glow.line(main_bolt, fill=(*color, int(50 * intensity)),
                width=int(10 * intensity), joint="curve")
    glow = glow.filter(ImageFilter.GaussianBlur(radius=int(6 * intensity)))
    img = Image.alpha_composite(img, glow)

    # Colour mid layer
    mid = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_mid = ImageDraw.Draw(mid, "RGBA")
    bolt2 = _jitter_path(points, 8 * intensity)
    d_mid.line(bolt2, fill=(*bright, int(160 * intensity)),
               width=max(2, int(3 * intensity)), joint="curve")
    mid = mid.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, mid)

    # White-hot core
    core = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_core = ImageDraw.Draw(core, "RGBA")
    bolt_core = _jitter_path(points, 4 * intensity)
    d_core.line(bolt_core, fill=(255, 255, 255, int(230 * intensity)),
                width=max(1, int(2 * intensity)), joint="curve")
    img = Image.alpha_composite(img, core)

    # Branch bolts
    branches = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_branches = ImageDraw.Draw(branches, "RGBA")
    resampled = _interpolate_points(points, spacing=15)
    for i in range(len(resampled)):
        if rng.random() < 0.25 * intensity:
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
            d_branches.line(branch_pts, fill=(255, 255, 255, int(ba * 0.5)), width=1, joint="curve")
    branches = branches.filter(ImageFilter.GaussianBlur(radius=1))
    img = Image.alpha_composite(img, branches)

    return img


def render_lightning_effect(
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    Jagged electrical arc with branching bolts along path.

    Returns a transparent RGBA Image (width × height).

    Args:
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)
    """
    color = _extract_color(colors)
    pixel_path = _denormalize_path(path, width, height)
    scale = _intensity_scale(intensity)
    return _render_lightning_internal(pixel_path, color, (width, height), scale)


# ---------------------------------------------------------------------------
# 4. INK — Thick stroke + bleed
# ---------------------------------------------------------------------------

def _render_ink_internal(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """Internal pixel-coord implementation for ink/calligraphy effect."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(77)

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

    max_w = 10 * intensity
    min_w = 1.5 * intensity

    # Map resampled points to nearest original segment
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
        seg_idx = 0
        for s in range(len(seg_starts) - 1):
            if i >= seg_starts[s]:
                seg_idx = s
        seg_begin = seg_starts[seg_idx]
        seg_end = seg_starts[seg_idx + 1] if seg_idx + 1 < len(seg_starts) else n - 1
        seg_len = max(1, seg_end - seg_begin)
        t_seg = (i - seg_begin) / seg_len
        pressure = 1.0 - t_seg ** 0.6
        angle = _angle_at(resampled, i)
        curve_factor = 1.0 - 0.6 * (angle / math.pi)
        w = min_w + (max_w - min_w) * pressure * curve_factor
        w += rng.gauss(0, 0.4 * intensity)
        widths.append(max(min_w, min(max_w, w)))

    # Dry brush texture
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

    # Main calligraphy stroke (polygon-based variable width)
    stroke = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_stroke = ImageDraw.Draw(stroke, "RGBA")
    for i in range(n - 1):
        nx0, ny0 = _normal_at(resampled, i)
        nx1, ny1 = _normal_at(resampled, i + 1)
        w0, w1 = widths[i] / 2, widths[i + 1] / 2
        x0, y0 = resampled[i]
        x1, y1 = resampled[i + 1]
        poly = [
            (x0 + nx0 * w0, y0 + ny0 * w0),
            (x1 + nx1 * w1, y1 + ny1 * w1),
            (x1 - nx1 * w1, y1 - ny1 * w1),
            (x0 - nx0 * w0, y0 - ny0 * w0),
        ]
        darkness = rng.uniform(0.80, 1.0)
        c = (int(ink_color[0] * darkness), int(ink_color[1] * darkness),
             int(ink_color[2] * darkness))
        a = int(min(255, (210 + rng.uniform(0, 45)) * intensity))
        d_stroke.polygon(poly, fill=(*c, a))

    # Apply dry brush mask
    stroke_arr = np.array(stroke, dtype=np.float32)
    stroke_arr[:, :, 3] *= dry_brush
    stroke = Image.fromarray(stroke_arr.astype(np.uint8), "RGBA")
    stroke = stroke.filter(ImageFilter.GaussianBlur(radius=0.8))
    img = Image.alpha_composite(img, stroke)

    # Paper texture bleed
    bleed = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_bleed = ImageDraw.Draw(bleed, "RGBA")
    bleed_step = max(1, int(2 / max(0.3, intensity)))
    for i in range(0, n, bleed_step):
        nx, ny = _normal_at(resampled, i)
        w = widths[i]
        for _ in range(rng.randint(1, 4)):
            side = rng.choice([-1, 1])
            offset = side * (w / 2 + rng.gauss(0, w * 0.3))
            bx = resampled[i][0] + int(nx * offset + rng.gauss(0, 0.8))
            by = resampled[i][1] + int(ny * offset + rng.gauss(0, 0.8))
            r = rng.uniform(0.3, 1.2) * intensity
            ba = int(rng.uniform(30, 90) * intensity)
            d_bleed.ellipse([bx - r, by - r, bx + r, by + r],
                            fill=(*ink_color, ba))
    bleed = bleed.filter(ImageFilter.GaussianBlur(radius=0.5))
    img = Image.alpha_composite(img, bleed)

    # Ink pooling at waypoints
    pool = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_pool = ImageDraw.Draw(pool, "RGBA")
    pool_color = (max(0, ink_color[0] - 40), max(0, ink_color[1] - 40),
                  max(0, ink_color[2] - 40))
    for pt in points:
        pr = rng.uniform(4, 8) * intensity
        pa = int(rng.uniform(140, 220) * intensity)
        d_pool.ellipse([pt[0] - pr, pt[1] - pr, pt[0] + pr, pt[1] + pr],
                       fill=(*pool_color, pa))
        cr = pr * 0.5
        d_pool.ellipse([pt[0] - cr, pt[1] - cr, pt[0] + cr, pt[1] + cr],
                       fill=(*pool_color, min(255, int(pa * 1.3))))
    pool = pool.filter(ImageFilter.GaussianBlur(radius=2))
    img = Image.alpha_composite(img, pool)

    # Ink splatter at corners
    splatter = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_splatter = ImageDraw.Draw(splatter, "RGBA")
    coarse = _interpolate_points(points, spacing=8)
    for i in range(len(coarse)):
        angle = _angle_at(coarse, i)
        if angle < 0.3:
            continue
        n_drops = int(rng.uniform(3, 10) * intensity * (angle / math.pi))
        dx = coarse[i + 1][0] - coarse[i - 1][0] if 0 < i < len(coarse) - 1 else rng.gauss(0, 1)
        dy = coarse[i + 1][1] - coarse[i - 1][1] if 0 < i < len(coarse) - 1 else rng.gauss(0, 1)
        fl = math.hypot(dx, dy)
        if fl > 0:
            dx, dy = dx / fl, dy / fl
        for _ in range(n_drops):
            spread = rng.uniform(5, 30) * intensity
            sx = coarse[i][0] + int(dx * rng.gauss(0, spread) + rng.gauss(0, spread * 0.5))
            sy = coarse[i][1] + int(dy * rng.gauss(0, spread) + rng.gauss(0, spread * 0.5))
            r = rng.uniform(0.5, 2.5) * intensity
            sa = int(rng.uniform(120, 240) * intensity)
            d_splatter.ellipse([sx - r, sy - r, sx + r, sy + r],
                               fill=(*ink_color, sa))
    for endpoint in [resampled[0], resampled[-1]]:
        for _ in range(int(5 * intensity)):
            sx = endpoint[0] + int(rng.gauss(0, 12 * intensity))
            sy = endpoint[1] + int(rng.gauss(0, 12 * intensity))
            r = rng.uniform(0.8, 3) * intensity
            sa = int(rng.uniform(100, 210) * intensity)
            d_splatter.ellipse([sx - r, sy - r, sx + r, sy + r],
                               fill=(*ink_color, sa))
    img = Image.alpha_composite(img, splatter)

    return img


def render_ink_effect(
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    Calligraphy ink brush — variable-width stroke with pressure, bleed and pooling.

    Returns a transparent RGBA Image (width × height).

    Args:
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)
    """
    color = _extract_color(colors)
    pixel_path = _denormalize_path(path, width, height)
    scale = _intensity_scale(intensity)
    return _render_ink_internal(pixel_path, color, (width, height), scale)


# ---------------------------------------------------------------------------
# 5. SPRAY — Gaussian particle cloud
# ---------------------------------------------------------------------------

def _render_spray_internal(
    points: List[Point],
    color: Color,
    canvas_size: Tuple[int, int],
    intensity: float = 1.0,
) -> Image.Image:
    """
    Spray / aerosol effect — Gaussian particle distribution along the path.

    Dense core of particles near the path with a soft falloff outward.
    Secondary colour accent is applied to edge particles.
    """
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    if len(points) < 2:
        return img

    rng = random.Random(13)
    w, h = canvas_size

    # Derived colours
    bright = (min(255, color[0] + 80), min(255, color[1] + 80), min(255, color[2] + 80))
    dark   = (max(0, color[0] - 60),   max(0, color[1] - 60),   max(0, color[2] - 60))

    resampled = _interpolate_points(points, spacing=4)
    n = len(resampled)

    # --- Layer 1: soft glow under the spray ---
    glow = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_glow = ImageDraw.Draw(glow, "RGBA")
    glow_w = max(3, int(12 * intensity))
    glow_alpha = max(1, int(50 * intensity))
    for i in range(n - 1):
        d_glow.line([resampled[i], resampled[i + 1]],
                    fill=(*color, glow_alpha), width=glow_w)
    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(2, int(14 * intensity))))
    img = Image.alpha_composite(img, glow)

    # --- Layer 2: Gaussian particle field ---
    particles = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_particles = ImageDraw.Draw(particles, "RGBA")

    # Number of particles scales with intensity and path length
    base_particles = max(200, int(800 * intensity))
    sigma_core   = max(1.0, 6.0  * intensity)   # tight core spread
    sigma_halo   = max(2.0, 22.0 * intensity)   # wider halo spread

    for _ in range(base_particles):
        # Pick a random anchor on the resampled path
        anchor_idx = rng.randint(0, n - 1)
        ax, ay = resampled[anchor_idx]
        nx, ny = _normal_at(resampled, anchor_idx)

        # Two-component Gaussian: dense core + diffuse halo
        is_halo = rng.random() < 0.35
        sigma = sigma_halo if is_halo else sigma_core

        # Spread along normal direction + slight tangential drift
        tang_x = -ny  # tangent is perpendicular to normal
        tang_y =  nx
        radial_offset = rng.gauss(0.0, sigma)
        tangent_offset = rng.gauss(0.0, sigma * 0.5)

        px = ax + nx * radial_offset + tang_x * tangent_offset
        py = ay + ny * radial_offset + tang_y * tangent_offset

        # Clamp to canvas
        px = max(0, min(w - 1, int(px)))
        py = max(0, min(h - 1, int(py)))

        # Particle size: small core dots, larger halo blobs
        r = rng.uniform(0.3, 1.2) * intensity if not is_halo else rng.uniform(0.8, 2.5) * intensity

        # Alpha: brighter toward centre
        distance_factor = min(1.0, abs(radial_offset) / (sigma * 2.0))
        base_alpha = 220 if not is_halo else 80
        alpha = int(base_alpha * (1.0 - distance_factor * 0.6) * intensity)
        alpha = max(5, min(255, alpha))

        # Colour: bright core → team colour → dark edge
        if is_halo:
            pc = dark
        elif distance_factor < 0.3:
            pc = bright
        else:
            pc = _lerp_color(bright, color, distance_factor)

        d_particles.ellipse([px - r, py - r, px + r, py + r],
                            fill=(*pc, alpha))

    # Very slight blur to blend particles naturally (not crisp dots)
    particles = particles.filter(ImageFilter.GaussianBlur(radius=max(0.5, 0.8 * intensity)))
    img = Image.alpha_composite(img, particles)

    # --- Layer 3: bright core spine ---
    spine = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d_spine = ImageDraw.Draw(spine, "RGBA")
    for i in range(n - 1):
        d_spine.line([resampled[i], resampled[i + 1]],
                     fill=(*bright, max(1, int(140 * intensity))),
                     width=max(1, int(2 * intensity)))
    spine = spine.filter(ImageFilter.GaussianBlur(radius=max(1, int(2 * intensity))))
    img = Image.alpha_composite(img, spine)

    return img


def render_spray_effect(
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    Gaussian spray / aerosol particle cloud along path.

    Dense core particles near the path with soft Gaussian falloff outward.

    Returns a transparent RGBA Image (width × height).

    Args:
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)
    """
    color = _extract_color(colors)
    pixel_path = _denormalize_path(path, width, height)
    scale = _intensity_scale(intensity)
    return _render_spray_internal(pixel_path, color, (width, height), scale)


# ---------------------------------------------------------------------------
# Dispatch table & convenience renderer
# ---------------------------------------------------------------------------

_EFFECT_MAP = {
    "laser":     render_laser_effect,
    "flame":     render_flame_effect,
    "lightning": render_lightning_effect,
    "ink":       render_ink_effect,
    "spray":     render_spray_effect,
}


def render_effect(
    name: str,
    path: list,
    width: int,
    height: int,
    colors: dict,
    intensity: float = 50.0,
    **kwargs,
) -> Image.Image:
    """
    Dispatch to a named effect renderer.

    Args:
        name      : one of 'laser', 'flame', 'lightning', 'ink', 'spray'
        path      : [(x, y, event_type), ...] — normalized coords 0.0–1.0
        width     : canvas width in pixels
        height    : canvas height in pixels
        colors    : {'primary': (R,G,B), ...}
        intensity : 0.0–100.0  (50.0 = default)

    Returns:
        PIL Image in RGBA mode, transparent background.

    Raises:
        ValueError: if name is not a recognised effect.
    """
    if name not in _EFFECT_MAP:
        raise ValueError(
            f"Unknown effect '{name}'. Available: {list(_EFFECT_MAP.keys())}"
        )
    return _EFFECT_MAP[name](path, width, height, colors, intensity, **kwargs)
