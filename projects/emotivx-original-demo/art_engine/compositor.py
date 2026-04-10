"""
Art Engine v2.0 — Compositor & Full-Stack Generator (Phase 2.3)

Owns one concern: combine a background layer with a data-line layer into
a finished artwork image.  Full-stack convenience wrapper also handles
background selection and data-line rendering so callers can go from raw
match data to a final PNG in a single call.

Usage (minimal):
    from art_engine.compositor import composite_artwork, generate_artwork

    # --- Low-level: you already have both layers ---
    final = composite_artwork(bg_image, data_line_image)

    # --- High-level: one-shot ---
    final = generate_artwork(
        background_style="camo",
        path=[(0.2, 0.5, "pass"), (0.6, 0.3, "shot"), (0.9, 0.4, "goal")],
        width=2048,
        height=2048,
        bg_palette={"primary": "#2D5016", "secondary": "#A3C586",
                    "accent": "#FFFFFF", "background": "#1A1A0F"},
        data_colors={"primary": "#FFFFFF", "secondary": "#DA291C",
                     "accent": "#FFFFFF"},
    )
    final.save("artwork.png")
"""

from __future__ import annotations

import logging
import random
from typing import Optional

from PIL import Image

logger = logging.getLogger(__name__)

# ── Background style registry ─────────────────────────────────────────────────
# Maps style name → generator callable.
# Each generator has signature:
#   generate_xxx_background(width, height, palette, **kwargs) -> (Image, metadata)

_BACKGROUND_REGISTRY: dict[str, str] = {
    "camo":       "art_engine.backgrounds.camo:generate_camo_background",
    "geometric":  "art_engine.backgrounds.geometric:generate_geometric_background",
    "jackson":    "art_engine.backgrounds.jackson:generate_jackson_background",
    "spider":     "art_engine.backgrounds.spider:generate_spider_background",
    "sunburst":   "art_engine.backgrounds.sunburst:generate_sunburst_background",
    "street":     "art_engine.backgrounds.street:generate_street_background",
    "classic":    "art_engine.backgrounds.classic:generate_classic_background",
    "tron":       "art_engine.backgrounds.tron:generate_tron_background",
    "fractals":   "art_engine.backgrounds.fractals:generate_fractals_background",
}


def _load_background_generator(style: str):
    """Lazy-import and return the background generator for *style*."""
    style_lower = style.lower()
    if style_lower not in _BACKGROUND_REGISTRY:
        available = ", ".join(sorted(_BACKGROUND_REGISTRY))
        raise ValueError(
            f"Unknown background style '{style}'. "
            f"Available: {available}"
        )

    module_path, func_name = _BACKGROUND_REGISTRY[style_lower].split(":")
    import importlib
    module = importlib.import_module(module_path)
    return getattr(module, func_name)


# ── Core compositor ───────────────────────────────────────────────────────────

def composite_artwork(
    background: Image.Image,
    data_line: Image.Image,
    focal_link: bool = False,
    bg_focal_point: Optional[tuple] = None,
    data_goal_point: Optional[tuple] = None,
) -> Image.Image:
    """
    Composite a background layer and a data-line layer into a single image.

    Args:
        background:      Background PIL Image (any mode; converted to RGBA
                         internally).
        data_line:       Data-line PIL Image in RGBA mode (transparent canvas
                         with the glowing path drawn on it).
        focal_link:      [Phase 3 placeholder] When True, align the background's
                         focal point with the data line's goal marker before
                         compositing.  Currently accepted but not acted upon.
        bg_focal_point:  (x, y) pixel coords of the background focal point.
                         Passed through for Phase 3; ignored for now.
        data_goal_point: (x, y) pixel coords of the data-line goal marker.
                         Passed through for Phase 3; ignored for now.

    Returns:
        PIL Image in RGBA mode: background with data line composited on top.
    """
    # ── Normalise modes ───────────────────────────────────────────────────────
    if background.mode != "RGBA":
        background = background.convert("RGBA")
    if data_line.mode != "RGBA":
        data_line = data_line.convert("RGBA")

    # ── Size guard ────────────────────────────────────────────────────────────
    if background.size != data_line.size:
        logger.warning(
            "compositor: size mismatch — background %s vs data_line %s. "
            "Resizing data_line to match background.",
            background.size,
            data_line.size,
        )
        data_line = data_line.resize(background.size, Image.LANCZOS)

    # ── Focal linking (Phase 3) ───────────────────────────────────────────────
    if focal_link and bg_focal_point and data_goal_point:
        try:
            offset_x = bg_focal_point[0] - data_goal_point[0]
            offset_y = bg_focal_point[1] - data_goal_point[1]
            logger.debug(
                "compositor: focal_link — bg_focal=%s  goal=%s  offset=(%d, %d)",
                bg_focal_point, data_goal_point, offset_x, offset_y,
            )

            # Blank RGBA canvas, same size as the layers
            shifted = Image.new("RGBA", data_line.size, (0, 0, 0, 0))

            # Paste data_line translated so the goal lands on the focal point.
            # PIL.paste ignores pixels outside the canvas bounds automatically.
            shifted.paste(data_line, (int(offset_x), int(offset_y)), data_line)
            data_line = shifted

        except Exception as exc:  # pragma: no cover — defensive fallback
            logger.warning(
                "compositor: focal_link transform failed (%s) — "
                "falling back to un-shifted composite.",
                exc,
            )

    elif focal_link:
        logger.debug(
            "compositor: focal_link=True but missing coords "
            "(bg_focal_point=%s, data_goal_point=%s) — skipping transform.",
            bg_focal_point, data_goal_point,
        )

    # ── Alpha composite: data line sits on top of background ─────────────────
    return Image.alpha_composite(background, data_line)


# ── Full-stack generator ──────────────────────────────────────────────────────

def generate_artwork(
    background_style: str,
    path: list,
    width: int = 2048,
    height: int = 2048,
    bg_palette: Optional[dict] = None,
    data_colors: Optional[dict] = None,
    data_effect: str = "default",
    glow: float = 50.0,
    scale: float = 1.0,
    point_size: float = 1.0,
    show_markers: bool = True,
    seed: Optional[int] = None,
    **kwargs,
) -> Image.Image:
    """
    One-shot artwork generation from raw match data.

    Pipeline:
        1. Generate background via *background_style* generator.
        2. Render glowing data path via ``art_engine.data_renderer``.
        3. Composite both layers.
        4. Return final RGBA image.

    Args:
        background_style: Background style name — "camo", "geometric",
                          "jackson", or "spider".
        path:             Goal path data: list of (x_norm, y_norm, event_type)
                          tuples with coordinates normalised to [0, 1].
        width:            Output image width in pixels (default 2048).
        height:           Output image height in pixels (default 2048).
        bg_palette:       Colour palette for the background.  Dict with keys
                          'primary', 'secondary', 'accent', 'background'
                          (hex strings).  Defaults applied per style if None.
        data_colors:      Colours for the data line.  Dict with keys
                          'primary', 'secondary', 'accent' (hex strings).
                          Defaults to white/red if None.
        data_effect:      Line effect preset passed to the data renderer.
                          Currently only "default" is handled.
        glow:             Glow intensity 0–100 (default 50).
        scale:            Path size multiplier for the data renderer (default 1.0).
        point_size:       Marker size multiplier for the data renderer (default 1.0).
        show_markers:     Draw small circles at each event point (default True).
        seed:             RNG seed for the background generator.  If None
                          (default), a random seed is chosen each call so
                          every render is unique.
        **kwargs:         Extra keyword args forwarded to the background
                          generator (e.g. ``web_complexity`` for spider).

    Returns:
        PIL Image (RGBA) — fully composited artwork ready for export.

    Raises:
        ValueError: If *background_style* is not registered.
    """
    # ── Defaults ──────────────────────────────────────────────────────────────
    if bg_palette is None:
        bg_palette = {
            "primary":    "#2D5016",
            "secondary":  "#A3C586",
            "accent":     "#FFFFFF",
            "background": "#1A1A0F",
        }

    if data_colors is None:
        data_colors = {
            "primary":   "#FFFFFF",
            "secondary": "#DA291C",
            "accent":    "#FFFFFF",
        }

    # ── Seed resolution ───────────────────────────────────────────────────────
    # None → new random seed each call; explicit value → deterministic render.
    seed = seed if seed is not None else random.randint(0, 99999)
    logger.debug("compositor: seed=%d", seed)

    # ── Step 1: Background ────────────────────────────────────────────────────
    logger.debug("compositor: generating '%s' background (%dx%d)", background_style, width, height)
    bg_generator = _load_background_generator(background_style)
    bg_image, bg_meta = bg_generator(
        width=width,
        height=height,
        palette=bg_palette,
        seed=seed,
        **kwargs,
    )

    # ── Step 2: Data line ─────────────────────────────────────────────────────
    logger.debug("compositor: rendering data line (%d events)", len(path))
    from art_engine.data_renderer import render_data_line
    data_line = render_data_line(
        path=path,
        width=width,
        height=height,
        colors=data_colors,
        scale=scale,
        point_size=point_size,
        glow=glow,
        show_markers=show_markers,
        effect=data_effect,
    )

    # ── Step 3: Composite ─────────────────────────────────────────────────────
    bg_focal = bg_meta.get("focal_point") if bg_meta else None

    # Find last goal event and convert normalised coords → pixel coords.
    goal_pixel: Optional[tuple] = None
    goal_events = [p for p in path if len(p) >= 3 and p[2] == "goal"]
    if goal_events:
        goal_x, goal_y = goal_events[-1][:2]
        goal_pixel = (int(goal_x * width), int(goal_y * height))
        logger.debug("compositor: goal pixel = %s", goal_pixel)

    final = composite_artwork(
        background=bg_image,
        data_line=data_line,
        focal_link=bool(bg_focal and goal_pixel),
        bg_focal_point=bg_focal,
        data_goal_point=goal_pixel,
    )

    logger.debug("compositor: done — output size %s", final.size)
    return final
