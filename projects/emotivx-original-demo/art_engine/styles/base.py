"""
Base style class — all style presets inherit from this.
Provides shared utilities for coordinate mapping, colour manipulation, and canvas setup.
"""

from dataclasses import dataclass
from typing import List, Tuple, Dict, Any, Optional
import math
import colorsys


@dataclass
class Palette:
    """Club colour palette for a specific kit (home/away)."""
    primary: str
    secondary: str
    accent: str
    background: str

    def hex_to_rgb(self, hex_color: str) -> Tuple[int, int, int]:
        h = hex_color.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

    def rgb(self, role: str) -> Tuple[int, int, int]:
        return self.hex_to_rgb(getattr(self, role))

    def rgba(self, role: str, alpha: int = 255) -> Tuple[int, int, int, int]:
        r, g, b = self.rgb(role)
        return (r, g, b, alpha)

    def lighter(self, role: str, factor: float = 0.3) -> Tuple[int, int, int]:
        r, g, b = self.rgb(role)
        return (
            min(255, int(r + (255 - r) * factor)),
            min(255, int(g + (255 - g) * factor)),
            min(255, int(b + (255 - b) * factor)),
        )

    def darker(self, role: str, factor: float = 0.3) -> Tuple[int, int, int]:
        r, g, b = self.rgb(role)
        return (
            int(r * (1 - factor)),
            int(g * (1 - factor)),
            int(b * (1 - factor)),
        )


@dataclass
class DataLine:
    """A single event in the moment sequence."""
    sequence: int
    label: str
    actor: str
    team: str
    x: float  # 0-1 normalised pitch coordinates
    y: float
    timestamp: str
    context: Dict[str, Any]


@dataclass
class MomentData:
    """Complete moment data for rendering."""
    moment_id: str
    title: str
    moment_type: str
    competition: str
    data_lines: List[DataLine]
    home_team: str
    away_team: str
    venue: Optional[str] = None


class BaseStyle:
    """
    Base style — subclasses override the render methods to create different aesthetics.
    All coordinates are normalised 0-1 (StatsBomb standard).
    """

    # Canvas dimensions (px) — these are the output resolution
    WIDTH = 2048
    HEIGHT = 2048

    # Pitch area within the canvas (leaving margin for metadata/branding)
    PITCH_MARGIN = 0.08  # 8% margin on each side
    PITCH_X = PITCH_MARGIN
    PITCH_Y = PITCH_MARGIN
    PITCH_W = 1.0 - (2 * PITCH_MARGIN)
    PITCH_H = 1.0 - (2 * PITCH_MARGIN)

    def map_x(self, normalised_x: float) -> int:
        """Map normalised pitch X (0-1) to canvas pixel X."""
        canvas_x = self.PITCH_X + (normalised_x * self.PITCH_W)
        return int(canvas_x * self.WIDTH)

    def map_y(self, normalised_y: float) -> int:
        """Map normalised pitch Y (0-1) to canvas pixel Y."""
        canvas_y = self.PITCH_Y + (normalised_y * self.PITCH_H)
        return int(canvas_y * self.HEIGHT)

    def map_point(self, x: float, y: float) -> Tuple[int, int]:
        return (self.map_x(x), self.map_y(y))

    def render_background(self, draw, image, palette: Palette, render_params: dict = None) -> None:
        """Render the styled background layer."""
        raise NotImplementedError

    def render_data_lines(self, draw, image, data_lines: List[DataLine], palette: Palette, render_params: dict = None) -> None:
        """Render the data line visualisation (motion arcs, passes, events)."""
        raise NotImplementedError

    def render_actors(self, draw, image, data_lines: List[DataLine], palette: Palette) -> None:
        """Render actor (player) position markers."""
        raise NotImplementedError

    def render_moment_marker(self, draw, image, data_lines: List[DataLine], palette: Palette) -> None:
        """Render the key moment highlight (goal shot, tackle, etc.)."""
        raise NotImplementedError

    def post_process(self, image, palette: Palette):
        """Final compositing — vignette, grain, overlays. Returns modified image."""
        return image
