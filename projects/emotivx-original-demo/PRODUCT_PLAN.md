# EmotivX — Full Product Plan
*Last updated: 2026-03-05*

---

## Product Vision

EmotivX is a three-tier SaaS platform that converts real sports moments into premium customisable merchandise. Fans pick a moment from match data, customise the art, preview it on a hoodie or shirt, and order it. We fulfil via Printful using cut-and-sew templates generated automatically.

---

## Three Pillars

### 1. Fan Portal (Customer-Facing)
The public-facing product. Fans browse, create, customise, and buy.

### 2. Club Portal (Club Administration)
Clubs manage their own moments, player data, branding, and IP assets.

### 3. Platform Admin (Our Console)
We control everything — all clubs, all users, all moments, feature flags, data modes.

---

## Phase 1 — Foundation (Blocks Everything Else)

### 1.1 Authentication & User Management
- [ ] Supabase Auth integration (email/password + social login)
- [ ] User profile schema (name, email, avatar, favourite team, preferences)
- [ ] Protected routes (fan portal, club portal, admin)
- [ ] Role system: `fan` | `club_admin` | `platform_admin`
- [ ] Team selection on signup + ability to change later
- [ ] Favourites system (favourite players, moments, matches)

### 1.2 Database Schema (Supabase)
- [ ] `users` table (profile, team, role, preferences)
- [ ] `clubs` table (name, colours, logo_svg_url, stadium, league)
- [ ] `players` table (name, club, position, jersey_number, avatar_url, stats)
- [ ] `moments` table (match, event, type, minute, player, data, visible, featured)
- [ ] `assets` table (IP Manager — SVG logos, brand assets, immutable flag)
- [ ] `orders` table (user, moment, style, merch type, status, printful_id)
- [ ] `order_items` table (size, quantity, customisation params)
- [ ] `patterns` table (name, enabled, preview_url)
- [ ] RLS policies for all tables

### 1.3 Club Data Seeding
- [ ] Seed initial clubs (Wrexham + 5 top clubs) with colours + placeholder logos
- [ ] Player roster seed (Wrexham full squad)

---

## Phase 2 — Art Engine v2

### 2.1 New Background Patterns
- [ ] **Jackson** — Jackson Pollock drip/splatter style, chaotic energy, club colours
- [ ] **Marble** — Fluid marble veining, luxury feel, team colour tints
- [ ] **Smoky** — Soft smoke/mist atmosphere, dramatic, stadium light effect
- [ ] Fix **Street** style (currently reuses tessellation, needs proper spray paint renderer)
- [ ] Fix **Futuristic** style (needs its own renderer, not tessellation clone)

### 2.2 Data Line Effects
The data line (the path from which artwork is generated) should be styleable independently:
- [ ] **Default** — clean geometric line (current)
- [ ] **Laser** — glowing neon beam, sharp, sci-fi
- [ ] **Flame** — animated flame trail along the path
- [ ] **Lightning** — jagged electrical arc
- [ ] **Ink** — brush stroke / calligraphy style
- [ ] **Dotted** — pulsing dots (like tracking data visualisation)
- [ ] UI: dropdown or icon selector in art customiser

### 2.3 IP Manager
- [ ] Supabase Storage bucket for IP assets (SVGs, PNGs)
- [ ] `assets` table with `immutable` flag — once uploaded, cannot be overwritten
- [ ] Upload interface (club admin + platform admin only)
- [ ] SVG viewer/preview in admin
- [ ] Club emblem + league logo stored here
- [ ] Version history on assets (can add new version, never delete old)

### 2.4 Player Avatar Generation
- [ ] Consistent art style across all player avatars (illustrated, not photorealistic)
- [ ] Photo upload → avatar generation pipeline (ComfyUI/Flux locally)
- [ ] Team colours applied to kit in avatar
- [ ] Avatar stored per player in Supabase Storage
- [ ] Club admin can upload source photos and trigger generation
- [ ] Fallback: silhouette avatar in team colours if no photo

---

## Phase 3 — Customer Portal

### 3.1 Fan Dashboard
- [ ] Home page: featured moments, club news, trending
- [ ] My Team page: all moments for user's favourite team
- [ ] Favourites: saved moments + wishlist
- [ ] Order history

### 3.2 Moment Browser
- [ ] Browse moments by club / competition / player / date
- [ ] Search
- [ ] Filter: goals / assists / saves / red cards
- [ ] Moment card: player name, minute, match result, preview thumbnail
- [ ] Featured moments (curated by club or us)
- [ ] Live/lagged/archive mode toggle (controlled by platform admin)

### 3.3 Art Customiser
- [ ] Pick background pattern (all patterns in Phase 2.1)
- [ ] Pick data line effect (all effects in Phase 2.2)
- [ ] Colour palette override (use club colours or customise)
- [ ] Real-time preview (current Python engine)
- [ ] Slider suite (current: glow, intensity, depth, etc.)
- [ ] Resolution selector (preview 1K, purchase 4K)

### 3.4 Player Cards
- [ ] Player profile page per player
- [ ] Stats: goals, assists, appearances, position, jersey number
- [ ] Player avatar (from Phase 2.4)
- [ ] Data line visualisation of their best moments
- [ ] All moments involving that player (browseable)
- [ ] "Create Merch from This Moment" CTA

### 3.5 Merch Preview (Avatar Builder)
- [ ] Upload your own photo
- [ ] AI composites user's head onto model wearing hoodie/shirt
- [ ] Background: team stadium or club colours
- [ ] Consistent output — no hallucinations, same pose every time
- [ ] Hoodie variant + T-shirt variant
- [ ] Preview before purchase

### 3.6 Shopping & Orders
- [ ] Add to cart
- [ ] Size selector (XS–4XL)
- [ ] Quantity
- [ ] Checkout (Stripe integration)
- [ ] Order confirmation email
- [ ] Order status tracking (via Printful webhook)

---

## Phase 4 — Printful Integration & Cut-and-Sew Pipeline

### 4.1 Printful API
- [ ] Connect Printful API (products, variants, orders)
- [ ] Product catalogue (hoodies, T-shirts, sizes, colours)
- [ ] Order creation on purchase
- [ ] Webhook receiver (order status → update our `orders` table)
- [ ] Printful product sync (keep local catalogue in sync)

### 4.2 Cut-and-Sew Template Generator
This is the premium differentiator — full garment patterns, not simple print-on-demand.
- [ ] Garment template library (hoodie, T-shirt, zip hoodie — front/back/sleeves/hood/pockets)
- [ ] Pattern tiling engine: artwork tiled/mapped across garment panels
- [ ] **Pattern alignment**: sleeves + pockets line up with main body panel
- [ ] **Zipper variants**: pattern splits cleanly at zipper line
- [ ] Inside pocket art: small secondary artwork panel
- [ ] Export: individual panel PDFs/SVGs for Printful laser cutting
- [ ] Laser cut template: outline path + artwork combined in single file
- [ ] Quality check: preview assembled garment before sending

### 4.3 Player Patch / Badge
A small embroidered/printed patch sewn onto the garment:
- [ ] Player name
- [ ] Event type (e.g. "GOAL")
- [ ] Minute scored
- [ ] Match result (e.g. "3–1")
- [ ] Player avatar (small, from Phase 2.4)
- [ ] Club emblem
- [ ] Design: premium badge feel, works at small size
- [ ] Output: separate print file for Printful
- [ ] Option: physical patch sewn on, or printed panel

### 4.4 Fixed Brand Assets
- [ ] EmotivX logo, Wrexham logo, league logos stored as immutable SVGs
- [ ] Auto-applied to all merch outputs (no manual step)
- [ ] Cannot be removed or overridden by club or user

---

## Phase 5 — Club Portal

### 5.1 Club Dashboard
- [ ] Club admin login
- [ ] Overview: active moments, recent orders, top players
- [ ] Quick stats: revenue share, units sold

### 5.2 Moment Management
- [ ] Browse all moments for their club
- [ ] Publish / unpublish moments
- [ ] Feature a moment (promoted to fans)
- [ ] Add manual moments (outside automated pipeline)
- [ ] Moment preview with current art engine

### 5.3 Player Management
- [ ] Full player roster
- [ ] Add / edit / retire players
- [ ] Upload player photos → trigger avatar generation
- [ ] Player stats (manual entry or from data feed)

### 5.4 Club Branding
- [ ] Set primary + secondary + accent colours
- [ ] Upload club crest (SVG preferred) → goes to IP Manager
- [ ] Upload kit template (front/back) for merch preview
- [ ] Stadium background image (used in avatar composites)

### 5.5 Club IP Manager
- [ ] View all uploaded brand assets
- [ ] Upload new assets (logo versions, sponsor logos)
- [ ] Immutable flag on approved assets
- [ ] Asset usage log (which moments/merch use each asset)

---

## Phase 6 — Platform Admin v2

### 6.1 Feature Flags
- [ ] Data mode: `archive` | `lagged` | `live` (per club or global)
- [ ] Enable/disable patterns per club or globally
- [ ] Enable/disable ADIO trigger (per club)
- [ ] Enable/disable merch ordering (maintenance mode)
- [ ] Kill switches per feature

### 6.2 Club Management
- [ ] Create / edit / suspend clubs
- [ ] Set revenue splits per club
- [ ] Assign club admin users
- [ ] View club's moments, players, assets

### 6.3 User Management
- [ ] Browse all users
- [ ] Search by email, team, join date
- [ ] Suspend / reinstate users
- [ ] View order history per user

### 6.4 Platform Analytics
- [ ] Orders by club, style, date
- [ ] Most popular moments
- [ ] Revenue dashboard (gross, splits, Printful costs)
- [ ] Art engine usage stats

---

## Phase 7 — ADIO Integration (Future)

*ADIO = inaudible audio trigger technology from DVLT partnership*

### 7.1 Audio Trigger Listener
- [ ] PWA service worker listening for ADIO audio trigger in stadium
- [ ] Trigger detection: identifies goal event from inaudible tone
- [ ] Background listening (app minimised still works)

### 7.2 Goal Notification Flow
- [ ] On trigger: push notification "GOAL! Want to own this moment?"
- [ ] Deep link into Moment Creator pre-loaded with that exact goal
- [ ] 60-second urgency window (limited edition framing)
- [ ] Works offline in stadium (queues order, sends when connected)

### 7.3 Exclusive Stadium Moments
- [ ] ADIO-triggered moments tagged as "Stadium Exclusive"
- [ ] Limited edition count (e.g. "Only 500 available")
- [ ] Higher price tier for live-captured moments

---

## Cleanup Tasks (Before Production)

- [ ] Remove `art_engine/euro_compositor.py` (one-off batch script)
- [ ] Remove `art_engine/demo.py` (dev demo)
- [ ] Remove `art_engine/tessellation.py` (superseded by v2)
- [ ] Remove `art_engine/self_critic.py` (unfinished experiment)
- [ ] Delete `scripts/dev-admin.ps1` (Windows orphan)
- [ ] Delete `scripts/smoke-test.js` (not needed in prod)
- [ ] Merge `(marketplace)/page.tsx` into Moment Creator flow (two art generators → one)
- [ ] Move `CODE_REVIEW_*.md` files to `/docs`
- [ ] Merge `feature/style-honeycomb` → `main` and tag `v0.3.0`
- [ ] Fix TypeScript strict mode violations
- [ ] Remove hardcoded Wrexham-only references from shared components

---

## Current State (2026-03-05)

### Working
- Wrexham 360 Viewer (Three.js, ball path, event replay) — best thing in the codebase
- Wrexham Data Lab (5 visualisations)
- Euro 2024 match cards
- Moment Creator wizard (5-step)
- Art Engine (6 Python styles)
- StatsBomb pipeline
- Admin panel (ingest, moments, matches, calibration)

### In Progress
- Event Stepper (replacing auto-play scrubber) — agent running

### Not Started
- Everything in Phases 1–7 above

---

## Data Strategy

### Launch Dataset: Euro 2024 (Open Data)
- 51 matches, all goals, full buildup event chains
- 2D data only (no ball height, no freeze frames, no xG)
- This is the **complete demo** — art engine, moment browser, customiser, merch flow all work from this
- Every feature must work with this data level as the baseline

### Premium Preview: Wrexham 5-3 Ipswich (360 Data)
- Full freeze frames (all player positions at moment of shot)
- Ball height (3D data lines), xG, weather, attendance
- Shown as a **"Coming Soon — Premium 360"** section
- Demonstrates what clubs get when they sign up with StatsBomb 360 data
- Not purchaseable — preview/teaser only at launch

### Scaling Rule
- Data layer is **format-agnostic**: works with 2D open data as baseline
- 3D ball height, freeze frames, xG, weather are **optional enrichments**
- Same UI, same fan experience — richer art output when premium data exists
- Adding a new competition = seed matches + moments → everything works

---

## Tech Stack Decisions

| Layer | Choice | Notes |
|-------|--------|-------|
| Auth | Supabase Auth | Already using Supabase, natural fit |
| DB | Supabase (Postgres) | Schema work done, extend it |
| Storage | Supabase Storage | SVGs, avatars, generated art |
| Payments | Stripe | Standard, well-documented |
| Fulfilment | Printful API | Already in spec |
| Avatar AI | ComfyUI + Flux (local) | Already set up on Mac, zero cost |
| Frontend | Next.js 16 + Tailwind | Current stack |
| 3D | Three.js + R3F | Current stack |

---

*This document is the single source of truth for the product plan. GitHub Issues are derived from this.*
