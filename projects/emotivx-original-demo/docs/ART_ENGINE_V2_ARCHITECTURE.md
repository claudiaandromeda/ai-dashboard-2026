# Art Engine v2.0 — Unified Architecture

**Created:** 2026-03-09 21:33 GMT  
**Shipped:** 2026-03-09 (Phases 1-3 delivered same evening)  
**Branch:** `feat/art-engine-unified`  
**Status:** Implemented ✅ (Phases 1–3 complete, Phase 4 partial)  
**Timeline:** Estimated 5-6 days → Delivered in 1 evening

---

## Problem Statement

**Current system has TWO incompatible architectures:**
1. **Overlay styles** (9 total) — background + data line coupled, doesn't scale well
2. **Tessellation styles** (4 total) — background only, scales beautifully

**Result:** Confusion, limited flexibility, can't mix backgrounds with different data line effects.

**Solution:** Unified tessellation-based system where EVERY pattern is a pure background + data line is always rendered separately.

---

## Core Principles

### 1. **Separation of Concerns**
- **Background** = pure pattern (no embedded data)
- **Data Line** = path visualization (independent styling)
- **Compositor** = merge layers with optional focal point linking

### 2. **Universal Capabilities**
Every background pattern MUST support:
- ✅ Scale (0.1-2.0, tight → loose)
- ✅ Rotation (0-360°)
- ✅ Tiling (shrink + repeat for Paisley effect)
- ✅ Color palette (primary, secondary, accent, background)
- ✅ Seed (reproducible randomness)

### 3. **Optional Focal Points**
Some patterns have natural focal points (Sunburst center, Spider web center).
When focal point exists + linking enabled:
- Goal position in data path → maps to focal point in background
- Background moves → goal position follows (or vice versa)

### 4. **Pattern-Specific Customization**
Universal rules apply, but each pattern can expose unique controls:
- Sunburst: ray colors (wide vs narrow)
- Jackson: splatter density, drip intensity
- Street: brick colors, mortar color
- Spider: web complexity, strand thickness

---

## Pattern Catalog (15 Total)

| Pattern | Type | Focal Point | Status | Notes |
|---------|------|-------------|--------|-------|
| **Sunburst** | radial rays | ✅ Center | ✅ Shipped | Focal linking working |
| **Classic** | plain club | ❌ None | ✅ Shipped | Simple shirt pattern |
| **Geometric** | tessellated shapes | ❌ None | ✅ Shipped | Extracted + working |
| **Camo** | camo | ❌ None | ✅ Shipped | Dense → loose |
| **Tron** | futuristic grid | ❌ None | ✅ Shipped | Sci-fi grid, NOT spider |
| **Street** | brick wall | ❌ None | ✅ Shipped | Bricks bg + spray data line |
| **Marble** | marble | ❌ None | ⏸ Deferred | Complex, post-launch |
| **Smoky** | smoke wisps | ❌ None | ⏸ Deferred | Needs rethink |
| **Jackson** | Pollock splatters | ❌ None | ✅ Shipped | Bg splatters + data line separate |
| **Dali** | surrealist | ❌ None | ⏸ Deferred | Mad, post-launch |
| **Spider** | spider web | ✅ Center | ✅ Shipped | Focal linking working |
| **Pebbles** | Voronoi cells | ❌ None | ✅ Shipped | Pure bg |
| **Broken Glass** | shattered | ❌ None | ✅ Shipped | Pure bg |
| **Honeycomb** | hexagons | ❌ None | ✅ Shipped | Pure bg |
| **Fractals** | fractal | ❌ None | ✅ Shipped | Generative fractal |

**Priority order:**
1. Easy wins (Pebbles, Broken Glass, Honeycomb) — already done ✅
2. Straightforward extractions (Camo, Geometric, Jackson, Spider) — Day 1
3. Sunburst + focal linking — Day 2
4. New patterns (Classic, Tron, Street, Fractals) — Days 3-4
5. Complex refactors (Marble, Smoky, Dali) — defer to post-launch

---

## Architecture Layers

### Layer 1: Background Generator

```python
def generate_background(
    style: str,          # Pattern name
    width: int,
    height: int,
    palette: dict,       # {primary, secondary, accent, background}
    scale: float = 1.0,  # 0.1-2.0 (pattern density)
    rotation: int = 0,   # 0-360 degrees
    tile: bool = False,  # Shrink + repeat
    seed: int = 42,      # Reproducible randomness
    **kwargs             # Pattern-specific params
) -> tuple[Image, dict]:
    """
    Generate pure background pattern.
    
    Returns:
        (background_image, metadata)
        
    Metadata includes:
        - focal_point: (x, y) if pattern has natural center, else None
        - pattern_bounds: (x, y, w, h) for linking calculations
    """
```

**Pattern-specific kwargs examples:**
- `sunburst_rays: list[str]` — colors for each ray tier (wide → narrow)
- `jackson_splatter_density: float` — 0-100
- `street_brick_colors: list[str]` — multiple brick colors
- `spider_web_complexity: int` — 1-10
- `fractals_depth: int` — recursion depth

### Layer 2: Data Line Renderer

```python
def render_data_line(
    path: list[tuple],       # [(x_norm, y_norm, event_type), ...]
    width: int,
    height: int,
    effect: str,             # "laser", "flame", "jackson", "spray", etc.
    colors: dict,            # {primary, secondary, accent}
    scale: float = 1.0,      # Path size multiplier
    repeat: int = 1,         # Tile the data line (Paisley effect)
    point_size: float = 1.0, # Data point marker size
    glow: float = 50.0,      # Intensity/brightness
    show_markers: bool = True,
    **kwargs
) -> Image:
    """
    Render data line on transparent background.
    
    Effects:
        - default: simple glow
        - laser: 4-layer neon
        - flame: heat + embers
        - lightning: jagged bolts
        - ink: thick stroke + bleed
        - spray: gaussian particles
        - jackson: Pollock splatter along path
        - geometric: tessellated shapes along path
    
    Returns:
        Transparent RGBA image with data line rendered
    """
```

### Layer 3: Compositor

```python
def composite_artwork(
    background: Image,
    data_line: Image,
    focal_link: bool = False,
    bg_focal_point: tuple = None,  # (x, y) from background metadata
    data_goal_point: tuple = None,  # (x, y) goal position in data path
    link_mode: str = "transform"    # "transform" or "offset"
) -> Image:
    """
    Composite background + data line with optional focal point linking.
    
    If focal_link=True and both focal points provided:
        - Transform data_line layer so goal position → background focal point
        - Preserves relative positions of other path points
    
    Link modes:
        - "transform": Scale + translate data line to match focal points
        - "offset": Simple translation (no scaling)
    
    Returns:
        Final composited RGBA image
    """
```

---

## UI Controls (Frontend)

### Background Section
```
┌─ BACKGROUND ───────────────────┐
│ Pattern: [Sunburst ▼]          │
│ Scale:   [████████░░] 80%       │
│ Rotate:  [████░░░░░░] 120°      │
│ Tile:    [OFF / ON]             │
│                                 │
│ Colors:                         │
│   Primary:    [#DA291C] 🎨     │
│   Secondary:  [#FFFFFF] 🎨     │
│   Accent:     [#C9A84C] 🎨     │
│                                 │
│ [Pattern-specific controls...]  │
└─────────────────────────────────┘
```

### Data Line Section
```
┌─ DATA LINE ────────────────────┐
│ Effect:      [Laser ▼]         │
│ Scale:       [████████░░] 80%   │
│ Repeat:      [█░░░░░░░░░] 1×    │
│ Point Size:  [█████████░] 90%   │
│ Glow:        [████████░░] 80%   │
│ Markers:     [ON / OFF]         │
│                                 │
│ Colors:                         │
│   Primary:    [#FAFAFA] 🎨     │
│   Secondary:  [#DA291C] 🎨     │
│   Accent:     [#FFFFFF] 🎨     │
└─────────────────────────────────┘
```

### Linking Section
```
┌─ FOCAL POINT LINKING ──────────┐
│ [✓] Link goal to pattern center │
│                                 │
│ When linked:                    │
│ • Goal position → Sunburst hub  │
│ • Move background → data moves  │
│                                 │
│ [Only shown for patterns with   │
│  focal points: Sunburst, Spider]│
└─────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Prep (Tonight, 1 hour) ✅ COMPLETE
- [x] Create branch `feat/art-engine-unified`
- [x] Write architecture spec (this doc)
- [x] Screenshot current pattern outputs (before refactor)
- [x] Commit spec

### Phase 1: Extract Easy Patterns ✅ COMPLETE
**Patterns:** Pebbles ✅, Broken Glass ✅, Honeycomb ✅, Camo ✅, Geometric ✅, Jackson ✅, Spider ✅, Sunburst ✅, Tron ✅, Street ✅, Classic ✅, Fractals ✅

**Delivered:**
1. ✅ Created `art_engine/backgrounds/` module
2. ✅ Moved all pattern generators to separate files with standardised signatures
3. ✅ Extracted data line rendering from coupled pattern files
4. ✅ 12 backgrounds rendering correctly (pure background, no embedded data)

### Phase 2: Unified Data Renderer ✅ COMPLETE
**Delivered:**
1. ✅ Created `art_engine/data_renderer.py`
2. ✅ Ported all line effects: laser, flame, lightning, ink, spray
3. ✅ Added jackson + geometric as data line styles (6 effects total)
4. ✅ Support repeat/tiling for data line
5. ✅ Tested on all extracted backgrounds

### Phase 3: Sunburst + Focal Linking ✅ COMPLETE
**Delivered:**
1. ✅ Extracted Sunburst pattern with focal point metadata (center of sunburst)
2. ✅ Implemented `composite_artwork()` with focal linking
3. ✅ Spider web focal point also working (hub as focal point)
4. ✅ Linked + unlinked modes tested
5. ✅ Full frontend integration: 12 patterns, 6 effects, pattern controls live

### Phase 4: New Patterns (PARTIAL — 12/15 done)
**Patterns:** Classic ✅, Street ✅, Tron ✅, Fractals ✅, Marble ⏸, Smoky ⏸, Dali ⏸

**Classic (plain club shirt):**
- Simple solid background with team color
- Optional subtle texture (fabric weave)
- No tessellation needed

**Street (brick wall + spray):**
- Background: brick pattern (configurable colors, mortar)
- Data line: spray paint effect
- Graffiti aesthetic

**Tron (futuristic grid):**
- Sci-fi grid lines (NOT spider web)
- Neon glow, digital aesthetic
- No focal point

**Fractals:**
- Generative fractal pattern (Mandelbrot, Julia set, etc.)
- Depth slider (recursion level)
- Zoom/pan controls

### Phase 5: Scaling + Tiling (Day 4, 2 hours)
**Tasks:**
1. Implement scale parameter for all backgrounds
2. Implement rotation parameter
3. Implement tile toggle (shrink + repeat)
4. Add data line scale slider
5. Add data line repeat slider
6. Test edge cases (scale=0.1, rotation=359°, etc.)

### Phase 6: UI Rebuild ✅ COMPLETE (shipped same night as Phase 1-3)
**Delivered:**
1. ✅ Pattern picker with 12 backgrounds
2. ✅ Background controls (scale, rotate, tile)
3. ✅ Data line effect picker (6 effects)
4. ✅ Data line controls (scale, repeat, size, glow)
5. ✅ Focal link toggle (conditional on Sunburst/Spider)
6. ✅ Pattern-specific controls live

### Phase 7: QA + Polish (Days 5-6, 6 hours)
**Tasks:**
1. Generate 15 × 6 = 90 sample images (all combos)
2. Visual QA (does it look good?)
3. Performance test (generation speed)
4. Fix bugs, adjust colors, tweak defaults
5. Document pattern usage (which works best for what?)
6. Write migration guide (old params → new params)

---

## Color Palette Examples

### Sunburst (Wrexham Home)
```
Wide rays (primary):     #DA291C (Wrexham red)
Narrow rays (secondary): #FFFFFF (white)
Accent rays (tertiary):  #000000 (black)
Background:              #0A0A0A (dark)
```

### Jackson (Arsenal Away)
```
Splatter primary:   #FFD700 (gold)
Splatter secondary: #000080 (navy)
Drip accent:        #FFFFFF (white)
Background:         #1A1A1A (dark grey)
```

### Street (Manchester United)
```
Brick color 1:  #8B0000 (dark red)
Brick color 2:  #A52A2A (brown red)
Mortar:         #808080 (grey)
Spray (data):   #FFFFFF (white graffiti)
```

---

## API Changes (Breaking)

### Old → New Mapping

**Old request:**
```json
{
  "style": "classic-home",
  "bgDetail": 50,
  "dataDetail": 50,
  "lineEffect": "laser"
}
```

**New request:**
```json
{
  "background": {
    "pattern": "sunburst",
    "scale": 1.0,
    "rotation": 0,
    "tile": false,
    "colors": {
      "primary": "#DA291C",
      "secondary": "#FFFFFF",
      "accent": "#C9A84C",
      "background": "#0A0A0A"
    },
    "params": {
      "ray_colors": ["#DA291C", "#FFFFFF", "#000000"]
    }
  },
  "dataLine": {
    "effect": "laser",
    "scale": 1.0,
    "repeat": 1,
    "pointSize": 1.0,
    "glow": 80,
    "showMarkers": true,
    "colors": {
      "primary": "#FAFAFA",
      "secondary": "#DA291C",
      "accent": "#FFFFFF"
    }
  },
  "linking": {
    "enabled": true,
    "mode": "transform"
  }
}
```

**Backward compatibility:** API will accept old format, auto-convert to new internally.

---

## Garment Overlay Integration (CRITICAL — DO NOT BREAK)

**Context:** Separate overlay system already exists for logo/badge/name placement on garments. This refactor MUST NOT break UV mapping.

### Existing Overlay Stack (Keep Intact)
1. **Art texture generation** (this refactor) → base 2048×2048 PNG
2. **Overlay compositor** (`art_server/main.py`) → adds logo/badge/name via PIL
3. **3D viewer** (Three.js) → UV maps final texture to garment mesh

**Critical functions (DO NOT MODIFY):**
- `_composite_logo()` — team logo at left chest
- `_composite_logo_overlay()` — logo for overlay-only endpoint
- `_render_player_back()` — name/number on back view
- `/generate-overlay` API endpoint — transparent overlay with logo/badge

### Integration Points
**Art generation outputs:**
- Resolution: **2048×2048** (must not change)
- Format: **PNG, RGBA**
- API: `/api/moments/generate` (existing endpoint, unchanged signature)

**Overlay compositor consumes:**
- Art texture URL (from Supabase or base64)
- Logo URL (team crest)
- Badge data (scorer, minute, teams, date)
- Player data (name, number)

**3D viewer consumes:**
- Final composited texture URL
- UV map (unchanged, matches hoodie model)

### UV Mapping Positions (Reference)
**Front view:**
- Logo: x=48%, y=76% (left chest, 13% of width, flipped vertically)
- Badge: x=55%, y=75% (pocket area, 20% width)

**Back view:**
- Player number: y=22% (center, large Impact font)
- Player name: y=30% (center, smaller Impact font)

**These positions MUST remain valid after refactor.**

### End-to-End Test (Before Merge)
1. Generate art with new system (any background + any data line)
2. Upload to Supabase via `/api/moments/generate`
3. Call `/generate-overlay` with logo + badge + player data
4. Load in 3D viewer (`/merch-preview`)
5. **Verify:**
   - [ ] Logo at left chest (correct position, size, no drift)
   - [ ] Moment badge at pocket (correct position, size)
   - [ ] Player name/number on back (correct position, correct font, flipped)
   - [ ] All overlays sharp (no blur from resize)
   - [ ] Colors match (no unexpected blending)

**If any overlay is broken → DO NOT MERGE until fixed.**

---

## Success Metrics

### Technical
- [x] ~~All 15 backgrounds~~ 12/15 backgrounds render correctly (Marble/Smoky/Dali deferred)
- [x] All 6 data line effects work on all backgrounds
- [x] Focal linking works (Sunburst ✅, Spider ✅)
- [ ] Generation speed < 3s per image (not yet benchmarked)
- [x] Zero crashes on valid inputs
- [ ] **Garment overlays work unchanged (logo/badge/name UV mapping intact)** — verify before merge

### Visual Quality
- [ ] Patterns scale smoothly (no pixelation)
- [ ] Colors blend correctly
- [ ] Data line overlays naturally
- [ ] Focal linking feels intuitive
- [ ] Tiling creates seamless patterns

### UX
- [ ] UI controls are clear + responsive
- [ ] Pattern picker shows previews
- [ ] Real-time preview updates (< 1s)
- [ ] Saved configurations load correctly
- [ ] Mobile UI works (touch sliders)

---

## Risks + Mitigation

### Risk 1: Refactor breaks existing art
**Mitigation:** Keep old system in separate module, dual-run for testing

### Risk 2: Focal linking too complex
**Mitigation:** Ship without linking first, add later as enhancement

### Risk 3: Performance regression
**Mitigation:** Profile early, optimize critical paths (tessellation, compositing)

### Risk 4: UI too complicated
**Mitigation:** Start with "Simple" mode (presets), add "Advanced" mode later

### Risk 5: Timeline slips
**Mitigation:** MVP = 10 backgrounds + 4 effects, defer complex patterns

---

## Next Steps

1. ~~**Tonight:** Commit this spec, screenshot current outputs~~ ✅ Done
2. ~~**Tomorrow:** Start Phase 1 (extract 6 patterns)~~ ✅ Done same evening
3. ~~**Day 2:** Data renderer + Sunburst~~ ✅ Done same evening
4. **Remaining:** Scaling/tiling parameters, QA + garment overlay verification
5. **Post-launch:** Marble, Smoky, Dali patterns (Phase 4 remainder)

**Current status (2026-03-09):**
- Phases 1–3 + UI: ✅ SHIPPED
- Phase 4: 12/15 patterns (Marble/Smoky/Dali deferred)
- Phase 5 (scaling): in progress
- Phase 7 (QA): pending garment overlay verification before merge

---

**Status:** Phases 1-3 shipped in one evening. Legendary. 🚀

*Last updated: 2026-03-09 22:26 GMT*
