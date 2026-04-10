#!/usr/bin/env python3
"""
Generate DRAMATIC aura/glow styles for each line effect.
Current max → new min. New max should be INTENSE.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import random
import math
import colorsys

# Sample data line (normalized 0-1 coordinates)
DATA_LINE = [
    (0.2, 0.5), (0.3, 0.4), (0.4, 0.35), (0.5, 0.4), 
    (0.6, 0.5), (0.7, 0.45), (0.8, 0.5)
]

WIDTH, HEIGHT = 1200, 800
BG_COLOR = (8, 12, 20)
LINE_COLOR = (255, 255, 255)
AURA_BASE = (255, 120, 40)  # Orange base

def scale_coords(coords):
    return [(int(x * WIDTH), int(y * HEIGHT)) for x, y in coords]

def draw_base_line(draw, coords, width=3):
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], fill=LINE_COLOR, width=width)

def laser_aura_v2(image, coords, intensity):
    """INTENSE NEON - multiple parallel beam layers"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Scale: min=old max, max=10x
    base = 50 + intensity * 500  # 50-550
    num_beams = int(3 + intensity * 12)  # 3-15 parallel beams
    
    for i in range(len(coords) - 1):
        p1, p2 = coords[i], coords[i+1]
        
        # Calculate perpendicular direction
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = math.sqrt(dx*dx + dy*dy)
        if length > 0:
            perp_x = -dy / length
            perp_y = dx / length
            
            # Draw multiple parallel beams
            for beam_idx in range(num_beams):
                offset = (beam_idx - num_beams//2) * (5 + intensity * 15)
                px1 = int(p1[0] + perp_x * offset)
                py1 = int(p1[1] + perp_y * offset)
                px2 = int(p2[0] + perp_x * offset)
                py2 = int(p2[1] + perp_y * offset)
                
                width = int(8 + intensity * 40)
                alpha = int(100 + intensity * 150)
                
                # Core beam
                r, g, b = AURA_BASE
                draw.line([(px1, py1), (px2, py2)], 
                         fill=(r, g, b, alpha), width=width)
    
    # Multi-pass blur for neon glow
    for i in range(3):
        glow = glow.filter(ImageFilter.GaussianBlur(radius=3 + intensity * 12))
    
    image.paste(glow, (0, 0), glow)

def flame_aura_v2(image, coords, intensity):
    """ACTUAL FLAMES - licking fire along path with embers"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Flame tongues at vertices
    for i, (x, y) in enumerate(coords):
        # Multiple flame tongues per vertex
        num_flames = int(3 + intensity * 20)  # 3-23 flames
        
        for _ in range(num_flames):
            # Random upward-biased direction
            angle = math.pi/2 + random.uniform(-math.pi/3, math.pi/3)
            length = random.randint(int(30 + intensity * 200), int(80 + intensity * 400))
            
            # Flame path (curvy)
            points = []
            segments = 8
            for seg in range(segments):
                t = seg / segments
                curve_offset = math.sin(t * math.pi) * random.uniform(5, 20 + intensity * 40)
                px = int(x + math.cos(angle) * length * t + curve_offset)
                py = int(y + math.sin(angle) * length * t)
                points.append((px, py))
            
            # Draw flame tongue (gradient from yellow to red)
            for j in range(len(points) - 1):
                t = j / len(points)
                # Yellow -> orange -> red gradient
                r = int(255 - t * 100)
                g = int(200 - t * 150)
                b = int(50 - t * 50)
                alpha = int((1 - t) * (120 + intensity * 135))
                
                width = int((1 - t) * (10 + intensity * 30))
                draw.line([points[j], points[j+1]], 
                         fill=(r, g, b, alpha), width=width)
    
    # Heat bloom base
    for x, y in coords:
        r = int(60 + intensity * 250)
        for pass_i in range(3):
            draw.ellipse([x - r, y - r, x + r, y + r],
                        fill=(200, 80, 20, int(40 + intensity * 80) // (pass_i + 1)))
    
    # Embers
    if intensity > 0.3:
        num_embers = int(20 + intensity * 200)
        for _ in range(num_embers):
            idx = random.randint(0, len(coords) - 1)
            cx, cy = coords[idx]
            # Scatter upward
            ex = cx + random.randint(-100, 100)
            ey = cy - random.randint(0, int(100 + intensity * 300))
            size = random.randint(1, int(3 + intensity * 8))
            draw.ellipse([ex - size, ey - size, ex + size, ey + size],
                        fill=(255, 180 + random.randint(-50, 50), 50, 200))
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=8 + intensity * 20))
    image.paste(glow, (0, 0), glow)

def lightning_aura_v2(image, coords, intensity):
    """BRANCHING FORKS - actual jagged electric arcs"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Main arc along path (thick, jagged)
    for i in range(len(coords) - 1):
        x1, y1 = coords[i]
        x2, y2 = coords[i+1]
        
        # Jagged main arc
        segments = int(5 + intensity * 20)
        arc_points = []
        for seg in range(segments + 1):
            t = seg / segments
            px = x1 + (x2 - x1) * t
            py = y1 + (y2 - y1) * t
            # Random jag
            jag = random.randint(-int(10 + intensity * 40), int(10 + intensity * 40))
            perp_x = -(y2 - y1)
            perp_y = (x2 - x1)
            length = math.sqrt(perp_x**2 + perp_y**2)
            if length > 0:
                px += (perp_x / length) * jag
                py += (perp_y / length) * jag
            arc_points.append((int(px), int(py)))
        
        # Draw jagged arc
        for j in range(len(arc_points) - 1):
            draw.line([arc_points[j], arc_points[j+1]], 
                     fill=(200, 150, 255, 200), width=int(4 + intensity * 12))
    
    # BRANCHING FORKS from main arc
    fork_count = int(10 + intensity * 100)  # 10-110 forks
    
    for _ in range(fork_count):
        # Pick random point on path
        seg_idx = random.randint(0, len(coords) - 2)
        t = random.random()
        x1, y1 = coords[seg_idx]
        x2, y2 = coords[seg_idx + 1]
        sx = int(x1 + (x2 - x1) * t)
        sy = int(y1 + (y2 - y1) * t)
        
        # Random fork direction
        angle = random.uniform(0, math.pi * 2)
        fork_len = random.randint(int(40 + intensity * 200), int(120 + intensity * 500))
        
        # Jagged fork path
        fork_segments = int(3 + intensity * 10)
        fork_points = [(sx, sy)]
        for seg in range(fork_segments):
            prev_x, prev_y = fork_points[-1]
            step_len = fork_len / fork_segments
            angle += random.uniform(-0.5, 0.5)  # Wiggle
            nx = int(prev_x + math.cos(angle) * step_len)
            ny = int(prev_y + math.sin(angle) * step_len)
            fork_points.append((nx, ny))
        
        # Draw fork
        for j in range(len(fork_points) - 1):
            fade = 1 - (j / len(fork_points))
            alpha = int(fade * (150 + intensity * 105))
            width = max(1, int(fade * (2 + intensity * 8)))
            draw.line([fork_points[j], fork_points[j+1]], 
                     fill=(180, 140, 255, alpha), width=width)
    
    # Electric glow
    glow = glow.filter(ImageFilter.GaussianBlur(radius=4 + intensity * 15))
    image.paste(glow, (0, 0), glow)

def ink_aura_v2(image, coords, intensity):
    """INK BLEED + SPLATS - heavy organic staining"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Heavy base bleed along path
    for i in range(len(coords) - 1):
        width = int(50 + intensity * 400)  # 50-450px
        alpha = int(60 + intensity * 140)
        draw.line([coords[i], coords[i+1]], 
                 fill=(*AURA_BASE, alpha), width=width)
    
    # INK POOLS at vertices
    for x, y in coords:
        pool_r = int(80 + intensity * 350)
        # Multiple overlapping ellipses for organic shape
        for _ in range(5):
            offset_x = random.randint(-30, 30)
            offset_y = random.randint(-30, 30)
            draw.ellipse([x + offset_x - pool_r, y + offset_y - pool_r,
                         x + offset_x + pool_r, y + offset_y + pool_r],
                        fill=(180, 80, 30, int(50 + intensity * 100)))
    
    # INK SPLATS scattered around
    if intensity > 0.2:
        num_splats = int(30 + intensity * 300)
        for _ in range(num_splats):
            idx = random.randint(0, len(coords) - 1)
            cx, cy = coords[idx]
            splat_x = cx + random.randint(-200, 200)
            splat_y = cy + random.randint(-200, 200)
            splat_r = random.randint(int(5 + intensity * 40), int(20 + intensity * 100))
            
            # Irregular splat shape
            num_pts = random.randint(6, 12)
            angles = sorted([random.uniform(0, math.pi * 2) for _ in range(num_pts)])
            splat_pts = []
            for angle in angles:
                r_var = splat_r + random.randint(-splat_r//3, splat_r//3)
                px = int(splat_x + math.cos(angle) * r_var)
                py = int(splat_y + math.sin(angle) * r_var)
                splat_pts.append((px, py))
            
            draw.polygon(splat_pts, fill=(160, 70, 25, int(80 + intensity * 120)))
    
    # Multiple heavy blur passes
    for _ in range(5):
        glow = glow.filter(ImageFilter.GaussianBlur(radius=15 + intensity * 35))
    
    image.paste(glow, (0, 0), glow)

def spray_aura_v2(image, coords, intensity):
    """WIDE SPRAY - massive particle scatter field"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    particle_count = int(500 + intensity * 5000)  # 500-5500 particles
    spread = int(50 + intensity * 400)  # 50-450px spread
    
    for x, y in coords:
        for _ in range(particle_count // len(coords)):
            # Random scatter
            angle = random.uniform(0, math.pi * 2)
            # Exponential falloff for natural spray
            dist = random.uniform(0, spread) * (1 - random.random()**2)
            
            px = int(x + math.cos(angle) * dist)
            py = int(y + math.sin(angle) * dist)
            
            # Varying particle sizes
            size = random.randint(1, int(3 + intensity * 15))
            alpha = int(100 + intensity * 155) - int(dist / spread * 100)  # Fade with distance
            alpha = max(50, min(255, alpha))
            
            # Color variation
            r = AURA_BASE[0] + random.randint(-30, 30)
            g = AURA_BASE[1] + random.randint(-30, 30)
            b = AURA_BASE[2] + random.randint(-10, 10)
            
            draw.ellipse([px - size, py - size, px + size, py + size],
                        fill=(r, g, b, alpha))
    
    # Soft blur
    glow = glow.filter(ImageFilter.GaussianBlur(radius=3 + intensity * 10))
    image.paste(glow, (0, 0), glow)

# Generate all 15 images (DRAMATIC version)
effects = {
    'laser': laser_aura_v2,
    'flame': flame_aura_v2,
    'lightning': lightning_aura_v2,
    'ink': ink_aura_v2,
    'spray': spray_aura_v2
}

intensities = {
    'min': 0.2,   # Old max → new min
    'mid': 0.6,   # Moderate
    'max': 1.0    # DRAMATIC
}

scaled_coords = scale_coords(DATA_LINE)

for effect_name, effect_func in effects.items():
    for intensity_name, intensity_val in intensities.items():
        img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
        
        # Draw aura FIRST
        effect_func(img, scaled_coords, intensity_val)
        
        # White line on top
        draw = ImageDraw.Draw(img)
        draw_base_line(draw, scaled_coords, width=4)
        
        filename = f'aura_v2_{effect_name}_{intensity_name}.png'
        img.save(filename)
        print(f'✓ {filename}')

print(f'\n✅ Generated 15 DRAMATIC test images')
