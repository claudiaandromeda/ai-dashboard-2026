# EmotivX — Comprehensive Status Report
**Date:** 2026-03-03 19:00 GMT | **Prepared for:** David

---

## Where We Are

The EmotivX app is a Next.js + Python art engine that turns real football data (StatsBomb) into generative art. It has three working views and one in-progress:

| View | Route | Status |
|------|-------|--------|
| Fan Marketplace | `/` | ✅ Working — 8 clubs, 4 styles, 16 controls |
| Euro 2024 Browser | `/euro-2024` | ✅ Working — 51 matches, real stats |
| Moment Creator | `/moments/create` | ⚠️ Partially working — see below |
| Admin | `/admin/*` | 🔴 Shell only — queries empty Supabase |

**Branch:** `feature/style-honeycomb` (20 commits ahead of main)
**Codebase:** 13,027 lines TypeScript/TSX + 4,837 lines Python

---

## What Actually Works Right Now

1. **Python art engine** — 4 tessellation styles (pebbles, broken_glass, spider_web, honeycomb), generates real PNG images from StatsBomb data. Fully functional.

2. **Fan Marketplace** (`/`) — Real-time art generation with club selector, style picker, ~16 sliders. This is the original proof of concept and it works end-to-end.

3. **Euro 2024 Browser** (`/euro-2024`) — Browsable grid of 51 real matches with search, sort, filter, and real pass/shot/possession stats extracted from StatsBomb event data.

4. **Moment Creator** (`/moments/create`) — 4-step wizard. Match selection works. Image generation works (API calls Python engine, returns real PNG). **BUT: sliders don't trigger regeneration** — the onChange handlers aren't wired up. This was the bug we were about to fix before the key rotation fire drill.

---

## What Doesn't Work / Isn't Needed Right Now

### 🔴 Dead Weight (not needed for current goals)

**Admin system** — 28 files, 2,950 lines of TypeScript across admin routes and components. All query Supabase which has no tables created. These are for the future NIL waterfall / rights management system. **Not needed now.**

- `app/(admin)/admin/*` — 6 pages, all empty
- `components/admin/*` — 8 components (2,726 lines), including a 1,762-line PitchCalibrationTool
- `app/api/admin/*` — 14 API routes querying empty Supabase

**Supabase integration** — Client is configured but there are no database tables. 25 files reference Supabase. 6 scripts depend on it. **None of this works.**

**Unused Python modules** — 551 lines across files that aren't called by anything:
- `mockup_hoodie.py` — T-shirt mockup renderer
- `mockup_tshirt.py` — Hoodie mockup renderer  
- `self_critic.py` — AI art quality evaluator
- `pixel_precision_mapper.py` — Pitch homography
- `segment_stylizer.py` — Image segmentation

**6 Supabase-dependent scripts** — `detect-moments.js`, `normalize-statsbomb.js`, `preview-moments.js`, `push-matches.js`, `reset-statsbomb-360.js`, `supabase-counts.js`. None work without DB tables.

### ⚠️ Partially Working

**Moment Creator sliders** — The 5 sliders render but don't trigger regeneration. The onChange handlers need wiring with a 600ms debounce pattern (documented in earlier session).

**Gallery** (`/moments/gallery`) — Page exists but is empty. No persistence layer — generated images aren't saved anywhere.

**Style branches** — `feature/style-broken-glass` and `feature/style-spider-web` exist but aren't merged to main. The styles themselves work in the engine; the branches just haven't been merged.

---

## The Critical Path (What Needs Doing)

Based on the session handoff and earlier conversations, the agreed plan was:

### Phase 1: Wire up the Moment Creator properly (1-2 hours)
1. **Fix slider onChange** — Add 600ms debounce, trigger regeneration on change
2. **Wire real art engine** — Moment generator already calls `api_generate.py` ✅ (done in commit bc230ec)
3. **Match-to-club mapping** — Currently hardcoded to Arsenal. Need to map Euro 2024 teams to kit colours

### Phase 2: Style expansion (2-3 hours)
1. Add all 4 tessellation styles to the Moment Creator UI
2. Merge broken_glass and spider_web branches
3. Team mascot-themed patterns (Arsenal guns, West Ham hammers, etc.) — from the overnight session ideas

### Phase 3: Polish + Demo-ready (1-2 hours)
1. Gallery persistence (local JSON index, no Supabase needed)
2. Multiple export formats (PNG, SVG, WebP)
3. Mobile responsiveness
4. Error handling / loading states

**Total estimated: 4-6 hours to demo-ready MVP**

---

## What I'd Recommend Cutting

To keep focus tight:

1. **Don't touch admin/Supabase** — It's not needed until you have a business model locked in. 2,950 lines of admin code sitting there doing nothing is fine — just ignore it.

2. **Don't merge style branches yet** — Work on `feature/style-honeycomb` which has everything. Merge to main once we're happy.

3. **Don't build persistence yet** — Downloaded PNGs are enough for demo. Gallery can wait.

4. **Focus order:** Sliders → Team mapping → Style selector → Demo polish

---

## Quick Architecture Summary

```
User → Next.js (localhost:3000)
         ↓
    /api/moments/generate (TypeScript)
         ↓
    Loads StatsBomb JSON from data/statsbomb/
    Extracts passes, shots, possession
         ↓
    Spawns python3 art_engine/api_generate.py
    Passes: club, kit, style, sliders as JSON
         ↓
    Python renders tessellation → /tmp/emotivx_moment.png
         ↓
    TypeScript reads PNG → base64 → JSON response
         ↓
    React displays image + stats + sliders
```

**Key files for the work ahead:**
- `app/moments/create/page.tsx` — The wizard UI (fix sliders here)
- `app/api/moments/generate/route.ts` — The API bridge (already working)
- `art_engine/api_generate.py` — The Python renderer (already working)
- `art_engine/clubs.json` — Club colour definitions (add Euro 2024 teams here)

---

## Git Status

```
On branch: feature/style-honeycomb
Ahead of main: 20 commits
Last commit: bc230ec — "Wire moments API to real art engine"
Uncommitted changes: Need to check
```

---

Ready to pick up Phase 1 when you are. The slider fix is probably 30 minutes of actual work.
