# Session Handoff — 2026-03-15 ~14:42 GMT

## What We Did Today

### EmotivX 360 Viewer (branch: feat/cv-virtual-stadium)
- Fixed `font-weight` → `fontWeight` TS errors on THE REALITY / THE HOLLYWOOD modes
- Built CV overlay toggle: white/silver paths = CV data, orange = low confidence events
- New API route: `app/api/wrexham/cv-data/route.ts` (reads `~/football-cv/goal_sam_smith_cv.json`)
- Sidebar restructured into two sections:
  - **📊 Third-Party Data** (StatsBomb) — Raw, Ball Path, Goal Moment, Replay, All Goals, All Goals 3D, Reality, Hollywood
  - **⚽ EmotivX Data** (CV pipeline) — CV overlay toggle, shows placeholder until Elliot's JSON arrives
- Committed: `a0d3958` and `98b2ae5` on `feat/cv-virtual-stadium`

### SHARED_CONTEXT.md System (cross-surface continuity)
- Built `scripts/update_discord_context.py` — reads last 24h of Discord + WebUI sessions, writes clean summary to `memory/SHARED_CONTEXT.md`
- AGENTS.md updated: step 2 of session start = load SHARED_CONTEXT.md
- Cron running every 30 min (ID: b8597b89)
- File currently at `memory/SHARED_CONTEXT.md` — 80 messages, clean, both surfaces

### Session Context / Overnight Fix
- Root cause: sessions compact at context window limit → cold start in morning
- Fix: SHARED_CONTEXT.md loaded at every session start means context survives compaction
- Old `DISCORD_CONTEXT.md` renamed to `.old` — `SHARED_CONTEXT.md` is canonical

## Current State of Play

### Waiting For
- Elliot + Tess: evaluate Roboflow detection quality on Wrexham footage (Elliot's WebUI)
- Elliot: build `generate_goal_json.py` → `goal_sam_smith_cv.json` → SCP to `~/football-cv/`
- Elliot: update his AGENTS.md to load SHARED_CONTEXT.md at startup (he'll do it himself)

### Ready to Build (when JSON arrives)
- CV overlay toggle is LIVE — viewer will auto-load as soon as file exists at `~/football-cv/goal_sam_smith_cv.json`
- No further work needed from me until Elliot delivers the JSON

### EmotivX Art Engine
- Branch `feature/style-honeycomb` has working art engine integration (commit bc230ec)
- Slider debounce: `useRef` + `useCallback` + 600ms — documented in SLIDER_DEBOUNCE_PATTERN.md
- Merge to `main` pending Tess signal

## Key Technical Facts
- CV JSON schema agreed — `source: "cv-pipeline"`, events in StatsBomb 120×80, path_override in 0–1 coords
- Arc heuristics: high→4m, low→1m, null→0.2m, clearance→5m, header→2.5m, carry→0.05m
- HITL confidence threshold: ~0.6 default, configurable slider in Elliot's Streamlit
- PnLCalib chosen over Hough for pitch registration (better investor story, handles phone footage)
- Investor demo: 3 beats — CV capture → StatsBomb comparison → art engine output

## Pending Sign-offs
- Commitments #8 (Discord restructuring), #9 (PA Bot Phase 1), #10 (Phygital consolidation) — all awaiting Tess
- Merge `feature/style-honeycomb` → `main` — awaiting Tess signal

## TODOs Still Open
- SCP SESSION_START_STRATEGY.md to Elliot's machine (after Tess validates SHARED_CONTEXT works)
- Add git commit to SHARED_CONTEXT cron (so crashes don't lose the file)
- BBC iPlayer password change (overdue task #15)
- Add Chelsea to CLUB_PALETTES if not present
- QMD index stale — `qmd update && qmd embed`

## Branches
- `feat/cv-virtual-stadium` — active, CV/viewer work here
- `feature/style-honeycomb` — art engine work, ready to merge
- `feat/wrexham-kit-replica` — DO NOT TOUCH
