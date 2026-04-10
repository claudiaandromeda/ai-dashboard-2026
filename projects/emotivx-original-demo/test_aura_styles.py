#!/usr/bin/env python3
"""
Generate test images showing different aura/glow styles for each line effect.
Output: 15 images (5 effects × 3 intensities: min/mid/max)
"""

from PIL import Image, ImageDraw, ImageFilter
import random
import math

# Sample data line (normalized 0-1 coordinates)
DATA_LINE = [
    (0.2, 0.5), (0.3, 0.4), (0.4, 0.35), (0.5, 0.4), 
    (0.6, 0.5), (0.7, 0.45), (0.8, 0.5)
]

WIDTH, HEIGHT = 1200, 800
BG_COLOR = (8, 12, 20)
LINE_COLOR = (255, 255, 255)
AURA_COLOR = (255, 100, 50)  # Orange glow

def scale_coords(coords):
    """Convert normalized coords to pixel coords"""
    return [(int(x * WIDTH), int(y * HEIGHT)) for x, y in coords]

def draw_base_line(draw, coords, width=4):
    """Draw the white data line"""
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], fill=LINE_COLOR, width=width)

def laser_aura(image, coords, intensity):
    """Sharp linear glow - tight parallel streaks"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    width = int(10 + intensity * 40)  # 10-50px
    alpha = int(50 + intensity * 150)  # 50-200
    
    for i in range(len(coords) - 1):
        # Main glow streak
        draw.line([coords[i], coords[i+1]], 
                 fill=(*AURA_COLOR, alpha), width=width)
    
    # Sharp blur for neon effect
    glow = glow.filter(ImageFilter.GaussianBlur(radius=2 + intensity * 4))
    image.paste(glow, (0, 0), glow)

def flame_aura(image, coords, intensity):
    """Organic heat bloom - radial gradient with flicker"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    radius = int(15 + intensity * 60)  # 15-75px
    
    for i, (x, y) in enumerate(coords):
        # Varying sizes for flicker effect
        r = radius + random.randint(-int(radius*0.3), int(radius*0.3))
        alpha = int(80 + intensity * 120)
        
        # Multiple passes for heat bloom
        for j in range(3):
            draw.ellipse(
                [x - r//2, y - r//2, x + r//2, y + r//2],
                fill=(*AURA_COLOR, alpha // (j + 1))
            )
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=8 + intensity * 12))
    image.paste(glow, (0, 0), glow)

def lightning_aura(image, coords, intensity):
    """Electric corona - jagged branching tendrils"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    fork_count = int(3 + intensity * 12)  # 3-15 forks per segment
    fork_len = int(20 + intensity * 80)   # 20-100px
    
    for i in range(len(coords) - 1):
        x1, y1 = coords[i]
        x2, y2 = coords[i+1]
        
        # Draw main arc
        draw.line([(x1, y1), (x2, y2)], 
                 fill=(*AURA_COLOR, 150), width=int(3 + intensity * 8))
        
        # Add branching forks
        for _ in range(fork_count):
            t = random.random()
            px = int(x1 + t * (x2 - x1))
            py = int(y1 + t * (y2 - y1))
            
            angle = random.uniform(0, math.pi * 2)
            length = random.randint(fork_len // 3, fork_len)
            
            ex = int(px + math.cos(angle) * length)
            ey = int(py + math.sin(angle) * length)
            
            draw.line([(px, py), (ex, ey)], 
                     fill=(*AURA_COLOR, int(100 + intensity * 100)), 
                     width=int(1 + intensity * 3))
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=3 + intensity * 6))
    image.paste(glow, (0, 0), glow)

def ink_aura(image, coords, intensity):
    """Watercolor diffusion - soft organic bleed"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    width = int(20 + intensity * 100)  # 20-120px
    alpha = int(40 + intensity * 100)   # 40-140
    
    # Draw thick soft strokes
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(*AURA_COLOR, alpha), width=width)
    
    # Multiple blur passes for organic bleed
    for _ in range(3):
        glow = glow.filter(ImageFilter.GaussianBlur(radius=10 + intensity * 20))
    
    image.paste(glow, (0, 0), glow)

def spray_aura(image, coords, intensity):
    """Particle scatter - dots radiating from path"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    particle_count = int(50 + intensity * 300)  # 50-350 particles
    spread = int(15 + intensity * 60)            # 15-75px spread
    
    for x, y in coords:
        for _ in range(particle_count // len(coords)):
            # Random scatter around point
            angle = random.uniform(0, math.pi * 2)
            dist = random.uniform(0, spread) * random.random()  # Bias toward center
            
            px = int(x + math.cos(angle) * dist)
            py = int(y + math.sin(angle) * dist)
            
            size = random.randint(1, int(2 + intensity * 4))
            alpha = int(80 + intensity * 120)
            
            draw.ellipse(
                [px - size, py - size, px + size, py + size],
                fill=(*AURA_COLOR, alpha)
            )
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=2 + intensity * 4))
    image.paste(glow, (0, 0), glow)

# Generate all 15 images
effects = {
    'laser': laser_aura,
    'flame': flame_aura,
    'lightning': lightning_aura,
    'ink': ink_aura,
    'spray': spray_aura
}

intensities = {
    'min': 0.0,
    'mid': 0.5,
    'max': 1.0
}

scaled_coords = scale_coords(DATA_LINE)

for effect_name, effect_func in effects.items():
    for intensity_name, intensity_val in intensities.items():
        # Create base image
        img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
        
        # Draw aura
        effect_func(img, scaled_coords, intensity_val)
        
        # Draw white line on top
        draw = ImageDraw.Draw(img)
        draw_base_line(draw, scaled_coords)
        
        # Save
        filename = f'aura_test_{effect_name}_{intensity_name}.png'
        img.save(filename)
        print(f'✓ {filename}')

print(f'\n✅ Generated 15 test images in current directory')
