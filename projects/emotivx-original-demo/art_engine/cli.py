#!/usr/bin/env python3
"""
EmotivX Art Engine — CLI interface

Reads JSON from stdin, renders artwork, writes PNG to stdout or file.

Input JSON:
{
  "points": [[0.5, 0.3], [0.6, 0.2], ...],   # normalised 0-1 coords
  "style": "geometric",                        # one of 9 styles
  "line_effect": "default",                    # default|laser|flame|lightning|ink|dotted
  "primary_color": "#DA291C",
  "secondary_color": "#FFFFFF",
  "accent_color": "#000000",
  "background_color": "#0A0A0A",
  "width": 1920,
  "height": 1080,
  "output": null                               # null → stdout, or filepath
}

Usage:
  echo '{"points":[[0.5,0.3],[0.6,0.2]],"style":"jackson"}' | python3 art_engine/cli.py
  echo '...' | python3 art_engine/cli.py > output.png
"""

import json
import sys
import io

from art_engine.styles.base import Palette, DataLine, MomentData
from art_engine.renderer import render_moment


def main():
    raw = sys.stdin.read()
    if not raw.strip():
        print("Error: no JSON input on stdin", file=sys.stderr)
        sys.exit(1)

    try:
        params = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON — {e}", file=sys.stderr)
        sys.exit(1)

    points = params.get("points", [])
    if len(points) < 2:
        print("Error: need at least 2 points", file=sys.stderr)
        sys.exit(1)

    style = params.get("style", "geometric")
    line_effect = params.get("line_effect", "default")
    width = int(params.get("width", 1920))
    height = int(params.get("height", 1080))

    primary = params.get("primary_color", "#DA291C")
    secondary = params.get("secondary_color", "#FFFFFF")
    accent = params.get("accent_color", "#000000")
    background = params.get("background_color", "#0A0A0A")
    output_path = params.get("output", None)

    # Build a moment JSON that renderer.render_moment expects
    data_lines = []
    for i, pt in enumerate(points):
        x = pt[0] if isinstance(pt, (list, tuple)) else pt.get("x", 0)
        y = pt[1] if isinstance(pt, (list, tuple)) else pt.get("y", 0)
        label = "pass" if i < len(points) - 1 else "goal"
        data_lines.append({
            "Sequence": i,
            "Label": label,
            "Actor": params.get("player", "Player"),
            "Team": params.get("team", ""),
            "X": x,
            "Y": y,
            "Timestamp": "",
            "Context": {},
        })

    moment_json = {
        "moment_id": params.get("moment_id", "cli"),
        "title": params.get("title", "Goal"),
        "moment_type": "goal",
        "competition": "Euro 2024",
        "data_lines": data_lines,
        "venue": params.get("venue", ""),
    }

    # Build palette directly (bypass clubs.json)
    palette = Palette(
        primary=primary,
        secondary=secondary,
        accent=accent,
        background=background,
    )

    # Get the style and render
    from art_engine.styles import get_style
    from art_engine.line_effects import render_line_effect
    from PIL import Image, ImageDraw

    style_obj = get_style(style)
    style_obj.WIDTH = width
    style_obj.HEIGHT = height

    moment = MomentData(
        moment_id=moment_json["moment_id"],
        title=moment_json["title"],
        moment_type=moment_json["moment_type"],
        competition=moment_json["competition"],
        data_lines=[
            DataLine(
                sequence=dl["Sequence"],
                label=dl["Label"],
                actor=dl["Actor"],
                team=dl["Team"],
                x=dl["X"],
                y=dl["Y"],
                timestamp=dl["Timestamp"],
                context=dl["Context"],
            )
            for dl in data_lines
        ],
        home_team=params.get("team", "Home"),
        away_team="Away",
        venue=moment_json.get("venue"),
    )

    # Create canvas
    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image, "RGBA")

    # Render layers
    style_obj.render_background(draw, image, palette)
    style_obj.render_data_lines(draw, image, moment.data_lines, palette)

    # Apply line effect overlay
    if line_effect != "default" and len(moment.data_lines) >= 2:
        trajectory = [style_obj.map_point(dl.x, dl.y) for dl in moment.data_lines]
        color = palette.rgb("primary")
        effect_layer = render_line_effect(
            name=line_effect,
            points=trajectory,
            color=color,
            canvas_size=(width, height),
            intensity=1.0,
        )
        image = Image.alpha_composite(image, effect_layer)

    # Re-create draw after compositing
    draw = ImageDraw.Draw(image, "RGBA")
    style_obj.render_actors(draw, image, moment.data_lines, palette)
    style_obj.render_moment_marker(draw, image, moment.data_lines, palette)

    # Post-processing
    image = style_obj.post_process(image, palette)

    # Output
    if output_path:
        image.save(output_path, "PNG")
        print(json.dumps({"ok": True, "path": output_path}), file=sys.stderr)
    else:
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        sys.stdout.buffer.write(buf.getvalue())


if __name__ == "__main__":
    main()
