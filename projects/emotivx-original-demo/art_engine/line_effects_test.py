"""
Line Effects Test — generates a 3×2 grid showing all 6 effects on a dummy zigzag path.

Output: art_engine/output/line_effects_test.png
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from art_engine.line_effects import EFFECTS, render_line_effect


def make_zigzag_path(
    x_start: int, y_start: int, width: int, height: int, segments: int = 8
):
    """Generate a zigzag path that exercises straights, turns, and curves."""
    points = []
    for i in range(segments + 1):
        t = i / segments
        x = x_start + int(t * width)
        # Zigzag with varying amplitude
        amp = height * 0.3 * (0.5 + 0.5 * math.sin(t * math.pi * 2))
        if i % 2 == 0:
            y = y_start + int(height * 0.5 - amp)
        else:
            y = y_start + int(height * 0.5 + amp)
        points.append((x, y))
    return points


def main():
    # Grid layout: 3 columns, 2 rows
    panel_w, panel_h = 600, 500
    cols, rows = 3, 2
    margin = 20
    label_h = 40

    grid_w = cols * panel_w + (cols + 1) * margin
    grid_h = rows * (panel_h + label_h) + (rows + 1) * margin

    canvas = Image.new("RGBA", (grid_w, grid_h), (15, 15, 15, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Team colour (Arsenal red as test)
    color = (239, 35, 60)

    for idx, effect_name in enumerate(EFFECTS):
        col = idx % cols
        row = idx // cols

        x0 = margin + col * (panel_w + margin)
        y0 = margin + row * (panel_h + label_h + margin)

        # Panel background
        draw.rectangle(
            [x0, y0 + label_h, x0 + panel_w, y0 + label_h + panel_h],
            fill=(5, 5, 5, 255),
            outline=(40, 40, 40, 255),
            width=1,
        )

        # Label
        draw.text(
            (x0 + panel_w // 2, y0 + label_h // 2),
            effect_name.upper(),
            fill=(200, 200, 200, 255),
            anchor="mm",
        )

        # Generate zigzag path within the panel area
        path_margin = 40
        path = make_zigzag_path(
            x_start=path_margin,
            y_start=path_margin,
            width=panel_w - 2 * path_margin,
            height=panel_h - 2 * path_margin,
        )

        # Render effect
        effect_img = render_line_effect(
            name=effect_name,
            points=path,
            color=color,
            canvas_size=(panel_w, panel_h),
            intensity=1.0,
        )

        # Composite onto the panel area
        canvas.paste(
            effect_img,
            (x0, y0 + label_h),
            mask=effect_img,
        )

    # Save output
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "line_effects_test.png"
    canvas.save(str(output_path), "PNG")
    print(f"Saved line effects test grid to: {output_path}")


if __name__ == "__main__":
    main()
