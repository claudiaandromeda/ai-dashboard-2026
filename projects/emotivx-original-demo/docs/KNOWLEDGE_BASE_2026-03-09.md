# Art Engine v2.0 — Complete Knowledge Base

**Generated:** 2026-03-09 23:19 GMT  
**Context:** Post-rebuild knowledge extraction from tonight's legendary single-evening delivery  
**Source docs:** Architecture spec, Deep Dive Review, Opus Strategic Review, Style Audit, Merch Preview Audit, CHANGELOG, all source files  

---

## Quick Start

**If you're a new developer, read these files in this order:**

1. **This document** — you're here, keep reading
2. **`docs/ART_ENGINE_V2_ARCHITECTURE.md`** — the architectural vision and API contracts
3. **`art_engine/compositor.py`** (269 lines) — the pipeline hub. Read the module docstring, then `generate_artwork()` and `composite_artwork()`
4. **`art_engine/data_renderer.py`** (414 lines) — how data lines get drawn. Read `render_data_line()` and `EVENT_PARAMS`
5. **`art_engine/line_effects.py`** (1,071 lines) — the 6 visual effects (laser, flame, lightning, ink, dotted, default). Beautiful code. **Currently disconnected from the pipeline** (see Critical Issues)
6. **Any background file** (e.g. `art_engine/backgrounds/jackson.py`) — to understand the background generator contract
7. **`docs/DEEP_DIVE_REVIEW_2026-03-09.md`** — forensic analysis of what works, what's broken, and exact fixes

**The 80/20:** Understand the 3-layer pipeline (background → data line → compositor) and you understand the whole system. Everything else is detail.

---

## Decision Log

### Decision 1: Background + Data Line Separation
- **What:** Decouple background pattern generation from data line rendering. Each is an independent layer composited together.
- **Why:** The v1 system had 9 "overlay styles" where background and data were coupled — couldn't mix backgrounds with different effects. Tessellation styles (4 total) only did backgrounds. Two incompatible architectures = confusion.
- **Alternatives considered:** (a) Keep coupled system, add more presets — rejected because it doesn't scale (N backgrounds × M effects = N×M presets to maintain). (b) Full shader-based WebGL — rejected as overkill for MVP.
- **What we learned:** Separation creates a combinatorial explosion of options (12 × 6 = 72 combos) from far less code. The architecture spec was right.

### Decision 2: Grid-Based Glow Instead of Voronoi
- **What:** `data_renderer.py` uses a regular grid of cells for the glow effect instead of Voronoi tessellation.
- **Why:** Avoids scipy dependency in the new v2 pipeline. The comment claims "nearly identical at grid_step ≤ 12."
- **Alternatives considered:** (a) Keep Voronoi from v1 (`api_generate.py`) — rejected to avoid the scipy dependency in the new module. (b) NumPy distance fields — considered but not implemented.
- **What we learned:** This was a quality regression. The grid creates visible rectangular artifacts. Voronoi produced organic, cell-like boundaries that looked much better. **Recommended reversal:** Re-add Voronoi or reduce grid_step significantly.

### Decision 3: Defer Marble, Smoky, and Dali
- **What:** Ship 12 of 15 patterns. Defer 3 complex ones.
- **Why:** Marble needs Perlin noise with convincing veining. Smoky needs rethinking (v1 was hardcoded near-black). Dali is "mad" — surrealist horizon effects that don't tile. All would consume disproportionate time for launch.
- **Alternatives considered:** Ship basic versions — rejected because half-done artistic effects look worse than no effect.
- **What we learned:** Correct call. The 12 shipped patterns provide enough variety. Organic patterns (Jackson, Camo) are the crowd-pleasers anyway.

### Decision 4: PIL Instead of Cairo/Skia
- **What:** All rendering uses Pillow (PIL) exclusively.
- **Why:** Already a dependency, well-understood, sufficient for 2D raster work. Cairo/Skia would add complex native dependencies and build complexity.
- **Alternatives considered:** (a) Cairo via pycairo — better path rendering, anti-aliasing, but heavyweight dependency. (b) Skia via skia-python — even more complex build. (c) SVG rendering — considered for `svg_compositor.py` (file exists but not primary path).
- **What we learned:** PIL is "good enough" for everything except maybe the flame effect (which needs smoother curves). The line_effects.py code proves PIL can produce stunning results (laser effect is 7 layers!).

### Decision 5: Stringly-Typed Background Registry
- **What:** `compositor.py` maps style names to `"module:function"` strings resolved via importlib.
- **Why:** Lazy loading — backgrounds only import when requested. Avoids loading all 9 background modules on startup.
- **Alternatives considered:** Direct imports in registry dict — simpler but loads everything. Decorator-based auto-registration — cleaner but more abstraction.
- **What we learned:** Works but is fragile — no IDE support, no type checking, runtime errors on typos. Acceptable tech debt for now.

### Decision 6: Focal Point Linking (Offset-Only)
- **What:** When a background has a natural focal point (Sunburst center, Spider hub), the compositor can offset the data line so the goal aligns with that focal point.
- **Why:** Creates a dramatic visual effect — the "moment" radiates from the artistic center of the background.
- **Alternatives considered:** Full affine transform (scale + translate + rotate) — spec called for it, but offset-only was shipped as MVP. The full transform risks distorting the data path.
- **What we learned:** Offset-only is surprisingly effective. Scale+translate may not be needed.

### Decision 7: Backward-Compatible API
- **What:** The API accepts both old format (`{style, bgDetail, lineEffect}`) and new format (`{background: {pattern, scale, ...}, dataLine: {effect, ...}}`).
- **Why:** Frontend migration doesn't need to happen simultaneously with backend refactor.
- **Alternatives considered:** Breaking change + frontend update in same PR — rejected because too risky for a single-evening delivery.
- **What we learned:** Good call. Allowed incremental delivery.

---

## Design Patterns

### Pattern 1: Background Generator Contract
Every background follows the same signature:
```python
def generate_xxx_background(
    width: int, height: int, palette: dict,
    scale: float = 1.0, rotation: int = 0, tile: bool = False,
    seed: int = 42, **kwargs
) -> tuple[Image.Image, dict]:
```
Returns `(image, metadata)`. Metadata includes optional `focal_point: (x, y)`.

**Error handling:** Every background wraps in try/except and returns a solid-colour fallback on failure. The pipeline never crashes from a bad background.

### Pattern 2: Palette → Color Mapping Flow
1. Frontend sends hex colors as `{primary, secondary, accent, background}`
2. `art_server/main.py` passes palette dict to `generate_artwork()`
3. `compositor.py` forwards `bg_palette` to the background generator and `data_colors` to `render_data_line()`
4. Each background uses `_hex_to_rgb()` or `_parse_colour()` to convert hex → RGB tuples
5. Background generators derive additional colors algorithmically (e.g., Jackson creates drip colors by adjusting lightness of primary/secondary)

**Gotcha:** `sunburst.py` uses `_parse_colour()` which handles both hex strings AND RGB tuples. `jackson.py` uses `_hex_to_rgb()` which only handles hex strings. Pass an RGB tuple to Jackson and it crashes.

### Pattern 3: Metadata Flow Through Pipeline
```
Frontend → API request → art_server/main.py
  → _resolve_style() maps aliases (pebbles→geometric, etc.)
  → generate_artwork(background_style, path, ...) in compositor.py
    → background generator returns (image, metadata) with focal_point
    → render_data_line() returns transparent RGBA image
    → composite_artwork() merges layers, applies focal offset if focal_point exists
  → Final image returned as PNG/base64
```

### Pattern 4: Style Aliasing
`art_server/main.py` has `_STYLE_ALIASES` that maps names:
- `pebbles` → `geometric`
- `broken_glass` → `geometric`
- `honeycomb` → `spider`
- `futuristic` → `tron` (renamed)

This handles backward compatibility and missing patterns gracefully.

### Pattern 5: Error Handling Strategy
- Background generators: try/except → solid colour fallback
- Data renderer: < 2 path points → return blank transparent image (silent)
- Compositor: graceful None handling for focal points
- Line effects (`line_effects.py`): **NO try/except** — errors crash the pipeline ⚠️
- API server: wraps everything in error response formatting

---

## How-To Guides

### Adding a New Background Pattern

1. **Create file:** `art_engine/backgrounds/your_pattern.py`
2. **Implement the standard signature:**
   ```python
   def generate_your_pattern_background(
       width: int, height: int, palette: dict,
       scale: float = 1.0, rotation: int = 0, tile: bool = False,
       seed: int = 42, **kwargs
   ) -> tuple[Image.Image, dict]:
       try:
           # Parse colors from palette
           primary = _hex_to_rgb(palette.get("primary", "#FFFFFF"))
           # ... generate your pattern on a new RGBA image ...
           img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
           # ... draw your pattern ...
           metadata = {"focal_point": None}  # or (x, y) if your pattern has a center
           return img, metadata
       except Exception:
           fallback = Image.new("RGBA", (width, height), primary + (255,))
           return fallback, {"focal_point": None}
   ```
3. **Register in compositor.py:** Add to `_BACKGROUND_REGISTRY`:
   ```python
   "your_pattern": "art_engine.backgrounds.your_pattern:generate_your_pattern_background",
   ```
4. **Add to `__init__.py`:** Import and add to `__all__` (currently incomplete — see Issues)
5. **Update `/styles` endpoint** in `art_server/main.py` (~line 490)
6. **Test:** Generate with `generate_artwork(background_style="your_pattern", ...)`

**Time estimate:** 30-60 min for a basic pattern, 2-4 hours for something as complex as Jackson.

### Adding a New Line Effect

1. **Edit `art_engine/line_effects.py`**
2. **Add your effect function:**
   ```python
   def effect_your_effect(
       points: List[Point], color: Color, 
       size: Tuple[int, int], intensity: float = 1.0
   ) -> Image.Image:
       w, h = size
       img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
       # ... draw your effect on the transparent image ...
       return img
   ```
3. **Register in the `get_line_effect()` registry dict** and add to `EFFECTS` list
4. **⚠️ CRITICAL:** As of tonight, `line_effects.py` is NOT wired into the pipeline. The effect routing fix (see Critical Issues) must be applied first, or your new effect will be unreachable.

### How Focal Linking Works (Step-by-Step)

1. Background generator returns `metadata = {"focal_point": (x, y)}` (only Sunburst and Spider do this)
2. `generate_artwork()` checks if `focal_link=True` (default: True when focal_point exists)
3. Data path is analyzed to find the goal event position
4. `composite_artwork()` receives both focal points
5. The data line layer is translated so the goal position aligns with the background's focal point
6. Currently **offset-only** — no scaling or rotation transform applied

### Debugging Visual Issues

1. **Generate layers separately:**
   ```python
   from art_engine.compositor import generate_artwork
   # Or use the lower-level functions:
   from art_engine.backgrounds.sunburst import generate_sunburst_background
   from art_engine.data_renderer import render_data_line
   
   bg, meta = generate_sunburst_background(1024, 1024, palette)
   bg.save("/tmp/debug_bg.png")
   
   data = render_data_line(path, 1024, 1024, colors)
   data.save("/tmp/debug_data.png")
   ```
2. **Check the data line on its own** — is it too faint? Too thin? Glow visible?
3. **Compare effects** — if all 6 effects look identical, the routing is still broken
4. **Check goal bloom** — if there's a massive white orb, `radius_mult` is still 2.5 (should be 1.6)
5. **Check palette** — pass a distinct color (like bright green) to verify it's reaching the generator

### Testing a Change Locally

```bash
cd /Users/claudia/.openclaw/workspace/projects/emotivx_app

# Quick Python test:
python3 -c "
from art_engine.compositor import generate_artwork
path = [(0.2, 0.5, 'pass'), (0.4, 0.4, 'pass'), (0.6, 0.3, 'shot'), (0.8, 0.4, 'goal')]
palette = {'primary': '#DA291C', 'secondary': '#FFFFFF', 'accent': '#C9A84C', 'background': '#0A0A0A'}
colors = {'primary': '#FAFAFA', 'secondary': '#DA291C', 'accent': '#FFFFFF'}
img = generate_artwork(background_style='sunburst', path=path, width=1024, height=1024,
                       bg_palette=palette, data_colors=colors)
img.save('/tmp/test_output.png')
print('Saved to /tmp/test_output.png')
"

# Full QA matrix (after fixes):
python3 -c "
from art_engine.compositor import generate_artwork
path = [(0.2, 0.5, 'pass'), (0.4, 0.4, 'pass'), (0.6, 0.3, 'shot'), (0.8, 0.4, 'goal')]
palette = {'primary': '#DA291C', 'secondary': '#FFFFFF', 'accent': '#C9A84C', 'background': '#0A0A0A'}
colors = {'primary': '#FAFAFA', 'secondary': '#DA291C', 'accent': '#FFFFFF'}
import os; os.makedirs('/tmp/qa', exist_ok=True)
for bg in ['sunburst','classic','camo','geometric','jackson','spider','street','tron','fractals']:
    for fx in ['default','laser','flame']:
        img = generate_artwork(background_style=bg, path=path, data_effect=fx,
              width=1024, height=1024, bg_palette=palette, data_colors=colors)
        img.save(f'/tmp/qa/{bg}_{fx}.png')
        print(f'{bg}_{fx} ✓')
"
```

---

## Gotchas & Non-Obvious Behavior

### 1. All 6 Line Effects Are Identical
`data_renderer.py` accepts the `effect` parameter but **silently ignores it**. Every effect produces the same default grid-based glow. The beautiful laser/flame/ink effects in `line_effects.py` (1,071 lines of production-ready code) are **never called**. This is the #1 surprise for anyone using the system.

### 2. Three "Shipped" Patterns Don't Exist
The architecture doc and CHANGELOG mark Pebbles, Broken Glass, and Honeycomb as "✅ Shipped". They're not. No `.py` files exist for them. The API handles this via aliases (pebbles→geometric, honeycomb→spider, broken_glass→geometric) so it doesn't crash, but you get a different pattern than advertised.

### 3. `__init__.py` Is Missing 3 Imports
`backgrounds/__init__.py` only exports 6 of the 9 working backgrounds. Missing: `classic`, `geometric`, `jackson`. The compositor uses direct importlib resolution so this doesn't break anything, but `from art_engine.backgrounds import generate_classic_background` would fail.

### 4. Two Complete Art Generation Systems Coexist
- **v1:** `api_generate.py` (1,761 lines) — monolith with Voronoi backgrounds, inline effects, StatsBomb, multi-moment support
- **v2:** `compositor.py` + `backgrounds/` + `data_renderer.py` — the new clean architecture

Nobody documented which one the production API actually calls. Both exist. v1 has features v2 doesn't (and vice versa).

### 5. Naming Mismatch: `spray` vs `dotted`
The API and frontend reference `spray` as a line effect. `line_effects.py` implements `dotted`. When effect routing gets fixed, requesting `spray` will throw a `KeyError` unless you add an alias.

### 6. `_hex_to_rgb()` Is Implemented 6 Times
Independently in `data_renderer.py`, `spider.py`, `jackson.py`, `tron.py`, `street.py`, `sunburst.py`, and `line_effects.py`. No shared color utility module.

### 7. HSL/HLS Parameter Order Confusion
Python's `colorsys` uses HLS (hue, lightness, saturation), not HSL (hue, saturation, lightness). Some implementations may swap S and L. Watch for this in color conversion code.

### 8. Goal Bloom Is 2.5× Normal
`EVENT_PARAMS["goal"]["radius_mult"] = 2.5` creates an overwhelming white orb at the goal position. This swallows the final path segment and looks broken. Should be ~1.6×.

### 9. Jackson + White Data Line = Invisible
Jackson background has dense white splatters. A white data line (the default for many palettes) is completely invisible against it. No automatic contrast detection exists.

### 10. Garment Overlays Are Untested Post-Refactor
The architecture doc has a big red warning: "DO NOT MERGE until garment overlays verified." UV mapping positions (logo at x=48% y=76%, badge at x=55% y=75%) must remain valid. This verification hasn't happened yet.

### 11. Scale Parameter Only Reaches Data Renderer
`generate_artwork(scale=...)` passes scale to `render_data_line()` but NOT to the background generator. Background scale only works if passed explicitly in kwargs.

---

## Lessons Learned

### What Worked Amazingly Well
- **The architectural vision was correct.** Separation of concerns into bg/data/compositor is clean, testable, extensible.
- **Speed of delivery.** Estimated 5-6 days → delivered Phases 1-3 + UI in one evening. That's 25× normal team pace.
- **Background quality.** Jackson (multi-layered paint splatters), Fractals (Mandelbrot in team colors), and Geometric (Voronoi mosaic) all look stunning.
- **`line_effects.py` code quality.** The 6 effects are beautifully implemented — especially laser (7-layer sci-fi beam) and ink (pressure simulation + pooling). Production-ready.
- **Graceful error handling in backgrounds.** Every generator falls back to solid color. The pipeline never crashes.
- **Style aliasing for backward compat.** Old style names still work via `_STYLE_ALIASES`.

### What Was Harder Than Expected
- **Wiring the effects into the pipeline.** Writing `line_effects.py` was the easy part. Connecting it to `data_renderer.py` should have been trivial but fell through the cracks.
- **Data line visual quality.** The grid-based glow approximation looked acceptable in isolation but mediocre next to the stunning backgrounds. The backgrounds raised the quality bar for everything else.
- **Accurate documentation.** Three patterns were marked "✅ Shipped" that don't exist as files. The `/styles` endpoint returns a stale list. The CHANGELOG says 12 shipped but only 9 have implementations.

### What We'd Do Differently Next Time
- **Wire effects immediately.** Don't write a beautiful `line_effects.py` and defer the 10-line integration. The feature isn't shipped until it's reachable.
- **Generate test images as you go.** A 27-image QA matrix (9 patterns × 3 effects) would have caught the "all effects identical" bug in minutes.
- **Shared utility module first.** `_hex_to_rgb()` duplicated 6 times is embarrassing. Should have created `art_engine/core/colors.py` on day one.
- **Verify the production code path.** Which API endpoint does the frontend actually call? If it's still routing through `api_generate.py` (v1), none of the v2 improvements are visible.

### What Surprised Us
- **The flame effect needs rework.** Tendrils render as rigid spikes, not organic fire. PIL's drawing primitives may not be ideal for this — Perlin noise displacement might help.
- **Spider web looks like stained glass, not a web.** Thread alpha too low (30-80), cell fill too opaque. Visual hierarchy is inverted — cells dominate, threads are invisible.
- **The `data_renderer.py` module explicitly says "Reserved for future line effects."** There's a comment in the code that the effect parameter is intentionally not wired. This wasn't a bug — it was a conscious choice to defer, but it wasn't communicated.
- **Focal linking works better than expected.** Even as offset-only (no scale), the effect of the goal aligning with the sunburst center is dramatic and intuitive.

---

## Tomorrow's Master Checklist

### 🔴 CRITICAL (30-45 min total — do first)

- [ ] **Fix 1: Wire line effects into pipeline** (15 min)
  - File: `art_engine/data_renderer.py`, after the early-return guard (~line 230)
  - Add 10-line routing block: when `effect != "default"`, call `line_effects.get_line_effect()`
  - Include `spray→dotted` alias
  - This single fix unlocks laser, flame, lightning, ink, dotted for ALL backgrounds

- [ ] **Fix 2: Increase data line glow intensity** (5 min)
  - File: `art_engine/data_renderer.py`, ~line 258
  - Change `cell_visibility = bloom_t ** 0.6` → `cell_visibility = 0.5 + bloom_t ** 0.5 * 0.5`
  - Change `line_width = max(1, int(2 * scale))` → `line_width = max(3, int(5 * scale))`
  - Change `line_alpha = int(200 * line_brightness)` → `line_alpha = min(255, int(240 * line_brightness))`

- [ ] **Fix 3: Reduce goal bloom size** (2 min)
  - File: `art_engine/data_renderer.py`, `EVENT_PARAMS` dict (~line 22)
  - Change goal `radius_mult: 2.5` → `1.6`, `brightness_mult: 1.6` → `1.4`, `falloff_exp: 0.7` → `0.9`

- [ ] **Fix 4: Visual QA** (15 min)
  - Generate 9 patterns × 3 effects = 27 test images
  - Verify: effects look different, glow is visible, goal bloom is proportional

### 🟡 IMPORTANT (45 min — if time allows)

- [ ] **Fix 5: Write 3 missing background patterns** (45 min total, 15 min each)
  - `art_engine/backgrounds/pebbles.py` — filled circles/Voronoi cells
  - `art_engine/backgrounds/broken_glass.py` — triangulated angular shards
  - `art_engine/backgrounds/honeycomb.py` — hex grid
  - Register each in `compositor.py` `_BACKGROUND_REGISTRY`
  - Remove `_STYLE_ALIASES` entries for these three

- [ ] **Fix 6: Update `__init__.py` exports** (2 min)
  - Add `classic`, `geometric`, `jackson` to `backgrounds/__init__.py`

- [ ] **Fix 7: Update `/styles` endpoint** (5 min)
  - File: `art_server/main.py`, ~line 490
  - Replace stale style list with current 9 (or 12) patterns

- [ ] **Fix 8: Fix spray→dotted naming** (5 min)
  - Either rename `effect_dotted` → `effect_spray` in `line_effects.py`
  - Or add `"spray": effect_dotted` to the registry dict

### 🟢 NICE-TO-HAVE (defer to next session)

- [ ] Spider web visual fix — increase thread alpha, decrease cell fill
- [ ] Classic pattern — add subtle fabric texture (currently flat solid)
- [ ] Create shared `art_engine/core/colors.py` — consolidate 6 copies of `_hex_to_rgb()`
- [ ] Reduce `grid_step` in data_renderer for better default glow quality
- [ ] Forward scale param to background generators in `generate_artwork()`
- [ ] Garment overlay verification (logo/badge UV mapping intact post-refactor)
- [ ] Jackson contrast fix — auto-switch data line color when bg has white splatters
- [ ] Performance benchmark — verify < 3s generation target

---

## Knowledge Gaps

1. **Which code path does production use?** Is the frontend calling v1 (`api_generate.py`) or v2 (`compositor.py`)? This determines whether ANY of tonight's work is visible to users.
2. **StatsBomb data integration status.** v1 had it, v2 doesn't. Where do real match events come from?
3. **Performance at scale.** The grid-based renderer is O(n²) — 100+ events could be catastrophically slow. Untested.
4. **Garment overlay integrity.** UV positions haven't been verified post-refactor.
5. **Mobile UI behavior.** Touch sliders, responsive layout — untested.
6. **Printful integration status.** Draft order system exists but Printful brand references need scrubbing.
7. **What does v1 do that v2 doesn't?** Known gaps: AI texture overlays, multi-moment (hat trick) rendering, StatsBomb loading, brightness/intensity controls, linked transform rotation, lightness inversion.

---

## Future Opportunities

### Near-Term (Week 2-4)
1. **Preset system** — 10-15 curated bg+effect+palette combos ("Midnight Laser", "Urban Spray"). One-click in UI.
2. **Background caching** — hash (style, palette, seed, scale, rotation) → cache. Halves render time for data-line-only changes.
3. **Voronoi data renderer** — port `make_voronoi_grid()` from v1 to v2. Visual quality leap.
4. **Visual regression tests** — reference images for all patterns, CI pixel diff.
5. **v1→v2 migration** — feature-flag API to route through v2. Port missing features incrementally.

### Medium-Term (Month 2-3)
6. **WebGL preview** — GPU shaders for real-time interactive preview. PIL for final high-res only.
7. **Animation** — animate data line drawing frame-by-frame. "Goal replay" video from artwork.
8. **NumPy vectorization** — replace Python grid loops with matrix distance fields. 100× speedup.
9. **Flame effect rework** — Perlin noise displacement, orange→yellow→white gradient.

### Long-Term (Month 4-6)
10. **User-uploaded backgrounds** — photo → palette extraction → tiled pattern.
11. **Multi-goal compositions** — hat trick = 3 interleaved data lines, each in different accent color.
12. **3D real-time preview** — v2 compositor output as live UV texture on Three.js garment.
13. **Tier system** — 5-tier merch with real-world perks (tunnel pass, VIP box, season ticket). Full spec in `docs/tier-system-spec.md`.

---

## Terminology Dictionary

| Term | Definition |
|------|-----------|
| **Background generator** | A Python function that produces a pure pattern image (no data embedded). Lives in `art_engine/backgrounds/`. |
| **Data line** | The glowing path visualization of a goal build-up (passes → shot → goal). Rendered on a transparent layer. |
| **Compositor** | The module that merges background + data line layers, with optional focal linking. |
| **Focal point** | A natural visual center in a background (e.g., Sunburst hub, Spider web center). Used for focal linking. |
| **Focal linking** | Offsetting the data line so the goal event aligns with the background's focal point. |
| **Line effect** | A visual style for the data line (laser, flame, lightning, ink, dotted/spray, default). |
| **Palette** | A dict of `{primary, secondary, accent, background}` hex color strings. Derived from team kit colors. |
| **Grid-based glow** | The v2 data renderer's approach: divides canvas into a grid, computes distance to nearest path point, draws colored rectangles with alpha falloff. Replaced v1's Voronoi approach. |
| **Voronoi tessellation** | v1's approach: scipy generates irregular polygonal cells. Each cell is colored by proximity to the data path. Looks more organic than grid. |
| **Event escalation** | Data points have types (pass, shot, goal) with increasing radius/brightness. Goal is the visual climax. |
| **Moment** | A specific goal event — the unit of content in EmotivX. Each moment generates unique artwork. |
| **UV mapping** | How 2D artwork textures map to 3D garment mesh in the Three.js viewer. Position-sensitive — logo at x=48% y=76%. |
| **Style alias** | Mapping from old/alternate names to actual implementations (e.g., `futuristic→tron`, `pebbles→geometric`). |
| **Tiling** | Shrink + repeat the artwork pattern. Works well for organic styles (Jackson, Camo). Problematic for radial styles (Sunburst, Spider). |
| **StatsBomb** | Open football data provider. Source of real match event coordinates. v1 integrated, v2 not yet. |
| **Printful** | Print-on-demand supplier. Referenced as "all over print partner" in user-facing copy. |

---

## File Map

### Core Art Engine (`art_engine/`)
| File | Lines | Purpose |
|------|-------|---------|
| `compositor.py` | 269 | **Pipeline hub.** `generate_artwork()` orchestrates bg→data→composite. `composite_artwork()` merges layers. Background registry lives here. |
| `data_renderer.py` | 414 | **Data line rendering.** Grid-based glow, event markers, path smoothing. `effect` param currently ignored. |
| `line_effects.py` | 1,071 | **6 visual effects.** Laser (7-layer), flame, lightning, ink, dotted, default. Beautiful code. **NOT CONNECTED to pipeline.** |
| `api_generate.py` | 1,761 | **v1 monolith.** Voronoi backgrounds, inline effects, StatsBomb, multi-moment. Still exists alongside v2. |
| `types.py` | ~50 | Type definitions (if any). |
| `style_factory.py` | ~100 | v1 style preset loading. |
| `cli.py` | ~80 | CLI entry point for direct art generation. |
| `segment_stylizer.py` | ~100 | v1 segment styling. |
| `texture_compositor.py` | ~200 | AI texture overlay system (v1 only). |
| `svg_compositor.py` | ~150 | SVG-based composition (alternative path). |
| `moment_generator.py` | ~100 | Moment orchestration. |
| `moment_loader.py` | ~150 | Match data loading (StatsBomb → synthetic fallback). |

### Background Generators (`art_engine/backgrounds/`)
| File | Lines | Pattern | Quality | Has Focal Point |
|------|-------|---------|---------|----------------|
| `sunburst.py` | 430 | Radial rays (vintage Japanese poster) | ⭐⭐⭐⭐ | ✅ Center |
| `jackson.py` | 568 | Pollock paint splatters | ⭐⭐⭐⭐½ | ❌ |
| `fractals.py` | 441 | Mandelbrot set | ⭐⭐⭐⭐⭐ | ❌ |
| `geometric.py` | 381 | Voronoi mosaic (stained glass) | ⭐⭐⭐⭐ | ❌ |
| `street.py` | 485 | Brick wall | ⭐⭐⭐ | ❌ |
| `camo.py` | 381 | Military camo blobs | ⭐⭐⭐½ | ❌ |
| `spider.py` | 307 | Spider web / radial cells | ⭐⭐⭐ (needs fix) | ✅ Center |
| `tron.py` | 284 | Sci-fi neon grid | ⭐⭐⭐⭐ | ❌ |
| `classic.py` | 239 | Flat team color | ⭐⭐ (needs texture) | ❌ |
| `__init__.py` | 15 | Exports (incomplete — missing 3) | — | — |

### Missing Backgrounds (advertised but not implemented)
| Pattern | Aliased To | Should Be |
|---------|-----------|-----------|
| `pebbles` | `geometric` | Rounded Voronoi cells |
| `broken_glass` | `geometric` | Angular shattered shards |
| `honeycomb` | `spider` | Hex grid |

### API Server (`art_server/`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI server. `/api/moments/generate`, `/generate-overlay`, `/styles`. Handles style resolution, palette routing, overlay composition. |

### Documentation (`docs/`)
| File | Purpose |
|------|---------|
| `ART_ENGINE_V2_ARCHITECTURE.md` | The architectural vision. API contracts, phase plan, UI controls, garment overlay constraints. |
| `DEEP_DIVE_REVIEW_2026-03-09.md` | Forensic analysis. Component-by-component audit, visual quality assessment, exact code fixes. |
| `OPUS_STRATEGIC_REVIEW_2026-03-09.md` | Strategic analysis. Systemic issues, code quality report, medium-term roadmap, "perfect implementation" vision. |
| `STYLE_AUDIT_2026-03-08.md` | Per-style readiness check. Color routing, tiling issues, priority fixes. |
| `merch-preview-audit-2026-03-09.md` | Frontend merch preview page audit. UI issues, constraints, improvement opportunities. |
| `tier-system-spec.md` | 5-tier premium merch system spec with real-world perks. Not yet implemented. |
| `KNOWLEDGE_BASE_2026-03-09.md` | **This file.** Complete knowledge extraction. |

---

## Conclusion

### The Wisdom

Tonight's build proved three things:

1. **The architecture is right.** Separation of concerns (bg + data + compositor) is the correct design. It creates a combinatorial explosion of options from minimal code. The spec was spot-on.

2. **The failures are wiring problems, not design problems.** The most critical issue — all 6 effects being identical — is a 15-minute integration fix. The effect code exists, is production-quality, and just needs connecting. Same pattern for the 3 missing backgrounds (aliases hide the gap) and the stale `/styles` endpoint.

3. **Quality follows speed, but only if you test.** Delivering Phases 1-3 in one evening was legendary. But skipping the 27-image QA matrix meant the "all effects identical" bug shipped undetected. A 15-minute test run would have caught it.

### The Bottom Line

**30-45 minutes of fixes tomorrow morning transforms the system from "backgrounds amazing, data lines not great" to "everything works and looks distinct."**

The hard work is done. The architecture is clean. The background generators are solid. The line effects are beautiful. Tomorrow is just plugging things together and turning the volume up.

**Coffee ☕ → Fix 1 → Fix 2 → Fix 3 → QA → Ship 🚀**

---

*Last updated: 2026-03-09 23:19 GMT*
*Generated by: Knowledge Archaeologist (Opus 4.6)*
