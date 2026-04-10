#!/usr/bin/env python3
"""
EmotivX T-Shirt Mockup — flat-lay with all-over-print pattern.
Quick visual for pattern review — NOT the final product mockup (that's Gemini).
"""

import sys
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance


def create_tshirt_mockup(
    art_path: str,
    output_path: str = None,
    size: tuple = (1800, 2200),
) -> Image.Image:
    width, height = size
    
    art = Image.open(art_path).convert("RGBA")
    
    canvas = Image.new("RGBA", (width, height), (240, 240, 240, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # T-shirt silhouette points
    collar_w = int(width * 0.12)
    shoulder_y = int(height * 0.18)
    sleeve_end_y = int(height * 0.38)
    body_bottom = int(height * 0.88)
    body_left = int(width * 0.22)
    body_right = int(width * 0.78)
    shoulder_left = int(width * 0.06)
    shoulder_right = int(width * 0.94)
    sleeve_left = int(width * 0.02)
    sleeve_right = int(width * 0.98)
    cx = width // 2
    
    tshirt_shape = [
        # Left sleeve
        (sleeve_left, sleeve_end_y + 20),
        (sleeve_left + 10, sleeve_end_y - 10),
        (shoulder_left, shoulder_y),
        # Left neck
        (cx - collar_w, shoulder_y - 15),
        # Collar curve (simplified)
        (cx - collar_w + 10, shoulder_y - 35),
        (cx, shoulder_y - 45),
        (cx + collar_w - 10, shoulder_y - 35),
        # Right neck
        (cx + collar_w, shoulder_y - 15),
        # Right shoulder + sleeve
        (shoulder_right, shoulder_y),
        (sleeve_right - 10, sleeve_end_y - 10),
        (sleeve_right, sleeve_end_y + 20),
        # Right armpit + body
        (shoulder_right - 30, sleeve_end_y + 10),
        (body_right, int(height * 0.42)),
        (body_right + 3, body_bottom - 20),
        (body_right, body_bottom),
        # Bottom hem
        (body_left, body_bottom),
        # Left body
        (body_left - 3, body_bottom - 20),
        (body_left, int(height * 0.42)),
        (shoulder_left + 30, sleeve_end_y + 10),
    ]
    
    # Create mask
    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.polygon(tshirt_shape, fill=255)
    
    # Map art onto t-shirt
    art_resized = art.resize((width, height), Image.LANCZOS)
    art_dimmed = ImageEnhance.Brightness(art_resized).enhance(0.9)
    
    # Dark base under the art
    base = Image.new("RGBA", (width, height), (20, 20, 20, 255))
    blended = Image.blend(base, art_dimmed.convert("RGBA"), alpha=0.8)
    
    # Apply through mask
    result = Image.new("RGBA", (width, height), (240, 240, 240, 255))
    masked = Image.composite(blended, Image.new("RGBA", (width, height), (0, 0, 0, 0)), mask)
    result = Image.alpha_composite(result, masked)
    
    # Add fabric details
    detail = ImageDraw.Draw(result, "RGBA")
    
    # Collar stitching
    for i in range(len(tshirt_shape)):
        if 3 <= i <= 6:  # Collar area
            p1 = tshirt_shape[i]
            p2 = tshirt_shape[(i + 1) % len(tshirt_shape)]
            detail.line([p1, p2], fill=(0, 0, 0, 60), width=3)
    
    # Vertical centre seam (very subtle)
    detail.line([(cx, shoulder_y - 30), (cx, body_bottom - 10)],
                fill=(0, 0, 0, 20), width=1)
    
    # Sleeve seams
    detail.line([(shoulder_left + 30, sleeve_end_y + 10),
                 (shoulder_left, shoulder_y)],
                fill=(0, 0, 0, 25), width=2)
    detail.line([(shoulder_right - 30, sleeve_end_y + 10),
                 (shoulder_right, shoulder_y)],
                fill=(0, 0, 0, 25), width=2)
    
    # Fabric fold shadows
    shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow, "RGBA")
    
    for fx in [0.35, 0.48, 0.55, 0.68]:
        x = int(width * fx)
        sdraw.line([(x, shoulder_y + 50), (x + 5, body_bottom - 40)],
                   fill=(0, 0, 0, 18), width=10)
    
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=6))
    shadow_masked = Image.composite(shadow, Image.new("RGBA", (width, height), (0, 0, 0, 0)), mask)
    result = Image.alpha_composite(result, shadow_masked)
    
    # Drop shadow
    drop = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ddraw = ImageDraw.Draw(drop, "RGBA")
    drop_shape = [(x + 6, y + 6) for x, y in tshirt_shape]
    ddraw.polygon(drop_shape, fill=(0, 0, 0, 40))
    drop = drop.filter(ImageFilter.GaussianBlur(radius=12))
    
    final = Image.new("RGBA", (width, height), (240, 240, 240, 255))
    final = Image.alpha_composite(final, drop)
    final = Image.alpha_composite(final, result)
    
    if output_path:
        final.save(output_path, "PNG")
    
    return final


if __name__ == "__main__":
    output_dir = Path(__file__).parent / "output" / "v2_mockups"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    v2_dir = Path(__file__).parent / "output" / "v2"
    
    patterns = list(v2_dir.glob("*.png"))
    if not patterns:
        print("No v2 patterns found. Run tessellation_v2.py first.")
        sys.exit(1)
    
    for art_file in sorted(patterns):
        name = f"tshirt_{art_file.stem}.png"
        out = output_dir / name
        print(f"👕 {art_file.stem} → {name}")
        create_tshirt_mockup(str(art_file), str(out))
    
    print(f"\n✅ All t-shirt mockups: {output_dir}")
