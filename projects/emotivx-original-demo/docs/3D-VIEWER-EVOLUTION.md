# 3D Goal Viewer — Evolution Log

Every iteration of the 360° Goal Viewer, in order. Each commit is a checkpoint you can return to.

## Iteration 1 — Basic 3D Scene
**Commit:** `bad890c`
**What:** First working Three.js scene. Basic cylinders for players, line for ball trajectory, flat green pitch.
**Look:** "80s Pong" — functional but ugly.

## Iteration 2 — Atmosphere Upgrade
**Commit:** `07b7aaa`
**What:** Post-processing bloom, stadium floodlights, metallic player capsules, particle trail on ball, starfield background, vignette, speed-scaled ball animation.
**Look:** Dark/moody nighttime. Glowing neon feel.

## Iteration 3 — Footballer Figures + Stadium Shell
**Commit:** `afc2a3d`
**What:** Players rebuilt with boots, socks, legs, shorts, jersey, arms, head, 4 hair styles, 10 hair colours, 6 skin tones, 7 boot colours. Stadium added: 3-tier stands, crowd dots, floodlight pylons, roof overhangs, red Wrexham fascia.
**Look:** Stylised but recognisably footballers. Night stadium.

## Iteration 4 — Daytime Stadium
**Commit:** `8aefa65`
**What:** Blue sky dome with clouds + sun. Bright green pitch with mowing stripes. ~1200 individual crowd figures (with torso, head, hair/hats). 8-tier concrete terracing. Steel roof trusses with support columns. Press box with windows. Advertising boards. Dugouts with seats. Corner flags. Lattice floodlight towers. Warm sunlight with shadows.
**Look:** Match day. Feels like being inside the Racecourse Ground.

## Iteration 5 — Player Labels + Click-to-Inspect + Trajectory Fix
**Commit:** `2306463`
**What:** 
- Fixed ball height (was doubled — Moore's goal looked like it went over the bar, now accurate)
- Every player has coloured name pill above head (jersey # + surname)
- Click any player → info card with stats
- Shooter card shows speed, xG, distance, height, technique
- API updated to include player names + jerseys from lineup data
**Look:** Interactive. You can identify and inspect every player on the pitch.

## Iteration 6 — Build-up Animation + Trail Glow Slider
**Commit:** `3d80647`
**What:** API returns preceding events for each goal. "Show Build-up" toggle animates the pass sequence — ball travels along each pass, lines fade in chronologically, player names at each touch. Trail Glow slider (0–300%) controls emissive intensity of everything: ball, trail, particles, impact flash. 0% = muted, 300% = blazing supernova.

## Iteration 7 — Full Goal Replay Engine
**Commit:** `c28e1e6`
**What:** Complete match replay. Hit "Play Build-up" and watch: every player on the pitch moves to their real positions as the play develops. Ball travels along each pass. Both teams visible. Tackles, blocks, carries all animated. Completed passes leave fading trail lines. Speed slider (0.2x slow-mo to 3x). Live event commentary showing "14/31 ➡️ PASS — Matusiwa (DEF)". ~24 players tracked per frame.
**Look:** Like watching a tactical replay from a football analysis tool, but in 3D and you can orbit around it.

---

## How to Revisit Any Iteration

```bash
# See all viewer commits
git log --oneline app/wrexham/360-viewer/

# Checkout a specific iteration
git checkout bad890c -- app/wrexham/360-viewer/page.tsx  # Iteration 1
git checkout 07b7aaa -- app/wrexham/360-viewer/page.tsx  # Iteration 2
git checkout afc2a3d -- app/wrexham/360-viewer/page.tsx  # Iteration 3
git checkout 8aefa65 -- app/wrexham/360-viewer/page.tsx  # Iteration 4
git checkout 2306463 -- app/wrexham/360-viewer/page.tsx  # Iteration 5

# Return to latest
git checkout feature/style-honeycomb -- app/wrexham/360-viewer/page.tsx
```

## Tech Stack
- Three.js + React Three Fiber + @react-three/drei
- @react-three/postprocessing (bloom, vignette)
- All geometry is primitives — no external 3D models loaded
- ~1200 crowd figures, ~15 on-pitch players per goal
- Data from StatsBomb 360 premium format via `/api/wrexham/match-data`

## Key Files
- Page: `app/wrexham/360-viewer/page.tsx`
- API: `app/api/wrexham/match-data/route.ts`
- Data: `data/statsbomb/events/1377475.json`
