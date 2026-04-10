"""
Jackson Background Generator — Art Engine v2.0

Pure Pollock-style splatter background: violent drip painting, chaotic
layered drips, gravity-pulled paint, Bezier curves, splatter pools,
and thin connecting threads — completely independent of any data line.

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """Parse '#RRGGBB' or 'RRGGBB' to (r, g, b)."""
    hex_str = hex_str.lstrip("#")
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex colour: {hex_str!r}")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


def _rgba(rgb: Tuple[int, int, int], alpha: int = 255) -> Tuple[int, int, int, int]:
    return (*rgb, alpha)


# ---------------------------------------------------------------------------
# Bezier / geometry helpers
# ---------------------------------------------------------------------------

def _cubic_bezier(
    p0: Tuple[float, float],
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float],
    steps: int,
) -> List[Tuple[float, float]]:
    """Evaluate a cubic Bezier curve, returning `steps+1` points."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        u = 1.0 - t
        x = (u**3 * p0[0] + 3 * u**2 * t * p1[0]
             + 3 * u * t**2 * p2[0] + t**3 * p3[0])
        y = (u**3 * p0[1] + 3 * u**2 * t * p1[1]
             + 3 * u * t**2 * p2[1] + t**3 * p3[1])
        pts.append((x, y))
    return pts


def _bezier_drip(
    start: Tuple[float, float],
    end: Tuple[float, float],
    rng: random.Random,
    chaos: float = 1.0,
    gravity: float = 0.0,
) -> List[Tuple[float, float]]:
    """Generate a flowing Bezier drip between two points.

    *chaos* controls how wild the control points are.
    *gravity* biases the curve downward (simulates paint weight).
    """
    dx = end[0] - start[0]
    dy = end[1] - start[1]
    dist = math.hypot(dx, dy) or 1.0
    spread = dist * 0.4 * chaos

    cp1 = (
        start[0] + dx * 0.33 + rng.uniform(-spread, spread),
        start[1] + dy * 0.33 + rng.uniform(-spread, spread) + gravity * dist * 0.15,
    )
    cp2 = (
        start[0] + dx * 0.66 + rng.uniform(-spread, spread),
        start[1] + dy * 0.66 + rng.uniform(-spread, spread) + gravity * dist * 0.25,
    )

    steps = max(20, int(dist / 3))
    return _cubic_bezier(start, cp1, cp2, end, steps)


def _freeform_drip(
    origin: Tuple[float, float],
    rng: random.Random,
    length: float,
    angle: float,
    gravity: float = 1.0,
) -> List[Tuple[float, float]]:
    """Generate a free-form drip that flows from *origin* at *angle*,
    pulled downward by gravity."""
    end = (
        origin[0] + math.cos(angle) * length,
        origin[1] + math.sin(angle) * length + gravity * length * 0.4,
    )
    return _bezier_drip(origin, end, rng, chaos=1.5, gravity=gravity)


# ---------------------------------------------------------------------------
# Stroke and splatter rendering helpers
# ---------------------------------------------------------------------------

def _draw_variable_stroke(
    draw: ImageDraw.Draw,
    points: List[Tuple[float, float]],
    color: Tuple[int, ...],
    base_width: float,
    rng: random.Random,
    taper: bool = True,
) -> None:
    """Draw a stroke with variable width — thick pools, thin stretched paint."""
    n = len(points)
    if n < 2:
        return

    for i in range(n - 1):
        t = i / max(1, n - 2)
        if taper:
            width_factor = 1.0 - 0.6 * math.sin(t * math.pi)
            width_factor *= rng.uniform(0.7, 1.3)
        else:
            width_factor = rng.uniform(0.6, 1.4)

        w = max(1, int(base_width * width_factor))
        p1 = (int(points[i][0]), int(points[i][1]))
        p2 = (int(points[i + 1][0]), int(points[i + 1][1]))
        draw.line([p1, p2], fill=color, width=w)

        # At thick points, draw a small circle for the paint-pool effect
        if w >= base_width * 1.1 and rng.random() < 0.3:
            r = w // 2 + 1
            draw.ellipse([p1[0] - r, p1[1] - r, p1[0] + r, p1[1] + r], fill=color)


def _splatter_dots(
    draw: ImageDraw.Draw,
    center: Tuple[float, float],
    color: Tuple[int, int, int],
    rng: random.Random,
    count: int = 12,
    radius: float = 80.0,
) -> None:
    """Spray random paint dots around a centre point."""
    for _ in range(count):
        angle = rng.uniform(0, 2 * math.pi)
        dist = rng.uniform(5, radius) ** rng.uniform(0.6, 1.0)
        x = center[0] + math.cos(angle) * dist
        y = center[1] + math.sin(angle) * dist
        r = rng.uniform(1, max(2, radius * 0.06))
        alpha = rng.randint(140, 255)
        draw.ellipse(
            [int(x - r), int(y - r), int(x + r), int(y + r)],
            fill=_rgba(color, alpha),
        )


def _thin_threads(
    draw: ImageDraw.Draw,
    start: Tuple[float, float],
    rng: random.Random,
    color: Tuple[int, int, int],
    count: int = 4,
    max_len: float = 200,
) -> None:
    """Thin connecting threads — the web between drips."""
    for _ in range(count):
        angle = rng.uniform(0, 2 * math.pi)
        length = rng.uniform(40, max_len)
        pts = _freeform_drip(start, rng, length, angle, gravity=rng.uniform(0.2, 1.0))
        alpha = rng.randint(80, 200)
        _draw_variable_stroke(
            draw, pts, _rgba(color, alpha),
            base_width=rng.uniform(1, 2.5), rng=rng, taper=False,
        )


# ---------------------------------------------------------------------------
# Splatter layer renderers (path-independent)
# ---------------------------------------------------------------------------

def _scatter_origins(
    width: int,
    height: int,
    count: int,
    rng: random.Random,
    margin: float = 0.08,
) -> List[Tuple[float, float]]:
    """Return `count` random points spread across the canvas interior."""
    m_x = width * margin
    m_y = height * margin
    return [
        (rng.uniform(m_x, width - m_x), rng.uniform(m_y, height - m_y))
        for _ in range(count)
    ]


def _render_black_web(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: dict,
    rng: random.Random,
    density: float = 1.0,
) -> None:
    """Layer 1: thin black threads scattered across the canvas — the web."""
    black = colours["black"]
    node_count = max(4, int(30 * density))
    nodes = _scatter_origins(width, height, node_count, rng)

    for node in nodes:
        thread_count = rng.randint(2, max(3, int(6 * density)))
        max_len = rng.uniform(150, 450) * density
        _thin_threads(draw, node, rng, black, count=thread_count, max_len=max_len)

    # Extra long web threads spanning larger distances
    extra = max(2, int(12 * density))
    for _ in range(extra):
        origin = (rng.uniform(0, width), rng.uniform(0, height))
        _thin_threads(draw, origin, rng, black,
                      count=rng.randint(3, 6),
                      max_len=rng.uniform(200, min(width, height) * 0.7))


def _render_secondary_drips(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: dict,
    rng: random.Random,
    density: float = 1.0,
    drip_intensity: float = 1.0,
) -> None:
    """Layer 2: secondary-colour drip passes at oblique angles."""
    secondary = colours["secondary"]
    pass_count = rng.randint(2, max(3, int(4 * density)))

    for _ in range(pass_count):
        seg_count = max(3, int(12 * density))
        starts = _scatter_origins(width, height, seg_count, rng)

        for i in range(len(starts) - 1):
            p1, p2 = starts[i], starts[i + 1]
            drip = _bezier_drip(p1, p2, rng, chaos=1.2,
                                gravity=rng.uniform(0.3, 1.5) * drip_intensity)
            alpha = rng.randint(120, 230)
            w = rng.uniform(3, 10 * drip_intensity)
            _draw_variable_stroke(draw, drip, _rgba(secondary, alpha),
                                  base_width=w, rng=rng)

            if rng.random() < 0.6:
                mid_idx = len(drip) // 2
                _splatter_dots(draw, drip[mid_idx], secondary, rng,
                               count=rng.randint(5, 15),
                               radius=rng.uniform(30, 80) * density)


def _render_primary_drips(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: dict,
    rng: random.Random,
    density: float = 1.0,
    drip_intensity: float = 1.0,
) -> None:
    """Layer 3: Primary-colour drip clusters — the dominant visual artery.

    Rather than following a fixed data path, paint flows from several
    organically chosen anchor points with gravity-pulled drip clusters.
    """
    primary = colours["primary"]

    # Anchor points — where the 'brush' passes closest
    anchor_count = max(3, int(8 * density))
    anchors = _scatter_origins(width, height, anchor_count, rng)

    # Connect anchors with a continuous Bezier path
    all_pts: List[Tuple[float, float]] = []
    for i in range(len(anchors) - 1):
        drip = _bezier_drip(anchors[i], anchors[i + 1], rng, chaos=0.7,
                            gravity=0.3 * drip_intensity)
        if all_pts:
            all_pts.extend(drip[1:])
        else:
            all_pts.extend(drip)

    base_w = max(1, int(18 * drip_intensity))
    _draw_variable_stroke(draw, all_pts, _rgba(primary, 240),
                          base_width=base_w, rng=rng, taper=True)

    # Paint pools at anchor points (where brush 'paused')
    for pt in anchors:
        pool_r = rng.randint(12, 28)
        draw.ellipse(
            [int(pt[0] - pool_r), int(pt[1] - pool_r),
             int(pt[0] + pool_r), int(pt[1] + pool_r)],
            fill=_rgba(primary, rng.randint(180, 250)),
        )

    # Gravity drips hanging down from the primary path
    for pt in all_pts:
        if rng.random() < 0.03 * density:
            drip_len = rng.uniform(40, 180) * drip_intensity
            angle = math.pi / 2 + rng.uniform(-0.2, 0.2)
            drip = _freeform_drip(pt, rng, drip_len, angle, gravity=1.5)
            _draw_variable_stroke(draw, drip,
                                  _rgba(primary, rng.randint(150, 240)),
                                  base_width=rng.uniform(2, 6), rng=rng, taper=True)

    # Side flings — momentum flings sideways off the main path
    for i in range(len(anchors) - 1):
        p1, p2 = anchors[i], anchors[i + 1]
        seg_angle = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
        for _ in range(rng.randint(2, max(3, int(5 * density)))):
            t = rng.uniform(0.1, 0.9)
            origin = (p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t)
            fling_angle = (seg_angle
                           + rng.choice([-1, 1])
                           * (math.pi / 2 + rng.uniform(-0.5, 0.5)))
            fling_len = rng.uniform(30, 150) * drip_intensity
            drip = _freeform_drip(origin, rng, fling_len, fling_angle,
                                  gravity=0.5 * drip_intensity)
            _draw_variable_stroke(draw, drip,
                                  _rgba(primary, rng.randint(130, 220)),
                                  base_width=rng.uniform(1.5, 5), rng=rng, taper=True)


def _render_accent_splatters(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: dict,
    rng: random.Random,
    density: float = 1.0,
    drip_intensity: float = 1.0,
) -> None:
    """Layer 4: accent-colour splatters — flicked and flung."""
    accent = colours["accent"]

    splatter_point_count = max(4, int(15 * density))
    splash_pts = _scatter_origins(width, height, splatter_point_count, rng)

    for pt in splash_pts:
        _splatter_dots(draw, pt, accent, rng,
                       count=rng.randint(15, max(16, int(35 * density))),
                       radius=rng.uniform(60, 160) * density)

    # Additional random splatters
    extra = max(4, int(14 * density))
    for _ in range(extra):
        rx = rng.uniform(width * 0.1, width * 0.9)
        ry = rng.uniform(height * 0.1, height * 0.9)
        _splatter_dots(draw, (rx, ry), accent, rng,
                       count=rng.randint(5, 20),
                       radius=rng.uniform(20, 60) * density)

    # Short flung drips
    fling_count = max(3, int(12 * density))
    fling_pts = _scatter_origins(width, height, fling_count, rng)
    for pt in fling_pts:
        angle = rng.uniform(0, 2 * math.pi)
        length = rng.uniform(40, 180) * drip_intensity
        drip = _freeform_drip(pt, rng, length, angle,
                              gravity=rng.uniform(0, 1) * drip_intensity)
        _draw_variable_stroke(draw, drip,
                              _rgba(accent, rng.randint(160, 255)),
                              base_width=rng.uniform(2, 6), rng=rng, taper=True)


def _render_white_flecks(
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    colours: dict,
    rng: random.Random,
    density: float = 1.0,
) -> None:
    """Layer 5: fine white/cream flecks — paint dust and dried spray."""
    fleck = colours["white_fleck"]
    count = rng.randint(max(20, int(40 * density)), max(50, int(100 * density)))
    for _ in range(count):
        rx = rng.uniform(width * 0.05, width * 0.95)
        ry = rng.uniform(height * 0.05, height * 0.95)
        r = rng.uniform(0.5, 3)
        alpha = rng.randint(60, 160)
        draw.ellipse(
            [int(rx - r), int(ry - r), int(rx + r), int(ry + r)],
            fill=_rgba(fleck, alpha),
        )


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def _post_process(image: Image.Image, width: int, height: int) -> Image.Image:
    """Dark vignette + subtle Gaussian blur for depth and paint-bleed."""
    image = image.convert("RGBA")

    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    cx, cy = width // 2, height // 2
    max_r = int(math.sqrt(cx * cx + cy * cy))
    for radius in range(max_r, max_r // 3, -4):
        progress = (radius - max_r // 3) / (max_r - max_r // 3)
        alpha = min(100, max(0, int(100 * progress)))
        vdraw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(0, 0, 0, alpha),
        )

    image = Image.alpha_composite(image, vignette)
    image = image.filter(ImageFilter.GaussianBlur(radius=0.6))
    return image


# ---------------------------------------------------------------------------
# Tiling helper
# ---------------------------------------------------------------------------

def _tile_image(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Shrink *img* to half size, then tile 2×2 to fill target dimensions."""
    tile_w = max(64, target_w // 2)
    tile_h = max(64, target_h // 2)
    tile = img.resize((tile_w, tile_h), Image.LANCZOS)
    result = Image.new("RGBA", (target_w, target_h))
    for ty in range(0, target_h, tile_h):
        for tx in range(0, target_w, tile_w):
            result.paste(tile, (tx, ty))
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_jackson_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,            # Splatter density multiplier
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    splatter_density: float = 1.0, # Extra density control for splatters
    drip_intensity: float = 1.0,   # Controls drip length, width, gravity
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a Pollock-style splatter background (no data line).

    Args:
        width:            Output image width in pixels.
        height:           Output image height in pixels.
        palette:          Colour dict with keys 'primary', 'secondary', 'accent',
                          'background'.  Values are hex strings ('#RRGGBB').
        scale:            Overall pattern scale / splatter density (0.1–2.0).
                          Higher = denser splatters.
        rotation:         Post-render rotation in degrees (0–360).
        tile:             If True, generate at half size then tile 2×2.
        seed:             RNG seed for reproducibility.
        splatter_density: Pattern-specific multiplier for splatter dot count and spread.
        drip_intensity:   Pattern-specific multiplier for drip length, gravity, and width.
        **kwargs:         Ignored; kept for forward-compatibility.

    Returns:
        (image, metadata) where:
          image    — PIL Image (RGBA) of the requested size.
          metadata — dict with 'focal_point' (None) and 'pattern_bounds'.
    """
    try:
        # ── Resolve colours ──────────────────────────────────────────────────
        primary   = _hex_to_rgb(palette.get("primary",    "#1A1A2E"))
        secondary = _hex_to_rgb(palette.get("secondary",  "#E94560"))
        accent    = _hex_to_rgb(palette.get("accent",     "#F5A623"))
        bg_colour = _hex_to_rgb(palette.get("background", "#0F0F0F"))

        colours = {
            "primary":      primary,
            "secondary":    secondary,
            "accent":       accent,
            "black":        (20, 20, 20),
            "white_fleck":  (220, 215, 200),
        }

        # ── Effective density (scale * splatter_density) ─────────────────────
        density = max(0.1, scale * splatter_density)

        # ── Canvas setup ─────────────────────────────────────────────────────
        render_w, render_h = width, height
        if tile:
            render_w = max(64, width // 2)
            render_h = max(64, height // 2)

        image = Image.new("RGBA", (render_w, render_h))
        draw  = ImageDraw.Draw(image)

        rng = random.Random(seed)

        # ── Base fill ─────────────────────────────────────────────────────────
        draw.rectangle([0, 0, render_w - 1, render_h - 1], fill=_rgba(bg_colour))

        # Subtle grain on base coat
        arr  = np.array(image)
        rs   = np.random.RandomState(seed)
        g    = max(1, int(6 * density))
        noise = rs.randint(-g, g, (render_h, render_w), dtype=np.int16)
        for c in range(3):
            ch = arr[:, :, c].astype(np.int16) + noise
            arr[:, :, c] = np.clip(ch, 0, 255).astype(np.uint8)
        image = Image.fromarray(arr, mode="RGBA")
        draw  = ImageDraw.Draw(image)  # rebind after paste

        # ── Layer 1: Background black web ─────────────────────────────────────
        _render_black_web(draw, render_w, render_h, colours, rng, density=density)

        # ── Layer 2: Secondary colour drip passes ─────────────────────────────
        _render_secondary_drips(draw, render_w, render_h, colours, rng,
                                density=density, drip_intensity=drip_intensity)

        # ── Layer 3: Primary colour drip clusters ─────────────────────────────
        _render_primary_drips(draw, render_w, render_h, colours, rng,
                              density=density, drip_intensity=drip_intensity)

        # ── Layer 4: Accent splatters and flicks ──────────────────────────────
        _render_accent_splatters(draw, render_w, render_h, colours, rng,
                                 density=density, drip_intensity=drip_intensity)

        # ── Layer 5: Fine white flecks ────────────────────────────────────────
        _render_white_flecks(draw, render_w, render_h, colours, rng, density=density)

        # ── Post-process: vignette + blur ─────────────────────────────────────
        image = _post_process(image, render_w, render_h)

        # ── Tile ──────────────────────────────────────────────────────────────
        if tile:
            image = _tile_image(image, width, height)

        # ── Rotation ──────────────────────────────────────────────────────────
        if rotation % 360 != 0:
            rotated = image.rotate(rotation, expand=True, resample=Image.BICUBIC)
            rx, ry  = rotated.size
            left    = max(0, (rx - width)  // 2)
            top     = max(0, (ry - height) // 2)
            image   = rotated.crop((left, top, left + width, top + height))

        # ── Ensure exact output size ───────────────────────────────────────────
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        metadata = {
            "focal_point":    None,
            "pattern_bounds": (0, 0, width, height),
        }
        return image, metadata

    except Exception as exc:
        fallback = Image.new("RGBA", (width, height), (15, 10, 10, 255))
        return fallback, {
            "focal_point":    None,
            "pattern_bounds": (0, 0, width, height),
            "error":          str(exc),
        }
