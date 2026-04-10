# EmotivX — Comprehensive IP & Patent Audit Report

**Prepared:** 11 March 2026  
**Scope:** Full EmotivX ecosystem — codebase, documentation, business model  
**Purpose:** Partnership due diligence, IP protection planning  
**Classification:** Confidential — Business Sensitive

---

## 1. Executive Summary

EmotivX has built a vertically integrated platform that transforms real sports match data into personalised, wearable artwork — a category that did not exist before this product. The ecosystem spans five distinct technology layers:

1. **A data-driven generative art engine** (Python) with 12+ procedural background styles and a novel data-path renderer that converts StatsBomb play-by-play events into glowing visual paths
2. **A computer vision pipeline** (Python/YOLO/Kalman) that can extract tracking data from amateur phone footage — democratising sports analytics
3. **A 3D garment visualiser** (React Three Fiber/WebGL) with world-space UV projection for seamless all-over print preview and DecalGeometry for badge/name/number placement
4. **An interactive 360° goal viewer** (Three.js) that reconstructs a full stadium scene — 4,000+ crowd figures, real player positions from StatsBomb freeze-frame data, animated ball trajectory with 3D height
5. **A complete Next.js application** with club onboarding, match data pipeline (StatsBomb → normalised moments), digital asset tier system, merchandise preview/order flow, staff IP management, and a "Your Moment" public upload flow for grassroots football

The strongest IP sits in the **method of converting sports event data into wearable visual art** (the core data-to-art pipeline) and the **composition system** that layers data visualisation onto procedural artistic backgrounds with focal-point linking. These represent genuinely novel combinations that have no direct prior art.

**Bottom line:** EmotivX holds 3–4 strong patent candidates, 5–6 medium-strength candidates, significant trade secrets in its art-generation algorithms, and substantial copyright in its original creative works. The IP portfolio is defensible and commercially valuable for partnership negotiations.

---

## 2. Unique IP Inventory

### 2.1 Core Algorithms & Methods

| # | Innovation | Location | Description |
|---|-----------|----------|-------------|
| **A1** | Data-to-art path renderer | `art_engine/data_renderer.py` | Converts normalised (x, y, event_type) match events into a glowing visual path with event-specific glow parameters, Bézier smoothing with dynamic perpendicular control points, grid-based glow pass, multi-pass spine rendering (halo + centreline), and event-type-specific colour mixing |
| **A2** | Background-data compositor with focal linking | `art_engine/compositor.py` | Two-layer compositing system that aligns background focal points (sunburst centre, spider web centre) with goal-event pixel coordinates, shifting the data layer so the goal "lands" on the visual centre of the background |
| **A3** | Adaptive Bézier path smoothing | `art_engine/data_renderer.py:smooth_path()` | Dynamic perpendicular control-point offset that responds to upcoming corner sharpness — tighter for straight segments, wider for sharp turns — producing organic flow from discrete event data |
| **A4** | Event-parameterised glow rendering | `art_engine/data_renderer.py:EVENT_PARAMS` | Per-event-type visual parameters (radius multiplier, brightness, max lightness, falloff exponent) that make passes, carries, shots, and goals visually distinct without labels |
| **A5** | Radial goal burst with per-cell noise | `data_renderer.py` (goal handling) | Goal events generate a radial burst where each grid cell gets a hash-based noise factor (0.7–1.3) for organic edge variation, rather than a clean circle |
| **A6** | Fractal Brownian Motion camo generation | `backgrounds/camo.py` | Custom FBM implementation (no scipy dependency) with noise-deformed polygon blobs, auto-detecting variant (urban/fire/woodland) from team primary colour luminance |
| **A7** | Lightweight Voronoi tessellation (no scipy) | `backgrounds/geometric.py` | Brute-force nearest-seed Voronoi with Graham scan convex hull, producing crystal-lattice patterns — deliberately avoids scipy for deployment simplicity |
| **A8** | Pollock-style generative splatter system | `backgrounds/jackson.py` | Five-layer rendering pipeline: black web threads → secondary drips → primary drip clusters with gravity → accent splatters → white flecks, all with variable-width Bézier strokes and paint-pool effects |
| **A9** | Impact-aware Delaunay triangulation | `backgrounds/broken_glass.py` | Broken glass pattern where impact points (goals/shots) generate exponentially-distributed extra vertices, creating denser/smaller shards radiating from the point of impact |
| **A10** | Cracking hexagonal honeycomb | `backgrounds/honeycomb.py` | Hex cells near impact points automatically split into 6 triangles with per-triangle colour variation, simulating glass cracking from force |
| **A11** | Kalman-filtered ball trajectory smoothing | `football-cv/ball_smoother.py` | OpenCV Kalman filter with constant-velocity model, configurable prediction horizon (15 frames), and gap-filling for ball tracking from amateur footage |
| **A12** | Hybrid ball tracking (YOLO + optical flow + Kalman) | `football-cv/` | Multi-source detection fusion: primary YOLO detections, optical flow motion tracking, and Kalman prediction, with source attribution per detection |

### 2.2 Data Pipelines & Processing

| # | Innovation | Location | Description |
|---|-----------|----------|-------------|
| **B1** | StatsBomb event → normalised path extraction | `art_engine/goal_extractor.py` | Extracts full possession chains from StatsBomb JSON, filters to meaningful play events, normalises 120×80 pitch coordinates to [0,1], handles carry distance thresholds |
| **B2** | StatsBomb 360 premium format ingestion | `art_engine/goal_extractor_360.py` | Handles the 360 format with 3D ball height (z-axis), lineup lookup for player names, time-window buildup extraction (2-minute window), crossbar-height normalisation |
| **B3** | CV-to-art pipeline bridge | `football-cv/export_datalines.py` | Converts CV tracking database (SQLite with frames/detections) to StatsBomb-like JSON for art engine consumption — the critical bridge between amateur footage and generated artwork |
| **B4** | Full match processing pipeline | `football-cv/process_match.py` + various scripts | End-to-end: video → YOLO detection → ball tracking → Kalman smoothing → trajectory export → art-ready format |
| **B5** | Scoreboard OCR for goal detection | `football-cv/scoreboard_ocr.py` | EasyOCR-based score-change detection from broadcast frames — monitors top-left region for score overlays to confirm goal timing |
| **B6** | StatsBomb match pipeline (fetch → normalise → detect → push) | `scripts/pipeline-statsbomb.js` and friends | Automated pipeline: fetch competition data → normalise events → detect goal moments → push to Supabase — supports auto-latest mode |

### 2.3 Visual/Artistic Generation

| # | Innovation | Location | Description |
|---|-----------|----------|-------------|
| **C1** | 12 procedural background generators | `art_engine/backgrounds/*.py` | Each a standalone module: camo, geometric, jackson, spider, sunburst, street, classic, tron, fractals, broken_glass, honeycomb, pebbles — all with consistent API (palette, scale, rotation, tile, seed) |
| **C2** | Team-colour-adaptive palette system | `art_engine/colour_utils.py` | Weighted palette distribution (70/30, 50/30/20, 40/30/20/10) from 1–4 team colour selections |
| **C3** | Brick wall with layered weathering | `backgrounds/street.py` | Four-layer rendering: brick grid with mortar → surface grain → grime weathering → ghost faded spray — graffiti aesthetic |
| **C4** | Neon Tron grid with bloom | `backgrounds/tron.py` | Multi-pass: dark void → blurred glow lines → crisp neon grid → bright intersection nodes → scanline vignette |
| **C5** | Multi-fractal generator | `backgrounds/fractals.py` | Mandelbrot, Julia, Burning Ship — with NumPy acceleration, team-colour gradient mapping, and reproducible Julia constant selection from seed |
| **C6** | 360° stadium scene generator | `app/wrexham/360-viewer/page.tsx` | Full 3D stadium: pitch with mowing stripes, 4,000+ crowd figures with deterministic appearance (skin tone, hair, boots), animated ball trajectory with real 3D height, freeze-frame player positioning |
| **C7** | Procedural footballer figures | `360-viewer/page.tsx:PlayerFigure` | Deterministic pseudo-random appearance per player: skin tones, hair styles (4 variants), boot colours, body scale, left-footedness — all from seeded RNG |
| **C8** | "Reality vs Hollywood" demo mode | `360-viewer/page.tsx` | Toggle between sparse raw data points (what the data actually contains) and the interpolated smooth visualisation — educational/impressive for presentations |
| **C9** | Dynamic badge texture generation | `GarmentViewer3D.tsx:createBadgeTexture()` | Canvas-rendered match badge with minute, player name, matchup, edition number, gold/riveted aesthetic — generated at runtime |

### 2.4 User Experience Innovations

| # | Innovation | Location | Description |
|---|-----------|----------|-------------|
| **D1** | World-space UV projection for garments | `GarmentViewer3D.tsx` | Replaces standard UV mapping: walks every vertex through matrixWorld, maps to normalised world-space coordinates, producing seamless all-over print that crosses garment seams |
| **D2** | DecalGeometry placement system | `GarmentViewer3D.tsx` | Logo, badge, name, and number rendered as THREE.DecalGeometry projected onto the mesh surface with per-garment position configs — replaces CSS overlays |
| **D3** | WebGL tier detection with graceful fallback | `lib/webgl-detect.ts` + `GarmentViewerWithFallback.tsx` | Three-tier device detection (full/limited/none) based on WebGL context creation, device memory, and CPU cores — seamlessly falls back to 2D SVG-masked preview |
| **D4** | 2D flat garment fallback with pattern controls | `FlatGarmentFallback.tsx` | CSS mask-image technique using SVG silhouettes — texture controls (repeat, rotation, offset, brightness) still work in 2D mode |
| **D5** | Per-garment decal configuration system | `GarmentViewer3D.tsx:GARMENT_CONFIGS` | Position/size configs for hoodie, tshirt, longsleeve — with swapOrientations and flipCameraZ flags for models exported in different orientations |
| **D6** | "Your Moment" grassroots upload flow | `app/your-moment/page.tsx` | Public flow: upload match footage → pick team colours (presets or image extraction) → describe moment → generate personalised artwork from amateur footage |
| **D7** | Digital asset tier system with physical redemption | `app/account/page.tsx` | Common/Uncommon/Rare/Epic/Legendary tiers — digital assets linked to physical purchases, with edition numbering |
| **D8** | IP Asset Manager for clubs | `app/staff/ip-manager/page.tsx` | Staff tool for managing player image rights status, team branding, logo uploads, AI avatar generation, and artistic background library |
| **D9** | Real-time art engine parameter control | API routes + configurator | Server-side Python art generation with 15+ controllable parameters (bgDetail, dataDetail, bloom, intensity, scale, markers, seed, etc.) exposed via JSON API |

### 2.5 Business Model Innovations

| # | Innovation | Description |
|---|-----------|-------------|
| **E1** | Data-driven artwork as merchandise | Converting play-by-play sports data into visual artwork printed on physical products — each piece unique to a specific goal/moment |
| **E2** | Edition-limited physical+digital bundles | Tiered scarcity model (5/25/75/200/500 editions) with linked digital assets — buying a hoodie unlocks the digital asset |
| **E3** | Club-as-a-service IP management | Platform handles image rights, branding, backgrounds — clubs onboard and the platform manages the IP complexity |
| **E4** | Grassroots-to-premium pipeline | Same technology serves amateur Sunday league (via phone footage + CV) and professional leagues (via StatsBomb data) — single platform, different data sources |
| **E5** | Real match data provenance | Every artwork traces back to verifiable match event data (StatsBomb IDs, possession chains, xG values) — authenticity built into the product |

---

## 3. Patent Candidates

### 3.1 STRONG Candidates

#### Patent Candidate 1: Method for Generating Visual Artwork from Sports Event Data
- **Description:** A computer-implemented method that receives play-by-play sports event data (passes, carries, shots, goals with normalised pitch coordinates), smooths the path using adaptive Bézier curves with dynamic control points, renders a glowing data visualisation with event-type-specific visual parameters, generates a procedural artistic background in team colours, and composites both layers with optional focal-point alignment to produce a unique visual artwork suitable for physical reproduction on merchandise
- **Why novel:** Existing sports visualisations (Opta, StatsBomb, WhoScored) produce analytical dashboards — shot maps, pass networks, heat maps. Existing merchandise personalisation (Nike By You, Fanatics) lets you add names/numbers to existing designs. **No prior art combines real play-by-play data into generative visual art for wearable merchandise.** This is a new category.
- **Prior art assessment:**
  - *StatsBomb/Opta visualisations:* Analytical, not artistic. Designed for data analysis, not as visual art or merchandise
  - *Nike By You / Fanatics:* Colour selection and name personalisation — does NOT use match data to generate art
  - *Sorare / NBA Top Shot:* Digital collectibles of existing footage — does NOT generate new artwork from data
  - *Generative art (Art Blocks, fxhash):* Procedural art from random seeds — does NOT use real-world sports data as input
  - *Data visualisation art (Jer Thorp, Nicholas Felton):* Artistic data vis exists as a genre, but not applied to sports merchandise at scale
- **Patent classification:** G06T 11/00 (2D image generation), A41D 27/00 (decorated garments), G06Q 30/06 (electronic commerce — merchandise)
- **Strength: STRONG** — No direct prior art found. The combination of real match data → generative art → physical merchandise is genuinely novel.

#### Patent Candidate 2: Focal-Point-Linked Composite Artwork Generation
- **Description:** A method for compositing layered digital artwork where a background pattern layer has a defined focal point (e.g., the convergence centre of a sunburst or the hub of a spider web), and a foreground data visualisation layer has a semantically significant point (e.g., the goal location in a sports path), where the foreground layer is spatially translated so the significant point aligns with the background focal point, producing artwork where the climactic data event coincides with the visual centre of interest
- **Why novel:** Standard image compositing does not consider semantic meaning of content. Focal-point alignment in photography is manual. The automatic linking of a data event's semantic importance to a pattern's visual focal point is a novel composition technique.
- **Prior art assessment:**
  - *Image compositing (Photoshop, GIMP):* Manual layer positioning, no semantic linking
  - *Rule-of-thirds / auto-crop AI:* Aesthetic cropping of photographs — does not create generative patterns with inherent focal points
  - *Data-driven layout (D3.js):* Forces and layouts respond to data, but not dual-layer background/foreground focal linking
- **Patent classification:** G06T 11/60 (editing — compositing), G06T 7/70 (correspondence between images)
- **Strength: STRONG** — Novel composition technique with clear technical implementation.

#### Patent Candidate 3: Seamless All-Over-Print Garment Preview via World-Space UV Projection
- **Description:** A method for previewing all-over-print garment designs in a 3D viewer where: (a) the garment model's UV coordinates are replaced at runtime by computing each vertex's world-space position and mapping it to normalised texture coordinates, producing seamless pattern continuity across garment seams; (b) logo, badge, and text elements are applied as DecalGeometry projected onto the mesh surface; (c) the system detects the device's WebGL capability tier and gracefully falls back to a 2D CSS-mask-based preview that retains the same pattern controls
- **Why novel:** Existing 3D garment viewers (Printful, Printify, Gooten) use standard UV maps that create visible seams in all-over prints. Custom UV remapping at runtime to world-space coordinates is a novel approach. The three-tier progressive enhancement (full 3D → reduced 3D → 2D SVG) with consistent controls is also distinctive.
- **Prior art assessment:**
  - *Printful / Printify 3D mockups:* Use pre-baked UV maps with visible seam artifacts on all-over prints
  - *CLO3D / Browzwear:* Professional garment CAD tools — do NOT run in-browser, not consumer-facing
  - *Nike By You:* Limited pattern placement, not full all-over print preview
  - *Zakeke / Customily:* Shopify product customisers — 2D overlays, not world-space UV projection
- **Patent classification:** G06T 15/04 (texture mapping), G06T 17/20 (3D modelling — clothing)
- **Strength: STRONG** — The world-space UV remapping technique is a distinct technical innovation over standard garment preview tools.

### 3.2 MEDIUM Candidates

#### Patent Candidate 4: Computer Vision Pipeline for Amateur Sports Footage to Generative Art
- **Description:** A system that processes amateur camera footage of a sports match through: YOLO object detection → hybrid tracking (YOLO + optical flow + Kalman filter) → ball trajectory smoothing → scoreboard OCR for goal detection → pitch coordinate homography → export to art-engine-compatible format → generative artwork output. Specifically designed to make professional-grade sports analytics accessible from phone camera footage.
- **Why novel:** Professional sports tracking (Hawk-Eye, Second Spectrum, Opta) uses multi-camera fixed installations costing millions. Amateur sports apps (Hudl, Veo) provide video replay but not data-to-art conversion. The full pipeline from phone footage to wearable art is novel.
- **Prior art assessment:**
  - *Hawk-Eye / Second Spectrum:* Multi-camera professional installations — not amateur
  - *Veo camera:* AI-powered amateur recording — provides tactical analysis, not art generation
  - *Hudl:* Video replay and tagging — manual, not automated tracking-to-art
  - *TrackNet / WASB:* Academic ball detection models — research papers, not commercial products, and not connected to art generation
- **Patent classification:** G06V 20/40 (activities — sports), G06T 11/00 (2D image generation)
- **Strength: MEDIUM** — The individual components (YOLO, Kalman, homography) are standard. The combination into a phone-footage-to-art pipeline is novel, but the CV elements are well-known. Patent scope would be on the end-to-end method rather than individual components.

#### Patent Candidate 5: Impact-Responsive Procedural Pattern Generation
- **Description:** A method for generating procedural visual patterns (Delaunay triangulation, hexagonal grids) where spatial coordinates of significant data events (goals, shots) influence the pattern density and structure — creating denser, smaller elements near impact points and normal-sized elements elsewhere, simulating the visual effect of force applied to a material
- **Why novel:** Standard procedural patterns (Voronoi, Delaunay, hex grids) use uniform or random point distributions. Using real-world event data coordinates to drive non-uniform density — with the specific metaphor of impact/cracking — is a novel data-art technique.
- **Prior art assessment:**
  - *Procedural texture generation:* Uniform or noise-driven — not data-event-driven
  - *Data-driven generative art:* Exists conceptually but not with impact-point density modulation on geometric patterns for merchandise
- **Patent classification:** G06T 11/00 (2D image generation), G06T 11/40 (filling a 2D area with pattern)
- **Strength: MEDIUM** — Novel but narrow. Could be characterised as an obvious extension of procedural generation with data input.

#### Patent Candidate 6: Interactive 3D Goal Reconstruction from Event Data
- **Description:** A method for generating an interactive 3D scene from sports event data that includes: pitch rendering with mowing stripes, real player positions from freeze-frame data, deterministic procedural crowd generation (4,000+ figures), animated ball trajectory with real 3D height, and a "Reality vs Hollywood" toggle showing raw data points versus interpolated visualisation
- **Why novel:** Existing 3D sports replays (FIFA game engine, broadcast graphics) use motion capture or manual animation. This generates the entire 3D scene from StatsBomb event data alone — positions, ball trajectory, even crowd — and runs in a web browser.
- **Prior art assessment:**
  - *FIFA/EA Sports replays:* Pre-rendered from motion capture, not generated from event data
  - *Second Spectrum/WSC Sports:* Broadcast overlays on real footage, not standalone 3D reconstruction
  - *StatsBomb 360 visualisation:* 2D pitch diagrams with player positions, not 3D interactive scenes
- **Patent classification:** G06T 13/40 (animation — sports), A63F 13/00 (games — sports)
- **Strength: MEDIUM** — Impressive technology, but 3D sports visualisation is a crowded space. The specific method of generating from event data (not motion capture) is the differentiator.

#### Patent Candidate 7: Edition-Limited Physical-Digital Linked Merchandise
- **Description:** A system for producing and selling limited-edition merchandise where: each physical item is linked to a unique digital asset, the artwork on each item is procedurally generated from verified real-world event data, edition numbers are enforced across both physical and digital, and tiered scarcity levels (5/25/75/200/500) determine pricing and availability
- **Prior art assessment:**
  - *NBA Top Shot:* Digital-only moments, no physical goods
  - *Sorare:* Digital fantasy cards, no physical merchandise
  - *Supreme/streetwear drops:* Limited editions but no digital link and not data-generated
  - *Nike .SWOOSH:* Digital+physical sneakers but not generated from sports data
- **Patent classification:** G06Q 30/06 (electronic commerce), G06Q 20/12 (payment — tokens)
- **Strength: MEDIUM** — The business method has clear prior art in adjacent spaces. The combination with data-generated art is the novel element, but business method patents are harder to defend.

### 3.3 WEAK Candidates

#### Patent Candidate 8: Team-Colour-Adaptive Camouflage Variant Selection
- **Description:** Automatically selecting a camouflage variant (urban, fire, woodland) based on the luminance and colour temperature of a team's primary colour
- **Strength: WEAK** — Clever but too narrow and likely obvious to a practitioner.

#### Patent Candidate 9: Procedural Crowd Generation with Deterministic Appearance
- **Description:** Generating thousands of crowd figures from a seeded pseudo-random number generator with attribute selection (skin tone, hair style, boot colour, hat probability)
- **Strength: WEAK** — Procedural crowd generation is well-established in games/film VFX. The specific implementation is clean but not novel enough for patent protection.

---

## 4. Trade Secrets

These are innovations better protected by secrecy than by patent (which requires public disclosure):

| # | Trade Secret | Rationale |
|---|-------------|-----------|
| **TS1** | Exact glow parameters per event type (`EVENT_PARAMS` dict) | The specific radius multipliers, brightness values, lightness caps, and falloff exponents took extensive iteration to get right. Competitors would need to reverse-engineer from output images. |
| **TS2** | Background style generation algorithms (all 12 styles) | Each background generator contains hundreds of tuned constants (blob counts, size ranges, layer counts, noise parameters). The overall approach is describable, but the specific parameter space represents significant R&D. |
| **TS3** | Garment decal position configs (`GARMENT_CONFIGS`) | The exact 3D coordinates for badge, logo, name, and number placement on each garment model — required extensive manual tuning per model. |
| **TS4** | Bézier control point offset formula | The specific formula relating cross-product of adjacent segments to perpendicular offset (`min(0.08, cross * 3 + 0.015)`) — produces the characteristic organic path look. |
| **TS5** | Grid-based glow rendering approach | Using a regular grid instead of Voronoi for the glow pass (avoiding scipy dependency) while achieving visually identical results — a non-obvious simplification. |
| **TS6** | Club palette derivation logic | How the camo, geometric, and other styles derive 5+ working colours from just 2 team colours — shift-towards, darken, lighten with specific ratios per variant. |
| **TS7** | CV pipeline tuning parameters | Kalman filter noise covariances, YOLO confidence thresholds, Kalman prediction horizon (15 frames), carry distance threshold (3% of pitch), scoreboard OCR region percentages. |

---

## 5. Copyright-Protectable Works

### 5.1 Software (Code)

All original source code is automatically copyrighted upon creation. Key copyrightable works:

- **Art engine** (`art_engine/` — ~4,500 lines Python): 12 background generators, data renderer, compositor, goal extractors, line effects
- **3D garment viewer** (`components/merch/GarmentViewer3D.tsx` — ~700 lines): World-space UV projection, DecalGeometry system, badge/name texture generators
- **360° goal viewer** (`app/wrexham/360-viewer/page.tsx` — ~2,200 lines): Stadium renderer, crowd generator, ball path animation, freeze-frame visualisation
- **CV pipeline** (`football-cv/` — ~2,000 lines Python): Ball tracking, Kalman smoothing, scoreboard OCR, dataline export
- **Full Next.js application** (~15,000+ lines TypeScript/React): All pages, API routes, components, utilities

### 5.2 Visual Designs

- **Background pattern designs** (12 distinct styles): Each represents a copyrightable artistic work
- **Badge/edition card design**: The gold-riveted moment badge with minute, player, matchup layout
- **Garment template SVGs**: Hoodie, tshirt, longsleeve silhouettes for 2D fallback
- **UI/UX design**: The dark theme with #DA291C accent, the staff dashboard, the configurator layout

### 5.3 Documentation

- Architecture documents (`docs/ART_ENGINE_V2_ARCHITECTURE.md`)
- Knowledge base (`docs/KNOWLEDGE_BASE_2026-03-09.md`)
- Deep dive review (`docs/DEEP_DIVE_REVIEW_2026-03-09.md`)
- Production rules (`docs/GARMENT_PRODUCTION_RULES.md`)

### 5.4 Generated Artwork

Each generated image is a copyrightable work — the combination of procedural background + data visualisation + team colours + specific seed creates a unique creative output.

---

## 6. Competitive Moat Analysis

### 6.1 What's Hardest to Replicate

| Rank | Moat Element | Difficulty to Replicate | Why |
|------|-------------|------------------------|-----|
| 1 | **Full data-to-art pipeline** | Very High | Requires art engine + data pipeline + garment viewer + ordering system — 6+ months of full-stack work minimum |
| 2 | **Art style library (12 backgrounds × data renderer)** | High | Each background style is 200-500 lines of carefully tuned procedural code. A competitor could build ONE style relatively quickly but replicating the breadth of 12+ styles with consistent quality would take months |
| 3 | **World-space UV garment viewer** | High | Non-obvious technique that requires deep Three.js knowledge. Most developers would default to standard UV mapping and get seam artifacts |
| 4 | **CV-to-art bridge** | Medium-High | The individual CV components are standard (YOLO, Kalman), but the full pipeline from phone footage to art-ready data is unique integration work |
| 5 | **360° goal viewer** | Medium | Impressive but ultimately a Three.js scene. An experienced 3D developer could replicate the core concept in 2-3 weeks |
| 6 | **StatsBomb integration** | Medium | Well-documented API. Anyone with a StatsBomb licence could build an integration, but the normalisation pipeline and moment detection add value |
| 7 | **Staff IP management** | Low-Medium | Standard CRUD tool, but the domain knowledge (image rights, branding, background management) is specific |

### 6.2 Competitive Landscape

| Competitor | What They Do | What EmotivX Does Differently |
|-----------|-------------|-------------------------------|
| **Opta / StatsBomb** | Sports data provision + analytical dashboards | EmotivX turns the DATA into ART — visual transformation, not analysis |
| **Nike By You** | Colour/name customisation on existing designs | EmotivX generates UNIQUE artwork from REAL match data — every piece is one-of-a-kind |
| **Fanatics** | Licensed sports merchandise at scale | Mass-produced, not personalised. No data-driven designs. |
| **Sorare** | Digital football trading cards | Digital-only. No physical goods. Generic card designs, not data-generated art |
| **NBA Top Shot** | Digital video "moments" | Clips of existing footage, not new generative artwork |
| **Printful / Printify** | Print-on-demand fulfilment | Infrastructure only — no art generation, no sports data integration |
| **Art Blocks / fxhash** | Generative art platforms | Abstract art from random seeds — no real-world data input, no merchandise |
| **Veo / Hudl** | Amateur sports video platforms | Video recording and replay — no tracking-to-art pipeline |

### 6.3 Key Differentiators

1. **Only platform** that converts real match event data into wearable artwork
2. **Only platform** with a CV pipeline that enables the same product for grassroots/amateur sport
3. **Only 3D garment previewer** with world-space UV projection for seamless all-over print
4. **Only product** combining digital asset tiers with linked physical merchandise where the artwork itself is data-generated
5. **Vertically integrated**: data ingestion → art generation → 3D preview → physical fulfilment — competitors would need to integrate 4-5 separate services

---

## 7. Open-Source Dependencies & IP Risk

### 7.1 Python Art Engine

| Dependency | Licence | Risk |
|-----------|---------|------|
| Pillow (PIL) | MIT/PIL | ✅ No risk — permissive |
| NumPy | BSD | ✅ No risk — permissive |
| SciPy (Delaunay only) | BSD | ✅ No risk — used in broken_glass/honeycomb only |
| Python stdlib (math, colorsys, random) | PSF | ✅ No risk |

### 7.2 CV Pipeline

| Dependency | Licence | Risk |
|-----------|---------|------|
| YOLO (Ultralytics) | AGPL-3.0 | ⚠️ **HIGH RISK** — AGPL requires source distribution if used in a network service. If the CV pipeline is offered as a cloud service, AGPL triggers. **Recommendation:** Use a permissively-licensed detection model for production, or obtain a commercial licence from Ultralytics. |
| OpenCV | Apache 2.0 | ✅ No risk — permissive |
| Streamlit | Apache 2.0 | ✅ No risk — internal tool only |
| WASB-SBDT (ball detection model) | Custom licence | ⚠️ **Check licence** — `models/wasb-sbdt/LICENSE.md` needs review for commercial use |

### 7.3 Web Application

| Dependency | Licence | Risk |
|-----------|---------|------|
| Next.js | MIT | ✅ No risk |
| React | MIT | ✅ No risk |
| Three.js | MIT | ✅ No risk |
| @react-three/fiber, drei | MIT | ✅ No risk |
| DecalGeometry (Three.js examples) | MIT | ✅ No risk — part of Three.js |
| Supabase | Apache 2.0 | ✅ No risk |
| Tailwind CSS | MIT | ✅ No risk |

### 7.4 Summary

The only significant IP risk is **YOLO's AGPL licence** in the CV pipeline. For production deployment:
- **Option A:** Obtain a commercial Ultralytics licence (~$1,500/year)
- **Option B:** Replace with a permissively-licensed model (e.g., RT-DETR, or a custom-trained model)
- **Option C:** Ensure the CV pipeline runs on-premise only (not as a hosted service), which may avoid AGPL network-use trigger — but legal advice needed

---

## 8. Recommendations

### 8.1 Priority Actions (Next 30 Days)

| Priority | Action | Estimated Cost | Rationale |
|----------|--------|---------------|-----------|
| **1** | File provisional patent for Patent Candidate 1 (data-to-art method) | £3,000–5,000 | Strongest IP, core business differentiator. Provisional gives 12 months to file full patent. |
| **2** | File provisional patent for Patent Candidate 3 (world-space UV garment preview) | £3,000–5,000 | Clear technical novelty, easily defensible. |
| **3** | Review YOLO AGPL licence implications with IP lawyer | £500–1,000 | Must resolve before any commercial CV deployment. |
| **4** | Implement copyright notices across all source files | £0 (internal) | Add `© 2025-2026 EmotivX Ltd. All rights reserved.` headers. |
| **5** | Document trade secrets formally with "confidential" marking | £0 (internal) | Create a formal trade secrets register with access controls. |

### 8.2 Medium-Term Actions (30–90 Days)

| Priority | Action | Estimated Cost | Rationale |
|----------|--------|---------------|-----------|
| **6** | File provisional patent for Patent Candidate 2 (focal-point linking) | £3,000–5,000 | Strong but more niche than #1. |
| **7** | File provisional patent for Patent Candidate 4 (CV-to-art pipeline) | £3,000–5,000 | Medium strength but high strategic value for grassroots market. |
| **8** | Register software copyright with UK IPO | £200–500 | Low cost, adds a layer of formal protection. |
| **9** | Review WASB-SBDT model licence for commercial use | £500 (legal) | Ensure the ball detection model is clear for production. |

### 8.3 Long-Term Actions (90+ Days)

| Priority | Action | Estimated Cost | Rationale |
|----------|--------|---------------|-----------|
| **10** | Convert strongest provisional patents to full patent applications | £15,000–25,000 each | Only convert the 2-3 strongest candidates after market validation. |
| **11** | Consider PCT (international) filing for strongest patent | £5,000–10,000 | If expanding beyond UK, file within 12 months of provisional. |
| **12** | Explore design registrations for visual pattern styles | £1,000–2,000 | Registered designs protect the visual appearance of background styles. |
| **13** | Conduct freedom-to-operate search before scaling | £5,000–10,000 | Ensure no existing patents block the commercial offering. |

### 8.4 Estimated Total IP Budget

| Phase | Cost Range |
|-------|-----------|
| Immediate (30 days) | £6,500–11,000 |
| Medium-term (90 days) | £9,700–15,500 |
| Long-term (12 months) | £26,000–47,000 |
| **Total first year** | **£42,200–73,500** |

---

## 9. Appendix: File Inventory

### Art Engine (`art_engine/`)
- `compositor.py` — Layer compositing with focal linking
- `data_renderer.py` — Glowing data path renderer
- `colour_utils.py` — Palette distribution
- `goal_extractor.py` — StatsBomb event extraction
- `goal_extractor_360.py` — 360 format with 3D height
- `moment_generator.py` — Match data → artwork wrapper
- `api_generate.py` — Legacy generation API
- `line_effects.py` — Line effect presets
- `renderer.py` — Legacy renderer
- `style_factory.py` — Style selection
- `mockup_hoodie.py`, `mockup_tshirt.py` — 2D mockup generators
- `backgrounds/` — 12 background generators (camo, geometric, jackson, spider, sunburst, street, classic, tron, fractals, broken_glass, honeycomb, pebbles)
- `styles/` — Legacy style system (9 styles: base, camo, classic, dali, futuristic, geometric, jackson, marble, smoky, street)

### CV Pipeline (`football-cv/`)
- `app.py` — Unified Streamlit dashboard
- `ball_smoother.py` — Kalman filter trajectory smoothing
- `scoreboard_ocr.py` — Score change detection
- `export_datalines.py` — Art-engine-compatible export
- `tracknet_ball_tracker.py` — TrackNet-based ball detection
- `wasb_ball_tracker.py` — WASB model ball detection
- `live_monitor.py` — Live monitoring
- `process_match.py` — Full pipeline orchestrator
- `visualise.py` — Trajectory visualisation
- `analytics.py` — Match analytics
- `camera_cuts.py` — Camera cut detection

### 3D Components (`components/merch/`)
- `GarmentViewer3D.tsx` — Core 3D viewer with world-space UV
- `GarmentViewerWithFallback.tsx` — WebGL tier gating
- `FlatGarmentFallback.tsx` — 2D SVG-masked fallback
- `HoodieViewer3D.tsx` — Hoodie-specific viewer
- `ProductMockup.tsx` — Product mockup component
- `GarmentPreview.tsx` — Preview component
- `EditionCard.tsx` — Edition card component

### 360° Viewer
- `app/wrexham/360-viewer/page.tsx` — Full interactive 3D stadium scene (~2,200 lines)

---

*This report is based on a thorough reading of every source file in the EmotivX ecosystem as of 11 March 2026. Patent strength assessments are informed opinions, not legal advice — formal patent searches and opinions should be obtained from a registered patent attorney before filing.*
