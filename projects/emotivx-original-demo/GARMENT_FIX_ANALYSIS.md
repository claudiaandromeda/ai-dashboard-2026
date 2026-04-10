# Garment Pattern Fix — Analysis (for discussion)

## What the demo version (b6d4fe9) does differently

### 3 key differences in GarmentViewer3D.tsx:

**1. Texture controls compensate for UV compression**
```
Demo:    repeat: 1.5, rotation: 78°, offsetX: 0.88
Current: repeat: 1.0, rotation: 0,   offsetX: 0
```
The demo's `repeat: 1.5` TILES the texture 1.5x, which stretches it to cover the full garment width (since UV only uses ~61% of [0,1] range due to normScale). The `offsetX: 0.88` shifts the tile seam off the center of the garment. The `rotation: 78°` rotates the pattern so the data path flows diagonally (bottom-left to chest). These values were hand-tuned for the Windass penalty goal data.

**2. needsUpdate = true in useFrame (every frame)**
```
Demo:    artworkTexture.needsUpdate = true;  // line 658
Current: removed (commit 2139013) because it crashes WebGL with data URL textures
```
This is critical: `needsUpdate = true` forces Three.js to re-upload the texture to the GPU every frame. Without it, changes to `wrapS`, `wrapT`, `repeat`, `offset`, `rotation` set AFTER the initial texture upload may not take effect. The demo had this, current doesn't.

**3. UV formula: normScale vs independent-axis (my recent change)**
```
Demo:    normScale = Math.max(worldSize.x, worldSize.y, worldSize.z)
Current: scaleX = worldSize.x, scaleY = worldSize.y (my commit e647661)
```
The demo used the single normScale which compressed the X axis to ~61%. But this didn't matter because repeat:1.5 compensated.

### Art engine difference:
```
Demo:    api_generate.py → art_engine/styles/ (old engine)
Current: compositor.py → art_engine/backgrounds/ (new engine)
```
Both produce full-canvas images. The old engine had richer compositions (sunrays, halftone, gold borders baked in), the new engine is simpler layers. But the generated images are NOT the problem — they're full coverage.

## Root cause

The white areas on the garment are caused by the UV mapping compressing the X axis to ~61% of [0,1]. Vertices at the garment edges map to UV ~0.19 or ~0.81 instead of 0.0 or 1.0. With `ClampToEdgeWrapping` the extreme edges get the texture's edge pixel color. With `RepeatWrapping` + `repeat:1.0`, vertices outside [0,1] wrap but the 61% band means the garment only sees part of the image.

The demo dodged this by setting `repeat: 1.5` which made the texture tile, effectively "zooming out" so the compressed range still showed the full image.

## Options for fixing

### Option A: Revert to demo version, add new features on top
- Restore b6d4fe9's GarmentViewer3D.tsx (including repeat:1.5, rotation:78°, offsetX:0.88, needsUpdate)
- Keep the new art engine (compositor.py + backgrounds/) 
- Pros: Known working, demo-proven
- Cons: repeat:1.5 creates visible tile seam (mitigated by rotation:78° hiding it), hand-tuned for one specific goal, `needsUpdate=true` in useFrame is expensive

### Option B: Fix UV mapping properly with independent-axis scaling
- Use scaleX/scaleY per axis (my commit e647661)
- Keep repeat:1.0, rotation:0, offsetX:0
- Re-add `needsUpdate = true` BUT only on the FIRST frame after texture load (not every frame)
- Pros: Clean all-over print, no tiling artifacts, works with any image
- Cons: Previous attempts were reverted multiple times due to white viewport crashes

### Option C: Hybrid — use demo defaults as a known-good starting point
- Restore demo's texture controls as defaults (repeat:1.5, rotation:78°, offsetX:0.88)
- Keep the normScale UV formula (unchanged from demo)
- Re-add `needsUpdate = true` with a guard (only when controls actually change)
- This gives us the demo experience back while we fix things properly

## My recommendation

**Option C for now** — gets you a working demo immediately. Then Option B as a proper fix once we've stabilised.

## Separate concern: data lines
David wants garment pattern ONLY (no data lines) for now. Options:
- Add `showDataLine: false` parameter to compositor — skip the data_line composite
- Or strip the data line from the art server endpoint
- Data line rendering can be a separate toggle added later
