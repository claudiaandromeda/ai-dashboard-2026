# Zakeke 3D Models Research — EmotivX

**Date:** 2026-03-06  
**Purpose:** Determine whether Zakeke's 3D garment models can be accessed for use in our own Three.js/React Three Fiber viewer, and identify the fastest legitimate path to production-accurate GLBs for Printful's garment range.

---

## TL;DR / Executive Summary

**Can we get Zakeke's models? No.** There is no API endpoint, export mechanism, or licensing path to extract Zakeke's 3D garment assets. Their models are proprietary, served from a private CDN, and their ToS explicitly prohibit copying or extracting assets.

**The fastest legitimate path to accurate Printful garment GLBs is a freelancer commission using Marvelous Designer or CLO3D**, referencing Printful's published tech pack specs. Cost: ~$100–$200 per garment. Delivery: 3–7 days. One well-made hoodie GLB is a reusable asset you own outright.

---

## 1. Zakeke API — What It Exposes

Zakeke has a documented public API at `https://api.zakeke.com/` (docs: `https://docs.zakeke.com`), using REST + OAuth S2S authentication.

**What the API covers:**
- Orders management (`GET /v2/orders`)
- Designs — customer-generated customisations, including print-ready file generation (PNG, JPG, PDF, SVG, DXF)
- Compositions — product configurations
- Integration hooks for non-supported e-commerce platforms

**What the API does NOT cover:**
- No endpoints for 3D model retrieval (no `/models`, no GLB download, no GLTF export)
- No endpoints for the 3D Asset Manager/DAM
- 3D asset management appears entirely UI-only (back-office only)

**Key quote from their docs:**  
> "If your intention is solely to utilise the 3D&AR Viewer, no integration is required. Simply create an account, upload your 3D models, and generate the link or iframe URL. No API integration required."

This framing confirms that 3D models are a one-way upload — you put models *in*, you don't pull them *out*.

The React SDK (`zakeke-configurator-react`) provides `useZakeke` hook and `<ZakekeViewer>` component. There is an `exportSceneToGlb()` method, but this exports the *customer's customised design* (i.e., your design applied to the model), not the underlying garment mesh itself. The GLB produced would contain your artwork baked in, and extracting a clean base mesh from it would be non-trivial and ToS-violating.

**Verdict:** No legitimate API path to model extraction.

---

## 2. Where Do Zakeke's Garment Models Come From?

Based on research:

- **Merchants upload their own 3D files** (GLB, OBJ, FBX) or have Zakeke's team create them from product photos
- **For Printful-integrated products**, Zakeke creates or supplies the 3D previews as an enhancement layer — but these are Zakeke-owned or created specifically for their platform
- There is no evidence of a direct licensed pipeline from Printful → Zakeke for 3D models; Printful provides product data and print specs, not model files
- **CLO3D is the industry-standard tool** Zakeke recommends merchants use to create source models before upload — Zakeke is not licensing CLO3D models themselves for distribution

**Bottom line:** Zakeke's garment models are either (a) created in-house by Zakeke's own 3D artists, or (b) uploaded by merchants who commissioned them. Either way, they're proprietary to Zakeke or their merchant clients — not available to third parties.

---

## 3. Zakeke Embed/Widget — Technical Architecture

The 3D viewer embeds as either:

1. **iFrame** — from Zakeke DAM: copy script → embed in HTML/Shopify/WordPress. No JS-level access to model internals.
2. **React SDK** — `zakeke-configurator-react` package. Renders via `<ZakekeViewer>` which fetches GLB models from Zakeke's CDN internally.

**CDN model URL accessibility:**
- Models are loaded from Zakeke's private CDN based on a `modelCode` query parameter
- CDN domains are not publicly documented
- Files are Draco-compressed GLBs optimised for web delivery
- You could theoretically intercept CDN URLs via browser DevTools Network tab while viewing a Zakeke-powered store — BUT:
  - This would only work if you have an active Zakeke subscription with a Printful product set up
  - The URLs would be signed/ephemeral or access-controlled
  - Downloading and using them would be a clear ToS violation and likely copyright infringement
  - This path is **legally and ethically a non-starter**

---

## 4. Zakeke Pricing & Terms — Key Findings

**Pricing (2025/2026):**
| Plan | Monthly | Annual | Products | Transaction Fee |
|------|---------|--------|----------|-----------------|
| Starter | $79.90 | ~$815/yr | Up to 5 | 1.9% |
| Grow | $199.90 | ~$2,039/yr | Up to 25 | 1.7% |
| Scale | $399.90 | ~$4,079/yr | Up to 50 | 1.5% |

**No plan gives you 3D model asset access.** Higher plans add white-labelling and more products, not model downloads.

**ToS — key restrictions:**
- Explicitly prohibits "copying and/or downloading and/or sharing... altering, publishing, transmitting, selling, sub-licensing, processing, transferring/granting to third parties or creating works that derive in any way from the content"
- Third-party content (including uploaded models) remains property of those third parties; Zakeke holds operational rights only
- Assets deleted 6 months after subscription ends — no export pathway
- Jurisdiction: Italian law

**Conclusion:** Even a paid enterprise subscription provides no mechanism or rights to export or reuse model assets outside Zakeke's platform.

---

## 5. Alternatives to Zakeke

### Customily
- Has a JavaScript Preview API with `setProduct(templateGuid)` — but this loads Customily's configurator widget, not exposes raw 3D assets
- Integrates with Printful for order fulfilment
- Same fundamental limitation: the 3D viewer is the product, not the underlying asset
- No evidence of model file access for third parties

### Printify
- Has 3D interactive previews (drag-to-rotate) in their product editor
- REST API returns mockup image URLs only — no 3D model files
- Not designed as a 3D asset platform

### Gelato
- Offers 3D viewer for some product categories (embroidery, hats, home décor)
- No public API for 3D model assets
- Same walled-garden approach

### Printful
- Provides 2D mockup generator and Shopify AR previews for some products
- Does NOT expose 3D model files via any API
- Their mockup system is proprietary

**Pattern across all POD platforms:** 3D viewers are competitive differentiators built on proprietary or licensed assets. None of them expose the underlying garment meshes to third parties. This is by design.

---

## 6. The CLO3D / Marvelous Designer Route

**Is Marvelous Designer the right tool?** Yes, and so is CLO3D — they are effectively the same product (CLO Virtual Fashion acquired Marvelous Designer; the tools share significant overlap). Both are industry-standard for production-accurate garment simulation.

### Recommended Tool: CLO3D (preferred for fashion/garments)
- Native GLB/GLTF export: File → Export → glTF 2.0 (GLB)
- Supports UV mapping, 4K textures, Draco compression
- Export settings: Unified UV Coordinates, weld seams, combined mesh
- Output is clean, production-accurate, web-ready
- **Price:** $50/month or $450/year (individual); student: $25/month

### Marvelous Designer (also valid)
- More accessible for beginners
- Export path: OBJ/FBX → optimise in Blender → export GLB
- Slightly more post-processing required vs CLO3D's native GLB export
- **Price:** ~$39/month or $280/year

### Workflow for One Accurate Printful Hoodie GLB

1. **Source Printful's specs** — download size charts and print area specs from Printful product pages. These give chest width, body length, sleeve length, hood dimensions per size.
2. **Build or commission 2D patterns** matching the Printful spec (or start from a CLO3D template hoodie and adjust to match measurements)
3. **Simulate in CLO3D** — assign appropriate fabric preset (fleece/cotton blend), simulate drape, add details (kangaroo pocket, drawstring eyelets, ribbed cuffs)
4. **Optimise** — retopologise to ~10-30k polys for web; bake normal map from hi-res sim
5. **Export** — GLB with embedded PBR textures (albedo, normal, roughness, metallic)
6. **Import into Three.js/R3F** — done

### Realistic Time & Cost

| Route | Time | Cost | Notes |
|-------|------|------|-------|
| DIY in CLO3D (you learn it) | 2–4 weeks to proficiency + 1–3 days per garment | $50/month software | Steep learning curve; not recommended for tight timeline |
| Freelancer via Upwork/Fiverr | 3–7 days per garment | **$100–$200** per garment (accurate, with source files) | **Recommended path** |
| Freelancer (Fiverr basic) | 1–3 days | $20–$50 | Lower accuracy; probably not production-matched to Printful specs |

**For EmotivX:** Commission one high-quality hoodie GLB from an experienced CLO3D/Marvelous Designer freelancer on Upwork. Provide them:
- Printful's size chart for your target garment (e.g., AOP Unisex Hoodie)
- Reference photos of the actual garment
- Your UV map requirements (flat, full-coverage for all-over-print)
- Delivery: source file (.zprj) + optimised GLB + UV template PNG

Budget: **$150–$250** for a production-accurate hoodie GLB you own outright, with source files for future revisions.

---

## 7. Other Routes to Printful-Accurate 3D Models

### CLO-SET Connect (connect.clo-set.com)
- Official CLO marketplace for 3D garment assets
- Hoodies available, free and paid
- Formats: .zprj (CLO source), exportable to GLB
- **Licensing caveat:** Most models licensed for internal prototyping, not commercial resale. Extended commercial licenses available on some listings (typically 2x base price). Must verify per listing.
- **Suitability:** Could work as a starting point for a freelancer to modify to Printful specs — cheaper than building from scratch

### CGTrader / RenderHub / Sketchfab
- Large libraries of hoodie models in FBX/OBJ/GLB/GLTF
- CGTrader: 3,000+ hoodie models, royalty-free commercial licenses available
- RenderHub: CLO3D-origin files with Extended Use commercial licenses
- **Accuracy caveat:** Generic models, not matched to Printful's specific garment specs. Would require adaptation.
- **Best use:** Buy a high-quality CLO3D hoodie file as a base, commission minor modifications to match Printful specs. Probably $50–$80 base model + $50–$100 freelancer adaptation = ~$130–$180 total.

### Academic Datasets (ClothesNet, GarmentCodeData, Deep Fashion3D)
- Open-source for research purposes
- ClothesNet: ~4,400 meshes, 11 categories, includes tops
- GarmentCodeData: 115k+ garments with sewing patterns
- **Issue:** Research-grade topology — not web-optimised, no commercial-quality textures, not matched to specific products. Heavy processing required.
- **Verdict:** Too much work for our use case. Not recommended.

### AI-Generated Garment Models (Meshy.ai, etc.)
- Tools like Meshy.ai generate GLB models from text/image prompts for free
- Quality is improving rapidly but not yet production-accurate for specific garment specs
- Good for rapid prototyping or placeholder models
- **Not recommended for final EmotivX viewer** — accuracy matters for premium positioning

### Blender + Cloth Simulation (DIY)
- Build from scratch using Blender's cloth sim
- Technically viable; Blender is free
- Getting Printful-accurate results requires significant Blender expertise
- Much lower accuracy ceiling than CLO3D/Marvelous Designer for garments
- **Not recommended** unless you already have deep Blender skills

---

## Recommendation

### Short Answer
**Do not pursue Zakeke models.** No API access, no asset export, ToS prohibits it, and attempting to extract via network interception is both technically uncertain and legally risky.

### Recommended Path: Commission Freelancer on Upwork

1. **Find a CLO3D specialist on Upwork** with fashion tech experience (search: "CLO3D garment 3D model GLB")
2. **Provide the brief:**
   - Target garment: Printful [product name + SKU]
   - Reference: Printful size chart (Medium dimensions as primary target)
   - Use case: web viewer (React Three Fiber), all-over-print UV layout
   - Deliverables: `.zprj` source file + web-optimised GLB (<5MB, max 30k tris) + UV template PNG
3. **Budget:** $150–$250 for hoodie with source files
4. **Timeline:** 5–7 days
5. **Own it completely** — no licensing strings, no platform dependency

### For future garments
Once you have one model commissioned, subsequent garments (t-shirts, caps, etc.) should cost less — the freelancer understands your spec requirements and can reuse elements.

### Longer term (if volume grows)
Consider a CLO3D subscription ($450/year) and hire a part-time 3D fashion artist. Building your own model library at scale becomes economical when you need 5+ garment types.

---

*Researched: 2026-03-06 | Sources: Zakeke docs, web research, Perplexity Sonar Pro*
