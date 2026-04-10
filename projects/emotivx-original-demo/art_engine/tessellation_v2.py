#!/usr/bin/env python3
"""
EmotivX Tessellation Pattern Engine v2

Key improvements over v1:
- Data line is clearly visible as a sweeping motion arc through the tessellation
- Richer synthetic data paths (realistic goal build-up with 15-20 events)
- Tighter glow falloff so the path reads as a LINE not a blob
- Cell size variation for more organic feel
- Subtle edge definition between cells
- Secondary "energy trails" branching from the main path
"""

import json
import math
import random
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any

import numpy as np
from scipy.spatial import Voronoi
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import colorsys


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hsl(r: int, g: int, b: int) -> Tuple[float, float, float]:
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
    return h * 360, s * 100, l * 100


def hsl_to_rgb(h: float, s: float, l: float) -> Tuple[int, int, int]:
    rf, gf, bf = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return int(min(255, max(0, rf * 255))), int(min(255, max(0, gf * 255))), int(min(255, max(0, bf * 255)))


def load_club_palette(club_id: str, kit: str = "home") -> Dict[str, Any]:
    clubs_path = Path(__file__).parent / "clubs.json"
    with open(clubs_path) as f:
        data = json.load(f)
    club = data["clubs"][club_id]
    kit_data = club[kit]
    primary_rgb = hex_to_rgb(kit_data["primary"])
    primary_hsl = rgb_to_hsl(*primary_rgb)
    secondary_rgb = hex_to_rgb(kit_data["secondary"])
    return {
        "primary_hsl": primary_hsl,
        "primary_rgb": primary_rgb,
        "secondary_rgb": secondary_rgb,
        "accent_rgb": hex_to_rgb(kit_data["accent"]),
        "background_rgb": hex_to_rgb(kit_data["background"]),
    }


def generate_rich_goal_path() -> List[Tuple[float, float]]:
    """
    Generate a realistic goal build-up data path with 18 events.
    Simulates: defensive clearance → midfield progression → wing play →
    cross/through ball → shot on goal. Much richer than 6-event StatsBomb data.
    
    IMPORTANT: All coordinates are inset within 0.15-0.85 range to ensure
    the data glow never touches the tile edges (needed for seamless tiling).
    """
    return [
        # Defensive clearance
        (0.20, 0.52),
        # CB pass to CM
        (0.27, 0.46),
        # CM receives, turns
        (0.32, 0.44),
        # CM carries forward
        (0.38, 0.40),
        # Pass to right midfielder
        (0.44, 0.32),
        # RM receives
        (0.47, 0.28),
        # RM carries down the wing
        (0.52, 0.25),
        (0.58, 0.23),
        # Cuts inside
        (0.62, 0.28),
        # Short pass to striker
        (0.66, 0.38),
        # Striker lays off
        (0.64, 0.44),
        # Attacking mid receives
        (0.67, 0.42),
        # Drives forward
        (0.70, 0.46),
        # Through ball to striker
        (0.74, 0.50),
        # Striker receives in box
        (0.77, 0.52),
        # Turns
        (0.79, 0.50),
        # SHOT — the moment
        (0.81, 0.48),
        # Ball hits net
        (0.83, 0.50),
    ]


def smooth_bezier_path(path: List[Tuple[float, float]], 
                       points_per_segment: int = 30) -> List[Tuple[float, float]]:
    """Create a smooth bezier curve through all path points."""
    if len(path) < 2:
        return path
    
    result = []
    for i in range(len(path) - 1):
        x1, y1 = path[i]
        x2, y2 = path[i + 1]
        
        # Control point: perpendicular offset based on direction change
        dx, dy = x2 - x1, y2 - y1
        
        # Look ahead for direction change to determine curve
        if i + 2 < len(path):
            x3, y3 = path[i + 2]
            dx2, dy2 = x3 - x2, y3 - y2
            # Perpendicular offset proportional to direction change
            cross = dx * dy2 - dy * dx2
            offset = min(0.05, abs(cross) * 2)
        else:
            offset = 0.02
        
        # Perpendicular direction
        length = math.sqrt(dx*dx + dy*dy)
        if length > 0:
            perp_x = -dy / length * offset
            perp_y = dx / length * offset
        else:
            perp_x, perp_y = 0, 0
        
        ctrl_x = (x1 + x2) / 2 + perp_x
        ctrl_y = (y1 + y2) / 2 + perp_y
        
        for t_idx in range(points_per_segment):
            t = t_idx / points_per_segment
            bx = (1-t)**2 * x1 + 2*(1-t)*t * ctrl_x + t**2 * x2
            by = (1-t)**2 * y1 + 2*(1-t)*t * ctrl_y + t**2 * y2
            result.append((bx, by))
    
    result.append(path[-1])
    return result


def point_to_polyline_distance(px: float, py: float,
                                polyline: List[Tuple[float, float]]) -> float:
    """Minimum distance from point to nearest segment of a polyline."""
    min_dist = float('inf')
    
    for i in range(len(polyline) - 1):
        ax, ay = polyline[i]
        bx, by = polyline[i + 1]
        
        # Project point onto line segment
        dx, dy = bx - ax, by - ay
        seg_len_sq = dx*dx + dy*dy
        
        if seg_len_sq < 1e-10:
            dist = math.sqrt((px - ax)**2 + (py - ay)**2)
        else:
            t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / seg_len_sq))
            proj_x = ax + t * dx
            proj_y = ay + t * dy
            dist = math.sqrt((px - proj_x)**2 + (py - proj_y)**2)
        
        min_dist = min(min_dist, dist)
    
    return min_dist


def generate_energy_trails(path: List[Tuple[float, float]], 
                           num_trails: int = 8,
                           seed: int = 42) -> List[List[Tuple[float, float]]]:
    """Generate secondary energy trails branching off the main data path."""
    rng = random.Random(seed)
    trails = []
    
    for _ in range(num_trails):
        # Pick a random point along the path
        idx = rng.randint(len(path) // 4, len(path) - 2)
        start_x, start_y = path[idx]
        
        # Branch direction — roughly perpendicular to path direction
        if idx + 1 < len(path):
            dx = path[idx + 1][0] - start_x
            dy = path[idx + 1][1] - start_y
        else:
            dx, dy = 0.01, 0
        
        length = math.sqrt(dx*dx + dy*dy)
        if length > 0:
            perp_x = -dy / length
            perp_y = dx / length
        else:
            perp_x, perp_y = 1, 0
        
        # Random direction (up or down from path)
        direction = rng.choice([-1, 1])
        trail_length = rng.uniform(0.03, 0.10)
        
        trail = []
        cx, cy = start_x, start_y
        steps = rng.randint(5, 12)
        for s in range(steps):
            t = s / steps
            # Branch out perpendicular, curving slightly forward
            cx += (perp_x * direction * trail_length / steps +
                   dx / length * 0.005 * rng.uniform(0.5, 1.5))
            cy += (perp_y * direction * trail_length / steps +
                   dy / length * 0.005 * rng.uniform(0.5, 1.5))
            trail.append((cx, cy))
        
        if trail:
            trails.append(trail)
    
    return trails


def generate_voronoi_points(width: int, height: int, density: int,
                            path: List[Tuple[float, float]],
                            seed: int = 42) -> np.ndarray:
    """Generate Voronoi points with higher density near the data path."""
    rng = np.random.RandomState(seed)
    
    # Base jittered grid
    grid_size = int(math.sqrt(density * 0.7))
    cell_w = width / max(1, grid_size)
    cell_h = height / max(1, grid_size)
    
    points = []
    for gx in range(grid_size + 2):
        for gy in range(grid_size + 2):
            base_x = (gx - 0.5) * cell_w
            base_y = (gy - 0.5) * cell_h
            jitter = 0.42
            jx = rng.uniform(-cell_w * jitter, cell_w * jitter)
            jy = rng.uniform(-cell_h * jitter, cell_h * jitter)
            points.append([base_x + jx, base_y + jy])
    
    # Extra points clustered near the data path for finer detail there
    path_pixels = [(x * width, y * height) for x, y in path]
    extra_near_path = int(density * 0.3)
    for _ in range(extra_near_path):
        idx = rng.randint(0, len(path_pixels))
        px, py = path_pixels[idx]
        # Scatter within ~5% of canvas size from path
        scatter = max(width, height) * 0.05
        points.append([
            px + rng.uniform(-scatter, scatter),
            py + rng.uniform(-scatter, scatter)
        ])
    
    points_arr = np.array(points)
    
    # Mirror boundaries for clean edges
    mirrors = []
    for axis, size in [(0, width), (1, height)]:
        m1 = points_arr.copy()
        m1[:, axis] = -m1[:, axis]
        mirrors.append(m1)
        m2 = points_arr.copy()
        m2[:, axis] = 2 * size - m2[:, axis]
        mirrors.append(m2)
    
    return np.vstack([points_arr] + mirrors)


def generate_pattern(
    moment_json: dict = None,
    path_override: List[Tuple[float, float]] = None,
    club: str = "arsenal",
    kit: str = "home",
    density: int = 1000,
    width: int = 2048,
    height: int = 2048,
    glow_radius: float = 0.06,
    glow_falloff: float = 2.5,
    lightness_range: Tuple[float, float] = (12, 70),
    saturation_range: Tuple[float, float] = (55, 100),
    seed: int = 42,
    show_edges: bool = True,
    edge_alpha: float = 0.15,
    energy_trails: bool = True,
) -> Image.Image:
    """
    Generate a v2 tessellation pattern with visible data-line trajectory.
    """
    palette = load_club_palette(club, kit)
    
    # Get or generate path
    if path_override:
        raw_path = path_override
    elif moment_json:
        raw_path = [(dl["X"], dl["Y"]) for dl in moment_json.get("data_lines", [])]
    else:
        raw_path = generate_rich_goal_path()
    
    # Smooth the path
    smooth_path = smooth_bezier_path(raw_path, points_per_segment=40)
    
    # Generate energy trails
    trails = []
    if energy_trails:
        trails = generate_energy_trails(smooth_path, num_trails=10, seed=seed)
        # Smooth each trail
        trails = [smooth_bezier_path(t, points_per_segment=10) for t in trails if len(t) >= 2]
    
    # All paths for distance calculation
    all_paths = [smooth_path] + trails
    
    # Generate Voronoi points (denser near path)
    points = generate_voronoi_points(width, height, density, smooth_path, seed)
    vor = Voronoi(points)
    
    # Colour setup
    h, s_base, l_base = palette["primary_hsl"]
    min_l, max_l = lightness_range
    min_s, max_s = saturation_range
    
    # Canvas
    image = Image.new("RGBA", (width, height), (*palette["background_rgb"], 255))
    draw = ImageDraw.Draw(image, "RGBA")
    
    max_dist = glow_radius * max(width, height)
    
    # Draw Voronoi regions
    for region_idx, region in enumerate(vor.regions):
        if not region or -1 in region:
            continue
        
        try:
            vertices = [vor.vertices[i] for i in region]
        except IndexError:
            continue
        
        # Centroid
        cx = sum(v[0] for v in vertices) / len(vertices)
        cy = sum(v[1] for v in vertices) / len(vertices)
        
        if cx < -100 or cx > width + 100 or cy < -100 or cy > height + 100:
            continue
        
        # Distance to main path (normalised coords)
        norm_cx, norm_cy = cx / width, cy / height
        main_dist = point_to_polyline_distance(norm_cx, norm_cy, smooth_path)
        main_dist_px = main_dist * max(width, height)
        
        # Distance to nearest trail (weighted less)
        trail_proximity = 0
        for trail in trails:
            t_dist = point_to_polyline_distance(norm_cx, norm_cy, trail)
            t_dist_px = t_dist * max(width, height)
            t_prox = max(0, 1 - (t_dist_px / (max_dist * 1.5)))
            trail_proximity = max(trail_proximity, t_prox * 0.5)  # Trails glow at 50% intensity
        
        # Main path proximity with sharper falloff
        main_proximity = max(0, 1 - (main_dist_px / max_dist))
        main_proximity = main_proximity ** glow_falloff  # Sharp falloff
        
        # Combined proximity
        proximity = min(1.0, main_proximity + trail_proximity)
        
        # ── Edge fade zone ──
        # Cells near the canvas border are forced dark for seamless tiling.
        # The fade zone is 12% of the canvas on each side.
        edge_margin = 0.12
        edge_fade = 1.0  # 1.0 = fully interior, 0.0 = at the very edge
        
        # Distance from each edge (normalised 0-1)
        dist_left = norm_cx / edge_margin if norm_cx < edge_margin else 1.0
        dist_right = (1.0 - norm_cx) / edge_margin if norm_cx > (1.0 - edge_margin) else 1.0
        dist_top = norm_cy / edge_margin if norm_cy < edge_margin else 1.0
        dist_bottom = (1.0 - norm_cy) / edge_margin if norm_cy > (1.0 - edge_margin) else 1.0
        
        edge_fade = min(dist_left, dist_right, dist_top, dist_bottom)
        edge_fade = max(0.0, min(1.0, edge_fade))
        # Smooth the fade with an ease curve
        edge_fade = edge_fade * edge_fade * (3 - 2 * edge_fade)  # smoothstep
        
        # Apply edge fade to proximity — edges get no glow
        proximity *= edge_fade
        
        # Per-cell variation
        rng = random.Random(region_idx + seed)
        variation = rng.uniform(-2.5, 2.5)
        
        # Calculate cell colour
        cell_l = min_l + (max_l - min_l) * proximity + variation
        cell_s = min_s + (max_s - min_s) * (0.4 + 0.6 * proximity)
        cell_l = max(min_l - 3, min(max_l + 8, cell_l))
        cell_s = max(30, min(100, cell_s))
        
        cell_rgb = hsl_to_rgb(h, cell_s, cell_l)
        
        poly = [(int(v[0]), int(v[1])) for v in vertices]
        
        if len(poly) >= 3:
            draw.polygon(poly, fill=cell_rgb)
            
            if show_edges:
                edge_l = max(5, cell_l - 4)
                edge_rgb = hsl_to_rgb(h, cell_s * 0.7, edge_l)
                # Subtle edge
                draw.polygon(poly, outline=(*edge_rgb, int(255 * edge_alpha)))
    
    # Bright core glow along the main path
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow, "RGBA")
    
    bright = hsl_to_rgb(h, 95, min(80, max_l + 15))
    
    path_px = [(int(x * width), int(y * height)) for x, y in smooth_path]
    
    # Draw the core path as a thin bright line
    for i in range(len(path_px) - 1):
        # Intensity increases toward the goal moment
        progress = i / max(1, len(path_px) - 1)
        alpha = int(15 + 35 * progress)
        width_line = int(2 + 4 * progress)
        glow_draw.line([path_px[i], path_px[i + 1]], 
                       fill=(*bright, alpha), width=width_line)
    
    # Bloom the glow
    glow = glow.filter(ImageFilter.GaussianBlur(radius=12))
    
    # Apply edge fade to glow layers too — mask out glow near borders
    edge_margin_px = int(0.12 * max(width, height))
    glow_arr = np.array(glow, dtype=np.float32)
    
    # Create edge fade mask
    fade_mask = np.ones((height, width), dtype=np.float32)
    for y in range(height):
        for x_zone in range(min(edge_margin_px, width)):
            fade_x = x_zone / edge_margin_px
            fade_mask[y, x_zone] = min(fade_mask[y, x_zone], fade_x * fade_x)
            fade_mask[y, width - 1 - x_zone] = min(fade_mask[y, width - 1 - x_zone], fade_x * fade_x)
    for x in range(width):
        for y_zone in range(min(edge_margin_px, height)):
            fade_y = y_zone / edge_margin_px
            fade_mask[y_zone, x] = min(fade_mask[y_zone, x], fade_y * fade_y)
            fade_mask[height - 1 - y_zone, x] = min(fade_mask[height - 1 - y_zone, x], fade_y * fade_y)
    
    # Apply mask to alpha channel of glow
    glow_arr[:, :, 3] *= fade_mask
    glow = Image.fromarray(np.clip(glow_arr, 0, 255).astype(np.uint8))
    
    image = Image.alpha_composite(image, glow)
    
    # Second pass — sharper core line (also masked)
    glow2 = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow2_draw = ImageDraw.Draw(glow2, "RGBA")
    for i in range(len(path_px) - 1):
        progress = i / max(1, len(path_px) - 1)
        alpha = int(10 + 20 * progress)
        glow2_draw.line([path_px[i], path_px[i + 1]],
                        fill=(255, 255, 255, alpha), width=1)
    glow2 = glow2.filter(ImageFilter.GaussianBlur(radius=3))
    
    glow2_arr = np.array(glow2, dtype=np.float32)
    glow2_arr[:, :, 3] *= fade_mask
    glow2 = Image.fromarray(np.clip(glow2_arr, 0, 255).astype(np.uint8))
    
    image = Image.alpha_composite(image, glow2)
    
    return image


if __name__ == "__main__":
    print("🎨 EmotivX Tessellation v2 — Rich Data Line Demo\n")
    
    output_dir = Path(__file__).parent / "output" / "v2"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Use the rich synthetic goal path
    rich_path = generate_rich_goal_path()
    
    clubs_kits = [
        ("arsenal", "home", "Arsenal Home"),
        ("arsenal", "away", "Arsenal Away"),
        ("manchester_united", "home", "Man Utd Home"),
        ("wrexham", "home", "Wrexham Home"),
        ("chelsea", "home", "Chelsea Home"),
        ("liverpool", "home", "Liverpool Home"),
    ]
    
    for club, kit, label in clubs_kits:
        print(f"📐 {label} (density=1000)...")
        img = generate_pattern(
            path_override=rich_path,
            club=club, kit=kit,
            density=1000,
            glow_radius=0.06,
            glow_falloff=2.0,
        )
        p = output_dir / f"{club}_{kit}.png"
        img.save(str(p), "PNG")
        print(f"   ✓ {p}")
    
    # Also do density comparison for Arsenal
    print(f"\n📐 Arsenal density comparison...")
    for d in [500, 1000, 1500]:
        img = generate_pattern(
            path_override=rich_path,
            club="arsenal", kit="home",
            density=d,
            glow_radius=0.06,
            glow_falloff=2.0,
        )
        p = output_dir / f"arsenal_home_d{d}.png"
        img.save(str(p), "PNG")
        print(f"   ✓ d={d}: {p}")
    
    print(f"\n✅ All v2 renders: {output_dir}")
