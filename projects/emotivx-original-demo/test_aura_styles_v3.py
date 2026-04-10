#!/usr/bin/env python3
"""
V3 - PROPER DRAMATIC EFFECTS
- Line itself glows bright
- Effects emanate FROM the line
- Max = truly dramatic
"""

from PIL import Image, ImageDraw, ImageFilter
import random
import math

DATA_LINE = [
    (0.2, 0.5), (0.3, 0.4), (0.4, 0.35), (0.5, 0.4), 
    (0.6, 0.5), (0.7, 0.45), (0.8, 0.5)
]

WIDTH, HEIGHT = 1200, 800
BG_COLOR = (8, 12, 20)

def scale_coords(coords):
    return [(int(x * WIDTH), int(y * HEIGHT)) for x, y in coords]

def flame_aura_v3(image, coords, intensity):
    """PROPER FLAMES - yellow core, orange mid, red tips"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Flame parameters scale with intensity
    num_flames_per_vertex = int(5 + intensity * 50)  # 5-55
    flame_height = int(60 + intensity * 350)  # 60-410px
    
    for x, y in coords:
        for _ in range(num_flames_per_vertex):
            # Upward-biased angle with slight randomness
            base_angle = -math.pi/2  # Straight up
            angle_var = random.uniform(-math.pi/6, math.pi/6)
            angle = base_angle + angle_var
            
            height = random.randint(int(flame_height * 0.6), flame_height)
            
            # Flame tongue path (curves as it rises)
            flame_pts = []
            segments = 12
            for seg in range(segments):
                t = seg / segments
                # Curve and taper
                curve = math.sin(t * math.pi * 2 + random.random()) * (15 + intensity * 40)
                px = int(x + math.cos(angle) * height * t + curve)
                py = int(y + math.sin(angle) * height * t)
                flame_pts.append((px, py))
            
            # Draw flame gradient: yellow core → orange → red tip
            for j in range(len(flame_pts) - 1):
                t = j / len(flame_pts)
                
                # Yellow (255,255,100) → Orange (255,150,50) → Red (255,50,20)
                if t < 0.3:  # Yellow core
                    r, g, b = 255, 255, int(100 + (1-t/0.3) * 155)
                elif t < 0.7:  # Orange mid
                    fade = (t - 0.3) / 0.4
                    r, g, b = 255, int(255 - fade * 105), int(255 - fade * 205)
                else:  # Red tip
                    fade = (t - 0.7) / 0.3
                    r, g, b = 255, int(150 - fade * 100), int(50 - fade * 30)
                
                alpha = int((1 - t) * (180 + intensity * 75))
                width = max(1, int((1 - t**0.5) * (8 + intensity * 25)))
                
                draw.line([flame_pts[j], flame_pts[j+1]], 
                         fill=(r, g, b, alpha), width=width)
    
    # Heat glow base
    for x, y in coords:
        r = int(40 + intensity * 180)
        draw.ellipse([x-r, y-r, x+r, y+r],
                    fill=(255, 120, 40, int(80 + intensity * 120)))
    
    # Bright line core
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(255, 240, 200, 255), width=int(6 + intensity * 12))
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=6 + intensity * 18))
    image.paste(glow, (0, 0), glow)

def lightning_aura_v3(image, coords, intensity):
    """LIGHTNING FORKS - small at min, massive storm at max"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Even at min, we have forks
    num_forks = int(15 + intensity * 250)  # 15-265 forks
    fork_length = int(80 + intensity * 450)  # 80-530px
    
    # Main arc (bright, thick)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(220, 200, 255, 255), width=int(8 + intensity * 20))
    
    # Branching forks
    for _ in range(num_forks):
        # Random point on path
        seg = random.randint(0, len(coords) - 2)
        t = random.random()
        x1, y1 = coords[seg]
        x2, y2 = coords[seg + 1]
        sx = int(x1 + (x2 - x1) * t)
        sy = int(y1 + (y2 - y1) * t)
        
        # Random angle
        angle = random.uniform(0, math.pi * 2)
        
        # Jagged fork
        fork_pts = [(sx, sy)]
        segments = int(4 + intensity * 12)
        for seg_i in range(segments):
            prev_x, prev_y = fork_pts[-1]
            step = fork_length / segments
            angle += random.uniform(-0.8, 0.8)  # Zigzag
            nx = int(prev_x + math.cos(angle) * step)
            ny = int(prev_y + math.sin(angle) * step)
            fork_pts.append((nx, ny))
        
        # Draw fork with fade
        for j in range(len(fork_pts) - 1):
            fade = 1 - (j / len(fork_pts))
            alpha = int(fade * (200 + intensity * 55))
            width = max(1, int(fade * (3 + intensity * 12)))
            
            # Electric blue-white
            r = int(200 + fade * 55)
            g = int(180 + fade * 75)
            b = 255
            
            draw.line([fork_pts[j], fork_pts[j+1]], 
                     fill=(r, g, b, alpha), width=width)
    
    # Corona glow
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(180, 160, 255, int(150 + intensity * 105)), 
                 width=int(20 + intensity * 60))
    
    glow = glow.filter(ImageFilter.GaussianBlur(radius=5 + intensity * 20))
    image.paste(glow, (0, 0), glow)
    
    # Bright core on top
    draw = ImageDraw.Draw(image)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(255, 255, 255), width=4)

def laser_aura_v3(image, coords, intensity):
    """NEON GLOW - bright electric core with clean bloom"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Neon core (orange-red)
    core_width = int(10 + intensity * 40)
    bloom_width = int(40 + intensity * 180)
    
    # Multiple glow layers for neon effect
    layers = [
        (bloom_width, (255, 100, 40, int(40 + intensity * 80))),
        (bloom_width // 2, (255, 140, 60, int(80 + intensity * 120))),
        (core_width, (255, 200, 100, int(200 + intensity * 55))),
    ]
    
    for width, color in layers:
        for i in range(len(coords) - 1):
            draw.line([coords[i], coords[i+1]], fill=color, width=width)
    
    # Blur for glow
    glow = glow.filter(ImageFilter.GaussianBlur(radius=4 + intensity * 16))
    image.paste(glow, (0, 0), glow)
    
    # Bright white core on top
    draw = ImageDraw.Draw(image)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(255, 255, 255), width=int(3 + intensity * 8))

def ink_aura_v3(image, coords, intensity):
    """INK BLEED - organic splatter and diffusion"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Heavy stroke bleed
    bleed_width = int(60 + intensity * 350)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(180, 90, 40, int(120 + intensity * 135)), 
                 width=bleed_width)
    
    # Ink pools at vertices
    for x, y in coords:
        pool_r = int(70 + intensity * 280)
        # Irregular organic shape
        for _ in range(8):
            offset_x = random.randint(-40, 40)
            offset_y = random.randint(-40, 40)
            r_var = pool_r + random.randint(-pool_r//3, pool_r//3)
            draw.ellipse([x + offset_x - r_var, y + offset_y - r_var,
                         x + offset_x + r_var, y + offset_y + r_var],
                        fill=(150, 70, 30, int(60 + intensity * 100)))
    
    # Splatter marks
    if intensity > 0.2:
        num_splatters = int(50 + intensity * 400)
        for _ in range(num_splatters):
            idx = random.randint(0, len(coords) - 1)
            cx, cy = coords[idx]
            
            # Scatter position
            dist = random.uniform(0, 150 + intensity * 350)
            angle = random.uniform(0, math.pi * 2)
            sx = int(cx + math.cos(angle) * dist)
            sy = int(cy + math.sin(angle) * dist)
            
            # Irregular splat
            splat_r = random.randint(int(3 + intensity * 30), int(15 + intensity * 70))
            num_vertices = random.randint(5, 10)
            splat_pts = []
            for i in range(num_vertices):
                a = (i / num_vertices) * math.pi * 2
                r_jitter = splat_r + random.randint(-splat_r//2, splat_r//2)
                px = int(sx + math.cos(a) * r_jitter)
                py = int(sy + math.sin(a) * r_jitter)
                splat_pts.append((px, py))
            
            alpha = int(100 + intensity * 155) - int(dist / (150 + intensity * 350) * 80)
            draw.polygon(splat_pts, fill=(140, 60, 25, max(40, alpha)))
    
    # Heavy blur for organic bleed
    for _ in range(6):
        glow = glow.filter(ImageFilter.GaussianBlur(radius=12 + intensity * 25))
    
    image.paste(glow, (0, 0), glow)
    
    # Dark line core
    draw = ImageDraw.Draw(image)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(80, 40, 20), width=int(4 + intensity * 10))

def spray_aura_v3(image, coords, intensity):
    """SPRAY PARTICLES - radiating from line"""
    glow = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    
    # Massive particle count
    particles_per_vertex = int(200 + intensity * 3000)  # 200-3200
    spread_radius = int(80 + intensity * 450)  # 80-530px
    
    for x, y in coords:
        for _ in range(particles_per_vertex // len(coords)):
            # Random direction
            angle = random.uniform(0, math.pi * 2)
            # Distance with falloff
            dist = random.uniform(0, spread_radius) * (1 - random.random()**1.5)
            
            px = int(x + math.cos(angle) * dist)
            py = int(y + math.sin(angle) * dist)
            
            # Particle size
            size = random.randint(1, int(2 + intensity * 12))
            
            # Fade with distance
            dist_fade = 1 - (dist / spread_radius)
            alpha = int((120 + intensity * 135) * dist_fade)
            
            # Color variation
            r = 255
            g = 100 + random.randint(-20, 40)
            b = 40 + random.randint(-10, 20)
            
            draw.ellipse([px - size, py - size, px + size, py + size],
                        fill=(r, g, b, alpha))
    
    # Soft blur
    glow = glow.filter(ImageFilter.GaussianBlur(radius=2 + intensity * 8))
    image.paste(glow, (0, 0), glow)
    
    # Bright core line
    draw = ImageDraw.Draw(image)
    for i in range(len(coords) - 1):
        draw.line([coords[i], coords[i+1]], 
                 fill=(255, 180, 100, 255), width=int(5 + intensity * 10))

# Generate
effects = {
    'flame': flame_aura_v3,
    'lightning': lightning_aura_v3,
    'laser': laser_aura_v3,
    'ink': ink_aura_v3,
    'spray': spray_aura_v3
}

intensities = {
    'min': 0.15,
    'mid': 0.55,
    'max': 1.0
}

scaled_coords = scale_coords(DATA_LINE)

for effect_name, effect_func in effects.items():
    for intensity_name, intensity_val in intensities.items():
        img = Image.new('RGB', (WIDTH, HEIGHT), BG_COLOR)
        effect_func(img, scaled_coords, intensity_val)
        
        filename = f'aura_v3_{effect_name}_{intensity_name}.png'
        img.save(filename)
        print(f'✓ {filename}')

print(f'\n✅ V3 generated - PROPER dramatic effects with glowing lines')
