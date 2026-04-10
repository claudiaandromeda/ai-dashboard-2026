# EmotivX Demo Build — Session State
**Last updated:** 2026-03-09 ~11:40 GMT
**Branch:** feat/demo-website
**Server:** localhost:3000
**Meeting:** 1:30pm GMT today
**Latest commit:** f4041a7

---

## What's Built & Working

### Homepage (/)
- Animated data line — real Windass 80' StatsBomb trajectory, WINDASS label, WREXHAM vs SHEFF UTD · 80' · LEAGUE ONE, no xG
- PHYGITAL MOMENTS section — 360 hoodie viewer (GarmentViewerWithFallback, no controls), spins automatically, pulls artwork from localStorage key `emotivx_merch_art` (set by merch-preview page), Wrexham logo from CDN, WINDASS 10 on back, copy updated (no minting language)
- Live ticker, audience tabs (Fans/Clubs/Investors), featured moments, stats, how it works, clubs section

### Other Pages
- `/staff/dashboard` — Wrexham staff portal (4 tabs: schedule, moment generator, IP/branding, sales)
- `/admin` — EFL Championship 24 teams grid + EmotivX Tracking System + 360° Stadium Demo buttons
- `/admin/teams/wrexham` — Full Wrexham admin (6 tabs incl. data pipeline, admin tools, revenue split)
- `/admin/cv` — EmotivX Tracking System (live animated pitch tracker + honest roadmap)
- `/admin/onboarding` — Club pipeline with onboarding flow
- `/avatar-generator` — Player avatar generator
- `/how-it-works` — Animated 4-stage pitch-to-product visual
- `/account` — Fan account with purchases + Phygital digital assets
- `/assets-preview` — 15 AI textures gallery
- `/merch-preview` — Full 3D hoodie configurator (working, logo+name toggles default OFF)

---

## Known Issues / Not Fixed
- Hoodie on homepage not showing as red — garmentColour prop added but not fully working. Good enough for demo.
- Logo/name on homepage hoodie requires visiting /merch-preview first to populate localStorage

---

## Agent Workflow
- Write task to /tmp/task.md
- Run: `cd /Users/claudia/.openclaw/workspace/projects/emotivx_app && claude --dangerously-skip-permissions -p "$(cat /tmp/task.md)"`
- Use pty:true background:true in exec tool
- Poll with: process poll sessionId:XXX timeout:90000

## Key Paths
- Homepage: app/(marketplace)/page.tsx
- 3D Viewer: components/merch/GarmentViewer3D.tsx + GarmentViewerWithFallback.tsx
- Teams config: lib/teams.ts (Wrexham logo: https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png)
