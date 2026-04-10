# Printful API Integration Research — EmotivX
**Research Date:** 2026-03-06  
**Scope:** Deep technical investigation for EmotivX premium sports merch platform  
**Question:** Can Printful's API power a headless Next.js storefront with 3D viewer integration for all-over print products?

---

## Executive Summary

**Short answer: Yes — but with a crucial caveat on the 3D viewer.**

Printful's API is genuinely capable of powering a fully headless Next.js storefront. The "works best through Shopify" perception is largely a myth perpetuated by non-developer Printful users — the direct API is a proper, well-documented REST API that supports the complete commerce lifecycle without touching Shopify at all.

However, the critical ask — **feeding Printful's product models directly into your Three.js viewer** — hits a hard wall: **Printful does not expose GLB/GLTF files, UV maps, or any 3D model assets via API**. Their 3D AR viewer (launched 2022) is Shopify-only and proprietary. There is no way to obtain their 3D model geometry or UV maps for external use.

**What IS possible:**
- Full headless storefront: Printful API → Next.js → customer checkout ✅
- Programmatic mockup generation: pass artwork URL → get 2D rendered product image ✅
- AOP product catalogue access: 90+ products queryable via API ✅
- Artwork upload pipeline: POST file or URL → Printful stores it → reference in orders ✅
- Webhook-driven fulfilment automation ✅

**What is NOT possible:**
- Getting GLB/GLTF models from Printful API ❌
- Embedding their 3D viewer outside Shopify ❌
- Getting UV maps for their specific product shapes ❌
- Real-time 3D texture preview using Printful's geometry ❌

**Recommended path for EmotivX:** Source UV-mapped GLB models independently (Blender, CGTrader, or custom-modelled from manufacturer specs), run the Three.js viewer with those models, generate Printful mockups via API for product listings, and integrate direct Next.js → Printful API for orders. Do not use Shopify.

---

## 1. Printful API Capabilities — Full Breakdown

### API Versions
- **v1:** `https://api.printful.com/` — stable, documented, production-ready
- **v2 (beta):** `https://api.printful.com/v2/` — enhanced, actively developed, recommended for new builds
- **Docs:** https://developers.printful.com/docs/ (v1) | https://developers.printful.com/docs/v2-beta/ (v2)
- **Postman collection** available for download

### Authentication
Two modes:
1. **Private Tokens** — for single-store direct use. Generate in Developer Portal. Pass as `Authorization: Bearer {token}`. Token doesn't expire. Multi-store: add `X-PF-Store-Id` header.
2. **Public Apps / OAuth** — for multi-tenant apps (if you want customers to connect their own Printful accounts). Full OAuth flow; access tokens expire hourly, must refresh. Suitable for a marketplace model.

For EmotivX (single store, founder-controlled), private tokens are the right choice.

### API Scopes Available
- `orders` (read/write)
- `sync_products` (read/write)
- `file_library` (read/write)
- `webhooks`
- `product_templates`
- `embedded_designer` (enterprise only)

### Rate Limits
- General: **120 requests/minute** (leaky bucket algorithm in v2)
- Mockup generation: lower limits apply (roughly 10 req/60s for task creation)
- Exceeded: `429` response with `X-Ratelimit-Remaining` and `X-Ratelimit-Reset` headers
- For a PoC with low volume this won't be an issue

### Product Catalogue API
- `GET /v2/catalog-products` — paginated product list with filters:
  - `category_ids` — filter by category
  - `techniques` — e.g., `dtg`, `sublimation`, `cut-sew`
  - `colors`, `placements` (front/back)
  - Sorting: new, price, bestseller
- `GET /v2/catalog-products/{id}` — full product detail including variants, techniques, placements, print area dimensions, size guides
- `GET /v2/catalog-variants/{id}/prices` — pricing by region/currency
- `GET /v2/catalog-products/{id}/mockup-styles` — available mockup styles for that product
- Supports DSR (Default Selling Region: `worldwide`, `north_america`, etc.)

### Order Management
- `POST /v2/orders` — create draft order
- `POST /v2/orders/{id}/confirm` — confirm draft for fulfilment
- `POST /v2/order-estimation-tasks` — estimate cost/shipping before confirming
- `POST /v2/orders/{id}/order-items` — add items to draft (cart-like flow)
- `PATCH/DELETE /v2/orders/{id}/order-items/{item_id}` — modify/remove items from draft
- Items specify: `catalog_variant_id`, `quantity`, `source: "catalog"`, `placements` array

### File Library
- `POST /files` — upload artwork file (multipart or URL)
  - Max size: 200MB
  - Max dimensions: 20,000px
  - Formats: PNG (preferred), JPG
  - Color profile: sRGB
- Returns file `id` and `hash` for reuse in orders/sync products

### Webhooks (v2 — Secure)
- HTTPS-only with request signing
- Events: `order_created`, `order_updated`, `order_failed`, `order_canceled`, `package_shipped`, `package_returned`, `stock_updated` (every 5 min), `mockup_task_finished`, `catalog_price_changed`
- Configure via `POST /v2/webhooks`

### Shipping
- `POST /v2/shipping-rates` — estimate shipping for a given cart/recipient
- Real-time rates based on destination, product weight, carrier

### Other Endpoints
- Tax calculation API
- Warehouse products API
- Approval sheets API (for products needing print approval)
- Reports/statistics API
- Store information API

### What the API CANNOT do
- Expose 3D models or UV maps
- Generate custom size charts (retrieve existing ones only)
- Provide real-time inventory counts (stock webhooks are delayed, ~5 min)
- Handle payment processing (that's your job — Stripe, etc.)

---

## 2. All-Over Print (AOP) Product Catalogue

### Printing Technologies
Printful uses two AOP methods:
1. **Dye-sublimation (synthetic/polyester):** Heat transfers dye-based inks into polyester fibres. Vivid colours, soft hand feel, extremely durable. The gold standard for AOP activewear.
2. **Direct-to-fabric / DTF (cotton — new ~2025):** Water-based inks applied directly to cotton before cut-and-sew. Softer, matte finish. Less vibrant than sublimation but breathable.

Both are **seam-to-seam** — fabric is printed first, then cut into panels and hand-sewn.

### Product Categories (90+ items across 15+ categories)

#### **Apparel — Activewear / Sports (most relevant for EmotivX)**
| Product | Tech | Notes |
|---------|------|-------|
| All-Over Print Men's Athletic T-Shirt (#103) | Sublimation | Moisture-wicking polyester |
| All-Over Print Unisex Athletic Long Shorts (#304) | Sublimation | Sports shorts |
| All-Over Print Yoga Leggings (#302) | Sublimation | Polyester-spandex blend |
| All-Over Print Leggings (#301) | Sublimation | Classic cut |
| All-Over Print Flare Leggings (#3015) | Sublimation | Flare cut |
| All-Over Print Recycled Leggings with Pockets | Sublimation | Eco option |
| All-Over Print Men's Joggers | Sublimation | Full print joggers |
| All-Over Print Longline Sports Bra | Sublimation | Women's activewear |
| All-Over Print Rash Guard | Sublimation | Great for sports branding |

#### **Apparel — Hoodies / Sweatshirts**
| Product | Tech | Notes |
|---------|------|-------|
| All-Over Print Unisex Hoodie | Sublimation | Core product, polyester |
| All-Over Print Recycled Unisex Hoodie | Sublimation | Eco-friendly |
| All-Over Print Unisex Cotton Hoodie | DTF | New cotton range |
| All-Over Print Unisex Cotton Sweatshirt | DTF | New cotton range |

#### **Apparel — T-Shirts**
| Product | Tech | Notes |
|---------|------|-------|
| All-Over Print Men's Cotton Crew Neck T-Shirt | DTF | New cotton, matte |
| All-Over Print Women's Cotton Crew Neck T-Shirt | DTF | New cotton range |
| All-Over Print Kids Cotton Crew Neck T-Shirt | DTF | Kids sizing |
| All-Over Print Youth Cotton Crew Neck T-Shirt | DTF | Youth sizing |

#### **Accessories / Other**
| Product | Tech | Notes |
|---------|------|-------|
| All-Over Print Drawstring Bag (#262) | Sublimation | Bags |
| All-Over Print Tote Bag | Sublimation | — |
| All-Over Print Backpack | Sublimation | — |
| All-Over Print Fanny Pack | Sublimation | — |
| AOP Throw Pillow (various sizes) | Sublimation | Home goods |
| AOP Swimsuit (one-piece) | Sublimation | — |
| AOP Bikini | Sublimation | — |
| AOP Snapback Cap (panel-printed) | Sublimation | Not fully AOP |

> **Note:** The full product list evolves constantly. Query the API: `GET /v2/catalog-products?techniques=CUT-SEW` or filter by category to get current IDs and variants.

### Artwork / Template Specifications

| Spec | Requirement |
|------|-------------|
| **Minimum DPI** | 150 DPI |
| **Recommended DPI** | 300 DPI |
| **File format** | PNG (preferred for transparency) or JPG |
| **Max file size** | 200 MB per file |
| **Max pixel dimensions** | 20,000 × 20,000 px |
| **Color profile** | sRGB |
| **Bleed** | Full bleed to template edges (approx 3mm / 0.125") |
| **Safe zones** | Key design elements must stay 2" inside seam lines |
| **Panel layout** | Upload single full-coverage file; Printful handles panel scaling |
| **Design coverage** | Must cover entire print area — partial coverage prints white on fabric |

**Key insight for EmotivX:** Your AI-generated artwork will need to be a single full-bleed image sized to the product template for the largest size variant (e.g., XXL). Printful scales it proportionally for smaller sizes. The template files are available per product in the Printful Design Maker — download them for reference dimensions. For API orders, the print area dimensions are returned in `GET /v2/catalog-products/{id}` as `print_area_width` and `print_area_height` per placement.

---

## 3. Mockup Generator API — Critical for EmotivX

This is the most important API surface for your product listing pipeline. **Printful DOES expose a proper programmatic mockup API.**

### How It Works (v1 — stable)

**Step 1: Get print file specs**
```
GET /mockup-generator/printfiles/{product_id}
```
Returns: available placements (front/back/full), print area dimensions in pixels, DPI requirements, available mockup styles (lifestyle, flat lay, ghost mannequin, etc.)

**Step 2: Create a mockup task**
```
POST /mockup-generator/create-task/{product_id}
```
Body:
```json
{
  "variant_ids": [4012, 4013],
  "files": [{
    "placement": "front",
    "image_url": "https://your-cdn.com/artwork-design.png",
    "position": {
      "area_width": 1800,
      "area_height": 2400,
      "width": 1800,
      "height": 1800,
      "top": 300,
      "left": 0
    }
  }],
  "format": "png"
}
```
Returns: `task_key` and `status: "pending"`

**Step 3: Poll for result**
```
GET /mockup-generator/task?task_key={key}
```
Poll every 10+ seconds until `status: "completed"`. Response contains:
```json
{
  "status": "completed",
  "mockups": [
    {
      "variant_ids": [4012],
      "placement": "front",
      "mockup_url": "https://cdn.printful.com/mockup-image.jpg",
      "extra": [...]
    }
  ]
}
```
**IMPORTANT:** Mockup URLs are **temporary** — they expire after ~24 hours. Download and store them in your own CDN immediately.

**Step 4 (alternative): Use webhook**
Set up `mockup_task_finished` webhook to receive results via POST to your server — better than polling for production.

### v2 Beta Mockup API
```
POST /v2/mockup-tasks
GET  /v2/mockup-tasks/{id}
GET  /v2/catalog-products/{id}/mockup-styles
```
Same concept; v2 supports multi-layer designs and richer placement control.

### Mockup Types Available
- Flat lay / ghost mannequin
- Lifestyle shots (model wearing product)
- Various angles and background colours
- Controllable via `option_groups` in the request

### Rate Limits for Mockups
- More restrictive than general API — approximately 10 tasks/60 seconds
- For a product setup pipeline, batch during off-hours
- For real-time generation (user uploads artwork → see it on product), cache aggressively

### For All-Over Print Products
- AOP products use `full_aop` or similar placement names — check per product via printfiles endpoint
- The artwork fills the entire print area; no position offset needed (or set to 0,0 at full dimensions)
- Works the same as standard products — just larger print areas

### Practical Pipeline for EmotivX
```
AI generates artwork
→ Upload to your CDN (get public URL)
→ POST to Printful mockup API with product variants
→ Poll for completion OR await webhook
→ Download mockup images → store in your CDN
→ Serve mockup images as product listing photos
→ On order: POST to /v2/orders with same artwork URL in placements
```

---

## 4. Printful 3D Viewer / Configurator — The Hard Truth

### What Printful Has Internally
- Their **Design Maker** tool has 3D product preview capability
- In **August 2022**, they launched **AR/3D product models for Shopify** — reportedly the first POD service to do this
- These 3D models let Shopify customers view products in 360° and place them in their environment via AR

### What's Available to Developers — NOTHING
- **No GLB/GLTF model downloads via API**
- **No UV map access**
- **No embeddable 3D viewer widget** (the Shopify AR is Shopify-native, not embeddable elsewhere)
- **No documentation** around 3D model assets for developer use
- **No API endpoints** for 3D geometry of any kind

The 2022 Shopify 3D launch was a consumer-facing feature that works through Shopify's native 3D model product field — Printful auto-populates it, but the models are not accessible outside Shopify's ecosystem.

### The Embedded Design Maker (EDM) — Not What You Need
Printful does have an embeddable iframe design tool (`PFDesignMaker`), but:
- Requires **enterprise approval** (not self-serve) — must apply at printful.com/enterprise/embedded-design-maker
- It's a **2D design editor** (like a basic Canva), not a 3D viewer
- No GLB or UV map exposure
- Not suitable for a premium sports art brand experience anyway

### Conclusion for EmotivX 3D Viewer
**Printful cannot feed 3D models into your Three.js viewer.** You must source GLB models independently. Options:

1. **CGTrader / Sketchfab** — purchase UV-mapped garment GLB models (~$20-80/model)
2. **Blender custom modelling** — model from reference images of Printful products (requires 3D artist time)
3. **CLO3D** — professional virtual fashion tool; export GLB with accurate UV maps
4. **Manufacturer specs** — request technical flat patterns from Printful (possible via their enterprise team) and model from those

Your existing approach of using custom GLB models is correct. The integration point with Printful is: **your artwork texture → applied to your GLB UV → rendered in Three.js** (for the interactive viewer) + **same artwork URL → Printful mockup API** (for product listing images).

---

## 5. Direct API vs Shopify — Definitive Answer

### The Myth
"Printful works best through Shopify" is said by:
- Non-developers who find the Shopify app easier to set up
- Influencers who use Printful's Shopify sync tool for their dropshipping tutorials
- People who don't know the API exists

### The Reality

| Feature | Direct API | Shopify + Printful App |
|---------|------------|------------------------|
| **Setup complexity** | Moderate (OAuth, REST endpoints) | Very easy (install app, click buttons) |
| **Storefront control** | Total control | Limited to Shopify themes/Hydrogen |
| **Product sync** | Manual via API | Automatic bidirectional sync |
| **Order routing** | Programmatic via API | Auto-forwarded by app |
| **Pricing control** | Full programmatic control | Set in Printful dashboard |
| **Mockups** | Full API access | Generated in Printful UI, synced to Shopify |
| **Shipping rates** | Calculate via API | Auto-synced to Shopify rates |
| **3D AR** | Not available | Available (Shopify native) |
| **Embedded designer** | Enterprise only | Standard app feature |
| **Headless Next.js** | Native fit | Possible but awkward (Storefront API bridge needed) |
| **Platform fee** | None | Shopify subscription ($39+/month) |
| **Customisation** | Unlimited | Constrained by Shopify |

### Direct API Limitations (Real Ones)
- **No 3D AR** — only available via Shopify integration
- **Rate limits** — 120 req/min (not an issue for a PoC)
- **Auth token management** — if using OAuth for multi-tenant, access tokens expire hourly; private tokens don't expire
- **No automatic price sync to storefront** — you build that logic
- **Manual shipping carrier setup** — you query Printful's shipping API and present rates

### Recommendation for EmotivX
**Go direct API. Do not use Shopify.**

Reasons:
1. You need a premium, custom UI — Shopify's constraints will fight you at every turn
2. Your 3D viewer requires a custom React/Next.js component — not achievable in Shopify without Hydrogen (which adds complexity for no benefit)
3. The pricing premium of your product (£45-£79) justifies the custom build
4. The "Shopify = easier for Printful" advantage disappears after initial setup — the API is well-documented
5. You avoid Shopify's 0.5-2% transaction fees on every sale

---

## 6. Competitor Approaches — 3D Viewer & API Access

### Printify
- **API:** REST v1, good documentation, OpenAPI spec, Postman collection
- **Rate limits:** 600 req/min general, 100/min for catalogue — more generous than Printful
- **Auth:** Bearer tokens, expire yearly (better than OAuth hourly)
- **Mockups:** Static image generation via API — similar to Printful
- **3D:** Interactive "click-to-rotate" preview in their Product Creator UI — **no GLB export**, not embeddable externally
- **AOP products:** Comparable catalogue
- **Verdict for EmotivX:** Similar capability to Printful; no 3D model advantage

### Gelato
- **API:** REST, `https://order.gelatoapis.com`, X-API-KEY auth
- **Rate limits:** Not publicly specified
- **Mockups:** "Magic Mockups" — AI-generated photorealistic lifestyle mockups; impressive output
- **3D:** 3D preview only in their design UI; no API access to 3D models
- **AOP products:** ~100+ products, global fulfilment (140+ hubs)
- **Advantage:** Better global fulfilment network; possibly faster EU delivery
- **Verdict for EmotivX:** Worth evaluating for EU fulfilment advantage; similar API capability

### SPOD (Spreadshirt POD)
- **API:** REST, integration-focused (Shopware, WooCommerce focus)
- **3D:** None documented
- **AOP:** Apparel-focused catalogue
- **Verdict:** Less developer-friendly than Printful; skip

### Gooten
- **API:** REST, order/printing resource management
- **Products:** ~500 products, apparel and home goods
- **3D:** None documented
- **Verdict:** Smaller catalogue; less competitive for this use case

### Any POD With GLB/3D Model Access?
**None.** No major POD platform exposes downloadable GLB models or UV maps via API. This is an industry-wide gap. The closest things are:

1. **Zakeke** — third-party 3D configurator that integrates with Printful via OAuth. Supports GLB uploads to Zakeke's own 3D asset manager, renders them in browser, sends print files to Printful for fulfilment. **This is actually relevant** — but Zakeke is a SaaS add-on, not a first-party Printful feature.

2. **Konfiwear** — specialised apparel 3D configurator (GLB/CLO3D exports), generates print-ready files for any POD partner. Good for jersey/sports kit customisation.

3. **Custom Three.js build** — the path EmotivX is already on. Correct approach.

### Key Insight
The market has **not solved this problem** at the API level. Every company doing premium POD + 3D viewer integration is sourcing GLB models independently and connecting them to POD fulfilment via print-ready file generation. EmotivX's approach is industry-standard for this tier of product.

---

## 7. Pricing & Margins — Viability Assessment

### Printful AOP Base Costs (Free Plan, USD)

| Product | Base Cost (USD) | Est. GBP |
|---------|-----------------|----------|
| All-Over Print Unisex Hoodie | ~$39.95 | ~£32 |
| All-Over Print Men's Athletic T-Shirt | ~$20-24 | ~£16-19 |
| All-Over Print Yoga Leggings | ~$25.95 | ~£21 |
| All-Over Print Drawstring Bag | ~$12-15 | ~£10-12 |
| All-Over Print Backpack | ~$25-30 | ~£20-24 |

### Shipping (UK customer, single item)
- Approximately £6-9 GBP for standard shipping from EU/US fulfilment centre
- Add £2-3 for each additional item in the same order

### Growth Plan (£19.99/month or free when sales exceed ~£9,500/year)
- Up to **33% off** product base costs
- AOP hoodie: ~$39.95 → ~$26.76 (≈ £21 with Growth plan)

### Margin Analysis

**Scenario: AOP Hoodie at £55 retail (mid-range for EmotivX)**

| Cost Component | Free Plan | Growth Plan |
|---------------|-----------|-------------|
| Product base | £32 | £21 |
| Shipping (to UK customer) | £7 | £7 |
| Payment processing (Stripe ~1.5%) | £0.83 | £0.83 |
| **Total cost** | **£39.83** | **£28.83** |
| **Revenue at £55** | £55 | £55 |
| **Gross margin** | **£15.17 (27.6%)** | **£26.17 (47.6%)** |

**Scenario: AOP T-Shirt at £45 retail**

| Cost Component | Free Plan | Growth Plan |
|---------------|-----------|-------------|
| Product base | £18 | £12 |
| Shipping | £7 | £7 |
| Payment processing | £0.68 | £0.68 |
| **Total cost** | **£25.68** | **£19.68** |
| **Gross margin** | **£19.32 (42.9%)** | **£25.32 (56.3%)** |

### Viability Assessment
- **At £45-£79 price points, this is viable** — but margins are tighter than they look until you hit Growth plan thresholds
- The hoodie at £55 on the Free plan gives only 27.6% gross margin — tight but workable for a PoC
- On Growth plan (achievable at modest volume), hoodie margins reach ~48% — solid for a premium brand
- **Minimum order quantities:** None — Printful is print-on-demand, zero MOQ
- **Bulk discounts:** Available at 25+ identical items (up to 55% off at very high volume)
- **The premium price point justifies the model:** At £79 for a hoodie, even on the Free plan you'd net ~£32 gross margin

### Recommendation
For a PoC, the Free plan is fine — test market fit first. Once you're doing >£800/month in sales, Growth plan pays for itself immediately and dramatically improves margins.

---

## 8. Technical Integration Path — Direct Next.js → Printful

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    EmotivX Platform                  │
├─────────────────────────────────────────────────────┤
│  Next.js App (App Router)                           │
│  ├── /products — product listing (from Printful cat)│
│  ├── /products/[id] — 3D viewer + product detail    │
│  ├── /cart — cart state (Zustand/Redux)             │
│  └── /checkout — payment (Stripe)                   │
├─────────────────────────────────────────────────────┤
│  Server (Next.js API Routes / Server Actions)       │
│  ├── Printful API client (private token)            │
│  ├── Mockup generation pipeline                     │
│  ├── Order submission to Printful                   │
│  └── Webhook handler (order events)                 │
├─────────────────────────────────────────────────────┤
│  External Services                                  │
│  ├── Printful API (product data, orders, mockups)   │
│  ├── Stripe (payments)                              │
│  ├── Your CDN (artwork files, mockup image cache)   │
│  └── Your DB (product metadata, order records)      │
└─────────────────────────────────────────────────────┘
```

### Step 1: Store Setup
1. Create a Printful account
2. Create a new store → select **"Manual order platform / API"**
3. In Settings → API → generate a **Private Token** with scopes: `orders`, `sync_products`, `file_library`, `webhooks`
4. Store token in `.env.local` as `PRINTFUL_API_KEY`

### Step 2: Product Catalogue Sync
```typescript
// lib/printful.ts
const PRINTFUL_API = 'https://api.printful.com';

async function getCatalogProducts(technique = 'CUT-SEW') {
  const res = await fetch(`${PRINTFUL_API}/v2/catalog-products?techniques=${technique}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
  });
  return res.json();
}

async function getProductVariants(productId: string) {
  const res = await fetch(`${PRINTFUL_API}/v2/catalog-products/${productId}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
  });
  return res.json();
}
```

Build a background sync job (cron / Next.js revalidation) to pull AOP catalogue into your DB — don't query Printful on every page load.

### Step 3: Artwork Upload Pipeline
```typescript
async function uploadArtwork(imageUrl: string) {
  // Option A: Pass URL directly (Printful fetches it)
  const res = await fetch(`${PRINTFUL_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url: imageUrl, type: 'default' })
  });
  const { result } = await res.json();
  return result.id; // file ID for use in orders
}
```

For EmotivX: when AI generates artwork for a match → upload to your CDN → then `uploadArtwork(cdnUrl)` → get Printful file ID.

### Step 4: Mockup Generation
```typescript
async function generateMockup(productId: number, variantIds: number[], artworkUrl: string) {
  // Create task
  const taskRes = await fetch(`${PRINTFUL_API}/mockup-generator/create-task/${productId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      variant_ids: variantIds,
      files: [{
        placement: 'default', // or 'front' / 'full_aop' per product
        image_url: artworkUrl
      }],
      format: 'png'
    })
  });
  const { result: { task_key } } = await taskRes.json();
  
  // Poll for result (or use mockup_task_finished webhook)
  return pollForMockup(task_key);
}

async function pollForMockup(taskKey: string, attempts = 0): Promise<string[]> {
  if (attempts > 30) throw new Error('Mockup generation timeout');
  
  await new Promise(r => setTimeout(r, 10000)); // wait 10s
  
  const res = await fetch(`${PRINTFUL_API}/mockup-generator/task?task_key=${taskKey}`, {
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
  });
  const { result } = await res.json();
  
  if (result.status === 'completed') {
    // Download and store mockup images to YOUR CDN
    return result.mockups.map(m => m.mockup_url);
  }
  
  return pollForMockup(taskKey, attempts + 1);
}
```

**Production note:** Use the `mockup_task_finished` webhook instead of polling.

### Step 5: Order Creation (on Stripe payment success)
```typescript
async function createPrintfulOrder(stripeSession: StripeCheckoutSession) {
  const order = {
    recipient: {
      name: stripeSession.shipping_details.name,
      address1: stripeSession.shipping_details.address.line1,
      address2: stripeSession.shipping_details.address.line2,
      city: stripeSession.shipping_details.address.city,
      zip: stripeSession.shipping_details.address.postal_code,
      country_code: stripeSession.shipping_details.address.country,
    },
    items: [{
      catalog_variant_id: cartItem.printfulVariantId,
      quantity: cartItem.quantity,
      retail_price: (cartItem.price / 100).toFixed(2),
      name: cartItem.productName,
      files: [{
        url: cartItem.artworkUrl // your CDN URL
      }]
    }]
  };
  
  // Create draft first
  const draftRes = await fetch(`${PRINTFUL_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...order, confirm: false })
  });
  const { result: draft } = await draftRes.json();
  
  // Confirm for fulfilment
  await fetch(`${PRINTFUL_API}/orders/${draft.id}/confirm`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` }
  });
  
  return draft.id;
}
```

### Step 6: Webhooks
```typescript
// app/api/printful-webhook/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  
  switch (body.type) {
    case 'package_shipped':
      await notifyCustomer(body.data.order, body.data.shipment);
      break;
    case 'order_failed':
      await alertOps(body.data.order);
      break;
    case 'mockup_task_finished':
      await storeMockupImages(body.data);
      break;
  }
  
  return Response.json({ ok: true });
}
```

### SDKs & Community Libraries
- **No official Printful SDK** exists (as of research date)
- **Community:** `lbsudo/printful-nextjs-starter` on GitHub — Next.js 13, Redux, Stripe, Clerk, TypeScript
- **Postman collection** available from Printful docs (good for API exploration)
- Most teams write a thin wrapper around `fetch` — the API is simple enough

### The 3D Viewer Integration Point
```typescript
// components/ProductViewer.tsx
// Your Three.js viewer already works — this is where it slots in:

function ProductViewer({ productGlb, artworkUrl, variantId }) {
  // 1. Load your custom GLB model
  // 2. Fetch/apply artwork as texture via UV map
  // 3. User sees 3D preview with their specific AI artwork
  
  // Separately (for product listing):
  // 4. artworkUrl → Printful mockup API → 2D product photo
  
  return <Canvas>
    <GLBModel url={productGlb} artworkTexture={artworkUrl} />
  </Canvas>
}
```

Your GLB models = visual viewer. Printful's mockup API = product listing photos. These are two separate things serving different purposes.

---

## Honest Assessment: What's Possible vs What Requires Workarounds

### Fully Possible Out-of-the-Box ✅
- Complete headless storefront without Shopify
- Browsing Printful's AOP catalogue programmatically
- Generating product listing mockup images via API
- Uploading AI artwork and referencing it in orders
- Automated order fulfilment on payment
- Real-time shipping rate calculation
- Webhook-driven order status updates
- £45-£79 price points with viable margins (especially on Growth plan)

### Possible But Requires Work 🔧
- **Mockup image pipeline:** Works well but requires: polling/webhook handling, CDN storage (URLs expire in 24h), rate limit management for batch generation
- **Artwork sizing for AOP:** Your AI must generate artwork at the correct dimensions/DPI for each product template — requires a per-product configuration layer
- **Product catalogue maintenance:** Printful adds/removes products — you need a periodic sync job, not just a one-time import
- **Price sync:** Printful can change base prices — your margin calculations need to pull live pricing, not hardcode it

### Requires Workarounds / External Solutions ⚠️
- **3D viewer with Printful product geometry:** Not possible via Printful API. Workaround: source GLB models from CGTrader/Blender/CLO3D, UV-map your artwork onto them independently. This is the correct industry approach.
- **Real-time try-on / AR:** Not available outside Shopify. Would require building your own AR layer (WebXR) on top of your Three.js viewer.

### Not Possible ❌
- Obtaining Printful's 3D model files
- Embedding Printful's 3D/AR viewer outside Shopify
- Getting UV maps from Printful
- Real-time inventory (only ~5-min delayed stock webhooks)
- Custom fulfilment SLAs (you get what Printful offers: 2-5 days for AOP)

---

## Recommended Integration Architecture for EmotivX

```
Phase 1 (PoC) — 4-6 weeks:

1. Direct API setup
   └── Printful "Manual order platform" store
   └── Private token, scoped to orders + file_library + webhooks

2. Product catalogue
   └── Fetch AOP products via API → store in Postgres/Supabase
   └── Focus on: athletic t-shirt, hoodie, leggings (most relevant for football)
   └── Pre-generate mockups for 2-3 hero products with sample artwork

3. 3D viewer (already working)
   └── Source UV-mapped GLB models for your 3 hero products
   └── Apply AI artwork texture via existing Three.js setup
   └── Mockup API provides 2D product images for thumbnails/OG images

4. Commerce flow
   └── Next.js product pages → cart (Zustand) → Stripe Checkout
   └── On payment_intent.succeeded → POST to Printful /orders
   └── Webhook handler for shipped/failed events → email customer

Phase 2 (Scaling):
   └── Expand product catalogue
   └── Artwork → mockup pipeline (bulk generation on artwork publish)
   └── Growth plan activation
   └── Consider Gelato as secondary provider for EU speed
```

---

## Sources

1. Printful API v1 Documentation — https://developers.printful.com/docs/
2. Printful API v2 Beta Documentation — https://developers.printful.com/docs/v2-beta/
3. Printful All-Over Print Product Page — https://www.printful.com/all-over-print
4. Printful Embedded Design Maker Docs — https://developers.printful.com/docs/edm/
5. Printful Growth Plan Pricing — https://www.printful.com/pricing
6. Printful AOP File Guidelines (design maker) — https://www.printful.com/uk/custom/all-over-print
7. Printful 3D Models for Shopify Announcement (2022) — https://www.printful.com/blog/3d-product-models
8. Printify API Documentation — https://developers.printify.com/
9. Gelato API Documentation — https://dashboard.gelato.com/docs/
10. GitHub: lbsudo/printful-nextjs-starter — https://github.com/lbsudo/printful-nextjs-starter
11. Zakeke 3D Configurator + Printful Integration — https://help.zakeke.com/en/articles/printful-integration
12. Perplexity web research synthesis (multiple sources), 2026-03-06

---

*Report compiled: 2026-03-06. Prices and API specifications should be verified against current Printful documentation before production implementation.*
