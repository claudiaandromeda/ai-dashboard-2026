"""
EmotivX Art Style Presets

Each style module exports a StylePreset class that implements:
  - render_background(canvas, palette) -> canvas with styled background
  - render_data_lines(canvas, data_lines, palette) -> canvas with motion/event art
  - render_actors(canvas, actors, palette) -> canvas with player position art
  - post_process(canvas, palette) -> final compositing effects
"""

from art_engine.styles.geometric import GeometricStyle
from art_engine.styles.camo import CamoStyle
from art_engine.styles.futuristic import FuturisticStyle
from art_engine.styles.street import StreetStyle
from art_engine.styles.classic import ClassicStyle
from art_engine.styles.jackson import JacksonStyle
from art_engine.styles.marble import MarbleStyle
from art_engine.styles.smoky import SmokyStyle
from art_engine.styles.dali import DaliStyle

STYLE_REGISTRY = {
    "geometric": GeometricStyle,
    "camo": CamoStyle,
    "futuristic": FuturisticStyle,
    "street": StreetStyle,
    "classic": ClassicStyle,
    "jackson": JacksonStyle,
    "marble": MarbleStyle,
    "smoky": SmokyStyle,
    "dali": DaliStyle,
}

def get_style(name: str):
    if name not in STYLE_REGISTRY:
        raise ValueError(f"Unknown style '{name}'. Available: {list(STYLE_REGISTRY.keys())}")
    return STYLE_REGISTRY[name]()
