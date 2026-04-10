# Style Audit — What Tonight's Fixes Can Apply To

*Generated: 2026-03-08 00:45 GMT — for David's morning review*
*No changes made — analysis only*

---

## Tonight's Improvements (recap)

1. **Background follows palette primary** — user picks a colour, bg changes
2. **Data line colour** — separate picker, achromatic fix (white ≠ red)
3. **Data point colour** — separate picker, bold markers
4. **Line effects** — laser, flame, lightning, ink, spray
5. **Cell glow dims when effect active** — effects punch through

---

## Style-by-Style Audit

### ✅ Classic (classic-home / classic-away)
- **BG colour**: ✅ Already uses `palette.primary` — tonight's fix works
- **Data line colour**: ✅ Uses `_data_pal` — works
- **Line effects**: ✅ Applied to glow layer — works
- **Tiling issue**: ⚠️ Background pattern (gradient + sunburst) follows the data focal point, so when repeated it creates obvious seams. **This is the complexity David flagged.**
- **Notes**: Best style currently. All features working.

### ✅ Jackson (drip painting)
- **BG colour**: ✅ Fixed tonight — was hardcoded `(10,10,10)`, now `palette.primary`
- **Data line colour**: ✅ Uses `_data_pal` for drip lines
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ✅ Organic chaos tiles better than geometric patterns — less obvious seams
- **Notes**: Looks incredible with colour changes. Drip secondary/accent could benefit from the data point colour picker too.

### ✅ Futuristic (spiderweb)
- **BG colour**: ✅ Fixed tonight — was hardcoded `(0,0,0)`, now `palette.primary`
- **Data line colour**: ✅ Web silk uses palette colours
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ⚠️ Radial web pattern has a single centre — tiles would show obvious repeating circles
- **Notes**: Looks great on dark backgrounds. Light backgrounds might need web colour inversion.

### ⚠️ Smoky
- **BG colour**: ❌ HARDCODED `(4, 4, 8)` — needs same fix as Jackson/Futuristic
- **Data line colour**: Smoke plumes use palette, but base is always near-black
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ✅ Organic smoke tiles well
- **Fix needed**: `draw.rectangle([0, 0, self.WIDTH, self.HEIGHT], fill=(4, 4, 8))` → use `palette.rgb("primary")`

### ⚠️ Street (graffiti/brick wall)
- **BG colour**: ⚠️ Uses `palette.darker("background", 0.45)` for bricks — partially works but dominated by brick texture
- **Data line colour**: ✅ Spray stroke uses palette
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ⚠️ Brick pattern has randomised layout but could show seams at boundaries
- **Fix needed**: Brick mortar colour should derive from primary. Currently fixed browns.

### ⚠️ Dali (surrealist)
- **BG colour**: ⚠️ Uses palette for sky top (`palette.darker("primary", 0.5)`) but horizon/ground are hardcoded warm tones `(235,200,145)` and `(210,180,120)`
- **Data line colour**: ✅ Uses palette
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ❌ Horizon line creates an obvious hard seam when tiled
- **Fix needed**: Ground/sky colours should derive from palette. Horizon line needs seamless wrapping or removal when tiling.

### ⚠️ Marble
- **BG colour**: ⚠️ Uses `palette.rgb("primary")` but heavily desaturated (`_desaturate(primary, 0.55)`) and blended toward cream — primary colour barely visible
- **Data line colour**: ✅ Veins use palette
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ✅ Perlin noise marble tiles reasonably well
- **Fix needed**: Reduce desaturation so primary colour actually shows through the stone

### ⚠️ Camo
- **BG colour**: ⚠️ Uses `_build_camo_colours(palette)` which derives from palette, but the algorithm darkens everything — user's colour choice is subtle
- **Data line colour**: ✅ Uses palette
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ✅ Organic blobs tile well
- **Fix needed**: First/largest camo colour should be closer to actual palette primary, not a darkened derivative

### ✅ Geometric (stained glass)
- **BG colour**: ✅ Uses `palette.rgb("background")` — but note: uses "background" not "primary", so it won't respond to the primary colour picker. **This is by design** — geometric cells ARE the visual, background is just gaps.
- **Data line colour**: ⚠️ Geometric explicitly uses `_pal` (bg palette) not `_data_pal` — this was a deliberate decision. Cell colours come from bg palette.
- **Line effects**: ✅ Works (glow layer)
- **Tiling**: ⚠️ Voronoi cells are position-dependent — same tiling issue as classic

---

## The Tiling Issue — Discussion Points

### What's happening
When `repeat > 1` in the texture controls, the art texture is tiled across the garment UV space. Styles with **directional features** (gradients, focal points, horizons) create visible seams where tiles meet.

### Affected styles
| Style | Tiling Problem | Severity |
|-------|---------------|----------|
| Classic | Radial gradient + sunburst centred on goal → obvious repeating circles | 🔴 High |
| Geometric | Voronoi cells cut at edges don't match across tiles | 🟡 Medium |
| Futuristic | Radial web from centre → repeating circles | 🔴 High |
| Dali | Horizon line creates hard band | 🔴 High |
| Street | Brick pattern slightly misaligns | 🟢 Low |
| Jackson | Organic chaos, barely noticeable | 🟢 Low |
| Smoky | Organic, barely noticeable | 🟢 Low |
| Marble | Perlin noise, barely noticeable | 🟢 Low |
| Camo | Organic blobs, barely noticeable | 🟢 Low |

### Possible solutions (to discuss, not implement)

1. **Seamless tiling mode**: Generate art that wraps — left edge matches right, top matches bottom. Complex but proper. Would need each style to handle edge-wrapping.

2. **Background/data separation**: Background pattern generated independently (no focal point), data line glow overlaid on top. Background tiles cleanly, data glow is a one-shot overlay that doesn't repeat. **This is conceptually what David suggested.**

3. **Single large texture**: Generate at final print resolution (6000×6000) and don't tile at all. Simplest but most expensive to generate.

4. **Mirror tiling**: Instead of repeating, mirror at boundaries (ABBA pattern). Removes seams but creates kaleidoscope symmetry.

5. **Offset tiling**: Shift every other row by 50% (brick-lay pattern). Reduces seam visibility but doesn't eliminate it.

### The Classic-Home paradox
Classic-home currently has the background gradient/sunburst following the goal focal point. This means the background IS the data — they're intertwined. If we separate bg from data for tiling, classic loses its signature look (the gradient radiating from where the goal was scored). This is the core tension David identified.

**Recommendation**: Discuss before changing. The solution probably needs to be per-style — organic styles (Jackson, marble, smoky, camo) can tile freely, directional styles (classic, futuristic, dali) might need single-texture mode at print time.

---

## Priority Fixes for Morning

### Quick wins (< 5 min each)
1. **Smoky**: Change `(4, 4, 8)` → `palette.rgb("primary")` (same fix as Jackson/Futuristic)
2. **Marble**: Reduce desaturation from 0.55 → 0.25 so primary shows through

### Medium effort
3. **Street**: Derive brick colours from palette instead of hardcoded browns
4. **Dali**: Derive ground/sky from palette
5. **Camo**: Boost primary representation in camo colour derivation

### Bigger discussion
6. **Tiling strategy**: Per-style decision on how to handle repeat > 1
7. **Background/data separation**: Architecture change, needs design review

---

*No code was changed. This is a readiness assessment for the morning session.*
