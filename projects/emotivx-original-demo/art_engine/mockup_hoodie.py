#!/usr/bin/env python3
"""
EmotivX Hoodie Mockup Generator

Takes an art engine output PNG and wraps it onto a hoodie template.
Creates an all-over-print effect similar to Austin's original merchandise mockups.

Usage:
    python3 -m art_engine.mockup_hoodie art_engine/output/arsenal_home/arsenal_home_futuristic.png
"""

import sys
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance


def create_hoodie_mockup(
    art_path: str,
    output_path: str = None,
    hoodie_color: tuple = (30, 30, 30),
    size: tuple = (2048, 2400),
) -> Image.Image:
    """
    Create a hoodie mockup with the art pattern applied as all-over print.
    
    This generates a flat-lay hoodie silhouette and maps the art pattern onto it.
    """
    width, height = size
    
    # Load the art pattern
    art = Image.open(art_path).convert("RGBA")
    
    # Create the canvas
    canvas = Image.new("RGBA", (width, height), (18, 18, 18, 255))
    draw = ImageDraw.Draw(canvas, "RGBA")
    
    # ─── Hoodie silhouette dimensions ───
    # All values as fractions of canvas size
    body_top = int(height * 0.22)
    body_bottom = int(height * 0.88)
    body_left = int(width * 0.18)
    body_right = int(width * 0.82)
    body_width = body_right - body_left
    body_height = body_bottom - body_top
    
    # Shoulder width (wider than body at top)
    shoulder_left = int(width * 0.08)
    shoulder_right = int(width * 0.92)
    shoulder_y = int(height * 0.25)
    
    # Neck/hood area
    neck_left = int(width * 0.38)
    neck_right = int(width * 0.62)
    neck_top = int(height * 0.10)
    hood_peak = int(height * 0.05)
    
    # Sleeve endpoints
    sleeve_left_x = int(width * 0.02)
    sleeve_right_x = int(width * 0.98)
    sleeve_y = int(height * 0.55)
    sleeve_width_end = int(height * 0.06)
    
    # ─── Draw hoodie shape ───
    # Main body + sleeves as a single polygon
    hoodie_shape = [
        # Start at left sleeve cuff
        (sleeve_left_x, sleeve_y + sleeve_width_end),
        (sleeve_left_x, sleeve_y - sleeve_width_end),
        # Up to left shoulder
        (shoulder_left, shoulder_y - 10),
        # Left side of neck
        (neck_left, body_top),
        # Hood - left side
        (neck_left - 15, neck_top + 20),
        (int(width * 0.42), neck_top),
        # Hood peak
        (int(width * 0.5), hood_peak),
        # Hood - right side
        (int(width * 0.58), neck_top),
        (neck_right + 15, neck_top + 20),
        # Right side of neck
        (neck_right, body_top),
        # Right shoulder
        (shoulder_right, shoulder_y - 10),
        # Right sleeve cuff
        (sleeve_right_x, sleeve_y - sleeve_width_end),
        (sleeve_right_x, sleeve_y + sleeve_width_end),
        # Right armpit area
        (shoulder_right - 20, sleeve_y + 20),
        (body_right, int(height * 0.42)),
        # Right body side down
        (body_right + 5, body_bottom - 30),
        (body_right, body_bottom),
        # Bottom hem
        (body_left, body_bottom),
        # Left body side up
        (body_left - 5, body_bottom - 30),
        (body_left, int(height * 0.42)),
        # Left armpit area
        (shoulder_left + 20, sleeve_y + 20),
    ]
    
    # Draw filled hoodie base
    draw.polygon(hoodie_shape, fill=hoodie_color)
    
    # ─── Create mask for the hoodie shape ───
    mask = Image.new("L", (width, height), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.polygon(hoodie_shape, fill=255)
    
    # ─── Map art pattern onto hoodie ───
    # Resize art to cover the hoodie area
    art_resized = art.resize((width, height), Image.LANCZOS)
    
    # Reduce opacity of the art slightly for realism
    art_enhanced = ImageEnhance.Brightness(art_resized).enhance(0.85)
    
    # Apply the art only within the hoodie mask
    art_masked = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    art_rgba = art_enhanced.convert("RGBA")
    
    # Blend: mix the art with the hoodie base colour
    hoodie_base = Image.new("RGBA", (width, height), (*hoodie_color, 255))
    
    # The art pattern at 70% opacity over the hoodie base
    blended = Image.blend(hoodie_base, art_rgba, alpha=0.7)
    
    # Apply mask
    result = Image.new("RGBA", (width, height), (18, 18, 18, 255))
    
    # Paste the blended art through the hoodie mask
    masked_art = Image.composite(blended, Image.new("RGBA", (width, height), (0, 0, 0, 0)), mask)
    result = Image.alpha_composite(result, masked_art)
    
    # ─── Add hoodie details ───
    detail_draw = ImageDraw.Draw(result, "RGBA")
    
    # Kangaroo pocket
    pocket_top = int(height * 0.62)
    pocket_bottom = int(height * 0.76)
    pocket_left = int(width * 0.30)
    pocket_right = int(width * 0.70)
    
    # Pocket outline (subtle dark line)
    pocket_shape = [
        (pocket_left, pocket_top),
        (pocket_left - 10, pocket_bottom),
        (pocket_right + 10, pocket_bottom),
        (pocket_right, pocket_top),
    ]
    detail_draw.line(pocket_shape + [pocket_shape[0]], 
                     fill=(0, 0, 0, 80), width=2)
    
    # Centre line (zipper area / seam)
    center_x = width // 2
    detail_draw.line(
        [(center_x, body_top + 30), (center_x, body_bottom - 20)],
        fill=(0, 0, 0, 40), width=1
    )
    
    # Hood drawstrings
    string_y_start = body_top + 15
    string_y_end = int(height * 0.45)
    for offset in [-25, 25]:
        detail_draw.line(
            [(center_x + offset, string_y_start),
             (center_x + offset - 5, string_y_end)],
            fill=(200, 200, 200, 100), width=2
        )
        # String aglet
        detail_draw.ellipse(
            [center_x + offset - 8, string_y_end - 3,
             center_x + offset + 2, string_y_end + 8],
            fill=(180, 180, 180, 120)
        )
    
    # ─── Fabric fold shadows for realism ───
    shadow_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_overlay, "RGBA")
    
    # Vertical fold shadows on body
    for fold_x in [int(width * 0.35), int(width * 0.45), int(width * 0.55), int(width * 0.65)]:
        shadow_draw.line(
            [(fold_x, body_top + 50), (fold_x + 3, body_bottom - 30)],
            fill=(0, 0, 0, 20), width=8
        )
    
    # Sleeve fold shadows
    # Left sleeve
    for i in range(3):
        sx = shoulder_left + (sleeve_left_x - shoulder_left) * (i + 1) / 4
        sy1 = shoulder_y + (sleeve_y - shoulder_y) * i / 4
        sy2 = shoulder_y + (sleeve_y - shoulder_y) * (i + 2) / 4
        shadow_draw.line([(int(sx), int(sy1)), (int(sx - 10), int(sy2))],
                        fill=(0, 0, 0, 15), width=6)
    
    # Apply shadows through mask
    shadow_masked = Image.composite(
        shadow_overlay, 
        Image.new("RGBA", (width, height), (0, 0, 0, 0)), 
        mask
    )
    result = Image.alpha_composite(result, shadow_masked)
    
    # ─── Subtle drop shadow under the hoodie ───
    shadow_bg = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    shadow_bg_draw = ImageDraw.Draw(shadow_bg, "RGBA")
    # Offset shadow
    shadow_shape = [(x + 8, y + 8) for x, y in hoodie_shape]
    shadow_bg_draw.polygon(shadow_shape, fill=(0, 0, 0, 60))
    shadow_bg = shadow_bg.filter(ImageFilter.GaussianBlur(radius=15))
    
    # Composite: shadow behind, then hoodie on top
    final = Image.new("RGBA", (width, height), (18, 18, 18, 255))
    final = Image.alpha_composite(final, shadow_bg)
    final = Image.alpha_composite(final, result)
    
    # Save
    if output_path:
        final.save(output_path, "PNG")
    
    return final


def main():
    """Generate hoodie mockups for all rendered art styles."""
    output_base = Path(__file__).parent / "output"
    mockup_dir = output_base / "mockups"
    mockup_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all rendered PNGs
    art_dirs = ["arsenal_home", "arsenal_away", "manutd_home"]
    
    for art_dir_name in art_dirs:
        art_dir = output_base / art_dir_name
        if not art_dir.exists():
            continue
            
        for art_file in sorted(art_dir.glob("*.png")):
            mockup_name = f"hoodie_{art_file.stem}.png"
            mockup_path = mockup_dir / mockup_name
            
            print(f"🧥 {art_file.stem} → {mockup_name}")
            create_hoodie_mockup(str(art_file), str(mockup_path))
    
    print(f"\n✅ All mockups saved to: {mockup_dir}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Single file mode
        art_path = sys.argv[1]
        stem = Path(art_path).stem
        out = f"art_engine/output/mockups/hoodie_{stem}.png"
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        create_hoodie_mockup(art_path, out)
        print(f"✅ {out}")
    else:
        main()
