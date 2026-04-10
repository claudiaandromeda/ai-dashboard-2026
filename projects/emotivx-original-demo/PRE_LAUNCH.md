# EmotivX — Pre-Launch Checklist
> **Rule:** Anything that's "good enough for demo but needs fixing before real customers pay money" goes here.
> Add items freely. Review and prioritise before the Wrexham pitch goes live.

---

## 🧥 3D Garment Viewer

### GLB Model Normalisation
**Status:** Demo-ready workaround in place (normalise to width=x axis)
**Problem:** Each GLB model has a different internal scale and orientation baked in. The hoodie is "landscape" (maxDim = width), the t-shirt is "portrait" (maxDim = height after a 90° X rotation baked into the node). This causes the t-shirt to render smaller and the camera distance to feel wrong.
**Fix:** Re-export all GLB models through `gltf-transform` (or Blender) to:
- Bake all node transforms (rotation, scale) into geometry
- Normalise to a consistent unit size (e.g., all garments exactly 1.0 unit wide at shoulder seam)
- Re-upload normalised GLBs to Supabase `models/` bucket
- Remove the per-garment `groupScale`/`groupPos` workaround from `GarmentMesh`
**Reference:** `components/merch/GarmentViewer3D.tsx` — `GarmentMesh` useMemo, `findBodyMesh`
**Effort:** ~2–4 hours per model in Blender, or scriptable via `gltf-transform` CLI

### Per-Garment Camera Distance
**Status:** Fixed camera settings tuned for hoodie, other garments inherit same values
**Fix:** Add `initialZoom` and `defaultCameraAngle` to `GARMENT_CONFIGS` per model
**Reference:** `GarmentViewer3D` → `OrbitControls` `minDistance`/`maxDistance`

### Decal Positions for Long Sleeve
**Status:** Inherits t-shirt config (`LONGSLEEVE_CONFIG = { ...TSHIRT_CONFIG }`) — NOT tuned
**Fix:** Tune `LONGSLEEVE_CONFIG` positions the same way hoodie and t-shirt were tuned
**Reference:** `GarmentViewer3D.tsx` → `LONGSLEEVE_CONFIG`

### DecalGeometry on Seams
**Status:** Worked around with large projection depth values (e.g. `depth=0.28`)
**Fix:** Investigate using a raycaster to find the exact surface normal at each decal position, then use that as the decal orientation — gives tighter, cleaner projections on curved surfaces
**Reference:** `GarmentViewer3D.tsx` → `DecalMesh` component

---

## 💰 Pricing & E-Commerce

### Logo and Name/Number Pricing
**Status:** Logo = £5, Name/Number = £10 — placeholder values, not validated
**Fix:** Confirm pricing strategy with David. Check Printful surcharges for personalisation

### Printful Order Payload — Toggles Not Wired
**Status:** Logo and name/number toggle state exists in UI but is NOT yet passed to the Printful order API payload
**Fix:** When building the Printful order, conditionally include `pocket` / `label_panel` placements based on `showLogo` and `includeNameNumber` toggle state
**Reference:** `app/merch-preview/page.tsx` → order submit handler; `PLACEMENT_KEYS` in Printful docs

### Printful AOP Hoodie Product ID
**Status:** Product 388 tested manually — needs full end-to-end order flow test with real variant selection
**Fix:** Run full Printful draft order → confirm → cancel cycle with a real size/colour selection

---

## 🎨 Art Generation

### Art Texture Resolution
**Status:** 2048px width — Printful recommends 6000×6000px at 150dpi for AOP
**Fix:** Scale art generation to 6000px output (check art server memory/timeout limits first)
**Reference:** `art_server/main.py`; Printful product 388 printfile spec (200 = 6000×6000)

### Art Style Coverage
**Status:** Only `geometric` style confirmed working end-to-end with real StatsBomb data
**Fix:** Test `street` and `futuristic` styles with real moment data; ensure art server handles all 3

---

## 🔐 Security & Infrastructure

### Gateway Token Mismatch
**Status:** `openclaw system event` fails — `gateway.remote.token` ≠ `gateway.auth.token` in `~/.openclaw/openclaw.json`
**Fix:** Rotate and resync gateway tokens on both Mac mini and Elliot

### Cloudflare Named Tunnel
**Status:** Deferred — not needed until full production Vercel deploy
**Fix:** Register domain in Cloudflare, create named tunnel, point at Vercel/art server

### Session Transcripts in Git
**Status:** Scrubbed from history via `git filter-repo`; `.gitignore` updated
**Fix:** ✅ Done — but verify `.gitignore` rule survives any future repo clones/forks

---

## 🧪 Testing & QA

### Mobile Responsive Polish
**Status:** Desktop-first, not tested on mobile
**Fix:** Test merch-preview on iOS Safari and Android Chrome; 3D viewer may need fallback on low-end devices

### WebGL Tier Detection
**Status:** `getWebGLTierCached()` falls back to `FlatGarmentFallback` — fallback not styled for merch-preview
**Fix:** Polish the flat fallback so it looks intentional, not broken

### End-to-End Order Flow
**Status:** Never run with a real Stripe/Printful live key
**Fix:** Full E2E test: select moment → choose garment → add customisation → checkout → Printful draft order → confirm

---

## 📋 How to use this file
- **Adding items:** Paste a `###` block with Status / Fix / Reference
- **Clearing items:** Change `**Status:**` to `**Status:** ✅ Done — <date>`; don't delete (keep for audit trail)
- **Prioritising:** Move items above the fold if they block launch; leave nice-to-haves at the bottom

_Last updated: 2026-03-07_
