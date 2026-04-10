#!/usr/bin/env python3
"""
Texture Compositor — composites AI-generated effect textures onto data line paths.

5 effects × 3 intensities = 15 textures in aura_textures_v2/.
Pipeline: load → blend intensities → recolor to team palette → place/warp along path → composite.

Strategies:
  focal:   Centre on goal point, rotated to match path approach (flame, lightning)
  scatter: Distribute patches at data event positions (ink, spray)
  warp:    Bend texture strip along the curved path (laser)
"""

import math
import random
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# ─── Texture filename mapping ────────────────────────────────────────────────

TEXTURE_DIR = Path(__file__).parent.parent / "aura_textures_v2"

TEXTURE_MAP = {
    "flame": {
        "low":  "001-subtle-flames-emanating-radially-in-all-.png",
        "mid":  "001-medium-flames-emanating-radially-in-all-.png",
        "high": "001-intense-dramatic-flames-emanating-radial.png",
    },
    "lightning": {
        "low":  "001-electric-lightning-with-very-prominent-b.png",
        "mid":  "001-medium-electric-lightning-with-prominent.png",
        "high": "001-dramatic-electric-lightning-storm-with-v.png",
    },
    "ink": {
        "low":  "001-jackson-pollock-style-abstract-expressio.png",
        "mid":  "001-medium-jackson-pollock-style-abstract-ex.png",
        "high": "001-intense-jackson-pollock-style-abstract-e.png",
    },
    "laser": {
        "low":  "001-subtle-neon-laser-beam-glow-on-pure-blac.png",
        "mid":  "001-neon-laser-beam-glow-on-pure-black-backg.png",
        "high": "001-intense-neon-laser-beam-on-pure-black-ba.png",
    },
    "spray": {
        "low":  "001-spray-paint-particles-scattered-on-pure-.png",
        "mid":  "001-spray-paint-particles-on-pure-black-back.png",
        "high": "001-intense-spray-paint-explosion-on-pure-bl.png",
    },
}

STRATEGY = {
    "flame":     "focal",
    "lightning": "focal",
    "ink":       "scatter",
    "laser":     "warp",
    "spray":     "scatter",
}


# ─── Cache ────────────────────────────────────────────────────────────────────

_cache: Dict[str, np.ndarray] = {}


# ─── Public API ───────────────────────────────────────────────────────────────

def is_available(effect_name: str) -> bool:
    """Check if all 3 intensity textures exist for the given effect."""
    if effect_name not in TEXTURE_MAP:
        return False
    for level in ("low", "mid", "high"):
        if not (TEXTURE_DIR / TEXTURE_MAP[effect_name][level]).exists():
            return False
    return True


def composite_effect(
    effect_name: str,
    intensity: float,
    data_line_path: List[Tuple],
    palette: dict,
    canvas_size: Tuple[int, int],
) -> Image.Image:
    """
    Composite an AI texture effect onto a transparent RGBA layer.

    Args:
        effect_name:    'flame', 'lightning', 'ink', 'laser', 'spray'
        intensity:      0.0-1.0 (blends low→mid→high textures)
        data_line_path: list of (x, y, event_type) — normalised 0-1 coords
        palette:        dict with 'aura_color' as (R, G, B) tuple
        canvas_size:    (width, height) in pixels

    Returns:
        RGBA PIL Image on transparent background, ready to alpha_composite.
    """
    if effect_name not in TEXTURE_MAP:
        raise ValueError(f"Unknown effect '{effect_name}'. Available: {list(TEXTURE_MAP.keys())}")

    # Normalise path format
    path_events = _normalise_path(data_line_path)
    if len(path_events) < 2:
        return Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    # 1. Get intensity-blended texture (RGB float32 array)
    texture_rgb = _get_blended_texture(effect_name, intensity)
    if texture_rgb is None:
        print(f"[texture_compositor] Could not load textures for {effect_name}", file=sys.stderr)
        return Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    # 2. Recolour to team palette → RGBA float32
    aura_color = palette.get("aura_color", (255, 180, 50))
    texture_rgba = _recolor(texture_rgb, aura_color)

    # 3. Composite using effect-specific strategy
    strategy = STRATEGY[effect_name]
    if strategy == "focal":
        result = _place_focal(texture_rgba, path_events, canvas_size, intensity)
    elif strategy == "scatter":
        result = _place_scatter(texture_rgba, path_events, canvas_size, intensity, effect_name)
    elif strategy == "warp":
        result = _place_warp(texture_rgba, path_events, canvas_size, intensity)
    else:
        result = Image.new("RGBA", canvas_size, (0, 0, 0, 0))

    # 4. Add data-driven flares at goal/shot events
    result = _add_event_flares(result, path_events, canvas_size, aura_color, intensity)

    # 5. Edge fade (match api_generate's 10% quadratic margin)
    result = _apply_edge_fade(result)

    return result


# ─── Loading & Processing ────────────────────────────────────────────────────

def _load_texture(effect: str, level: str) -> Optional[np.ndarray]:
    """Load texture PNG as float32 RGB array. Cached."""
    key = f"{effect}_{level}"
    if key in _cache:
        return _cache[key]

    filename = TEXTURE_MAP.get(effect, {}).get(level)
    if not filename:
        return None
    path = TEXTURE_DIR / filename
    if not path.exists():
        return None

    img = Image.open(path).convert("RGB")
    arr = np.array(img, dtype=np.float32)
    _cache[key] = arr
    print(f"[texture_compositor] Loaded {path.name} ({arr.shape[1]}×{arr.shape[0]})", file=sys.stderr)
    return arr


def _get_blended_texture(effect: str, intensity: float) -> Optional[np.ndarray]:
    """Blend between low/mid/high textures based on intensity (0-1). Crossfade."""
    intensity = max(0.0, min(1.0, intensity))

    if intensity <= 0.33:
        lo = _load_texture(effect, "low")
        hi = _load_texture(effect, "mid")
        t = intensity / 0.33
    elif intensity <= 0.66:
        return _load_texture(effect, "mid")
    else:
        lo = _load_texture(effect, "mid")
        hi = _load_texture(effect, "high")
        t = (intensity - 0.66) / 0.34

    if lo is None:
        return hi
    if hi is None:
        return lo

    # Resize to match if different dimensions
    if lo.shape != hi.shape:
        th = max(lo.shape[0], hi.shape[0])
        tw = max(lo.shape[1], hi.shape[1])
        if lo.shape[:2] != (th, tw):
            lo = np.array(Image.fromarray(lo.astype(np.uint8)).resize((tw, th), Image.LANCZOS), dtype=np.float32)
        if hi.shape[:2] != (th, tw):
            hi = np.array(Image.fromarray(hi.astype(np.uint8)).resize((tw, th), Image.LANCZOS), dtype=np.float32)

    return lo * (1.0 - t) + hi * t


def _recolor(texture_rgb: np.ndarray, team_color: Tuple[int, int, int]) -> np.ndarray:
    """
    Recolour texture to team palette.
    Converts to luminance (preserving structural detail) then applies team colour.
    Black background becomes transparent via luminance-based alpha.
    """
    lum = 0.299 * texture_rgb[:, :, 0] + 0.587 * texture_rgb[:, :, 1] + 0.114 * texture_rgb[:, :, 2]
    lum_max = lum.max()
    if lum_max < 1.0:
        return np.zeros((*texture_rgb.shape[:2], 4), dtype=np.float32)

    lum_n = lum / lum_max  # normalised 0-1

    # Team colour modulated by luminance
    r = team_color[0] * lum_n
    g = team_color[1] * lum_n
    b = team_color[2] * lum_n

    # Alpha: gamma-adjusted luminance so midtones stay visible, black is transparent
    alpha = np.power(lum_n, 0.6) * 255.0

    return np.stack([r, g, b, alpha], axis=-1)


# ─── Path Utilities ───────────────────────────────────────────────────────────

def _normalise_path(path):
    """Ensure path events are (x, y, event_str) tuples."""
    result = []
    for pt in path:
        if len(pt) >= 3:
            result.append((float(pt[0]), float(pt[1]), str(pt[2])))
        elif len(pt) == 2:
            result.append((float(pt[0]), float(pt[1]), "pass"))
    return result


def _smooth_path(coords, points_per_seg=20):
    """Catmull-Rom spline smoothing."""
    if len(coords) < 3:
        if len(coords) == 2:
            n = max(2, points_per_seg)
            return [
                (coords[0][0] + (coords[1][0] - coords[0][0]) * i / (n - 1),
                 coords[0][1] + (coords[1][1] - coords[0][1]) * i / (n - 1))
                for i in range(n)
            ]
        return [(float(c[0]), float(c[1])) for c in coords]

    pts = [coords[0]] + list(coords) + [coords[-1]]
    segments = len(pts) - 3
    per_seg = max(2, points_per_seg)
    result = []
    for i in range(segments):
        p0, p1, p2, p3 = pts[i], pts[i + 1], pts[i + 2], pts[i + 3]
        for j in range(per_seg):
            t = j / per_seg
            t2, t3 = t * t, t * t * t
            x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
                        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
                        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
            y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
                        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
                        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
            result.append((x, y))
    result.append((float(pts[-2][0]), float(pts[-2][1])))
    return result


def _resample_dense(path_px, spacing=1.5):
    """Resample polyline to approximately uniform pixel spacing."""
    if len(path_px) < 2:
        return list(path_px)
    result = [path_px[0]]
    carry = 0.0
    for i in range(1, len(path_px)):
        ax, ay = path_px[i - 1]
        bx, by = path_px[i]
        dx, dy = bx - ax, by - ay
        seg_len = math.hypot(dx, dy)
        if seg_len < 1e-6:
            continue
        ux, uy = dx / seg_len, dy / seg_len
        d = spacing - carry
        while d <= seg_len:
            result.append((ax + ux * d, ay + uy * d))
            d += spacing
        carry = seg_len - (d - spacing)
    last = path_px[-1]
    if math.hypot(result[-1][0] - last[0], result[-1][1] - last[1]) > 0.5:
        result.append(last)
    return result


def _tangent_angle(path, idx):
    """Tangent angle (radians) at a path point."""
    if len(path) < 2:
        return 0.0
    if idx <= 0:
        dx, dy = path[1][0] - path[0][0], path[1][1] - path[0][1]
    elif idx >= len(path) - 1:
        dx, dy = path[-1][0] - path[-2][0], path[-1][1] - path[-2][1]
    else:
        dx, dy = path[idx + 1][0] - path[idx - 1][0], path[idx + 1][1] - path[idx - 1][1]
    return math.atan2(dy, dx)


def _to_pil(rgba_arr):
    """Convert float32 RGBA array to PIL Image."""
    return Image.fromarray(np.clip(rgba_arr, 0, 255).astype(np.uint8), "RGBA")


# ─── Placement: FOCAL ─────────────────────────────────────────────────────────

def _place_focal(tex_rgba, path_events, canvas_size, intensity):
    """
    Centre texture on goal/focal point, rotated to match path approach.
    Additional smaller patches at shot events for data-driven depth.
    Best for flame (radial emanation) and lightning (branching).
    """
    w, h = canvas_size

    # Find focal point
    goal_pts = [(x, y) for x, y, e in path_events if e == "goal"]
    fx, fy = goal_pts[-1] if goal_pts else (
        sum(x for x, y, e in path_events) / len(path_events),
        sum(y for x, y, e in path_events) / len(path_events),
    )

    # Path approach angle at focal
    raw_coords = [(x, y) for x, y, e in path_events]
    approach_deg = math.degrees(_tangent_angle(raw_coords, len(raw_coords) - 1))

    # PIL RGBA from array
    tex_img = _to_pil(tex_rgba)
    tex_tw, tex_th = tex_img.size

    # Scale to ~75% of canvas
    target = int(max(w, h) * 0.75)
    scale = target / max(tex_tw, tex_th)
    new_w, new_h = int(tex_tw * scale), int(tex_th * scale)
    tex_scaled = tex_img.resize((new_w, new_h), Image.LANCZOS)

    # Rotate to align with path approach
    tex_rotated = tex_scaled.rotate(-approach_deg, expand=True, resample=Image.BICUBIC)

    # Place centred on focal
    fpx, fpy = int(fx * w), int(fy * h)
    output = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    output.paste(tex_rotated,
                 (fpx - tex_rotated.width // 2, fpy - tex_rotated.height // 2),
                 tex_rotated)

    # Smaller patches at shot events (smart feature alignment)
    shot_pts = [(x, y, i) for i, (x, y, e) in enumerate(path_events) if e == "shot"]
    for sx, sy, idx in shot_pts:
        pw = max(20, int(new_w * 0.35))
        ph = max(20, int(new_h * 0.35))
        patch = tex_img.resize((pw, ph), Image.LANCZOS)
        local_deg = math.degrees(_tangent_angle(raw_coords, idx))
        patch = patch.rotate(-local_deg + 90, expand=True, resample=Image.BICUBIC)
        ppx = int(sx * w) - patch.width // 2
        ppy = int(sy * h) - patch.height // 2
        output.paste(patch, (ppx, ppy), patch)

    # Intensity modulates alpha
    out_arr = np.array(output, dtype=np.float32)
    out_arr[:, :, 3] *= 0.4 + intensity * 0.6
    return _to_pil(out_arr)


# ─── Placement: SCATTER ───────────────────────────────────────────────────────

def _place_scatter(tex_rgba, path_events, canvas_size, intensity, effect_name):
    """
    Distribute texture patches at data event positions.
    Goal/shot events get larger bursts, passes get small splatters.
    Best for ink (Pollock splatter) and spray (particle scatter).
    """
    rng = random.Random(42)
    w, h = canvas_size
    tex_h, tex_w = tex_rgba.shape[:2]

    size_mult = {
        "goal": 1.0, "shot": 0.65,
        "pass": 0.3, "carry": 0.25, "carry_end": 0.25, "dribble": 0.3,
    }
    base_size = int(min(w, h) * 0.35)

    # Base coverage patch at path centroid (drawn first, behind event patches)
    xs = [x for x, y, e in path_events]
    ys = [y for x, y, e in path_events]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)

    big_w = int(min(w, h) * 0.5)
    big_h = int(big_w * tex_h / tex_w)
    base_patch = _to_pil(tex_rgba).resize((big_w, big_h), Image.LANCZOS)

    output = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    output.paste(base_patch,
                 (int(cx * w) - big_w // 2, int(cy * h) - big_h // 2),
                 base_patch)

    # Event-driven patches on top
    crop_half = min(tex_w, tex_h) // 3
    if crop_half < 10:
        crop_half = min(tex_w, tex_h) // 2

    for i, (x, y, evt) in enumerate(path_events):
        s = size_mult.get(evt, 0.3)
        # Skip some minor events to avoid clutter
        if evt in ("pass", "carry", "carry_end", "dribble") and rng.random() > 0.5:
            continue

        patch_size = max(24, int(base_size * s))

        # Random sub-region crop for variety
        margin_x = max(0, tex_w - 2 * crop_half)
        margin_y = max(0, tex_h - 2 * crop_half)
        cx_t = crop_half + (rng.randint(0, margin_x) if margin_x > 0 else 0)
        cy_t = crop_half + (rng.randint(0, margin_y) if margin_y > 0 else 0)
        crop = tex_rgba[cy_t - crop_half:cy_t + crop_half, cx_t - crop_half:cx_t + crop_half]

        patch = _to_pil(crop).resize((patch_size, patch_size), Image.LANCZOS)
        angle = rng.uniform(-180, 180) if effect_name == "ink" else rng.uniform(-45, 45)
        patch = patch.rotate(angle, expand=True, resample=Image.BICUBIC)

        ppx = int(x * w) - patch.width // 2
        ppy = int(y * h) - patch.height // 2
        output.paste(patch, (ppx, ppy), patch)

    # Intensity modulation
    out_arr = np.array(output, dtype=np.float32)
    out_arr[:, :, 3] *= 0.4 + intensity * 0.6
    return _to_pil(out_arr)


# ─── Placement: WARP ──────────────────────────────────────────────────────────

def _place_warp(tex_rgba, path_events, canvas_size, intensity):
    """
    Warp texture strip along the curved data line path.
    Maps texture X to arc length, texture Y to perpendicular offset.
    Best for laser (horizontal beam → curved beam following path).
    """
    w, h = canvas_size
    tex_h, tex_w = tex_rgba.shape[:2]

    # Smooth path → pixel coords → dense resampling
    raw_coords = [(x, y) for x, y, e in path_events]
    smoothed = _smooth_path(raw_coords, points_per_seg=30)
    path_px = [(x * w, y * h) for x, y in smoothed]
    dense = _resample_dense(path_px, spacing=1.5)
    n = len(dense)
    if n < 3:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # Cumulative arc length
    cum_len = np.zeros(n)
    for i in range(1, n):
        cum_len[i] = cum_len[i - 1] + math.hypot(
            dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1])
    total_len = cum_len[-1]
    if total_len < 1:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))

    # Strip half-width scales with intensity and canvas
    strip_hw = max(20, int(min(w, h) * 0.12 * (0.5 + intensity * 0.5)))

    # Pre-compute perpendicular offsets → texture v-coords
    offsets = np.arange(-strip_hw, strip_hw + 1, dtype=np.float64)
    v_norm = (offsets + strip_hw) / (2 * strip_hw)
    ty_arr = np.clip((v_norm * (tex_h - 1)).astype(int), 0, tex_h - 1)

    output = np.zeros((h, w, 4), dtype=np.float32)

    for i in range(n):
        # Texture u-coordinate (along path → along texture width)
        u = cum_len[i] / total_len
        tx = max(0, min(tex_w - 1, int(u * (tex_w - 1))))

        # Perpendicular direction
        if i == 0:
            dx = dense[1][0] - dense[0][0]
            dy = dense[1][1] - dense[0][1]
        elif i >= n - 1:
            dx = dense[-1][0] - dense[-2][0]
            dy = dense[-1][1] - dense[-2][1]
        else:
            dx = dense[i + 1][0] - dense[i - 1][0]
            dy = dense[i + 1][1] - dense[i - 1][1]
        length = math.hypot(dx, dy)
        if length < 1e-6:
            continue
        nx, ny = -dy / length, dx / length

        # Pixel positions along perpendicular strip (vectorised)
        ox = (dense[i][0] + nx * offsets).astype(np.intp)
        oy = (dense[i][1] + ny * offsets).astype(np.intp)
        valid = (ox >= 0) & (ox < w) & (oy >= 0) & (oy < h)
        if not np.any(valid):
            continue

        # Sample texture column, max-blend into output
        tex_col = tex_rgba[ty_arr[valid], tx]
        existing = output[oy[valid], ox[valid]]
        output[oy[valid], ox[valid]] = np.maximum(existing, tex_col)

    # Light blur for anti-aliasing strip edges
    result = _to_pil(output)
    result = result.filter(ImageFilter.GaussianBlur(radius=1.5))

    # Intensity modulation
    out_arr = np.array(result, dtype=np.float32)
    out_arr[:, :, 3] *= 0.4 + intensity * 0.6
    return _to_pil(out_arr)


# ─── Post-processing ─────────────────────────────────────────────────────────

def _add_event_flares(image, path_events, canvas_size, team_color, intensity):
    """Add bright radial flares at goal/shot events for data-driven emphasis."""
    w, h = canvas_size
    flare = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(flare, "RGBA")

    bright = (min(255, team_color[0] + 80),
              min(255, team_color[1] + 80),
              min(255, team_color[2] + 80))

    for x, y, evt in path_events:
        if evt not in ("goal", "shot"):
            continue
        px, py = int(x * w), int(y * h)
        r = int((40 if evt == "goal" else 25) * intensity)
        a_max = int((120 if evt == "goal" else 80) * intensity)

        # Radial gradient rings
        steps = max(4, r // 4)
        for ring in range(steps, 0, -1):
            frac = ring / steps
            rr = int(r * frac)
            ra = int(a_max * (1.0 - frac) * 0.5)
            if ra < 1 or rr < 1:
                continue
            draw.ellipse([px - rr, py - rr, px + rr, py + rr],
                         fill=(*bright, min(255, ra)))

    flare = flare.filter(ImageFilter.GaussianBlur(radius=max(2, int(6 * intensity))))
    return Image.alpha_composite(image, flare)


def _apply_edge_fade(image, margin_frac=0.10):
    """Quadratic edge fade matching api_generate's 10% margin."""
    arr = np.array(image, dtype=np.float32)
    img_h, img_w = arr.shape[:2]
    margin = int(margin_frac * max(img_w, img_h))
    if margin < 1:
        return image

    fade_h = np.ones(img_h, dtype=np.float32)
    fade_w = np.ones(img_w, dtype=np.float32)
    for i in range(margin):
        f = (i / margin) ** 2
        fade_h[i] = min(fade_h[i], f)
        fade_h[img_h - 1 - i] = min(fade_h[img_h - 1 - i], f)
        fade_w[i] = min(fade_w[i], f)
        fade_w[img_w - 1 - i] = min(fade_w[img_w - 1 - i], f)

    mask = np.minimum(fade_h[:, None], fade_w[None, :])
    arr[:, :, 3] *= mask
    return _to_pil(arr)
