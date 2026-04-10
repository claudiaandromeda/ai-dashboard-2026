# EmotivX — Development Backlog

**Location: `projects/emotivx_app/BACKLOG.md`** ← Right here. In the project. Where it belongs.

---

## 🔴 In Progress
- [ ] Test art output with real StatsBomb data — does it actually look good?
- [ ] Fan page working end-to-end
- [ ] Club admin page

## 🟡 Up Next
- [ ] Street/Geometric/Futuristic styles — may need custom renderers (currently reuse tessellation)
- [ ] Team-to-club colour mapping — currently hardcoded to Arsenal kit colours
- [ ] David has "more info to share" — awaiting input

## 🟡 Up Next
- [ ] Own Goal artwork treatment — NO team colours, NO buildup path. Full red palette only. It's a mistake, not a moment to celebrate. Data line should show the chaos, not a clean possession chain.

## 🟢 Backlog
- [ ] Historical weather data for matches — pull from weather API using match date + stadium city
- [ ] Gallery persistence — save generated images locally (JSON index, no Supabase needed)
- [ ] Multi-goal overlay — "All Goals" button renders all buildup paths layered
- [ ] Multiple export formats (SVG, WebP, JPG)
- [ ] Mobile responsive polish
- [ ] Team mascot-themed patterns (Arsenal guns, West Ham hammers, Brentford bees)
- [ ] Expand beyond Euro 2024 — Premier League, La Liga, Champions League
- [ ] AI mockup generation — "what do I look like in this hoodie"
- [ ] Merge feature branches to main and tag v0.3.0
- [ ] Wrexham 360 data (awaiting StatsBomb response)

## 🔵 Done (March 3)
- [x] Real StatsBomb goal data extraction (goal_extractor.py)
- [x] 5-step Moment Creator wizard
- [x] Buildup Depth slider
- [x] All 11 sliders from marketplace restored
- [x] 7 styles in UI
- [x] 600ms debounce on all controls
- [x] Goals API endpoint
- [x] EVENT_PARAMS for carry/dribble types

---

*Last updated: 2026-03-03 21:06 GMT*

## 🔴 Architecture — StatsBomb Premium 360 Format
**When we sign up with StatsBomb, ALL matches come in the premium 360 format.**
The Wrexham 5-3 Ipswich data (match 1377475) is the reference file.

### Key differences from open data:
- **Bundle format**: single JSON with `match`, `lineups`, `events`, `player_stats`, `team_stats`
- **Flat event fields**: `start_x/y/z`, `end_x/y/z` (not nested `location[]`)
- **Ball height**: `start_z` and `end_z` on every event — this is the 3D data
- **Freeze frames**: every shot has full player positions at moment of shot
- **xG**: on every shot event
- **Player IDs**: need lineup lookup for names (not embedded in event)
- **Event types**: `type` field is string like "open-play", not nested `{name: "Shot"}`
- **Goal detection**: `goal_for=true` flag, not nested shot→outcome→Goal
- **Weather**: in match metadata
- **Attendance**: in match metadata

### Must-do before StatsBomb signup:
- [ ] Build unified event parser that handles BOTH formats (open + premium 360)
- [ ] goal_extractor.py must detect format and parse accordingly
- [ ] 3D data line renderer using z-axis for height/depth in artwork
- [ ] Freeze frame renderer — show player positions at moment of goal
- [ ] xG display in goal picker and artwork metadata
- [ ] Ingest pipeline: premium JSON → Supabase (events table needed)
- [ ] Scale test: 2282 events per match × hundreds of matches

---

## Printful Production — Cutting Templates

### Background
EmotivX sells all-over dye-sublimation / cut-and-sew garments. For Printful to print these correctly, the artwork needs to be supplied pre-mapped to each garment panel (front body, back body, left sleeve, right sleeve, hood, pocket etc.) — not as a single flat image.

### Tasks

- [ ] **Research Printful's cut-and-sew template spec** — confirm exact panel layout, bleed zones, DPI requirements, file format per product
- [ ] **Build cutting template generator** — for each product (hoodie, tee, long sleeve) produce a panel-mapped artwork file from the generated 2048px art image
  - Map the world-space UV projection we use in the 3D viewer onto each physical panel
  - Output a single print-ready file with correct panel positions + bleed
- [ ] **Validate with Printful mockup API** — upload a generated cutting template and confirm it renders correctly on their end
- [ ] **Automate per-order** — when a customer places an order, auto-generate the cutting template and push to Printful via their API
- [ ] **Cutting template for every product** — hoodie, tshirt, longsleeve, snapback, dadcap (each has different panel layouts)

### Notes
- The 3D viewer uses world-space UV projection (seamless across panels) — the same logic can drive the cutting template geometry
- This is a prerequisite for real Printful fulfilment — without it, print quality at seams will be wrong
- May need a Blender/Python pipeline to automate panel extraction from the 3D model UV layout
