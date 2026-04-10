"""
Sunburst Background Generator — Art Engine v2.0 Phase 3

Radial sunburst pattern with rays emanating from a central focal point.
Inspired by vintage Japanese-flag style / 1960s sports poster aesthetics.

FOCAL POINT: The exact centre of the sunburst (where all rays converge).
This is THE critical metadata field — it is where linked foreground elements
(goals, moments) anchor when focal linking is enabled.

Returns (image, metadata) — metadata always includes:
  - focal_point: (x, y) pixel coords of the ray convergence centre
  - pattern_bounds: (0, 0, width, height)

Used by: art_engine/backgrounds/__init__.py
"""

import math
import random
from typing import List, Optional, Tuple

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Colour constants (vintage palette)
# ---------------------------------------------------------------------------

_CREAM = (245, 235, 215)
_GOLD = (200, 170, 90)
_DARK_BROWN = (55, 35, 20)
_WARM_WHITE = (250, 242, 228)


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _parse_colour(value) -> Tuple[int, int, int]:
    """Normalise a colour value to an (R, G, B) int tuple."""
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return (int(value[0]), int(value[1]), int(value[2]))
    if isinstance(value, str):
        h = value.lstrip("#")
        if len(h) == 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
    return (128, 128, 128)


def _blend(c1: Tuple[int, int, int], c2: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
    """Linear interpolation between two RGB colours; t in [0, 1]."""
    return (
        int(c1[0] + (c2[0] - c1[0]) * t),
        int(c1[1] + (c2[1] - c1[1]) * t),
        int(c1[2] + (c2[2] - c1[2]) * t),
    )


def _darken(colour: Tuple[int, int, int], factor: float = 0.65) -> Tuple[int, int, int]:
    """Return a darker version of the colour."""
    return (
        int(colour[0] * factor),
        int(colour[1] * factor),
        int(colour[2] * factor),
    )


# ---------------------------------------------------------------------------
# Ray rendering helpers
# ---------------------------------------------------------------------------

def _draw_rays(
    odraw: ImageDraw.Draw,
    cx: int,
    cy: int,
    num_rays: int,
    max_r: int,
    rotation_rad: float,
    wide_color: Tuple[int, int, int],
    narrow_color: Tuple[int, int, int],
    accent_color: Tuple[int, int, int],
    ray_alpha: int = 35,
    narrow_alpha: int = 20,
    accent_alpha: int = 28,
    rng: Optional[random.Random] = None,
) -> None:
    """
    Draw alternating wide/narrow/accent rays from centre (cx, cy).

    Ray tiers:
      - Even rays: wide_color (primary) — the dominant visible rays
      - Odd rays:  narrow_color (secondary/cream) — spacer rays
      - Every 6th: accent_color — subtle accent pop
    """
    for i in range(num_rays):
        # Rotation offset applied to all rays uniformly
        angle1 = (2 * math.pi * i) / num_rays + rotation_rad
        angle2 = (2 * math.pi * (i + 0.5)) / num_rays + rotation_rad

        # Slight width variation for organic feel
        width_jitter = 0.0
        if rng is not None:
            width_jitter = rng.uniform(-0.05, 0.05)
        angle2 += width_jitter

        # Colour and alpha selection
        if i % 6 == 0:
            # Accent ray — slightly more opaque, gold-ish
            color = (*accent_color, accent_alpha)
        elif i % 2 == 0:
            # Wide ray — team primary
            color = (*wide_color, ray_alpha)
        else:
            # Narrow ray — cream/secondary
            color = (*narrow_color, narrow_alpha)

        # Triangle fan from centre to the edge
        x1 = cx + int(math.cos(angle1) * max_r)
        y1 = cy + int(math.sin(angle1) * max_r)
        x2 = cx + int(math.cos(angle2) * max_r)
        y2 = cy + int(math.sin(angle2) * max_r)

        odraw.polygon([(cx, cy), (x1, y1), (x2, y2)], fill=color)


def _apply_radial_fade(
    overlay: Image.Image,
    cx: int,
    cy: int,
    max_r: int,
    inner_bright: float = 1.0,
    outer_falloff: float = 0.5,
) -> Image.Image:
    """
    Apply a radial gradient mask so rays are bright at the centre and fade
    toward the edges. Returns a new RGBA image with the mask applied.

    inner_bright: alpha multiplier at centre (default 1.0 = full)
    outer_falloff: exponent controlling the fade curve (< 1 = slower fade)
    """
    mask = Image.new("L", overlay.size, 0)
    mdraw = ImageDraw.Draw(mask)

    for r in range(max_r, 0, -4):
        # Radial alpha: bright centre, transparent edge
        frac = r / max_r                          # 1.0 at edge, ~0 at centre
        alpha = int(255 * inner_bright * (1.0 - frac ** outer_falloff))
        mdraw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=alpha,
        )

    # Composite: use the mask to modulate the overlay alpha channel
    overlay.putalpha(
        Image.composite(
            overlay.getchannel("A"),
            Image.new("L", overlay.size, 0),
            mask,
        )
    )
    return overlay


# ---------------------------------------------------------------------------
# Background fill helpers
# ---------------------------------------------------------------------------

def _draw_background_fill(
    image: Image.Image,
    draw: ImageDraw.Draw,
    width: int,
    height: int,
    cx: int,
    cy: int,
    primary: Tuple[int, int, int],
    secondary: Tuple[int, int, int],
    density: float = 1.0,
) -> None:
    """
    Solid primary fill with a subtle secondary-colour radial gradient
    lightening toward the focal centre (same approach as ClassicStyle).
    """
    # Base fill
    draw.rectangle([0, 0, width, height], fill=primary)

    # Radial gradient: secondary-tinted highlight at the sunburst centre
    max_r = int(math.hypot(max(cx, width - cx), max(cy, height - cy)))
    grad = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(grad)

    for radius in range(max_r, 0, -6):
        frac = radius / max_r            # 1.0 at edge → 0.0 at centre
        r = int(primary[0] + (secondary[0] - primary[0]) * (1.0 - frac) * 0.3)
        g = int(primary[1] + (secondary[1] - primary[1]) * (1.0 - frac) * 0.3)
        b = int(primary[2] + (secondary[2] - primary[2]) * (1.0 - frac) * 0.3)
        a = int(130 * (1.0 - frac) * density)
        gdraw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(r, g, b, a),
        )

    image.paste(Image.alpha_composite(image.convert("RGBA"), grad), (0, 0))

    # Edge vignette: darken toward corners
    dark = _darken(primary, 0.7)
    vignette = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    fade_start = int(max_r * 0.5)
    for radius in range(max_r, fade_start, -4):
        frac = (radius - fade_start) / (max_r - fade_start)
        a = int(110 * frac * density)
        vdraw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=(*dark, a),
        )
    image.paste(Image.alpha_composite(image.convert("RGBA"), vignette), (0, 0))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_sunburst_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    ray_colors: Optional[List] = None,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Generate a radial sunburst background with rays converging at the centre.

    Parameters
    ----------
    width, height : int
        Output image dimensions in pixels.
    palette : dict
        Team colour palette.  Expected keys: "primary", "secondary", "accent".
        Each value may be a hex string ("#RRGGBB") or an (R, G, B) tuple/list.
    scale : float
        Scales ray reach; 1.0 fills to the canvas diagonal.
    rotation : int
        Rotation of the entire sunburst in degrees (clockwise).
    tile : bool
        If True, generates at a smaller render size then tiles 2×2 before
        resizing to the requested output dimensions (useful for tiled patterns).
    seed : int
        RNG seed for reproducible ray-width jitter.
    ray_colors : list, optional
        Override ray colours as [wide_ray_color, narrow_ray_color, accent_ray_color].
        Each element may be a hex string or (R, G, B) tuple.  Falls back to
        palette["primary"], palette["secondary"]/cream, and palette["accent"]/gold.
    **kwargs
        Silently absorbed (allows caller to pass extra params without error).

    Returns
    -------
    (image, metadata) : tuple
        image    — PIL.Image.Image in "RGB" mode, size (width, height).
        metadata — dict always containing:
                     "focal_point"    : (int, int)  — pixel coords of ray centre
                     "pattern_bounds" : (int, int, int, int) — (0, 0, w, h)
    """
    try:
        rng = random.Random(seed)

        # ------------------------------------------------------------------ #
        # Colour resolution
        # ------------------------------------------------------------------ #
        primary = _parse_colour(palette.get("primary", (180, 20, 20)))
        secondary = _parse_colour(palette.get("secondary", _CREAM))
        accent = _parse_colour(palette.get("accent", _GOLD))

        if ray_colors is not None and len(ray_colors) >= 3:
            wide_color = _parse_colour(ray_colors[0])
            narrow_color = _parse_colour(ray_colors[1])
            accent_color = _parse_colour(ray_colors[2])
        else:
            wide_color = primary
            narrow_color = secondary if secondary != primary else _CREAM
            accent_color = accent if accent not in (primary, secondary) else _GOLD

        # ------------------------------------------------------------------ #
        # Render size (tile mode: render smaller, then tile)
        # ------------------------------------------------------------------ #
        if tile:
            render_w = width // 2
            render_h = height // 2
        else:
            render_w = width
            render_h = height

        render_w = max(render_w, 64)
        render_h = max(render_h, 64)

        # ------------------------------------------------------------------ #
        # Canvas setup
        # ------------------------------------------------------------------ #
        image = Image.new("RGB", (render_w, render_h), primary)
        draw = ImageDraw.Draw(image)

        # FOCAL POINT — centre of sunburst (where all rays converge)
        # This is THE critical coordinate for downstream focal linking.
        cx = render_w // 2
        cy = render_h // 2

        # ------------------------------------------------------------------ #
        # Background fill with radial gradient
        # ------------------------------------------------------------------ #
        _draw_background_fill(
            image, draw, render_w, render_h, cx, cy,
            primary, secondary,
            density=kwargs.get("density", 1.0),
        )

        # ------------------------------------------------------------------ #
        # Sunburst rays
        # ------------------------------------------------------------------ #
        # Max ray reach: fraction of diagonal, scaled by 'scale' parameter
        diagonal = math.hypot(render_w, render_h)
        max_r = int(diagonal * 0.6 * scale)
        max_r = max(max_r, max(render_w, render_h))   # always reach canvas edge

        num_rays = kwargs.get("num_rays", 36)

        # Convert rotation to radians
        rotation_rad = math.radians(rotation)

        # Draw rays onto a transparent overlay
        overlay = Image.new("RGBA", (render_w, render_h), (0, 0, 0, 0))
        odraw = ImageDraw.Draw(overlay)

        _draw_rays(
            odraw, cx, cy,
            num_rays=num_rays,
            max_r=max_r,
            rotation_rad=rotation_rad,
            wide_color=wide_color,
            narrow_color=narrow_color,
            accent_color=accent_color,
            ray_alpha=kwargs.get("ray_alpha", 38),
            narrow_alpha=kwargs.get("narrow_alpha", 22),
            accent_alpha=kwargs.get("accent_alpha", 30),
            rng=rng,
        )

        # Apply radial fade — bright at centre, dissolving toward edges
        overlay = _apply_radial_fade(
            overlay, cx, cy, max_r,
            inner_bright=1.0,
            outer_falloff=0.5,
        )

        image.paste(
            Image.alpha_composite(image.convert("RGBA"), overlay),
            (0, 0),
        )

        # ------------------------------------------------------------------ #
        # Inner glow at focal point — warm highlight ring
        # ------------------------------------------------------------------ #
        glow = Image.new("RGBA", (render_w, render_h), (0, 0, 0, 0))
        gdraw = ImageDraw.Draw(glow)
        glow_r = int(min(render_w, render_h) * 0.12)
        for gr in range(glow_r, 0, -2):
            frac = gr / glow_r
            # Blend from warm white to transparent
            ga = int(60 * (1.0 - frac))
            gdraw.ellipse(
                [cx - gr, cy - gr, cx + gr, cy + gr],
                fill=(*_WARM_WHITE, ga),
            )
        image.paste(
            Image.alpha_composite(image.convert("RGBA"), glow),
            (0, 0),
        )

        # ------------------------------------------------------------------ #
        # Tile (optional)
        # ------------------------------------------------------------------ #
        if tile:
            tiled = Image.new("RGB", (render_w * 2, render_h * 2))
            tiled.paste(image, (0, 0))
            tiled.paste(image, (render_w, 0))
            tiled.paste(image, (0, render_h))
            tiled.paste(image, (render_w, render_h))
            image = tiled.resize((width, height), Image.LANCZOS)

        # ------------------------------------------------------------------ #
        # Rotation (whole image, if not already handled via ray rotation_rad)
        # ------------------------------------------------------------------ #
        # Note: rotation is already baked into ray angles above.
        # A secondary whole-image rotation is NOT applied to avoid
        # double-rotating; the focal_point stays at the centre regardless.

        # Ensure exact output dimensions
        if image.size != (width, height):
            image = image.resize((width, height), Image.LANCZOS)

        # ------------------------------------------------------------------ #
        # Metadata — FOCAL POINT is mandatory for this pattern
        # ------------------------------------------------------------------ #
        # Always the centre of the output image (rays converge here).
        focal_point = (width // 2, height // 2)

        metadata = {
            "focal_point": focal_point,          # ← THE KEY LINKING COORDINATE
            "pattern_bounds": (0, 0, width, height),
            "pattern": "sunburst",
            "num_rays": num_rays,
            "rotation_deg": rotation,
            "seed": seed,
        }

        return image, metadata

    except Exception as exc:
        # Graceful fallback — never crash the pipeline
        primary_fb = _parse_colour(palette.get("primary", (180, 20, 20)))
        fallback = Image.new("RGB", (width, height), primary_fb)
        metadata = {
            "focal_point": (width // 2, height // 2),
            "pattern_bounds": (0, 0, width, height),
            "pattern": "sunburst",
            "error": str(exc),
        }
        return fallback, metadata
