#!/usr/bin/env python3
"""
Generate 256×256 preview thumbnails for all 9 art styles.

Uses the real renderer with a simple diagonal path and red/white palette.
Outputs to public/previews/style-{name}.png
"""

import sys
from pathlib import Path

# Add project root to path so art_engine imports work
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from PIL import Image, ImageDraw
from art_engine.styles import STYLE_REGISTRY
from art_engine.styles.base import Palette, DataLine

# Red/white palette (Arsenal-ish default)
PALETTE = Palette(
    primary="#DA291C",
    secondary="#FFFFFF",
    accent="#9C824A",
    background="#1A1111",
)

# Simple diagonal path — 8 points from bottom-left to top-right
SAMPLE_DATA_LINES = [
    DataLine(sequence=i, label=f"pass_{i}", actor="Player", team="Home",
             x=x, y=y, timestamp=f"00:{i:02d}", context={})
    for i, (x, y) in enumerate([
        (0.15, 0.85), (0.25, 0.72), (0.35, 0.60), (0.45, 0.50),
        (0.55, 0.40), (0.65, 0.30), (0.75, 0.22), (0.85, 0.15),
    ])
]

PREVIEW_SIZE = 256
OUTPUT_DIR = ROOT / "public" / "previews"


def generate_preview(style_name: str, style_cls) -> Path:
    """Render one style preview at 256×256."""
    style = style_cls()
    style.WIDTH = PREVIEW_SIZE
    style.HEIGHT = PREVIEW_SIZE

    image = Image.new("RGBA", (PREVIEW_SIZE, PREVIEW_SIZE), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image, "RGBA")

    style.render_background(draw, image, PALETTE)
    style.render_data_lines(draw, image, SAMPLE_DATA_LINES, PALETTE)
    style.render_actors(draw, image, SAMPLE_DATA_LINES, PALETTE)
    style.render_moment_marker(draw, image, SAMPLE_DATA_LINES, PALETTE)
    image = style.post_process(image, PALETTE)

    # Resize if style outputs at different size (shouldn't happen, but safety)
    if image.size != (PREVIEW_SIZE, PREVIEW_SIZE):
        image = image.resize((PREVIEW_SIZE, PREVIEW_SIZE), Image.LANCZOS)

    out_path = OUTPUT_DIR / f"style-{style_name}.png"
    image.save(str(out_path), "PNG")
    return out_path


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Generating {len(STYLE_REGISTRY)} style previews → {OUTPUT_DIR}/\n")

    for name, cls in STYLE_REGISTRY.items():
        try:
            path = generate_preview(name, cls)
            print(f"  ✓ {name:12s} → {path}")
        except Exception as e:
            print(f"  ✗ {name:12s} — {e}")

    print(f"\nDone. {len(STYLE_REGISTRY)} previews saved.")


if __name__ == "__main__":
    main()
