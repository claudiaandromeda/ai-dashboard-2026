"""
EmotivX Art Engine — Core Renderer

Takes a moment (from StatsBomb pipeline), a club config, a kit choice (home/away),
and a style preset → produces a 2048×2048 artwork.

Usage:
    from art_engine.renderer import render_moment
    image = render_moment(moment_json, club="arsenal", kit="home", style="geometric")
    image.save("output.png")
"""

import json
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw

from art_engine.styles.base import Palette, DataLine, MomentData
from art_engine.styles import get_style
from art_engine.line_effects import render_line_effect


def load_club_config(club_id: str, kit: str = "home") -> Palette:
    """Load club colours from clubs.json and return a Palette."""
    clubs_path = Path(__file__).parent / "clubs.json"
    with open(clubs_path) as f:
        data = json.load(f)

    if club_id not in data["clubs"]:
        available = list(data["clubs"].keys())
        raise ValueError(f"Unknown club '{club_id}'. Available: {available}")

    club = data["clubs"][club_id]
    if kit not in club:
        raise ValueError(f"Unknown kit '{kit}'. Available: home, away")

    kit_data = club[kit]
    return Palette(
        primary=kit_data["primary"],
        secondary=kit_data["secondary"],
        accent=kit_data["accent"],
        background=kit_data["background"],
    )


def parse_moment(moment_json: dict) -> MomentData:
    """Parse a moment JSON object (from StatsBomb pipeline) into MomentData."""
    data_lines = []
    for dl in moment_json.get("data_lines", []):
        data_lines.append(DataLine(
            sequence=dl.get("Sequence", 0),
            label=dl.get("Label", ""),
            actor=dl.get("Actor", "Unknown"),
            team=dl.get("Team", ""),
            x=dl.get("X", 0),
            y=dl.get("Y", 0),
            timestamp=dl.get("Timestamp", ""),
            context=dl.get("Context", {}),
        ))

    # Determine teams from data lines
    teams = list(set(dl.team for dl in data_lines if dl.team))
    home_team = teams[0] if teams else "Home"
    away_team = teams[1] if len(teams) > 1 else "Away"

    return MomentData(
        moment_id=moment_json.get("moment_id", ""),
        title=moment_json.get("title", ""),
        moment_type=moment_json.get("moment_type", ""),
        competition=moment_json.get("competition", ""),
        data_lines=data_lines,
        home_team=home_team,
        away_team=away_team,
        venue=moment_json.get("venue"),
    )


def render_moment(
    moment_json: dict,
    club: str = "arsenal",
    kit: str = "home",
    style_name: str = "geometric",
    line_effect: str = "default",
    width: int = 2048,
    height: int = 2048,
) -> Image.Image:
    """
    Render a moment artwork.

    Args:
        moment_json: Raw moment dict from the StatsBomb pipeline
        club: Club ID from clubs.json
        kit: "home" or "away"
        style_name: Style preset name
        line_effect: Line visual effect — "default", "laser", "flame",
                     "lightning", "ink", or "dotted"
        width: Output width in pixels
        height: Output height in pixels

    Returns:
        PIL Image (RGBA)
    """
    # Load config
    palette = load_club_config(club, kit)
    style = get_style(style_name)
    moment = parse_moment(moment_json)

    # Override dimensions if needed
    style.WIDTH = width
    style.HEIGHT = height

    # Create canvas
    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image, "RGBA")

    # Render layers in order
    style.render_background(draw, image, palette)
    style.render_data_lines(draw, image, moment.data_lines, palette)

    # Apply line effect overlay if not default
    if line_effect != "default" and len(moment.data_lines) >= 2:
        # Extract pixel-mapped trajectory points
        trajectory = [style.map_point(dl.x, dl.y) for dl in moment.data_lines]
        color = palette.rgb("primary")
        effect_layer = render_line_effect(
            name=line_effect,
            points=trajectory,
            color=color,
            canvas_size=(width, height),
            intensity=1.0,
        )
        image = Image.alpha_composite(image, effect_layer)

    style.render_actors(draw, image, moment.data_lines, palette)
    style.render_moment_marker(draw, image, moment.data_lines, palette)

    # Post-processing
    image = style.post_process(image, palette)

    return image


def render_all_styles(
    moment_json: dict,
    club: str = "arsenal",
    kit: str = "home",
    output_dir: str = ".",
    width: int = 2048,
    height: int = 2048,
) -> list:
    """Render a moment in all available styles. Returns list of output paths."""
    from art_engine.styles import STYLE_REGISTRY

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    outputs = []
    for style_name in STYLE_REGISTRY:
        image = render_moment(moment_json, club=club, kit=kit,
                              style_name=style_name, width=width, height=height)
        filename = f"{club}_{kit}_{style_name}.png"
        path = output_dir / filename
        image.save(str(path), "PNG")
        outputs.append(str(path))
        print(f"  ✓ {style_name}: {path}")

    return outputs
