"""
EmotivX — Garment UV Fixer
===========================
Blender Python script. Run via: Blender → Scripting tab → Open → Run Script

What it does:
- Loads each GLB garment model
- Replaces all UV maps with a world-space planar projection (X/Y axes)
- This matches what our Three.js viewer does in code — making it seamless in Blender too
- Centres and normalises UVs so the artwork covers the full garment correctly
- Exports clean GLBs ready to upload to Supabase

Usage:
1. Open Blender
2. Go to the Scripting tab
3. Open this file
4. Adjust INPUT_DIR and OUTPUT_DIR below if needed
5. Hit Run Script
6. Upload the output GLBs to Supabase models bucket
"""

import bpy
import os
import math
from mathutils import Vector

# ── Config ────────────────────────────────────────────────────────────────
INPUT_DIR  = os.path.expanduser("~/Downloads/garments")   # put your GLBs here
OUTPUT_DIR = os.path.expanduser("~/Downloads/garments-fixed")  # fixed GLBs go here

MODELS = [
    "hoodie.glb",
    "tshirt.glb",
    "longsleeve.glb",
]
# ──────────────────────────────────────────────────────────────────────────


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def fix_uvs_world_space(obj):
    """
    Replace UV map with world-space planar projection (X/Y).
    This is identical to the world-space UV approach in our Three.js viewer
    so the pattern is seamless across all mesh parts.
    """
    mesh = obj.data

    # Ensure we have a UV map
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    uv_layer = mesh.uv_layers[0]

    # Get world-space bounding box of the entire object
    world_verts = [obj.matrix_world @ v.co for v in mesh.vertices]
    min_x = min(v.x for v in world_verts)
    max_x = max(v.x for v in world_verts)
    min_y = min(v.y for v in world_verts)
    max_y = max(v.y for v in world_verts)

    range_x = max_x - min_x or 1.0
    range_y = max_y - min_y or 1.0
    norm = max(range_x, range_y)  # keep aspect ratio square

    # Assign UV per loop based on world position of the vertex
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            loop = mesh.loops[loop_idx]
            vert = mesh.vertices[loop.vertex_index]
            world_pos = obj.matrix_world @ vert.co

            u = (world_pos.x - min_x) / norm
            v = (world_pos.y - min_y) / norm

            uv_layer.data[loop_idx].uv = (u, v)

    print(f"  ✓ UV remapped: {obj.name}")


def process_model(filename):
    input_path  = os.path.join(INPUT_DIR, filename)
    output_path = os.path.join(OUTPUT_DIR, filename)

    if not os.path.exists(input_path):
        print(f"  ⚠ Not found: {input_path}")
        return

    print(f"\nProcessing: {filename}")
    clear_scene()

    # Import GLB
    bpy.ops.import_scene.gltf(filepath=input_path)

    # Fix UVs on all mesh objects
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            fix_uvs_world_space(obj)

    # Export clean GLB
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_materials="EXPORT",
        export_apply=True,      # apply modifiers
    )

    size_mb = os.path.getsize(output_path) / 1_048_576
    print(f"  ✓ Exported: {output_path} ({size_mb:.1f} MB)")


# ── Main ──────────────────────────────────────────────────────────────────

print("\n" + "="*50)
print("EmotivX Garment UV Fixer")
print("="*50)

for model in MODELS:
    process_model(model)

print("\n✅ All done! Upload the fixed GLBs to Supabase:")
print(f"   {OUTPUT_DIR}")
print("\nUpload command (run in terminal after script):")
print("   bash ~/workspace/scripts/upload-models-supabase.sh")
