#!/usr/bin/env python3
"""
EmotivX Pattern Generator — Layered Architecture v4

Two independent layers with separate density controls:
  1. BACKGROUND: Continuous Voronoi tessellation (never tiled) with optional gradient and edge control
  2. DATA LINE: Cell-based glow overlay (tileable, rotatable, scatterable) with intensity control

Args (JSON mode): pass a single JSON string as arg[1]
Args (legacy): club kit bgDetail dataDetail bloom repeatSize repeatMode randomRotate rotation invertColors showMarkers width height outputPath
"""

import sys
import os
import math
import random
import random as rng_mod

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from scipy.spatial import Voronoi
import colorsys


def hex_to_rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hsl(r, g, b):
    rf, gf, bf = r / 255.0, g / 255.0, b / 255.0
    h, l, s = colorsys.rgb_to_hls(rf, gf, bf)
    return h * 360, s * 100, l * 100


def hsl_to_rgb(h, s, l):
    rf, gf, bf = colorsys.hls_to_rgb(h / 360.0, l / 100.0, s / 100.0)
    return int(min(255, max(0, rf * 255))), int(min(255, max(0, gf * 255))), int(min(255, max(0, bf * 255)))


def load_club_palette(club_id, kit="home"):
    import json
    from pathlib import Path
    clubs_path = Path(__file__).parent / "clubs.json"
    with open(clubs_path) as f:
        data = json.load(f)
    club = data["clubs"][club_id]
    kit_data = club[kit]
    primary_rgb = hex_to_rgb(kit_data["primary"])
    primary_hsl = rgb_to_hsl(*primary_rgb)
    return {
        "primary_hsl": primary_hsl,
        "primary_rgb": primary_rgb,
        "secondary_rgb": hex_to_rgb(kit_data["secondary"]),
        "accent_rgb": hex_to_rgb(kit_data["accent"]),
        "background_rgb": hex_to_rgb(kit_data["background"]),
    }


# ──────────────────────────────────────────
# SHARED FOCAL CONSTANT
# Single source of truth: goal event anchor Y (normalised 0-1, top=0).
# scale_path TARGET_Y and render_background FOCAL_Y MUST both reference this.
# If you change this, both alignment and gradient move together — they cannot drift.
GOAL_FOCAL_Y = 0.36   # chest-high; UV formula: scene_y = (0.5 - 0.36) * 1.31 ≈ +0.183
GOAL_FOCAL_X = 0.50   # horizontal centre

# ──────────────────────────────────────────
# PATH DATA
# ──────────────────────────────────────────

def generate_rich_goal_path():
    """
    18-event goal build-up with event types.
    Event types: 'pass', 'shot', 'goal'
    """
    return [
        (0.20, 0.52, "pass"),
        (0.27, 0.46, "pass"),
        (0.32, 0.44, "pass"),
        (0.38, 0.40, "pass"),
        (0.44, 0.32, "pass"),
        (0.47, 0.28, "pass"),
        (0.52, 0.25, "pass"),
        (0.58, 0.23, "pass"),
        (0.62, 0.28, "pass"),
        (0.66, 0.38, "pass"),
        (0.64, 0.44, "pass"),
        (0.67, 0.42, "pass"),
        (0.70, 0.46, "pass"),
        (0.74, 0.50, "pass"),
        (0.76, 0.54, "shot"),    # SHOT — curves up
        (0.78, 0.48, "shot"),    # Shot arcs
        (0.80, 0.44, "shot"),    # Shot dips in
        (0.82, 0.47, "goal"),    # GOAL — nestled organically
    ]


# Event glow params — goal is softer now, broader, gentler
EVENT_PARAMS = {
    "pass": {"radius_mult": 1.0, "brightness_mult": 1.0, "max_lightness": 50, "falloff_exp": 1.3},
    "carry": {"radius_mult": 0.8, "brightness_mult": 0.8, "max_lightness": 40, "falloff_exp": 1.5},
    "carry_end": {"radius_mult": 0.8, "brightness_mult": 0.8, "max_lightness": 40, "falloff_exp": 1.5},
    "dribble": {"radius_mult": 1.0, "brightness_mult": 1.0, "max_lightness": 50, "falloff_exp": 1.3},
    "shot": {"radius_mult": 1.1, "brightness_mult": 1.1, "max_lightness": 50, "falloff_exp": 1.4},
    "goal": {"radius_mult": 2.5, "brightness_mult": 1.6, "max_lightness": 65, "falloff_exp": 0.7},
}


def smooth_path(path, points_per_seg=30):
    if len(path) < 2:
        return path
    result = []
    for i in range(len(path) - 1):
        x1, y1 = path[i]
        x2, y2 = path[i + 1]
        dx, dy = x2 - x1, y2 - y1
        offset = 0.035
        if i + 2 < len(path):
            x3, y3 = path[i + 2]
            cross = abs(dx * (y3 - y2) - dy * (x3 - x2))
            offset = min(0.08, cross * 3 + 0.015)
        length = math.sqrt(dx*dx + dy*dy)
        if length > 0:
            perp_x = -dy / length * offset
            perp_y = dx / length * offset
        else:
            perp_x = perp_y = 0
        ctrl_x = (x1 + x2) / 2 + perp_x
        ctrl_y = (y1 + y2) / 2 + perp_y
        for t_idx in range(points_per_seg):
            t = t_idx / points_per_seg
            bx = (1-t)**2 * x1 + 2*(1-t)*t * ctrl_x + t**2 * x2
            by = (1-t)**2 * y1 + 2*(1-t)*t * ctrl_y + t**2 * y2
            result.append((bx, by))
    result.append(path[-1])
    return result


# ──────────────────────────────────────────
# VORONOI HELPER
# ──────────────────────────────────────────

def make_voronoi_grid(width, height, density, seed=42):
    """Generate Voronoi tessellation with mirrored boundaries."""
    rng = np.random.RandomState(seed)
    grid_size = int(math.sqrt(density))
    cell_w = width / max(1, grid_size)
    cell_h = height / max(1, grid_size)

    points = []
    for gx in range(grid_size + 2):
        for gy in range(grid_size + 2):
            base_x = (gx - 0.5) * cell_w
            base_y = (gy - 0.5) * cell_h
            jx = rng.uniform(-cell_w * 0.42, cell_w * 0.42)
            jy = rng.uniform(-cell_h * 0.42, cell_h * 0.42)
            points.append([base_x + jx, base_y + jy])

    points_arr = np.array(points)
    mirrors = []
    for axis, size in [(0, width), (1, height)]:
        m1 = points_arr.copy(); m1[:, axis] = -m1[:, axis]; mirrors.append(m1)
        m2 = points_arr.copy(); m2[:, axis] = 2 * size - m2[:, axis]; mirrors.append(m2)

    all_points = np.vstack([points_arr] + mirrors)
    return Voronoi(all_points)


def make_delaunay_grid(width, height, density, seed=42):
    """Generate Delaunay triangulation with jittered grid points."""
    from scipy.spatial import Delaunay
    rng = np.random.RandomState(seed)
    grid_size = int(math.sqrt(density))
    cell_w = width / max(1, grid_size)
    cell_h = height / max(1, grid_size)

    points = []
    for gx in range(grid_size + 2):
        for gy in range(grid_size + 2):
            base_x = (gx - 0.5) * cell_w
            base_y = (gy - 0.5) * cell_h
            jx = rng.uniform(-cell_w * 0.42, cell_w * 0.42)
            jy = rng.uniform(-cell_h * 0.42, cell_h * 0.42)
            points.append([base_x + jx, base_y + jy])

    points_arr = np.array(points)
    return Delaunay(points_arr), points_arr


def make_impact_delaunay(width, height, density, seed=42, impact_points=None):
    """
    Delaunay triangulation with extra density near impact points.
    Impact points = goal/shot locations (normalised 0-1 coords).
    Creates smaller, denser shards near impacts — like glass cracking from force.
    """
    from scipy.spatial import Delaunay
    rng = np.random.RandomState(seed)
    grid_size = int(math.sqrt(density))
    cell_w = width / max(1, grid_size)
    cell_h = height / max(1, grid_size)

    points = []
    for gx in range(grid_size + 2):
        for gy in range(grid_size + 2):
            base_x = (gx - 0.5) * cell_w
            base_y = (gy - 0.5) * cell_h
            jx = rng.uniform(-cell_w * 0.42, cell_w * 0.42)
            jy = rng.uniform(-cell_h * 0.42, cell_h * 0.42)
            points.append([base_x + jx, base_y + jy])

    # Add extra density near impact points (goals/shots)
    if impact_points:
        extra_count = max(20, density // 4)
        for ix, iy in impact_points:
            px, py = ix * width, iy * height
            for _ in range(extra_count):
                # Radial distribution — denser near centre
                angle = rng.uniform(0, 2 * math.pi)
                dist = rng.exponential(scale=min(width, height) * 0.08)
                ex = px + math.cos(angle) * dist
                ey = py + math.sin(angle) * dist
                if -50 <= ex <= width + 50 and -50 <= ey <= height + 50:
                    points.append([ex, ey])

    points_arr = np.array(points)
    return Delaunay(points_arr), points_arr


# ──────────────────────────────────────────
# LAYER 1: Background
# ──────────────────────────────────────────

def generate_background(width, height, density, palette, seed=42,
                        edge_visibility=30, gradient_style="none", secondary_accent=0):
    """
    Generate continuous Voronoi background.
    edge_visibility: 0 = no edges, 100 = bold faceted edges
    gradient_style: "none", "radial", "linear-v", "linear-h"
    secondary_accent: 0-100, blends secondary colour into some cells
    """
    h, s_base, l_base = palette["primary_hsl"]
    vor = make_voronoi_grid(width, height, density, seed)

    min_l, max_l = 10, 22
    min_s, max_s = 50, 85

    image = Image.new("RGBA", (width, height), (*palette["background_rgb"], 255))
    draw = ImageDraw.Draw(image, "RGBA")
    r = rng_mod.Random(seed + 99)
    
    # Secondary colour for accent
    sec_rgb = palette.get("secondary_rgb", palette["primary_rgb"])
    sec_hsl = rgb_to_hsl(*sec_rgb)
    sec_h = sec_hsl[0]
    accent_t = secondary_accent / 100.0

    # Edge alpha based on visibility slider
    edge_alpha = int(edge_visibility * 2.55)  # 0-255

    for region in vor.regions:
        if not region or -1 in region:
            continue
        try:
            vertices = [vor.vertices[i] for i in region]
        except IndexError:
            continue
        cx = sum(v[0] for v in vertices) / len(vertices)
        cy = sum(v[1] for v in vertices) / len(vertices)
        if cx < -50 or cx > width + 50 or cy < -50 or cy > height + 50:
            continue

        cell_l = r.uniform(min_l, max_l)
        cell_s = r.uniform(min_s, max_s)
        
        # Secondary accent: some cells use secondary hue
        use_secondary = r.random() < accent_t * 0.3  # Max 30% of cells
        cell_h = sec_h if use_secondary else h
        
        cell_rgb = hsl_to_rgb(cell_h, cell_s, cell_l)
        poly = [(int(v[0]), int(v[1])) for v in vertices]
        if len(poly) >= 3:
            draw.polygon(poly, fill=cell_rgb)
            if edge_alpha > 3:
                edge_rgb = hsl_to_rgb(cell_h, cell_s * 0.7, max(5, cell_l - 3))
                draw.polygon(poly, outline=(*edge_rgb, edge_alpha))

    # Background gradient overlay
    if gradient_style != "none":
        grad = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        grad_arr = np.zeros((height, width, 4), dtype=np.float32)
        
        if gradient_style == "radial":
            # Radial: bright centre, dark edges
            cy_c, cx_c = height / 2, width / 2
            max_dist = math.sqrt(cx_c**2 + cy_c**2)
            for y_px in range(height):
                for x_px in range(0, width, 4):  # Step 4 for speed
                    dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                    darken = dist * 0.3  # Max 30% darker at edges
                    grad_arr[y_px, x_px:min(x_px+4, width), 3] = darken * 255
        elif gradient_style == "linear-v":
            for y_px in range(height):
                t = y_px / max(1, height - 1)
                darken = abs(t - 0.5) * 0.25
                grad_arr[y_px, :, 3] = darken * 255
        elif gradient_style == "linear-h":
            for x_px in range(width):
                t = x_px / max(1, width - 1)
                darken = abs(t - 0.5) * 0.25
                grad_arr[:, x_px, 3] = darken * 255
        
        grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))
        # Composite as darkening overlay
        img_arr = np.array(image, dtype=np.float32)
        g_arr = np.array(grad, dtype=np.float32)
        darken_factor = 1.0 - g_arr[:, :, 3:4] / 255.0
        img_arr[:, :, :3] *= darken_factor
        image = Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))

    return image


def generate_background_broken_glass(width, height, density, palette, seed=42,
                                      edge_visibility=50, gradient_style="none",
                                      secondary_accent=0, impact_points=None):
    """
    Broken Glass style: Delaunay triangulation with sharp angular shards.
    Impact points get denser, smaller fragments radiating outward.
    Bold white/bright edge lines simulate glass fracture cracks.
    """
    h, s_base, l_base = palette["primary_hsl"]
    tri, pts = make_impact_delaunay(width, height, density, seed, impact_points)

    min_l, max_l = 8, 25
    min_s, max_s = 45, 90

    image = Image.new("RGBA", (width, height), (*palette["background_rgb"], 255))
    draw = ImageDraw.Draw(image, "RGBA")
    r = rng_mod.Random(seed + 99)

    sec_rgb = palette.get("secondary_rgb", palette["primary_rgb"])
    sec_hsl = rgb_to_hsl(*sec_rgb)
    sec_h = sec_hsl[0]
    accent_t = secondary_accent / 100.0

    # Edge styling — broken glass has prominent bright crack lines
    edge_alpha = max(40, int(edge_visibility * 2.55))  # Minimum visible edges
    crack_l = min(45, 15 + edge_visibility * 0.3)  # Brighter edges = more visible cracks

    for simplex in tri.simplices:
        verts = pts[simplex]
        cx = np.mean(verts[:, 0])
        cy = np.mean(verts[:, 1])
        if cx < -50 or cx > width + 50 or cy < -50 or cy > height + 50:
            continue

        # Proximity to impact → lighter, more saturated (like light refracting through cracked glass)
        impact_boost = 0
        if impact_points:
            for ix, iy in impact_points:
                dist = math.sqrt((cx / width - ix)**2 + (cy / height - iy)**2)
                impact_boost = max(impact_boost, max(0, 1.0 - dist * 4) * 8)

        cell_l = r.uniform(min_l, max_l) + impact_boost
        cell_s = r.uniform(min_s, max_s)

        use_secondary = r.random() < accent_t * 0.3
        cell_h = sec_h if use_secondary else h

        cell_rgb = hsl_to_rgb(cell_h, cell_s, min(35, cell_l))
        poly = [(int(v[0]), int(v[1])) for v in verts]

        draw.polygon(poly, fill=cell_rgb)
        # Crack lines — bright, sharp edges
        crack_rgb = hsl_to_rgb(h, max(20, cell_s * 0.5), crack_l)
        draw.polygon(poly, outline=(*crack_rgb, edge_alpha))
        # Double-draw edges for thickness on high visibility
        if edge_visibility > 50:
            draw.line(poly + [poly[0]], fill=(*crack_rgb, edge_alpha), width=2)

    # Gradient overlay (same as pebbles)
    if gradient_style != "none":
        grad_arr = np.zeros((height, width, 4), dtype=np.float32)
        if gradient_style == "radial":
            cy_c, cx_c = height / 2, width / 2
            max_dist = math.sqrt(cx_c**2 + cy_c**2)
            for y_px in range(height):
                for x_px in range(0, width, 4):
                    dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                    grad_arr[y_px, x_px:min(x_px+4, width), 3] = dist * 0.3 * 255
        elif gradient_style == "linear-v":
            for y_px in range(height):
                grad_arr[y_px, :, 3] = abs(y_px / max(1, height-1) - 0.5) * 0.25 * 255
        elif gradient_style == "linear-h":
            for x_px in range(width):
                grad_arr[:, x_px, 3] = abs(x_px / max(1, width-1) - 0.5) * 0.25 * 255
        grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))
        img_arr = np.array(image, dtype=np.float32)
        g_arr = np.array(grad, dtype=np.float32)
        img_arr[:, :, :3] *= (1.0 - g_arr[:, :, 3:4] / 255.0)
        image = Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))

    return image


def generate_background_spider_web(width, height, density, palette, seed=42,
                                    edge_visibility=50, gradient_style="none",
                                    secondary_accent=0, impact_points=None):
    """
    Spider's Web style: Radial spokes + concentric rings centred on goal point.
    Irregular, organic web — not perfectly symmetrical.
    """
    h, s_base, l_base = palette["primary_hsl"]
    r = rng_mod.Random(seed + 99)

    image = Image.new("RGBA", (width, height), (*palette["background_rgb"], 255))
    draw = ImageDraw.Draw(image, "RGBA")

    # Web centre = first impact point, or canvas centre
    if impact_points and len(impact_points) > 0:
        cx_n, cy_n = impact_points[-1]  # Goal point
    else:
        cx_n, cy_n = 0.5, 0.5
    cx_px, cy_px = int(cx_n * width), int(cy_n * height)

    # Number of spokes scales with density
    num_spokes = max(8, int(math.sqrt(density) * 1.2))
    # Number of concentric rings
    num_rings = max(4, int(math.sqrt(density) * 0.6))
    max_radius = math.sqrt(width**2 + height**2) * 0.7

    # Generate spoke angles with organic irregularity
    base_angle_step = 2 * math.pi / num_spokes
    spoke_angles = []
    for i in range(num_spokes):
        angle = i * base_angle_step + r.uniform(-base_angle_step * 0.25, base_angle_step * 0.25)
        spoke_angles.append(angle)

    # Generate ring radii with organic spacing
    ring_radii = []
    for i in range(num_rings):
        base_r = max_radius * ((i + 1) / num_rings)
        jitter = r.uniform(-max_radius * 0.02, max_radius * 0.02)
        ring_radii.append(base_r + jitter)

    # Thread colours — web-like, subtle variations
    sec_rgb = palette.get("secondary_rgb", palette["primary_rgb"])
    sec_hsl = rgb_to_hsl(*sec_rgb)
    accent_t = secondary_accent / 100.0

    thread_alpha = max(30, int(edge_visibility * 2.0))
    thread_l_base = 18 + edge_visibility * 0.15

    # Fill triangular cells between spokes and rings
    for si in range(num_spokes):
        a1 = spoke_angles[si]
        a2 = spoke_angles[(si + 1) % num_spokes]
        for ri in range(num_rings):
            r1 = ring_radii[ri - 1] if ri > 0 else 0
            r2 = ring_radii[ri]

            # Four corners of this web cell
            pts = [
                (cx_px + math.cos(a1) * r1, cy_px + math.sin(a1) * r1),
                (cx_px + math.cos(a1) * r2, cy_px + math.sin(a1) * r2),
                (cx_px + math.cos(a2) * r2, cy_px + math.sin(a2) * r2),
                (cx_px + math.cos(a2) * r1, cy_px + math.sin(a2) * r1),
            ]
            poly = [(int(x), int(y)) for x, y in pts]

            cell_l = r.uniform(8, 20)
            cell_s = r.uniform(50, 85)
            use_sec = r.random() < accent_t * 0.3
            cell_h = sec_hsl[0] if use_sec else h
            cell_rgb = hsl_to_rgb(cell_h, cell_s, cell_l)
            draw.polygon(poly, fill=cell_rgb)

    # Draw concentric rings (silk threads)
    for rad in ring_radii:
        ring_points = []
        steps = max(60, num_spokes * 4)
        for si in range(steps + 1):
            angle = (si / steps) * 2 * math.pi
            # Organic wobble on rings
            wobble = r.uniform(0.96, 1.04)
            rx = cx_px + math.cos(angle) * rad * wobble
            ry = cy_px + math.sin(angle) * rad * wobble
            ring_points.append((int(rx), int(ry)))
        thread_rgb = hsl_to_rgb(h, 40, thread_l_base + r.uniform(-3, 3))
        if len(ring_points) >= 2:
            draw.line(ring_points, fill=(*thread_rgb, thread_alpha), width=1)

    # Draw radial spokes
    for angle in spoke_angles:
        spoke_pts = []
        for rad in [0] + ring_radii:
            wobble = r.uniform(0.97, 1.03)
            sx = cx_px + math.cos(angle) * rad * wobble
            sy = cy_px + math.sin(angle) * rad * wobble
            spoke_pts.append((int(sx), int(sy)))
        thread_rgb = hsl_to_rgb(h, 40, thread_l_base + r.uniform(-3, 3))
        if len(spoke_pts) >= 2:
            draw.line(spoke_pts, fill=(*thread_rgb, thread_alpha), width=1)

    # Gradient overlay
    if gradient_style != "none":
        grad_arr = np.zeros((height, width, 4), dtype=np.float32)
        if gradient_style == "radial":
            cy_c, cx_c = height / 2, width / 2
            max_dist = math.sqrt(cx_c**2 + cy_c**2)
            for y_px in range(height):
                for x_px in range(0, width, 4):
                    dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                    grad_arr[y_px, x_px:min(x_px+4, width), 3] = dist * 0.3 * 255
        elif gradient_style == "linear-v":
            for y_px in range(height):
                grad_arr[y_px, :, 3] = abs(y_px / max(1, height-1) - 0.5) * 0.25 * 255
        elif gradient_style == "linear-h":
            for x_px in range(width):
                grad_arr[:, x_px, 3] = abs(x_px / max(1, width-1) - 0.5) * 0.25 * 255
        grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))
        img_arr = np.array(image, dtype=np.float32)
        g_arr = np.array(grad, dtype=np.float32)
        img_arr[:, :, :3] *= (1.0 - g_arr[:, :, 3:4] / 255.0)
        image = Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))

    return image


def generate_hex_grid(width, height, density, seed=42):
    """
    Generate a hexagonal grid of cell centres.
    Returns list of (cx, cy, [(vx, vy), ...]) tuples — centre + 6 vertices per hex.
    """
    r = rng_mod.Random(seed + 42)
    # Hex dimensions from density
    cols = max(4, int(math.sqrt(density) * 1.2))
    hex_w = width / cols
    hex_h = hex_w * 0.866  # sqrt(3)/2 ratio
    rows = int(height / hex_h) + 2

    cells = []
    for row in range(-1, rows + 1):
        for col in range(-1, cols + 2):
            cx = col * hex_w + (hex_w * 0.5 if row % 2 else 0)
            cy = row * hex_h
            # Slight organic jitter
            jitter = hex_w * 0.03
            cx += r.uniform(-jitter, jitter)
            cy += r.uniform(-jitter, jitter)

            # 6 vertices of the hexagon
            verts = []
            for i in range(6):
                angle = math.pi / 6 + i * math.pi / 3  # Flat-top hex
                vx = cx + (hex_w * 0.52) * math.cos(angle)
                vy = cy + (hex_w * 0.52) * math.sin(angle)
                verts.append((vx, vy))
            cells.append((cx, cy, verts))

    return cells, hex_w


def generate_background_honeycomb(width, height, density, palette, seed=42,
                                   edge_visibility=50, gradient_style="none",
                                   secondary_accent=0, impact_points=None):
    """
    Honeycomb style: Hexagonal grid with data-driven cell effects.
    Impact points cause hex cells to "crack" (split into triangles).
    """
    h, s_base, l_base = palette["primary_hsl"]
    cells, hex_w = generate_hex_grid(width, height, density, seed)
    r = rng_mod.Random(seed + 99)

    image = Image.new("RGBA", (width, height), (*palette["background_rgb"], 255))
    draw = ImageDraw.Draw(image, "RGBA")

    sec_rgb = palette.get("secondary_rgb", palette["primary_rgb"])
    sec_hsl = rgb_to_hsl(*sec_rgb)
    sec_h = sec_hsl[0]
    accent_t = secondary_accent / 100.0

    edge_alpha = max(20, int(edge_visibility * 2.55))
    edge_l = 12 + edge_visibility * 0.2

    for cx, cy, verts in cells:
        # Skip cells fully outside canvas
        if cx < -hex_w or cx > width + hex_w or cy < -hex_w or cy > height + hex_w:
            continue

        # Impact proximity — cells near goal/shot crack into triangles
        impact_dist = float("inf")
        if impact_points:
            for ix, iy in impact_points:
                d = math.sqrt((cx / width - ix)**2 + (cy / height - iy)**2)
                impact_dist = min(impact_dist, d)

        cracked = impact_dist < 0.12  # Cells within 12% of impact crack open
        impact_boost = max(0, (1.0 - impact_dist * 5)) * 10 if impact_points else 0

        cell_l = r.uniform(8, 22) + impact_boost
        cell_s = r.uniform(50, 88)
        use_sec = r.random() < accent_t * 0.3
        cell_h = sec_h if use_sec else h

        poly = [(int(v[0]), int(v[1])) for v in verts]

        if cracked and len(verts) == 6:
            # Split hex into 6 triangles from centre — cracked glass effect
            cxi, cyi = int(cx), int(cy)
            for ti in range(6):
                v1 = poly[ti]
                v2 = poly[(ti + 1) % 6]
                tri_poly = [v1, v2, (cxi, cyi)]
                # Each triangle gets slightly different shade
                tri_l = min(40, cell_l + r.uniform(-4, 6))
                tri_s = cell_s + r.uniform(-10, 10)
                tri_rgb = hsl_to_rgb(cell_h, max(30, tri_s), tri_l)
                draw.polygon(tri_poly, fill=tri_rgb)
                # Crack lines between triangles
                crack_rgb = hsl_to_rgb(h, 30, min(50, edge_l + 15))
                draw.line([v1, (cxi, cyi)], fill=(*crack_rgb, min(255, edge_alpha + 40)), width=1)
        else:
            # Normal hex cell
            cell_rgb = hsl_to_rgb(cell_h, cell_s, min(30, cell_l))
            draw.polygon(poly, fill=cell_rgb)

        # Hex edge outlines
        edge_rgb = hsl_to_rgb(h, max(20, cell_s * 0.5), edge_l)
        draw.polygon(poly, outline=(*edge_rgb, edge_alpha))

    # Gradient overlay
    if gradient_style != "none":
        grad_arr = np.zeros((height, width, 4), dtype=np.float32)
        if gradient_style == "radial":
            cy_c, cx_c = height / 2, width / 2
            max_dist = math.sqrt(cx_c**2 + cy_c**2)
            for y_px in range(height):
                for x_px in range(0, width, 4):
                    dist = math.sqrt((x_px - cx_c)**2 + (y_px - cy_c)**2) / max_dist
                    grad_arr[y_px, x_px:min(x_px+4, width), 3] = dist * 0.3 * 255
        elif gradient_style == "linear-v":
            for y_px in range(height):
                grad_arr[y_px, :, 3] = abs(y_px / max(1, height-1) - 0.5) * 0.25 * 255
        elif gradient_style == "linear-h":
            for x_px in range(width):
                grad_arr[:, x_px, 3] = abs(x_px / max(1, width-1) - 0.5) * 0.25 * 255
        grad = Image.fromarray(np.clip(grad_arr, 0, 255).astype(np.uint8))
        img_arr = np.array(image, dtype=np.float32)
        g_arr = np.array(grad, dtype=np.float32)
        img_arr[:, :, :3] *= (1.0 - g_arr[:, :, 3:4] / 255.0)
        image = Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))

    return image


# ──────────────────────────────────────────
# LAYER 2: Data line (cell-based glow)
# ──────────────────────────────────────────

def scale_path(path_events, data_scale):
    """
    Scale and centre a path on the canvas.
    
    1. Scale events around their centroid (spread controlled by data_scale 0-100)
    2. Translate centroid toward (0.5, 0.5)
    
    Art elements (gradient, sunburst, glow) read the goal position FROM the
    result — they follow the data, not a hardcoded constant.
    """
    if data_scale <= 0 or len(path_events) < 2:
        return list(path_events)
    xs = [x for x, y, _ in path_events]
    ys = [y for x, y, _ in path_events]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    cx, cy = (min_x + max_x) / 2, (min_y + max_y) / 2
    range_x = max(0.01, max_x - min_x)
    range_y = max(0.01, max_y - min_y)
    fill_t = data_scale / 100.0
    target_span = 0.15 + fill_t * 0.65
    current_span = max(range_x, range_y)
    scale_factor = target_span / current_span if current_span > 0 else 1.0
    blend = fill_t

    # Step 1 — scale around centroid
    scaled = []
    for x, y, evt in path_events:
        sx = cx + (x - cx) * (1.0 + (scale_factor - 1.0) * blend)
        sy = cy + (y - cy) * (1.0 + (scale_factor - 1.0) * blend)
        scaled.append((sx, sy, evt))

    # Step 2 — translate so the GOAL EVENT lands at canvas centre.
    # The goal is the hero moment — it belongs at chest height on the garment.
    # The buildup path naturally extends away from it (giving the art directionality).
    # All art layers (gradient, sunburst, glow) read the goal position from this
    # result — they all converge at the same point.
    goal_pts = [(x, y) for x, y, e in scaled if e == "goal"]
    if goal_pts:
        gx, gy = goal_pts[-1]
    else:
        gx, gy = cx, cy  # fallback: centroid
    tx = (0.5 - gx)   # full translation — no blend
    ty = (0.5 - gy)

    result = []
    for sx, sy, evt in scaled:
        rx = max(0.05, min(0.95, sx + tx))
        ry = max(0.05, min(0.95, sy + ty))
        result.append((rx, ry, evt))
    return result


def generate_dataline_glow(width, height, density, palette, glow_radius=0.08, bloom=50, path_override=None, data_scale=50, draw_markers=False, data_palette=None, **kwargs):
    """
    Cell-based data line glow. Each cell lights up based on proximity
    to the path AND the event type at that part of the path.
    Goal radiates as a soft organic burst — no hard edges.
    """
    # Use data_palette if provided (separate data line colour); fall back to bg palette
    _dpal = data_palette if data_palette is not None else palette
    hue, s_base, l_base = _dpal["primary_hsl"]
    line_effect = kwargs.get("lineEffect", "default")

    path_events = path_override if path_override else generate_rich_goal_path()
    path_events = scale_path(path_events, data_scale)
    
    raw_coords = [(x, y) for x, y, _ in path_events]
    smoothed = smooth_path(raw_coords, points_per_seg=40)

    # Map each smoothed point to nearest event type
    def get_event_at(sx, sy):
        best_dist = float("inf")
        best_evt = "pass"
        for (ox, oy, evt) in path_events:
            d = (sx - ox)**2 + (sy - oy)**2
            if d < best_dist:
                best_dist = d
                best_evt = evt
        return best_evt

    smoothed_events = [(x, y, get_event_at(x, y)) for x, y in smoothed]

    # Goal point for radial burst
    goal_pts = [(px, py) for px, py, e in path_events if e == "goal"]
    goal_x, goal_y = goal_pts[-1] if goal_pts else (0.83, 0.50)

    vor = make_voronoi_grid(width, height, density, seed=77)  # Different seed from bg
    
    # Bloom controls spread: 0 = laser-tight, 100 = maximum atmospheric spread
    bloom_t = bloom / 100.0
    # Radius scales from 15% (laser) to 200% (full bloom) of base
    radius_scale = 0.15 + bloom_t * 1.85
    base_radius = glow_radius * max(width, height) * radius_scale
    # Falloff: very steep at low bloom (laser), very gentle at high bloom
    bloom_falloff_adj = 3.0 - bloom_t * 2.4  # 3.0 (laser) → 0.6 (gentle)
    # Blur: 0px at low bloom (crisp edges), 8px at high bloom
    bloom_blur = max(0, int(bloom_t * 8))
    # At low bloom, boost brightness to compensate for narrow radius
    bloom_brightness_boost = 1.0 + (1.0 - bloom_t) * 0.8  # 1.8× at 0, 1.0× at 100

    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image, "RGBA")

    for region in vor.regions:
        if not region or -1 in region:
            continue
        try:
            vertices = [vor.vertices[i] for i in region]
        except IndexError:
            continue

        cx = sum(v[0] for v in vertices) / len(vertices)
        cy = sum(v[1] for v in vertices) / len(vertices)
        if cx < -50 or cx > width + 50 or cy < -50 or cy > height + 50:
            continue

        cx_n = cx / width
        cy_n = cy / height

        # Find nearest path point and event type
        best_dist = float("inf")
        best_event = "pass"
        for (px, py, evt) in smoothed_events:
            d = math.sqrt((cx_n - px)**2 + (cy_n - py)**2)
            if d < best_dist:
                best_dist = d
                best_event = evt

        params = EVENT_PARAMS[best_event]

        # For goal: ONLY use radial distance from goal point
        # This eliminates the hard line at the path terminus — pure soft explosion
        if best_event == "goal":
            radial_dist = math.sqrt((cx_n - goal_x)**2 + (cy_n - goal_y)**2)
            # Organic noise on the burst radius per cell
            cell_hash = abs(hash((round(cx, 1), round(cy, 1)))) % 1000 / 1000.0
            noise = 0.7 + cell_hash * 0.6  # 0.7 - 1.3
            effective_radius = base_radius * params["radius_mult"] * noise
            best_dist = radial_dist  # ONLY radial — no path proximity
        
        # For shot: slight radial pull toward goal, but much less than before
        if best_event == "shot":
            radial_dist = math.sqrt((cx_n - goal_x)**2 + (cy_n - goal_y)**2)
            shot_radial = glow_radius * 1.2
            if radial_dist < shot_radial:
                blend = 1.0 - (radial_dist / shot_radial)
                best_dist = best_dist * (1 - blend * 0.2) + radial_dist * (blend * 0.2)

        effective_radius = base_radius * params["radius_mult"]
        dist_px = best_dist * max(width, height)

        if dist_px > effective_radius * 2.0:
            continue

        # Smooth falloff — adjusted by bloom slider
        t = max(0, 1.0 - (dist_px / effective_radius))
        adjusted_falloff = params["falloff_exp"] * bloom_falloff_adj / 1.0
        adjusted_falloff = max(0.3, min(2.5, adjusted_falloff))
        t = t ** adjusted_falloff

        # Cell glow scales with bloom — at low bloom, cells barely visible (laser dominates)
        cell_visibility = bloom_t ** 0.6  # 0 at bloom=0, ramps up. Cells invisible at low bloom
        intensity = t * params["brightness_mult"] * bloom_brightness_boost * cell_visibility
        intensity = min(1.0, intensity)

        if intensity < 0.03:
            continue

        # Cell colour — respect low-saturation primaries (white, grey, black)
        min_l = 16
        max_l = params["max_lightness"]
        cell_l = min_l + (max_l - min_l) * intensity

        if s_base < 10:
            # Near-achromatic (white/grey/black) — blend toward primary RGB, no forced saturation
            pr = _dpal["primary_rgb"]
            t_blend = min(1.0, intensity * 1.5)
            cell_rgb = tuple(int(min_l + (c - min_l) * t_blend) for c in pr)
        else:
            cell_s = 55 + 40 * intensity
            cell_rgb = hsl_to_rgb(hue, cell_s, cell_l)
        # Reduce cell glow when a line effect is active so the effect dominates
        _cell_alpha_max = 80 if line_effect != "default" else 220
        alpha = int(_cell_alpha_max * min(1.0, intensity * 1.2))

        poly = [(int(v[0]), int(v[1])) for v in vertices]
        if len(poly) >= 3:
            draw.polygon(poly, fill=(*cell_rgb, alpha))

    # ── Line effect overlay ──
    _primary_rgb = _dpal["primary_rgb"]
    _get_rgb = lambda s, l: _primary_rgb if s_base < 10 else hsl_to_rgb(hue, s, l)

    laser_raw_coords = [(x, y) for x, y, _ in path_events]
    laser_smooth = smooth_path(laser_raw_coords, points_per_seg=50)
    laser_px = [(int(x * width), int(y * height)) for x, y in laser_smooth]

    if line_effect == "laser":
        # Tight neon laser — thin core, sharp glow, no bloom fade
        for layer_w, layer_a, layer_s, layer_l, blur_r in [
            (40, 60, 90, 50, 16), (20, 120, 95, 60, 8), (10, 200, 95, 75, 3), (3, 255, 60, 95, 0)]:
            layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            ld = ImageDraw.Draw(layer, "RGBA")
            lc = _get_rgb(layer_s, layer_l)
            for i in range(len(laser_px) - 1):
                ld.line([laser_px[i], laser_px[i+1]], fill=(*lc, layer_a), width=layer_w)
            if blur_r > 0:
                layer = layer.filter(ImageFilter.GaussianBlur(radius=blur_r))
            image = Image.alpha_composite(image, layer)

    elif line_effect == "flame":
        # Fire effect — warm gradient, flickering width, ember particles
        _rng = random.Random(42)
        for _pass in range(3):
            flame = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            fd = ImageDraw.Draw(flame, "RGBA")
            for i in range(len(laser_px) - 1):
                progress = i / max(1, len(laser_px) - 1)
                # Flames get hotter (brighter) toward the goal
                heat = 30 + int(50 * progress)
                flicker = _rng.uniform(0.5, 1.8)
                w = max(2, int((8 + 20 * progress) * flicker))
                # Orange outer, yellow mid, white core
                if _pass == 0:
                    fc = _get_rgb(95, heat)
                    a = int(60 * flicker)
                elif _pass == 1:
                    fc = _get_rgb(80, min(85, heat + 30))
                    a = int(120 * flicker)
                else:
                    fc = _get_rgb(50, min(95, heat + 50))
                    a = int(180 * flicker)
                    w = max(1, w // 3)
                fd.line([laser_px[i], laser_px[i+1]], fill=(*fc, min(255, a)), width=w)
            blur = [8, 4, 1][_pass]
            flame = flame.filter(ImageFilter.GaussianBlur(radius=blur))
            image = Image.alpha_composite(image, flame)
        # Ember particles
        embers = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        ed = ImageDraw.Draw(embers, "RGBA")
        ember_c = _get_rgb(90, 70)
        for px_pt, py_pt in laser_px[::3]:
            for _ in range(_rng.randint(1, 4)):
                ox = _rng.randint(-40, 40)
                oy = _rng.randint(-60, 10)  # embers rise
                r = _rng.uniform(1, 4)
                ea = _rng.randint(80, 200)
                ed.ellipse([px_pt+ox-r, py_pt+oy-r, px_pt+ox+r, py_pt+oy+r], fill=(*ember_c, ea))
        embers = embers.filter(ImageFilter.GaussianBlur(radius=2))
        image = Image.alpha_composite(image, embers)

    elif line_effect == "lightning":
        # Electric lightning — jagged forks branching from the path
        _rng = random.Random(42)
        bolt = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        bd = ImageDraw.Draw(bolt, "RGBA")
        bolt_c = _get_rgb(80, 85)
        core_c = _get_rgb(40, 95)
        # Main bolt along path with jitter
        for _pass in range(2):
            jitter = 15 if _pass == 0 else 4
            w = 6 if _pass == 0 else 2
            a = 140 if _pass == 0 else 240
            for i in range(len(laser_px) - 1):
                p1 = (laser_px[i][0] + _rng.randint(-jitter, jitter),
                      laser_px[i][1] + _rng.randint(-jitter, jitter))
                p2 = (laser_px[i+1][0] + _rng.randint(-jitter, jitter),
                      laser_px[i+1][1] + _rng.randint(-jitter, jitter))
                c = bolt_c if _pass == 0 else core_c
                bd.line([p1, p2], fill=(*c, a), width=w)
        # Fork branches
        for i in range(0, len(laser_px), max(1, len(laser_px)//8)):
            if _rng.random() < 0.7:
                start = laser_px[i]
                angle = _rng.uniform(0, 2 * math.pi)
                length = _rng.randint(30, 120)
                segments = _rng.randint(3, 7)
                pts = [start]
                for s in range(segments):
                    angle += _rng.uniform(-0.8, 0.8)
                    step = length / segments
                    nx = pts[-1][0] + int(math.cos(angle) * step)
                    ny = pts[-1][1] + int(math.sin(angle) * step)
                    pts.append((nx, ny))
                for j in range(len(pts) - 1):
                    fa = max(40, 200 - j * 30)
                    fw = max(1, 3 - j // 2)
                    bd.line([pts[j], pts[j+1]], fill=(*bolt_c, fa), width=fw)
        bolt = bolt.filter(ImageFilter.GaussianBlur(radius=2))
        image = Image.alpha_composite(image, bolt)
        # Electric glow
        glow_l = bolt.filter(ImageFilter.GaussianBlur(radius=15))
        glow_l_arr = np.array(glow_l, dtype=np.float32)
        glow_l_arr[:, :, 3] = np.clip(glow_l_arr[:, :, 3] * 0.5, 0, 255)
        image = Image.alpha_composite(image, Image.fromarray(glow_l_arr.astype(np.uint8)))

    elif line_effect == "ink":
        # Tattoo ink — confident thick strokes, slight bleed, no glow
        ink = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        id_ = ImageDraw.Draw(ink, "RGBA")
        ink_c = _primary_rgb
        # Thick confident line
        for i in range(len(laser_px) - 1):
            id_.line([laser_px[i], laser_px[i+1]], fill=(*ink_c, 230), width=8)
        # Slight ink bleed
        ink = ink.filter(ImageFilter.GaussianBlur(radius=1.5))
        image = Image.alpha_composite(image, ink)
        # Fine detail line on top
        detail = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        dd = ImageDraw.Draw(detail, "RGBA")
        for i in range(len(laser_px) - 1):
            dd.line([laser_px[i], laser_px[i+1]], fill=(*ink_c, 255), width=3)
        image = Image.alpha_composite(image, detail)

    elif line_effect == "spray":
        # Spray paint — scattered particles along the path, density gradient
        _rng = random.Random(42)
        spray = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        sd = ImageDraw.Draw(spray, "RGBA")
        spray_c = _primary_rgb
        for px_pt, py_pt in laser_px:
            density = _rng.randint(15, 35)
            for _ in range(density):
                spread = _rng.gauss(0, 25)  # gaussian spray pattern
                spread_y = _rng.gauss(0, 20)
                r = _rng.uniform(0.5, 3.5)
                sa = _rng.randint(60, 220)
                x = px_pt + spread
                y = py_pt + spread_y
                sd.ellipse([x-r, y-r, x+r, y+r], fill=(*spray_c, sa))
        # Overspray — wider, fainter
        for px_pt, py_pt in laser_px[::2]:
            for _ in range(_rng.randint(3, 8)):
                spread = _rng.gauss(0, 60)
                spread_y = _rng.gauss(0, 50)
                r = _rng.uniform(0.5, 2)
                sa = _rng.randint(20, 80)
                sd.ellipse([px_pt+spread-r, py_pt+spread_y-r, px_pt+spread+r, py_pt+spread_y+r],
                           fill=(*spray_c, sa))
        spray = spray.filter(ImageFilter.GaussianBlur(radius=0.8))
        image = Image.alpha_composite(image, spray)

    else:
        # Default — existing behaviour: ambient glow + mid + core
        laser_opacity = max(0, 1.0 - bloom_t * 1.2)
        if laser_opacity > 0.02:
            amb = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            ad = ImageDraw.Draw(amb, "RGBA")
            amb_color = _get_rgb(90, 60)
            for i in range(len(laser_px) - 1):
                progress = i / max(1, len(laser_px) - 1)
                w = max(4, int((20 + 40 * progress) * (1.0 - bloom_t * 0.5)))
                a = int(100 * laser_opacity * (0.4 + 0.6 * progress))
                ad.line([laser_px[i], laser_px[i+1]], fill=(*amb_color, a), width=w)
            amb = amb.filter(ImageFilter.GaussianBlur(radius=max(2, int(15 * (1 - bloom_t * 0.5)))))
            image = Image.alpha_composite(image, amb)
            mid = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            mid_d = ImageDraw.Draw(mid, "RGBA")
            mid_color = _get_rgb(95, 75)
            for i in range(len(laser_px) - 1):
                progress = i / max(1, len(laser_px) - 1)
                w = max(2, int((8 + 16 * progress) * (1.0 - bloom_t * 0.6)))
                a = int(200 * laser_opacity * (0.5 + 0.5 * progress))
                mid_d.line([laser_px[i], laser_px[i+1]], fill=(*mid_color, a), width=w)
            mid = mid.filter(ImageFilter.GaussianBlur(radius=max(1, int(5 * (1 - bloom_t * 0.5)))))
            image = Image.alpha_composite(image, mid)
            core = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            cd = ImageDraw.Draw(core, "RGBA")
            core_color = _get_rgb(60, 92)
            for i in range(len(laser_px) - 1):
                progress = i / max(1, len(laser_px) - 1)
                w = max(1, int((3 + 5 * progress) * (1.0 - bloom_t * 0.4)))
                a = int(255 * laser_opacity * (0.6 + 0.4 * progress))
                cd.line([laser_px[i], laser_px[i+1]], fill=(*core_color, a), width=w)
            core = core.filter(ImageFilter.GaussianBlur(radius=1))
            image = Image.alpha_composite(image, core)
    
    # Soft bloom — controlled by bloom slider
    if bloom_blur > 0:
        image = image.filter(ImageFilter.GaussianBlur(radius=bloom_blur))

    # Edge fade
    img_arr = np.array(image, dtype=np.float32)
    margin = int(0.10 * max(width, height))
    fade_h = np.ones(height, dtype=np.float32)
    fade_w = np.ones(width, dtype=np.float32)
    for i in range(margin):
        f = (i / margin) ** 2
        fade_h[i] = min(fade_h[i], f)
        fade_h[height - 1 - i] = min(fade_h[height - 1 - i], f)
        fade_w[i] = min(fade_w[i], f)
        fade_w[width - 1 - i] = min(fade_w[width - 1 - i], f)
    mask_2d = np.minimum(fade_h[:, None], fade_w[None, :])
    img_arr[:, :, 3] *= mask_2d
    image = Image.fromarray(np.clip(img_arr, 0, 255).astype(np.uint8))

    return image


# ──────────────────────────────────────────
# COMPOSITING
# ──────────────────────────────────────────

def tile_glow(glow_img, canvas_size, tile_scale):
    canvas_w, canvas_h = canvas_size
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    tw = max(64, int(glow_img.width * tile_scale))
    th = max(64, int(glow_img.height * tile_scale))
    tile = glow_img.resize((tw, th), Image.LANCZOS)
    cols = math.ceil(canvas_w / tw) + 1
    rows = math.ceil(canvas_h / th) + 1
    for row in range(rows):
        for col in range(cols):
            x = col * tw
            y = row * th
            if row % 2 == 1:
                x -= tw // 2
            canvas.paste(tile, (x, y), tile)
    return canvas


def random_scatter(glow_img, canvas_size, tile_scale, seed=42):
    """Scatter rotated data line glows evenly."""
    canvas_w, canvas_h = canvas_size
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    r = rng_mod.Random(seed)
    tw = max(48, int(glow_img.width * tile_scale))
    th = max(48, int(glow_img.height * tile_scale))
    glow_small = glow_img.resize((tw, th), Image.LANCZOS)

    spacing_x = int(tw * 1.2)
    spacing_y = int(th * 1.2)
    cols = math.ceil(canvas_w / spacing_x) + 1
    rows = math.ceil(canvas_h / spacing_y) + 1

    for row in range(rows):
        for col in range(cols):
            bx = col * spacing_x
            by = row * spacing_y
            if row % 2 == 1:
                bx += spacing_x // 2
            jx = r.randint(-spacing_x // 5, spacing_x // 5)
            jy = r.randint(-spacing_y // 5, spacing_y // 5)
            x, y = bx + jx, by + jy
            angle = r.uniform(-180, 180)
            sv = r.uniform(0.9, 1.1)
            vw = max(32, int(tw * sv))
            vh = max(32, int(th * sv))
            varied = glow_small.resize((vw, vh), Image.LANCZOS)
            rotated = varied.rotate(angle, expand=True, resample=Image.BICUBIC)
            px = x - (rotated.width - vw) // 2
            py = y - (rotated.height - vh) // 2
            if -rotated.width < px < canvas_w and -rotated.height < py < canvas_h:
                canvas.paste(rotated, (px, py), rotated)
    return canvas


def rotate_layer(img, angle_deg):
    """Rotate an RGBA image around centre, expanding to fit."""
    if angle_deg == 0:
        return img
    return img.rotate(-angle_deg, expand=False, resample=Image.BICUBIC,
                      fillcolor=(0, 0, 0, 0))


# ──────────────────────────────────────────
# LIGHTNESS INVERSION
# ──────────────────────────────────────────

def invert_lightness(img):
    arr = np.array(img.convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    delta = cmax - cmin
    L = (cmax + cmin) / 2.0
    L_inv = 1.0 - L
    S = np.zeros_like(L)
    mask = delta > 0
    low = L <= 0.5
    S[mask & low] = delta[mask & low] / (2 * L[mask & low] + 1e-10)
    S[mask & ~low] = delta[mask & ~low] / (2 - 2 * L[mask & ~low] + 1e-10)
    S = np.clip(S, 0, 1)
    H = np.zeros_like(L)
    r_m = (cmax == r) & mask
    g_m = (cmax == g) & mask & ~r_m
    b_m = (cmax == b) & mask & ~r_m & ~g_m
    H[r_m] = ((g[r_m] - b[r_m]) / (delta[r_m] + 1e-10)) % 6
    H[g_m] = ((b[g_m] - r[g_m]) / (delta[g_m] + 1e-10)) + 2
    H[b_m] = ((r[b_m] - g[b_m]) / (delta[b_m] + 1e-10)) + 4
    H = H / 6.0
    c = (1 - np.abs(2 * L_inv - 1)) * S
    x = c * (1 - np.abs((H * 6) % 2 - 1))
    m = L_inv - c / 2
    h6 = (H * 6).astype(int) % 6
    ro = np.zeros_like(H); go = np.zeros_like(H); bo = np.zeros_like(H)
    for sec, rv, gv, bv in [(0,c,x,0),(1,x,c,0),(2,0,c,x),(3,0,x,c),(4,x,0,c),(5,c,0,x)]:
        sm = h6 == sec
        ro[sm] = rv[sm] if hasattr(rv, '__getitem__') else rv
        go[sm] = gv[sm] if hasattr(gv, '__getitem__') else gv
        bo[sm] = bv[sm] if hasattr(bv, '__getitem__') else bv
    result = np.stack([np.clip(ro+m,0,1), np.clip(go+m,0,1), np.clip(bo+m,0,1)], axis=2)
    result = (result * 255).astype(np.uint8)
    alpha = np.array(img.convert("RGBA"))[:,:,3]
    return Image.fromarray(np.dstack([result, alpha]))


# ──────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────

def main():
    import json as json_mod
    
    args = sys.argv[1:]
    
    # JSON mode: single JSON arg
    if len(args) == 1 and args[0].startswith("{"):
        p = json_mod.loads(args[0])
    else:
        # Legacy positional args
        p = {
            "club": args[0] if len(args) > 0 else "arsenal",
            "kit": args[1] if len(args) > 1 else "home",
            "bgDetail": int(args[2]) if len(args) > 2 else 50,
            "dataDetail": int(args[3]) if len(args) > 3 else 50,
            "bloom": int(args[4]) if len(args) > 4 else 50,
            "repeatSize": int(args[5]) if len(args) > 5 else 0,
            "repeatMode": args[6] if len(args) > 6 else "tiled",
            "randomRotate": args[7] == "1" if len(args) > 7 else False,
            "rotation": int(args[8]) if len(args) > 8 else 0,
            "invertColors": args[9] == "1" if len(args) > 9 else False,
            "showMarkers": args[10] == "1" if len(args) > 10 else True,
            "width": int(args[11]) if len(args) > 11 else 1024,
            "height": int(args[12]) if len(args) > 12 else 1024,
            "outputPath": args[13] if len(args) > 13 else "output.png",
        }
    
    # Extract params with defaults
    club         = p.get("club", "arsenal")
    kit          = p.get("kit", "home")
    bg_detail    = int(p.get("bgDetail", 50))
    data_detail  = int(p.get("dataDetail", 50))
    bloom        = int(p.get("bloom", 50))
    intensity    = int(p.get("intensity", 50))  # NEW: glow brightness
    repeat_size  = int(p.get("repeatSize", 0))
    repeat_mode  = p.get("repeatMode", "tiled")
    random_rot   = p.get("randomRotate", False)
    rotation     = int(p.get("rotation", 0))
    invert       = p.get("invertColors", False)
    show_markers = p.get("showMarkers", True)
    seed         = int(p.get("seed", 42))  # NEW: randomizable
    edge_vis     = int(p.get("edgeVisibility", 30))  # NEW: cell edge prominence
    gradient     = p.get("gradient", "none")  # NEW: bg gradient style
    sec_accent   = int(p.get("secondaryAccent", 0))  # NEW: secondary colour
    data_scale   = int(p.get("dataScale", 50))  # NEW: path fill amount
    style        = p.get("style", "pebbles")  # pebbles | broken_glass | spider_web | honeycomb
    motif_scale  = int(p.get("motifScale", 50))  # direct size control for data motif
    marker_size  = int(p.get("markerSize", 80))  # data point prominence: 0=invisible, 100=huge
    line_effect  = p.get("lineEffect", "default")  # default|laser|flame|lightning|ink|spray
    aura_colour  = p.get("auraColour", None)  # separate glow/aura colour hex (or None = use data primary)
    universal_intensity = int(p.get("universalIntensity", 50))  # 0-100, universal intensity for all effects
    brightness_val = int(p.get("brightness", 50))  # 0-100, overall data line brightness
    link_transforms = p.get("linkTransforms", True)  # link bg + data transforms
    match_id     = p.get("matchId", "")  # NEW: real StatsBomb data
    moment_idx   = int(p.get("momentIndex", 0))
    multi_moment = p.get("multiMoment", False)  # NEW: hat trick overlay
    width        = int(p.get("width", 1024))
    height       = int(p.get("height", 1024))
    output_path  = p.get("outputPath", "output.png")
    
    if isinstance(random_rot, str):
        random_rot = random_rot == "1"
    if isinstance(invert, str):
        invert = invert == "1"
    if isinstance(show_markers, str):
        show_markers = show_markers == "1"
    if isinstance(multi_moment, str):
        multi_moment = multi_moment == "1"

    # ── Palette resolution ───────────────────────────────────────────────
    # bg_palette  → drives background pattern generation
    # data_palette → drives data line / glow overlay
    # Both can be set independently from the API.

    def _luminance(hex_c):
        r, g, b = hex_to_rgb(hex_c)
        return (0.299*r + 0.587*g + 0.114*b) / 255.0

    def _make_palette(primary_hex, secondary_hex, accent_hex, background_hex):
        pr = hex_to_rgb(primary_hex)
        return {
            "primary_hsl":    rgb_to_hsl(*pr),
            "primary_rgb":    pr,
            "secondary_rgb":  hex_to_rgb(secondary_hex),
            "accent_rgb":     hex_to_rgb(accent_hex),
            "background_rgb": hex_to_rgb(background_hex),
        }

    if p.get("primary"):
        bg_primary    = p["primary"]
        bg_secondary  = p.get("secondary",  "#FFFFFF")
        bg_accent     = p.get("accent",     "#000000")
        bg_background = p.get("background", "#1A0A0A")

        # Data palette — separate keys; default = luminance-opposite of bg primary
        default_data_primary = "#FAFAFA" if _luminance(bg_primary) < 0.5 else "#111111"
        data_primary   = p.get("dataPrimary")   or default_data_primary
        data_secondary = p.get("dataSecondary") or bg_primary   # data accent = bg primary (cross-reference)
        data_accent    = p.get("dataAccent")    or bg_secondary

        palette      = _make_palette(bg_primary,   bg_secondary,  bg_accent,    bg_background)
        data_palette = _make_palette(data_primary, data_secondary, data_accent, bg_background)

        print(
            f"[palette] bg={bg_primary}/{bg_secondary}  data={data_primary}/{data_secondary}  raw_dataPrimary={p.get('dataPrimary')}",
            file=sys.stderr, flush=True
        )
    else:
        palette      = load_club_palette(club, kit)
        data_palette = palette   # legacy: same palette for both

    # ── Aura colour override for glow ──
    if aura_colour:
        _aura_rgb = hex_to_rgb(aura_colour)
        aura_palette = {
            "primary_hsl": rgb_to_hsl(*_aura_rgb),
            "primary_rgb": _aura_rgb,
            "secondary_rgb": data_palette.get("secondary_rgb", _aura_rgb),
            "accent_rgb": data_palette.get("accent_rgb", _aura_rgb),
            "background_rgb": data_palette.get("background_rgb", (0, 0, 0)),
        }
        print(f"[aura] override glow colour → {aura_colour} rgb={_aura_rgb}", file=sys.stderr, flush=True)
    else:
        aura_palette = None

    # Density mappings
    t_bg = bg_detail / 100
    bg_density = int(600 + (t_bg ** 1.5) * 7400)
    bg_density = max(400, min(8000, bg_density))

    t_data = data_detail / 100
    data_density = int(400 + (t_data ** 1.5) * 2000)
    data_density = max(300, min(2500, data_density))

    # ── Load real or synthetic path data ──
    # IMPORTANT: generate path ONCE here, pass same data to glow + markers
    base_path = None
    multi_paths_data = None
    if match_id:
        # Try 360 format first if flagged
        if p.get("format360"):
            try:
                from art_engine.goal_extractor_360 import get_360_goal_paths, path_to_legacy_format as path_to_legacy_360, path_to_3d_format
                result = get_360_goal_paths(int(match_id), goal_index=moment_idx or 0)
                if result and result.get("path"):
                    full_path = path_to_legacy_360(result["path"])
                    path_3d = path_to_3d_format(result["path"])
                    buildup_pct = p.get("buildupDepth", 100) / 100.0
                    if buildup_pct < 1.0 and len(full_path) > 2:
                        keep = max(2, int(len(full_path) * buildup_pct))
                        full_path = full_path[-keep:]
                        path_3d = path_3d[-keep:]
                    base_path = full_path
                    # Store 3D path for height-aware rendering
                    p["_path_3d"] = path_3d
                    print(f"[360_extractor] Loaded 3D path: {len(base_path)} events, has_3d={result['has_3d']}, scorer={result['scorer']}", file=sys.stderr)
            except Exception as e:
                print(f"[360_extractor] Failed: {e}, falling back", file=sys.stderr)

        # Try regular StatsBomb open format
        if base_path is None:
            try:
                from art_engine.goal_extractor import get_goal_path, path_to_legacy_format
                result = get_goal_path(int(match_id), goal_index=moment_idx or 0)
                if result.get("path"):
                    full_path = path_to_legacy_format(result["path"])
                    buildup_pct = p.get("buildupDepth", 100) / 100.0
                    if buildup_pct < 1.0 and len(full_path) > 2:
                        keep = max(2, int(len(full_path) * buildup_pct))
                        full_path = full_path[-keep:]
                    base_path = full_path
                    print(f"[goal_extractor] Loaded real path: {len(base_path)} events (depth {int(buildup_pct*100)}%) for goal {moment_idx or 0}", file=sys.stderr)
            except Exception as e:
                print(f"[goal_extractor] Failed: {e}", file=sys.stderr)
        
        # Fallback to moment_loader (pre-processed files)
        if base_path is None:
            try:
                from art_engine.moment_loader import load_moment_path, load_multi_moment_paths
                if multi_moment:
                    multi_paths_data = load_multi_moment_paths(match_id)
                else:
                    path_data, meta = load_moment_path(match_id, moment_idx)
                    if path_data:
                        base_path = path_data
            except Exception:
                pass
    
    if base_path is None and multi_paths_data is None:
        base_path = generate_rich_goal_path()  # Synthetic fallback — called ONCE

    # ── Collect impact points for styles that use them ──
    impact_pts  = None
    _scaled_path = None   # set here so glow layer can detect if already scaled
    if base_path:
        impact_pts = [(x, y) for x, y, evt in base_path if evt in ("goal", "shot")]
    
    # ── LAYER 1: Continuous background ──
    # Try new style system first (art_engine/styles/*.py)
    _new_style_names = {"geometric","camo","futuristic","street","classic","jackson","marble","smoky","dali"}
    # Normalise kit-variant suffixes before style lookup
    _style_base = style.rsplit("-home", 1)[0].rsplit("-away", 1)[0]
    if _style_base in _new_style_names:
        style = _style_base  # use base name for renderer lookup
    if style in _new_style_names:
        try:
            from art_engine.styles import get_style
            # Strip kit-variant suffix (classic-home → classic, classic-away → classic)
            style = style.rsplit("-home", 1)[0].rsplit("-away", 1)[0]
            from art_engine.styles.base import Palette, DataLine
            style_renderer = get_style(style)
            style_renderer.WIDTH = width
            style_renderer.HEIGHT = height

            # Build typed Palette objects from palette dicts
            def _rgb_to_hex(rgb): return "#{:02x}{:02x}{:02x}".format(*rgb)

            _pal = Palette(
                primary=_rgb_to_hex(palette.get("primary_rgb",     (218, 41,  28))),
                secondary=_rgb_to_hex(palette.get("secondary_rgb", (255, 255, 255))),
                accent=_rgb_to_hex(palette.get("accent_rgb",       (201, 168,  76))),
                background=_rgb_to_hex(palette.get("background_rgb",(10,  10,  10))),
            )

            # Separate data palette — drives render_data_lines colours
            _data_pal = Palette(
                primary=_rgb_to_hex(data_palette.get("primary_rgb",     (255, 255, 255))),
                secondary=_rgb_to_hex(data_palette.get("secondary_rgb", (218,  41,  28))),
                accent=_rgb_to_hex(data_palette.get("accent_rgb",       (201, 168,  76))),
                background=_rgb_to_hex(palette.get("background_rgb",    (10,  10,  10))),
            )

            # Convert raw path tuples to DataLine objects
            _data_lines = []
            if base_path:
                for i, pt in enumerate(base_path):
                    x_norm = pt[0] / width if pt[0] > 1 else pt[0]
                    y_norm = pt[1] / height if pt[1] > 1 else pt[1]
                    evt = pt[2] if len(pt) > 2 else "pass"
                    _data_lines.append(DataLine(
                        sequence=i, label=str(evt), actor="", team="",
                        x=x_norm, y=y_norm, timestamp="", context={}
                    ))

            # ── Scale path ONCE — both style renderer AND glow use same coords ──
            # Simple centroid scaling. The focal point is read FROM the result.
            _scaled_path = scale_path(base_path, data_scale) if base_path else []

            # Convert scaled path to DataLine objects
            _data_lines = []
            for i, pt in enumerate(_scaled_path):
                x_norm = pt[0] / width if pt[0] > 1 else pt[0]
                y_norm = pt[1] / height if pt[1] > 1 else pt[1]
                evt    = pt[2] if len(pt) > 2 else "pass"
                _data_lines.append(DataLine(
                    sequence=i, label=str(evt), actor="", team="",
                    x=x_norm, y=y_norm, timestamp="", context={}
                ))

            # Remove pitch margin so pre-scaled (0-1) coords map 1:1 to canvas pixels
            style_renderer.PITCH_MARGIN = 0.0
            style_renderer.PITCH_X = 0.0
            style_renderer.PITCH_Y = 0.0
            style_renderer.PITCH_W = 1.0
            style_renderer.PITCH_H = 1.0

            # Art focal point = GOAL EVENT position in the scaled path.
            # Gradient, sunburst, and glow all converge at the same point.
            # One source of truth: the goal lands at (0.5, 0.5) after scale_path.
            _goal_norms = [(x, y) for x, y, e in _scaled_path if e == "goal"]
            if _goal_norms:
                style_renderer._focal_x, style_renderer._focal_y = _goal_norms[-1]
            else:
                _all_xs = [x for x, y, e in _scaled_path]
                _all_ys = [y for x, y, e in _scaled_path]
                style_renderer._focal_x = sum(_all_xs) / len(_all_xs)
                style_renderer._focal_y = sum(_all_ys) / len(_all_ys)

            bg = Image.new("RGBA", (width, height), (10, 10, 10, 255))
            draw_bg = ImageDraw.Draw(bg)
            _render_params = {'bg_density': bg_density, 'edge_vis': edge_vis, 'universal_intensity': universal_intensity, 'brightness': brightness_val}
            style_renderer.render_background(draw_bg, bg, _pal, render_params=_render_params)
            if _data_lines:
                draw_bg = ImageDraw.Draw(bg)  # refresh after background mods
                _lines_pal = _pal if style == "geometric" else _data_pal
                style_renderer.render_data_lines(draw_bg, bg, _data_lines, _lines_pal, render_params=_render_params)
            bg = style_renderer.post_process(bg, _pal)
        except Exception as _e:
            import traceback; traceback.print_exc()
            # Fallback to old pebbles
            bg = generate_background(width, height, bg_density, palette, seed=seed,
                                      edge_visibility=edge_vis, gradient_style=gradient,
                                      secondary_accent=sec_accent)
    elif style == "broken_glass":
        bg = generate_background_broken_glass(width, height, bg_density, palette, seed=seed,
                                               edge_visibility=edge_vis, gradient_style=gradient,
                                               secondary_accent=sec_accent, impact_points=impact_pts)
    elif style == "spider_web":
        bg = generate_background_spider_web(width, height, bg_density, palette, seed=seed,
                                             edge_visibility=edge_vis, gradient_style=gradient,
                                             secondary_accent=sec_accent, impact_points=impact_pts)
    elif style == "honeycomb":
        bg = generate_background_honeycomb(width, height, bg_density, palette, seed=seed,
                                            edge_visibility=edge_vis, gradient_style=gradient,
                                            secondary_accent=sec_accent, impact_points=impact_pts)
    else:  # pebbles (default)
        bg = generate_background(width, height, bg_density, palette, seed=seed,
                                  edge_visibility=edge_vis, gradient_style=gradient,
                                  secondary_accent=sec_accent)

    # ── LAYER 2: Data line glow ──
    if multi_paths_data:
        # Multi-moment: overlay multiple paths
        glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        _glow_pal = aura_palette or data_palette
        for i, (mp, _) in enumerate(multi_paths_data):
            layer = generate_dataline_glow(width, height, data_density, palette,
                                            bloom=bloom, path_override=mp, data_scale=data_scale,
                                            data_palette=_glow_pal, lineEffect=line_effect)
            _combined = (intensity / 50.0) * (universal_intensity / 50.0)
            if _combined != 1.0:
                l_arr = np.array(layer, dtype=np.float32)
                l_arr[:, :, 3] = np.clip(l_arr[:, :, 3] * _combined, 0, 255)
                layer = Image.fromarray(l_arr.astype(np.uint8))
            glow = Image.alpha_composite(glow, layer)
    else:
        # Use pre-scaled path if available (style renderer already scaled it).
        # Pass data_scale=0 so scale_path inside generate_dataline_glow is a no-op
        # (returns path unchanged), preventing double-scaling.
        _glow_path  = _scaled_path if _scaled_path else base_path
        _glow_scale = 0 if _glow_path is not base_path else data_scale
        _glow_pal = aura_palette or data_palette
        glow = generate_dataline_glow(width, height, data_density, palette,
                                       bloom=bloom, path_override=_glow_path, data_scale=_glow_scale,
                                       data_palette=_glow_pal, lineEffect=line_effect)
        _combined = (intensity / 50.0) * (universal_intensity / 50.0)
        if _combined != 1.0:
            g_arr = np.array(glow, dtype=np.float32)
            g_arr[:, :, 3] = np.clip(g_arr[:, :, 3] * _combined, 0, 255)
            glow = Image.fromarray(g_arr.astype(np.uint8))
        
        # 3D height overlay — when ball is in the air, add extra bright spots
        path_3d = p.get("_path_3d")
        if path_3d and any(pt[2] > 0.1 for pt in path_3d):
            height_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            hd = ImageDraw.Draw(height_layer, "RGBA")
            h_hue = palette["primary_hsl"][0]
            for pt in path_3d:
                nx, ny, nz = pt[0], pt[1], pt[2]
                if nz < 0.1:
                    continue  # ground level, skip
                px = int(nx * width)
                py = int(ny * height)
                # Height = bigger, brighter glow (aerial ball)
                r = int(20 + nz * 60)  # radius scales with height
                alpha = int(40 + nz * 100)  # brighter when higher
                bright = hsl_to_rgb(h_hue, 80, 80)
                hd.ellipse([px-r, py-r, px+r, py+r], fill=(*bright, alpha))
                # Inner bright core
                ri = int(r * 0.4)
                hd.ellipse([px-ri, py-ri, px+ri, py+ri], fill=(255, 255, 255, int(alpha * 0.8)))
            height_layer = height_layer.filter(ImageFilter.GaussianBlur(radius=12))
            glow = Image.alpha_composite(glow, height_layer)
            print(f"[3d_height] Added {sum(1 for pt in path_3d if pt[2] > 0.1)} aerial points", file=sys.stderr)

    # ── AI texture overlay (enhances line effects with generated textures) ──
    if line_effect in ('flame', 'lightning', 'ink', 'laser', 'spray'):
        try:
            from art_engine.texture_compositor import composite_effect, is_available
            if is_available(line_effect):
                _tex_path = _scaled_path or base_path or (multi_paths_data[0][0] if multi_paths_data else None)
                if _tex_path:
                    _tex_color = (aura_palette or data_palette)['primary_rgb']
                    _tex_layer = composite_effect(
                        effect_name=line_effect,
                        intensity=universal_intensity / 100.0,
                        data_line_path=_tex_path,
                        palette={'aura_color': _tex_color},
                        canvas_size=(width, height),
                    )
                    glow = Image.alpha_composite(glow, _tex_layer)
                    print(f"[texture] Applied {line_effect} AI texture overlay", file=sys.stderr)
        except Exception as _tex_err:
            print(f"[texture] Skipped: {_tex_err}", file=sys.stderr)

    # Draw markers ON the glow layer BEFORE rotation (so they move with it)
    if show_markers:
        # Use data_palette secondary for marker colour (2nd data colour pick);
        # fall back to data_palette primary, then bg palette
        _marker_pal = data_palette if data_palette else palette
        _marker_sec = _marker_pal.get("secondary_rgb", _marker_pal.get("primary_rgb", (218, 41, 28)))
        _marker_hsl = rgb_to_hsl(*_marker_sec)
        marker_hue = _marker_hsl[0]
        marker_sat = _marker_hsl[1]
        marker_is_achromatic = marker_sat < 10
        print(f"[markers] secondary_rgb={_marker_sec} hsl={_marker_hsl} achromatic={marker_is_achromatic}", file=sys.stderr, flush=True)
        marker_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        md = ImageDraw.Draw(marker_layer, "RGBA")
        # Use EXACT same path as glow — scaled + smoothed identically
        marker_scaled = scale_path(base_path or multi_paths_data[0][0], data_scale)
        raw_coords_m = [(x, y) for x, y, _ in marker_scaled]
        smoothed_m = smooth_path(raw_coords_m, points_per_seg=40)
        
        path_events = []
        for ox, oy, evt in marker_scaled:
            best_dist = float("inf")
            best_pt = (ox, oy)
            for sx, sy in smoothed_m:
                d = (sx - ox)**2 + (sy - oy)**2
                if d < best_dist:
                    best_dist = d
                    best_pt = (sx, sy)
            path_events.append((best_pt[0], best_pt[1], evt))
        
        # Scale marker sizes relative to canvas AND marker_size slider
        ms = max(width, height) / 1024.0
        mk = marker_size / 33.0  # 0 at slider 0, 1.5 at 50, 3.0 at 100 (more dramatic range)
        ms *= mk
        
        for i, (x, y, evt) in enumerate(path_events):
            px, py = int(x * width), int(y * height)
            
            def _marker_rgb(s, l):
                if marker_is_achromatic:
                    # Blend toward the marker secondary RGB at given lightness
                    t_l = l / 100.0
                    return tuple(int(c * t_l) for c in _marker_sec)
                return hsl_to_rgb(marker_hue, s, l)

            if evt in ("pass", "carry", "carry_end", "dribble"):
                bright = _marker_rgb(80, 60)
                core = _marker_rgb(90, 50)
                scale = 0.7 if evt in ("carry", "carry_end") else 1.0
                r_core, r_mid, r_outer = int(5 * ms * scale), int(12 * ms * scale), int(24 * ms * scale)
            elif evt == "shot":
                bright = _marker_rgb(90, 55)
                core = _marker_rgb(95, 45)
                r_core, r_mid, r_outer = int(7 * ms), int(16 * ms), int(32 * ms)
            elif evt == "goal":
                bright = _marker_rgb(95, 60)
                core = _marker_rgb(100, 50)
                r_core, r_mid, r_outer = int(12 * ms), int(26 * ms), int(48 * ms)
            else:
                bright = _marker_rgb(80, 60)
                core = _marker_rgb(90, 50)
                r_core, r_mid, r_outer = int(5 * ms), int(12 * ms), int(24 * ms)
            
            # Layered soft glow — markers are the HERO element
            ia = min(1.5, mk * 0.5)  # intensity alpha multiplier (higher cap for prominence at max slider)
            md.ellipse([px-r_outer, py-r_outer, px+r_outer, py+r_outer],
                       fill=(*bright, int(50 * ia)))
            r_mo = int(r_outer * 0.7)
            md.ellipse([px-r_mo, py-r_mo, px+r_mo, py+r_mo],
                       fill=(*bright, int(90 * ia)))
            md.ellipse([px-r_mid, py-r_mid, px+r_mid, py+r_mid],
                       fill=(*bright, int(160 * ia)))
            r_inner = int(r_mid * 0.6)
            md.ellipse([px-r_inner, py-r_inner, px+r_inner, py+r_inner],
                       fill=(*core, int(220 * ia)))
            md.ellipse([px-r_core, py-r_core, px+r_core, py+r_core],
                       fill=(*core, int(255 * ia)))
        
        # Heavy blur for smooth glow falloff (scaled to canvas)
        marker_layer = marker_layer.filter(ImageFilter.GaussianBlur(radius=max(4, int(6 * ms))))
        glow = Image.alpha_composite(glow, marker_layer)

    # ── Brightness adjustment on glow (data lines) ──
    if brightness_val != 50:
        _b_scale = brightness_val / 50.0   # 0→0.0  50→1.0  100→2.0
        _g_arr = np.array(glow, dtype=np.float32)
        _g_arr[:, :, :3] = np.clip(_g_arr[:, :, :3] * _b_scale, 0, 255)
        glow = Image.fromarray(_g_arr.astype(np.uint8))

    # Apply rotation — linked mode rotates both bg + glow together
    if link_transforms and rotation != 0:
        bg = rotate_layer(bg, rotation)
        glow = rotate_layer(glow, rotation)
    elif rotation != 0:
        glow = rotate_layer(glow, rotation)

    if repeat_size == 0 and not random_rot:
        # Single data line overlay
        img = Image.alpha_composite(bg, glow)

    elif repeat_size == 0 and random_rot:
        # Single but randomly rotated
        angle = rng_mod.Random(42).uniform(-180, 180)
        glow = rotate_layer(glow, angle)
        img = Image.alpha_composite(bg, glow)

    else:
        # Repeat mode — tile_scale from repeatSize slider
        rs = repeat_size / 100
        tile_scale = max(0.25, 0.85 - rs * 0.60)  # 85% at repeat 0, 25% at repeat 100
        
        # motifScale overrides tile_scale directly if set (0-100 maps to 10%-150%)
        if motif_scale != 50:
            ms = motif_scale / 100.0
            tile_scale = 0.10 + ms * 1.40  # 10% at 0, 80% at 50, 150% at 100

        if random_rot:
            glow_layer = random_scatter(glow, (width, height), tile_scale, seed=42)
        else:
            glow_layer = tile_glow(glow, (width, height), tile_scale)

        img = Image.alpha_composite(bg, glow_layer)

    if invert:
        img = invert_lightness(img)

    img.save(output_path, "PNG")
    print("OK")


if __name__ == "__main__":
    main()
