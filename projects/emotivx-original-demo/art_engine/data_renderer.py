"""
Art Engine v2.0 — Core Data Line Renderer (Phase 2.1)

Renders a glowing data path on a transparent RGBA layer.
No background generation, no Voronoi tessellation, no line effects —
those are all separate concerns. This module owns one thing:
draw a smooth, glowing path from normalised event coordinates.

Usage:
    from art_engine.data_renderer import render_data_line

    img = render_data_line(
        path=[(0.2, 0.5, "pass"), (0.6, 0.3, "shot"), (0.8, 0.4, "goal")],
        width=1024,
        height=1024,
        colors={"primary": "#FAFAFA", "secondary": "#DA291C", "accent": "#FFFFFF"},
        glow=80,
    )
    img.save("output.png")
"""

import math
import colorsys

from PIL import Image, ImageDraw, ImageFilter


# ──────────────────────────────────────────────────────────────────────────────
# Event configuration
# Each event type controls glow radius, brightness, max lightness, and falloff.
# ──────────────────────────────────────────────────────────────────────────────

EVENT_PARAMS = {
    "pass":      {"radius_mult": 1.0, "brightness_mult": 1.0, "max_lightness": 50, "falloff_exp": 1.3},
    "carry":     {"radius_mult": 0.8, "brightness_mult": 0.8, "max_lightness": 40, "falloff_exp": 1.5},
    "carry_end": {"radius_mult": 0.8, "brightness_mult": 0.8, "max_lightness": 40, "falloff_exp": 1.5},
    "dribble":   {"radius_mult": 1.0, "brightness_mult": 1.0, "max_lightness": 50, "falloff_exp": 1.3},
    "shot":      {"radius_mult": 1.1, "brightness_mult": 1.1, "max_lightness": 50, "falloff_exp": 1.4},
    "goal":      {"radius_mult": 1.2, "brightness_mult": 1.3, "max_lightness": 58, "falloff_exp": 1.4},
}

# Fallback params for any unknown event type
_DEFAULT_EVENT_PARAMS = EVENT_PARAMS["pass"]


# ──────────────────────────────────────────────────────────────────────────────
# Colour helpers
# ──────────────────────────────────────────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return h * 360, s * 100, l * 100


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    r, g, b = colorsys.hls_to_rgb(h / 360, l / 100, s / 100)
    return int(r * 255), int(g * 255), int(b * 255)


# ──────────────────────────────────────────────────────────────────────────────
# Path helpers
# ──────────────────────────────────────────────────────────────────────────────

def smooth_path(path: list[tuple[float, float]], points_per_seg: int = 30) -> list[tuple[float, float]]:
    """
    Smooth a 2-D path using quadratic Bézier curves with a dynamic perpendicular
    control point offset — tighter for straight segments, wider for sharp turns.

    Args:
        path:           List of (x, y) normalised coordinates.
        points_per_seg: Number of interpolation points per segment.

    Returns:
        Expanded list of (x, y) points tracing a smooth curve.
    """
    if len(path) < 2:
        return path

    result: list[tuple[float, float]] = []

    for i in range(len(path) - 1):
        x1, y1 = path[i]
        x2, y2 = path[i + 1]
        dx, dy = x2 - x1, y2 - y1

        # Determine perpendicular offset based on upcoming corner sharpness
        offset = 0.035
        if i + 2 < len(path):
            x3, y3 = path[i + 2]
            cross = abs(dx * (y3 - y2) - dy * (x3 - x2))
            offset = min(0.08, cross * 3 + 0.015)

        length = math.sqrt(dx * dx + dy * dy)
        if length > 0:
            perp_x = -dy / length * offset
            perp_y =  dx / length * offset
        else:
            perp_x = perp_y = 0.0

        ctrl_x = (x1 + x2) / 2 + perp_x
        ctrl_y = (y1 + y2) / 2 + perp_y

        for t_idx in range(points_per_seg):
            t = t_idx / points_per_seg
            bx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * ctrl_x + t ** 2 * x2
            by = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * ctrl_y + t ** 2 * y2
            result.append((bx, by))

    result.append(path[-1])
    return result


def _nearest_event(point: tuple[float, float], path_events: list[tuple]) -> str:
    """Return the event type from path_events closest to the given normalised point."""
    bx, by = point
    best_dist = float("inf")
    best_evt = "pass"
    for (px, py, evt) in path_events:
        d = (bx - px) ** 2 + (by - py) ** 2
        if d < best_dist:
            best_dist = d
            best_evt = evt
    return best_evt


# ──────────────────────────────────────────────────────────────────────────────
# Glow grid helpers
# ──────────────────────────────────────────────────────────────────────────────

def _build_sample_grid(width: int, height: int, grid_step: int) -> list[tuple[int, int, float, float]]:
    """
    Build a regular grid of sample points covering the canvas.

    Returns:
        List of (px, py, x_norm, y_norm) for every grid cell centre.
    """
    points = []
    half = grid_step // 2
    x = half
    while x < width:
        y = half
        while y < height:
            points.append((x, y, x / width, y / height))
            y += grid_step
        x += grid_step
    return points


# ──────────────────────────────────────────────────────────────────────────────
# Marker helpers
# ──────────────────────────────────────────────────────────────────────────────

_MARKER_RADII = {
    "pass":      5,   # was 4
    "carry":     5,   # was 4
    "carry_end": 5,   # was 4
    "dribble":   5,   # was 4
    "shot":      9,   # was 7
    "goal":      10,  # was 16 — reduced to stop dominating garment
}

_MARKER_ALPHA = {
    "pass":      210,  # was 180
    "carry":     190,  # was 150
    "carry_end": 190,  # was 150
    "dribble":   210,  # was 180
    "shot":      240,  # was 220
    "goal":      255,
}


def _draw_markers(
    draw: ImageDraw.ImageDraw,
    path_events: list[tuple],
    width: int,
    height: int,
    primary_rgb: tuple[int, int, int],
    accent_rgb: tuple[int, int, int],
    point_size: float,
) -> None:
    """Draw small event markers at each path point."""
    for (x_n, y_n, evt) in path_events:
        px = int(x_n * width)
        py = int(y_n * height)
        base_r = _MARKER_RADII.get(evt, 4)
        r = max(1, int(base_r * point_size))
        alpha = _MARKER_ALPHA.get(evt, 180)

        color = accent_rgb if evt == "goal" else primary_rgb

        # Outer ring
        draw.ellipse(
            [px - r - 2, py - r - 2, px + r + 2, py + r + 2],
            fill=(*color, alpha // 3),
        )
        # Solid centre
        draw.ellipse(
            [px - r, py - r, px + r, py + r],
            fill=(*color, alpha),
        )


# ──────────────────────────────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────────────────────────────

def render_data_line(
    path: list[tuple],
    width: int,
    height: int,
    colors: dict,
    scale: float = 1.0,
    point_size: float = 1.0,
    glow: float = 50.0,
    show_markers: bool = True,
    effect: str = "default",
    **kwargs,
) -> Image.Image:
    """
    Render a glowing data path on a transparent RGBA canvas.

    Args:
        path:         [(x_norm, y_norm, event_type), ...] — all coords 0.0–1.0.
                      Supported event types: "pass", "carry", "shot", "goal".
        width:        Output image width in pixels.
        height:       Output image height in pixels.
        colors:       Dict with keys "primary", "secondary", "accent" (hex strings).
        scale:        Path size multiplier (1.0 = natural size, >1 = larger spread).
        point_size:   Data point marker size multiplier.
        glow:         Glow intensity 0–100. Low = tight/laser, High = soft bloom.
        show_markers: Draw small circles at each event point.
        effect:       Reserved for future line effects. Only "default" is handled here.
        **kwargs:     Accepted but ignored (forward-compat with v2 layer system).

    Returns:
        PIL Image in RGBA mode. Background is fully transparent; only the
        glowing path has non-zero alpha.
    """
    if not path or len(path) < 2:
        return Image.new("RGBA", (width, height), (0, 0, 0, 0))

    # ── Parse colours ──────────────────────────────────────────────────────────
    primary_rgb   = _hex_to_rgb(colors.get("primary",  "#FFFFFF"))
    secondary_rgb = _hex_to_rgb(colors.get("secondary", "#FF0000"))
    accent_rgb    = _hex_to_rgb(colors.get("accent",   "#FFFFFF"))

    hue, sat, _lum = _rgb_to_hsl(*primary_rgb)
    is_achromatic = sat < 10  # white / grey / black — skip HSL colour mixing

    # ── Clamp glow ─────────────────────────────────────────────────────────────
    glow = max(0.0, min(100.0, glow))
    bloom_t = glow / 100.0

    # ── Derive bloom parameters (matches generate_dataline_glow logic) ─────────
    #    radius_scale: 0.15 (laser-tight) → 2.0 (full atmospheric spread)
    #    bloom_falloff_adj: steep at low bloom, gentle at high
    #    bloom_blur:  0px (sharp) → 10px (feathered) final composite blur
    glow_radius      = 0.07 * scale                              # base radius in normalised space (was 0.06)
    radius_scale     = 0.25 + bloom_t * 1.75                    # was 0.15 + bloom_t * 1.85
    base_radius_px   = glow_radius * max(width, height) * radius_scale
    bloom_falloff    = 2.5 - bloom_t * 1.8                      # was 3.0 → 0.6; now 2.5 → 0.7
    bloom_blur       = max(1, int(bloom_t * 10))                # was max(0, bloom_t*8); minimum blur of 1
    brightness_boost = 1.0 + (1.0 - bloom_t) * 0.6             # 1.6× at 0, 1.0× at 100
    cell_visibility  = max(0.45, bloom_t ** 0.5)               # was bloom_t**0.6; now minimum 0.45 at any glow

    # ── Smooth path ────────────────────────────────────────────────────────────
    raw_coords    = [(x, y) for x, y, _ in path]
    smoothed_2d   = smooth_path(raw_coords, points_per_seg=40)
    smoothed_events = [(x, y, _nearest_event((x, y), path)) for x, y in smoothed_2d]

    # Goal point for radial burst
    goal_pts = [(x, y) for x, y, e in path if e == "goal"]
    goal_x, goal_y = goal_pts[-1] if goal_pts else (raw_coords[-1][0], raw_coords[-1][1])

    # ── Create transparent canvas ──────────────────────────────────────────────
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw  = ImageDraw.Draw(image, "RGBA")

    # ── Grid-based glow pass ───────────────────────────────────────────────────
    #    We sample on a regular grid rather than Voronoi so this module has zero
    #    scipy dependency. Visual result is nearly identical at grid_step ≤ 12.
    grid_step = max(4, int(min(width, height) / 90))
    grid_pts  = _build_sample_grid(width, height, grid_step)

    cell_half = grid_step // 2 + 1  # half-width of each "cell" square

    for (px, py, cx_n, cy_n) in grid_pts:
        # Find nearest smoothed event point
        best_dist = float("inf")
        best_event = "pass"
        for (ex, ey, evt) in smoothed_events:
            d = math.sqrt((cx_n - ex) ** 2 + (cy_n - ey) ** 2)
            if d < best_dist:
                best_dist = d
                best_event = evt

        params = EVENT_PARAMS.get(best_event, _DEFAULT_EVENT_PARAMS)

        # Goal: pure radial burst from goal point (no hard path-terminus line)
        if best_event == "goal":
            radial_dist = math.sqrt((cx_n - goal_x) ** 2 + (cy_n - goal_y) ** 2)
            # Per-cell noise for organic burst edge
            cell_hash = abs(hash((round(cx_n, 2), round(cy_n, 2)))) % 1000 / 1000.0
            noise = 0.7 + cell_hash * 0.6   # 0.7 – 1.3
            effective_radius = base_radius_px * params["radius_mult"] * noise
            best_dist = radial_dist

        # Shot: slight radial pull toward goal
        elif best_event == "shot":
            radial_dist = math.sqrt((cx_n - goal_x) ** 2 + (cy_n - goal_y) ** 2)
            shot_radial = glow_radius * 1.2
            if radial_dist < shot_radial:
                blend = 1.0 - (radial_dist / shot_radial)
                best_dist = best_dist * (1 - blend * 0.2) + radial_dist * (blend * 0.2)

        effective_radius = base_radius_px * params["radius_mult"]
        dist_px = best_dist * max(width, height)

        if dist_px > effective_radius * 2.0:
            continue  # well outside glow range — skip for performance

        # Smooth falloff
        t = max(0.0, 1.0 - (dist_px / effective_radius))
        adj_falloff = max(0.3, min(2.5, params["falloff_exp"] * bloom_falloff))
        t = t ** adj_falloff

        intensity = t * params["brightness_mult"] * brightness_boost * cell_visibility
        intensity = min(1.0, intensity)

        if intensity < 0.03:
            continue

        # Colour — secondary used for shot/goal events
        min_l  = 20.0
        max_l  = float(params["max_lightness"])
        cell_l = min_l + (max_l - min_l) * intensity

        use_secondary = best_event in ("shot", "goal")
        if use_secondary:
            # Blend primary → secondary for shots, full secondary for goals
            sec_h, sec_s, _ = _rgb_to_hsl(*secondary_rgb)
            blend = 0.6 if best_event == "shot" else 1.0
            sec_l = min_l + (max_l - min_l) * intensity
            sec_rgb = _hsl_to_rgb(sec_h, max(60.0, sec_s), sec_l)
            if is_achromatic:
                cell_rgb = tuple(int(primary_rgb[i] * (1 - blend) + sec_rgb[i] * blend) for i in range(3))
            else:
                cell_rgb = sec_rgb
        elif is_achromatic:
            t_blend = min(1.0, intensity * 1.5)
            cell_rgb = tuple(int(min_l + (c - min_l) * t_blend) for c in primary_rgb)
        else:
            cell_s   = 60 + 35 * intensity
            cell_rgb = _hsl_to_rgb(hue, cell_s, cell_l)

        alpha = int(255 * min(1.0, intensity * 1.4))  # was 220 * intensity*1.2

        # Draw cell square (cheap, looks identical to Voronoi at small grid_step)
        draw.rectangle(
            [px - cell_half, py - cell_half, px + cell_half, py + cell_half],
            fill=(*cell_rgb, alpha),
        )

    # ── Gaussian blur pass (atmospheric softening) ─────────────────────────────
    if bloom_blur > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=bloom_blur))

    # ── Bright spine on top of glow ───────────────────────────────────────────
    #    Two passes: (1) wide soft inner glow, (2) crisp bright centreline.
    smooth_px = [(int(x * width), int(y * height)) for x, y in smoothed_2d]
    line_brightness = min(1.0, 0.65 + bloom_t * 0.35)  # was 0.5+bloom_t*0.5 — higher floor

    if is_achromatic:
        spine_rgb = primary_rgb
    else:
        spine_rgb = _hsl_to_rgb(hue, 80, int(60 + 30 * line_brightness))

    # Pass 1 — soft inner glow halo (wide blurred)
    halo = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo, "RGBA")
    halo_width = max(4, int(8 * scale))
    halo_alpha = int(160 * line_brightness)  # semi-transparent wide halo
    for i in range(len(smooth_px) - 1):
        halo_draw.line([smooth_px[i], smooth_px[i + 1]], fill=(*spine_rgb, halo_alpha), width=halo_width)
    halo = halo.filter(ImageFilter.GaussianBlur(radius=max(2, int(4 * scale))))
    image = Image.alpha_composite(image, halo)

    # Pass 2 — crisp bright centreline
    spine = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    spine_draw = ImageDraw.Draw(spine, "RGBA")
    line_width = max(2, int(4 * scale))    # was max(1, int(2 * scale)) — doubled
    line_alpha = min(255, int(230 * line_brightness + 25))  # was int(200 * line_brightness) — brighter

    for i in range(len(smooth_px) - 1):
        spine_draw.line([smooth_px[i], smooth_px[i + 1]], fill=(*spine_rgb, line_alpha), width=line_width)

    # Slight blur on spine to soften anti-aliasing edges, then composite
    spine = spine.filter(ImageFilter.GaussianBlur(radius=max(0.5, scale * 0.6)))
    image = Image.alpha_composite(image, spine)

    # ── Event markers ──────────────────────────────────────────────────────────
    if show_markers:
        marker_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        marker_draw  = ImageDraw.Draw(marker_layer, "RGBA")
        _draw_markers(marker_draw, path, width, height, primary_rgb, accent_rgb, point_size)
        marker_layer = marker_layer.filter(ImageFilter.GaussianBlur(radius=1.0))
        image = Image.alpha_composite(image, marker_layer)

    return image
