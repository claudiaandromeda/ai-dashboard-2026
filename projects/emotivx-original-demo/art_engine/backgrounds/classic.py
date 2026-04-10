"""
Classic Background Generator — Art Engine v2.0 Phase 4.2

Plain club shirt aesthetic — simple, clean, minimal.
Think: an actual football shirt before the art goes on.

No complex patterns. No sunbursts. No tessellation.
Just: base colour → subtle fabric texture → gentle radial gradient.
That's the whole design. It's supposed to look like fabric.

focal_point is always None for this pattern — there's no anchor.
Downstream focal linking should fall back gracefully.

Returns (image, metadata) — metadata always includes:
  - focal_point: None
  - pattern_bounds: (0, 0, width, height)

Used by: art_engine/backgrounds/__init__.py
"""

import random
from typing import Tuple

from PIL import Image, ImageFilter


# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------

def _parse_colour(value, fallback: Tuple[int, int, int] = (128, 128, 128)) -> Tuple[int, int, int]:
    """Normalise a colour value to an (R, G, B) int tuple."""
    if isinstance(value, (list, tuple)) and len(value) >= 3:
        return (int(value[0]), int(value[1]), int(value[2]))
    if isinstance(value, str):
        h = value.lstrip("#")
        if len(h) == 6:
            try:
                return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
            except ValueError:
                pass
    return fallback


def _clamp(value: float, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, int(value)))


def _darken(colour: Tuple[int, int, int], factor: float) -> Tuple[int, int, int]:
    return (_clamp(colour[0] * factor), _clamp(colour[1] * factor), _clamp(colour[2] * factor))


def _lighten(colour: Tuple[int, int, int], factor: float) -> Tuple[int, int, int]:
    r = colour[0] + (255 - colour[0]) * factor
    g = colour[1] + (255 - colour[1]) * factor
    b = colour[2] + (255 - colour[2]) * factor
    return (_clamp(r), _clamp(g), _clamp(b))


# ---------------------------------------------------------------------------
# Fabric texture
# ---------------------------------------------------------------------------

def _add_fabric_texture(
    image: Image.Image,
    primary: Tuple[int, int, int],
    rng: random.Random,
    strength: float = 0.035,
) -> Image.Image:
    """
    Add a very subtle per-pixel noise layer to mimic fabric weave.

    strength controls how visible the noise is — 0.035 is barely perceptible
    at arm's length (like real fabric texture).  Range: 0.01–0.08.
    """
    width, height = image.size
    pixels = image.load()

    noise_range = int(255 * strength)

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]

            # Tiny independent noise per channel — mimics fabric grain
            nr = _clamp(r + rng.randint(-noise_range, noise_range))
            ng = _clamp(g + rng.randint(-noise_range, noise_range))
            nb = _clamp(b + rng.randint(-noise_range, noise_range))

            # Very subtle horizontal/vertical weave bias (1px alternating lines)
            # Creates just enough structure to read as woven fabric at close range
            if (x + y) % 2 == 0:
                nr = _clamp(nr - 3)
                ng = _clamp(ng - 3)
                nb = _clamp(nb - 3)

            pixels[x, y] = (nr, ng, nb)

    return image


# ---------------------------------------------------------------------------
# Radial gradient (edge darkening)
# ---------------------------------------------------------------------------

def _apply_radial_gradient(
    image: Image.Image,
    strength: float = 0.18,
) -> Image.Image:
    """
    Gently darken the edges, lighten the centre.

    strength: 0.0 = flat, 0.18 = subtle shirt-fold feel.
    This is the same technique used on real product photography.
    """
    width, height = image.size
    cx, cy = width / 2.0, height / 2.0
    max_r = (cx ** 2 + cy ** 2) ** 0.5  # corner distance

    pixels = image.load()

    for y in range(height):
        for x in range(width):
            r, g, b = pixels[x, y]

            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            # frac: 0.0 at centre, 1.0 at corner
            frac = dist / max_r

            # Darken toward edges, very gentle
            factor = 1.0 - frac * strength

            pixels[x, y] = (_clamp(r * factor), _clamp(g * factor), _clamp(b * factor))

    return image


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_classic_background(
    width: int,
    height: int,
    palette: dict,
    scale: float = 1.0,
    rotation: int = 0,
    tile: bool = False,
    seed: int = 42,
    **kwargs,
) -> Tuple[Image.Image, dict]:
    """
    Plain club shirt pattern — simple, clean, minimal.
    Think: actual football shirt before we add art.

    Parameters
    ----------
    width, height : int
        Output image dimensions in pixels.
    palette : dict
        Team colour palette.  Only "primary" is used for the base fill.
        Optional "accent" tints the gradient highlight (fallback: white).
    scale : float
        Unused for this pattern (kept for API compatibility).
    rotation : int
        Unused for this pattern (kept for API compatibility).
    tile : bool
        Unused for this pattern (kept for API compatibility).
    seed : int
        RNG seed for reproducible fabric noise.
    **kwargs
        texture_strength : float (default 0.035) — noise intensity
        gradient_strength : float (default 0.18) — edge darkening intensity
        no_texture : bool (default False) — skip fabric noise
        no_gradient : bool (default False) — skip radial gradient

    Returns
    -------
    (image, metadata) : tuple
        image    — PIL.Image.Image in "RGB" mode, size (width, height).
        metadata — dict containing:
                     "focal_point"    : None  (plain shirt has no focal anchor)
                     "pattern_bounds" : (int, int, int, int) — (0, 0, w, h)
                     "pattern"        : "classic"
                     "seed"           : int
    """
    try:
        rng = random.Random(seed)

        primary = _parse_colour(palette.get("primary", (180, 20, 20)))

        # ------------------------------------------------------------------ #
        # 1. Solid base fill
        # ------------------------------------------------------------------ #
        image = Image.new("RGB", (width, height), primary)

        # ------------------------------------------------------------------ #
        # 2. Subtle fabric weave texture (optional, on by default)
        # ------------------------------------------------------------------ #
        if not kwargs.get("no_texture", False):
            texture_strength = float(kwargs.get("texture_strength", 0.035))
            image = _add_fabric_texture(image, primary, rng, strength=texture_strength)

        # ------------------------------------------------------------------ #
        # 3. Gentle radial gradient — edges darker, centre lighter
        # ------------------------------------------------------------------ #
        if not kwargs.get("no_gradient", False):
            gradient_strength = float(kwargs.get("gradient_strength", 0.18))
            image = _apply_radial_gradient(image, strength=gradient_strength)

        # ------------------------------------------------------------------ #
        # 4. Micro-blur — softens noise to read as texture, not grain
        # ------------------------------------------------------------------ #
        if not kwargs.get("no_texture", False):
            image = image.filter(ImageFilter.GaussianBlur(radius=0.6))

        # ------------------------------------------------------------------ #
        # Metadata — focal_point is None (plain shirt has no anchor)
        # ------------------------------------------------------------------ #
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "pattern": "classic",
            "seed": seed,
        }

        return image, metadata

    except Exception as exc:
        # Graceful fallback — never crash the pipeline
        primary_fb = _parse_colour(palette.get("primary", (180, 20, 20)))
        fallback = Image.new("RGB", (width, height), primary_fb)
        metadata = {
            "focal_point": None,
            "pattern_bounds": (0, 0, width, height),
            "pattern": "classic",
            "error": str(exc),
        }
        return fallback, metadata
