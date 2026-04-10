# EmotivX — POD Platform Deep Comparison & Advanced Product Customisation Research

**Research date:** March 2026  
**Scope:** Deep investigation across 6 research areas  
**Prepared for:** EmotivX — premium AI-generated sports art merch platform  
**Context:** AOP cut-and-sew dye-sublimation garments with Three.js/React Three Fiber 3D viewer. Expanding beyond AOP into advanced customisation.

---

## Executive Summary

1. **Shopify's 3D viewer GLB files are technically extractable** via the Storefront API — but legal risk exists. Printful's 3D assets are licensed for display use only. Safer to use free CC0 models.
2. **Free CC0 GLB models** for apparel exist on Quaternius, Sketchfab, and Poly Pizza — but coverage for specific athletic/AOP garments is patchy. Fabrication via Blender or CLO3D is likely needed for production-grade models.
3. **Printful remains the strongest AOP API partner** for EmotivX but **Apliiq is the clear winner for inside labels + neck branding**. A dual-provider approach (Printful AOP + Apliiq branding) is the most powerful architecture.
4. **Multi-zone AOP + chest placement prints are possible via Printful API v2** — this is real and documented. Specify multiple `placements` in a single order item.
5. **Apliiq supports neck prints and private labels via API** — but QR codes on labels require custom artwork; there's no native QR-per-order API param. This is solvable: generate QR PNGs server-side and pass as label artwork.
6. **NFC tags are viable as a post-production add-on** — Seritag (UK) offers washable iron-on NTAG213/NTAG424 tags from ~£0.37–£2/unit. Not integrated into any POD workflow natively.
7. **Official team logos (Premier League etc.) are unlicensable for POD**. Fan-stylised / AI-abstracted artwork is the correct path.
8. **QR-on-label → digital match moment page is the most practical phygital implementation**. NFT certificates add premium positioning but require blockchain infrastructure.

---

## Section 1: Shopify 3D Viewer — Embedding & Model Extraction

### Can Shopify's 3D viewer be embedded externally?

Shopify's 3D product viewer is built on Google's `<model-viewer>` web component. **It is not a proprietary Shopify viewer** — Shopify simply hosts GLB files and renders them via this open-source component. This means:

- ✅ You can embed `<model-viewer>` in any Next.js app — it's open source and free
- ✅ Shopify's Storefront API (GraphQL) exposes `Model3d.sources[].url` — publicly accessible GLB URLs for any product with 3D media
- ✅ No authentication required for public product data

**GraphQL query to retrieve GLB URL:**
```graphql
query {
  product(handle: "your-product-handle") {
    media(first: 10) {
      edges {
        node {
          ... on Model3d {
            sources {
              url
              mimeType
              format
            }
          }
        }
      }
    }
  }
}
```

**Embed on external Next.js app:**
```html
<script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
<model-viewer src="https://cdn.shopify.com/path/to/model.glb" ar camera-controls shadow-intensity="1"></model-viewer>
```

This works on any website, no Shopify dependency.

### Do Shopify/Printful expose their own GLB model files?

- Printful uses 3D mockup models in their Shopify app — these are hosted on Printful's CDN
- The GLB URLs are technically accessible via the Storefront API if a Printful-connected Shopify store has 3D media enabled
- However, **these are Printful's proprietary 3D assets**, not Shopify's

### Legal / ToS implications

| Scenario | Legal Status | Risk |
|----------|-------------|------|
| Using your own GLB files with `<model-viewer>` | ✅ Fully legal | None |
| Fetching GLB URL from Shopify Storefront API (public products you own) | ✅ Legal — it's your store data | None |
| Fetching GLB URL from a Printful-connected store you don't own | ⚠️ Grey area | Medium — depends on ToS of that store |
| Extracting Printful's proprietary 3D mockup files and redistributing them | ❌ Violates ToS | High — Printful prohibits reuse of stock/mockup assets |

**Printful's Terms explicitly restrict reuse of their stock files to "promoting Printful products only"**. Their 3D mockup GLBs fall under this — they are not yours to extract and repurpose in your own viewer.

### Verdict for EmotivX

**Do not attempt to extract Printful's 3D models.** The ToS risk is real and unnecessary. EmotivX already has custom GLB models built in-house — this is the correct approach. The `<model-viewer>` component can be used freely in your Next.js/Three.js pipeline.

**Recommendation:** Continue building your own GLB models. Use Blender + standard reference garment dimensions from Printful's tech packs. Your Three.js/R3F setup is already superior to Shopify's vanilla `<model-viewer>` embed.

---

## Section 2: Free / Licensed GLB Models for AOP Garments

### CC0 / Permissive Sources

#### Quaternius (quaternius.com / poly.pizza)
- Massive CC0 library, all fully commercial
- **Available:** Casual hoodies (Ultimate Modular Men/Women Packs), basic t-shirts, casual trousers
- **Missing:** Athletic/compression-fit garments, rash guards, AOP-specific UV-mapped flat pieces, snapback/dad caps
- Formats: FBX and glTF/GLB
- ⭐ Best source for casual silhouettes; limited for sportswear

#### Sketchfab (sketchfab.com)
- Filter by "Downloadable" + "CC0" or "Creative Commons"
- **Available:** Basic hoodie, t-shirt, leggings (some CC BY not CC0 — check individually)
- **Caps:** Snapback Hat Base exists under CC-BY (not CC0); usable with attribution
- GLB format available on many models
- ⚠️ CC0 is less common here — many are CC-BY or royalty-free (not same as CC0)

#### Poly Pizza (poly.pizza)
- Curated free 3D assets, many CC0
- Hosts Quaternius content + community uploads
- Good for quick prototype models

#### CGTrader (cgtrader.com)
- Free section has some apparel models
- License verification required — many are "royalty-free" not CC0 (restrictions may apply to commercial use)
- GLB/OBJ/FBX available

#### Fab.com (fab.com — Epic Games marketplace)
- Commercial packs with Standard License (allows use in end products, no revenue limit)
- **Available:** Casual Wear Girls Pack 1, Future Fashion Pack, various streetwear packs
- Not CC0 — paid purchase required, but broad commercial rights
- High-poly, PBR-textured, exportable to GLB
- ⭐ Best source for high-quality commercial models if budget allows

#### Meshy.ai
- AI-generated 3D models, can generate apparel types
- CC0-tagged downloads available
- Quality is improving rapidly — good for prototype/quick iteration

### Specific Products Coverage Assessment

| Product | Quaternius | Sketchfab CC0 | Fab.com | Notes |
|---------|-----------|--------------|---------|-------|
| AOP Hoodie | ✅ Casual style | ✅ Some | ✅ Multiple packs | Athletic-fit variants rare |
| AOP Athletic T-shirt | ✅ Basic | ✅ Some | ✅ | Performance-fit UV map may need tweaking |
| AOP Long Sleeve | ⚠️ Limited | ⚠️ Rare | ✅ | |
| AOP Leggings | ⚠️ Fantasy/casual | ✅ Some | ✅ Workout packs | |
| AOP Rash Guard / Compression Top | ❌ Not found | ❌ Rare | ⚠️ Some fitness packs | Likely custom Blender work needed |
| AOP Joggers | ⚠️ Limited | ⚠️ Some | ✅ | |
| Snapback Cap | ❌ | ⚠️ CC-BY only | ✅ | Custom model likely needed |
| Dad Cap / 6-panel | ❌ | ❌ | ⚠️ Limited | Custom model likely needed |

### Commercial 3D Asset Packs for Apparel Configurators

- **CLO3D** (clo3d.com): Industry-standard garment simulation software. Output directly to GLB. Used by major fashion brands. Can generate your own AOP-ready UV-mapped garment models with accurate cloth simulation. One-time licence or subscription.
- **Browzwear VStitcher**: Similar to CLO3D, enterprise-grade
- **Marvelous Designer**: More affordable, same concept — cloth simulation → GLB

**Recommendation:** For production-grade 3D viewer models that match Printful's actual AOP garment dimensions and UV map layouts exactly, **CLO3D or Marvelous Designer is the correct tool**. Use Printful's downloadable product template PDFs (their "print files" / tech packs) as reference geometry, then simulate in CLO3D and export as GLB. This is what premium merch configurators do.

### Format Conversion Tools

| Tool | Type | FBX→GLB | OBJ→GLB | Quality | Cost |
|------|------|---------|---------|---------|------|
| **Blender** | Desktop/CLI | ✅ Excellent | ✅ Excellent | High | Free |
| **FBX2glTF** (Facebook/Meta) | CLI | ✅ Specialised | ❌ | High | Free |
| **Khronos glTF-Validator** | CLI/web | Validation only | | — | Free |
| **AnyConv / Meshy web** | Web-based | ✅ Good | ✅ Good | Medium | Free |
| **Unity / Unreal** | Desktop | ✅ | ✅ | High | Paid |

**Best workflow:** Import FBX into Blender → adjust UV maps for AOP print area → export as GLB with KHR_materials PBR extension. Draco compression (supported by Three.js) reduces file sizes ~60–80%.

---

## Section 3: POD Platform Comparison for EmotivX

### Scoring Criteria (1–5)
AOP range, API quality, UK fulfilment speed, pricing/margins, headless-friendly, custom branding support.

---

### Printful ⭐ (Baseline)

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | 90+ AOP cut-and-sew items — hoodies, tees, leggings, joggers, sports bra, rash guard, long sleeves, socks |
| **API Quality** | ★★★★★ — REST v2, well-documented, supports multiple placements per order item, webhooks, mockup generation |
| **UK Fulfilment** | Fulfilment from Letterkenny, Ireland (EU) + USA centres. UK orders: 5–10 days typical |
| **Pricing (AOP)** | Hoodie: ~£31–37 base. T-shirt: ~£12–16. Leggings: ~£20. Competitive but not cheapest. |
| **Inside Label** | ✅ `label_inside` placement via API v2. Printed DTG. $0.99–1.25/label. 3″ × 3″ max. Logo only (no standalone text). |
| **Multi-zone prints** | ✅ Multiple placements in one order — `front` (AOP) + `embroidery_chest_left` + `back` number baked in AOP layer |
| **Minimum Orders** | None (true POD) |
| **Headless** | ✅ Fully headless via API. No Shopify required. |
| **Custom Neck Labels** | Printed inside label via API — not woven. Woven label option exists but manual process only (not API) |

**Verdict:** Best all-round AOP API. Multi-zone placements are real and documented. UK fulfilment slightly slower than Prodigi/Contrado.

---

### Apliiq ⭐⭐ (Custom Branding Specialist)

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | Limited AOP cut-and-sew — primarily stock garments with placement printing, embroidery, patches. NOT a sublimation-first AOP provider |
| **API Quality** | ★★★★ — RESTful with HMAC auth. Supports product design creation, private labels, neck prints, patches, order posting, tracking |
| **UK Fulfilment** | US-based only. **Not suitable as primary UK POD.** International shipping adds cost and time |
| **Pricing** | Neck print: $2.50/unit (first 10 free). Private label: $2.50/unit (sewn, B&W, 1″ × 1″). Embroidery from $5.95 |
| **Inside Label** | ✅✅ Best-in-class. Two options: (1) **Neck print** — full colour, 2.5″ × 1″, printed inside neck. (2) **Private label** — sewn satin tag, 1″ × 1″, B&W. Both orderable via API |
| **QR on Label** | ⚠️ No native QR field — BUT: generate QR PNG server-side (any QR library) and pass as the label artwork file. Works for neck prints (full colour). NOT for private satin label (B&W only). |
| **Multi-zone prints** | ✅ Yes — can combine chest placement + back + neck print + patches on one order via API |
| **Woven Labels** | ✅ Available as add-on product. Woven labels shipped separately for manual attachment, or sewn on during fulfilment |
| **Patches** | ✅ Printed patches, woven patches, embroidered patches — can add to garments during fulfilment |
| **Minimum Orders** | None (true POD) |
| **Headless** | ✅ REST API suitable for headless |

**Verdict:** The best provider for custom inside branding (labels, neck prints, patches, woven labels). NOT ideal as your AOP cut-and-sew provider — limited dye-sublimation AOP range. **Use Apliiq as a secondary layer for branding elements** applied to Printful-fulfiled garments (if feasible) or run a separate Apliiq product line for placement-print garments with premium branding.

**Important:** Running Apliiq + Printful simultaneously on the same garment is NOT directly possible — they're separate production facilities. The approach would be: use Apliiq as your primary provider for non-AOP products (placement tees, hoodies with custom labels), and Printful for full AOP cut-and-sew.

---

### Gelato

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | Limited AOP cut-and-sew. Gelato's strength is DTG and local print routing, not specialised sublimation cut-and-sew. Some AOP products exist. |
| **API Quality** | ★★★★ — RESTful, headless-friendly, good documentation. 2025 GelatoConnect upgrades: AI tools, intelligent routing, TikTok integration |
| **UK Fulfilment** | ✅ Excellent — 140+ local print partners in 32 countries, including UK hubs. Typically 2–5 days UK domestic |
| **Pricing** | AOP hoodie: ~$25–43 (est., not publicly listed for AOP specifically). General apparel competitive |
| **Inside Label** | ❌ Not documented via API |
| **Headless** | ✅ Fully headless-capable |

**Verdict:** Best for fast UK/EU fulfilment for standard apparel. Weak on AOP cut-and-sew specialisation and custom branding. Good supplementary provider for non-AOP products.

---

### Printify

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅ Good — AOP hoodies, tees, leggings, joggers through network of print providers. 7 UK-based print providers available |
| **API Quality** | ★★★★ — REST, OAuth 2.0 or PAT auth. Endpoints for blueprints, providers, products, orders. 600 req/min global limit |
| **UK Fulfilment** | ✅ Good — 7 UK print providers. Printify Choice Global routes to nearest local provider. 2–8 days typical |
| **Pricing** | AOP Hoodie: ~$37.84. AOP Leggings: ~$23.95. 25% discount with Premium ($24.99/month). Competitive |
| **Inside Label** | ❌ Not a standard feature — depends on specific print provider |
| **Headless** | ✅ Fully headless — server-side only (no CORS) |
| **Multi-zone** | ⚠️ Depends on print provider — not guaranteed |

**Verdict:** Strong AOP competitor to Printful. Better pricing with Premium subscription. Less API polish than Printful. Good UK provider network.

---

### SPOD (Spreadshirt POD)

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅ Supports sublimation AOP — designs printed on paper, heat-pressed onto polyester, then cut-and-sewn |
| **API Quality** | ★★★★ — Spreadconnect RESTful API. EU: api.spreadshirt.net. Full CRUD for products/orders. No setup fees |
| **UK Fulfilment** | ✅ Outstanding — 95% of orders ship within 48 hours. EU facilities in Poland and Czech Republic. ~3–5 days UK |
| **Pricing** | Pay-as-you-go product cost. Competitive. No monthly fee |
| **Inside Label** | ❌ Not documented |
| **Headless** | ✅ Yes |

**Verdict:** Best fulfilment speed in the market. Strong AOP capabilities. Weaker on advanced customisation/branding. Good if speed is a priority for EmotivX customers.

---

### Prodigi

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅ Sublimation available. 500,000+ SKUs including apparel. UK in-house manufacturing. Cut-and-sew capability — confirm specific AOP SKUs directly |
| **API Quality** | ★★★★ — RESTful v4.0. Quote endpoint for pricing. Sandbox + live environments. X-API-Key auth |
| **UK Fulfilment** | ✅✅ Best UK fulfilment — UK-based in-house production. 1–3 day production. Express options |
| **Pricing** | Competitive. Pro subscribers get 10–15% discounts. GBP pricing available. Quote API for accurate per-product pricing |
| **Inside Label** | ❌ Not documented for API |
| **Headless** | ✅ Fully headless |

**Verdict:** Best UK-native production quality and speed. Ideal for EmotivX customers who prioritise quality and fast UK delivery. Less dominant in AOP cut-and-sew than Printful. Worth a direct sales conversation to confirm full AOP garment range.

---

### Gooten

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅ Sublimation and AOP available. 130+ products. Kornit partnership for quality textiles |
| **API Quality** | ★★★★ — Enterprise-grade REST. Webhooks. JS/Java/Python SDKs. Smart order routing engine |
| **UK Fulfilment** | ✅ 70+ global locations, UK routes available. Multi-store order centralisation |
| **Pricing** | Requires account for pricing. Enterprise-focused — not transparent public pricing |
| **Inside Label** | ❌ Not documented |
| **Headless** | ✅ API-first, excellent for headless |

**Verdict:** Best for enterprise-scale operations. Overkill for EmotivX at current scale. API is excellent. Pricing opacity is a barrier.

---

### Subliminator

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅✅ Specialist AOP — 160+ products. Jerseys, hoodies, leggings, activewear. 95% recycled polyester/5% spandex athletic blend |
| **API Quality** | ★★ — Shopify app only. **No public REST API documented**. Custom API requires direct developer contact |
| **UK Fulfilment** | ⚠️ Worldwide shipping but no UK facility. Standard: 7+ days production + variable delivery |
| **Pricing** | Competitive for AOP specialist. Vibrant polyester sublimation prints praised in reviews |
| **Inside Label** | ❌ Not documented |
| **Headless** | ❌ NOT headless-capable (Shopify-only) |

**Verdict:** Great AOP product range, especially for athletic/sports garments. **Completely unsuitable for EmotivX's headless architecture.** Skip unless you're willing to run a Shopify storefront alongside.

---

### Contrado

| Metric | Detail |
|--------|--------|
| **AOP Product Range** | ✅ Premium — 470+ products including all-over print on 139+ fabric types. Organic cotton, silk, waterproof nylon. Unique high-end positioning |
| **API Quality** | ★★★ — API exists for custom integrations, primarily Shopify-focused. Limited public documentation. Manual dropshipping option. |
| **UK Fulfilment** | ✅✅ UK-based, handmade, 1–3 day production. Ethical/sustainable |
| **Pricing** | ⚠️ Premium pricing — highest base costs of all providers. Positioned as boutique, not mass-market |
| **Inside Label** | ✅ Custom labels available, satin fabric labels, customisable during ordering |
| **Headless** | ⚠️ Partial — API exists but less developer-friendly than Printful/Printify |

**Verdict:** Premium quality ideal for EmotivX's positioning. High margins required to justify base cost. UK-native is a plus. API maturity is a limitation — requires more manual work or direct integration effort.

---

### Provider Comparison Summary Table

| Provider | AOP Range | API Quality | UK Fulfilment | Pricing | Inside Label | Headless | Multi-Zone |
|----------|-----------|-------------|---------------|---------|--------------|----------|------------|
| **Printful** | ★★★★★ | ★★★★★ | ★★★ | ★★★ | ✅ (printed) | ✅ | ✅ |
| **Apliiq** | ★★ | ★★★★ | ★ (US only) | ★★★ | ✅✅ | ✅ | ✅ |
| **Gelato** | ★★★ | ★★★★ | ★★★★★ | ★★★★ | ❌ | ✅ | ⚠️ |
| **Printify** | ★★★★ | ★★★★ | ★★★★ | ★★★★ | ❌ | ✅ | ⚠️ |
| **SPOD** | ★★★ | ★★★★ | ★★★★★ | ★★★★ | ❌ | ✅ | ⚠️ |
| **Prodigi** | ★★★ | ★★★★ | ★★★★★ | ★★★★ | ❌ | ✅ | ⚠️ |
| **Gooten** | ★★★★ | ★★★★★ | ★★★ | ★★★ | ❌ | ✅ | ⚠️ |
| **Subliminator** | ★★★★★ | ★ | ★★ | ★★★★ | ❌ | ❌ | ❌ |
| **Contrado** | ★★★★ | ★★★ | ★★★★★ | ★★ | ✅ | ⚠️ | ⚠️ |

---

## Section 4: Advanced Product Customisation — What's Actually Possible

### 4a) Placement Prints Alongside All-Over Print

#### Can you do AOP dye-sub + chest placement on the same garment?

**YES — via Printful API v2.** This is real and documented.

The Printful v2 order API accepts an array of `placements` per item. You can combine:
- `"placement": "front"` with `"technique": "aop"` (sublimation cut-and-sew)
- `"placement": "embroidery_chest_left"` with `"technique": "embroidery"` (chest logo)

Or for DTG/DTF overlay:
- AOP full garment as base
- Chest placement via DTG (limited — AOP polyester base may not take DTG well)
- Embroidery chest is the most reliable premium-look overlay on AOP polyester

**Example order spec (Printful v2):**
```json
{
  "items": [{
    "quantity": 1,
    "catalog_variant_id": 9224,
    "placements": [
      {
        "placement": "front",
        "technique": "aop",
        "layers": [{"type": "file", "url": "https://emotivx.com/artwork/aop-front.png"}]
      },
      {
        "placement": "embroidery_chest_left",
        "technique": "embroidery",
        "layers": [{"type": "file", "url": "https://emotivx.com/artwork/team-logo.png"}]
      }
    ]
  }]
}
```

**Verify exact placement IDs** by querying `GET /v2/catalog-products/{id}` for your specific AOP product SKU.

#### Player number on the back

Two approaches:
1. **Baked into AOP artwork** (simplest): Number is part of the all-over print file. Generated server-side (your AI artwork pipeline adds the number to the design before submission). This is what most POD providers handle cleanly.
2. **Separate back placement print**: Some providers support a separate back zone (e.g., DTG or embroidery on the back panel). Only works if the AOP technique and secondary technique are compatible on that garment.

**Recommendation for EmotivX:** Bake the player number into the AOP artwork generatively. Your AI art pipeline already generates custom designs per match — add the number as a layer in the generation step. Simpler, cheaper, no second technique zone.

#### How providers handle multiple print zones

- **Printful:** Explicit multi-placement array per item in API v2. Most flexible.
- **Printify:** Depends on print provider. Some support multi-zone, others don't. Test with specific UK providers.
- **SPOD/Gelato/Prodigi:** Not prominently documented. Likely single design per product.
- **Gooten/Apliiq:** Yes — both explicitly support multi-service items (chest + back + neck label + patch simultaneously).

---

### 4b) Inside Label / QR Code Label

#### Printed inside label via POD API

| Provider | Label Type | API Support | Colour | Size | Cost |
|----------|-----------|------------|--------|------|------|
| **Printful** | Printed DTG inside label | ✅ `label_inside` placement | Full colour | 3″ × 3″ | $0.99–1.25/label |
| **Apliiq** | Neck print (printed) | ✅ Via API design spec | Full colour | 2.5″ × 1″ | $2.50/unit |
| **Apliiq** | Private label (sewn satin) | ✅ Via API subscriptions | B&W only | 1″ × 1″ | $2.50/unit |
| **Contrado** | Custom satin label | ⚠️ Manual/partial API | Full colour | Custom | Quoted |
| **Gelato** | ❌ Not available | | | | |
| **Printify** | ❌ Not standard | Depends on provider | | | |

#### Can the label contain a QR code unique per order?

**YES — for both Printful and Apliiq, but requires server-side QR generation.**

The POD providers don't generate QR codes — they print what you send them. The flow is:

1. Order comes in → your server generates a unique URL: `emotivx.com/moment/{order-id}` or `emotivx.com/moment/{match-id}/{player-id}/{serial}`
2. Generate QR PNG server-side (Node.js: `qrcode` npm package, or `sharp` + `qrcode`)
3. Composite QR into label artwork template
4. Upload generated PNG to your CDN/storage (S3, Cloudflare R2)
5. Pass URL to Printful/Apliiq label placement in the order API call

**Technical note:** Printful's `label_inside` placement requires the artwork at 150 DPI min, transparent background, RGB. Your QR must be large enough to scan reliably at the printed size. At 3″ wide label printed at 150 DPI = 450px wide. QR at 250px+ within that field will scan reliably.

**Apliiq neck print:** 2.5″ × 1″ is SMALL for a QR code. At 150 DPI that's 375px × 150px. A QR code needs to be roughly square — you'd be fitting a ~140px QR in a landscape label. Version 1 QR codes (21×21 modules) can work at this size if printed cleanly. **Printful's 3″ × 3″ label is better for QR codes.**

**Lead times:** Printful adds ~1 business day for label printing. Apliiq: part of standard production time.

---

### 4c) NFC / RFID Tag Integration

#### Can POD providers embed NFC tags?

**NO.** No mainstream POD provider currently offers integrated NFC tag embedding in garments. This is a post-production operation only.

#### Post-production NFC tag options

**Seritag (UK) — Recommended Primary Supplier**
- UK-based, ships worldwide
- Products: Iron-on woven patches, iron-on PET labels, sew-in labels
- Chip options: NTAG213 (basic, 144 bytes), NTAG424 DNA (authentication-grade, tamper-evident, prevents cloning)
- Wash resistance: Up to 100 domestic wash cycles (ISO 6330)
- **Pricing (ex VAT):**
  - 35mm Iron-on: ~£0.37–£2.02/unit (bulk-dependent)
  - 25mm Clear Garment: ~£0.34–£0.45/unit
  - 35mm Woven Patch (NTAG424): slightly higher — contact for quote
- MOQ: None for standard stock. 500+ units for custom spec.

**Other Suppliers:**
- **RFIDSilicone**: Custom iron-on woven NFC patches, washable, MOQ 500
- **One of None**: Garment Tags and Flex Tags, pre-encoded, heat-press or sew-in
- **Alibaba (Shenzhen Chuangxinjia, Guangzhou DOY Label)**: Volume pricing, 2,000+ MOQ, 4–6 week lead

#### NFC integration workflow for EmotivX

1. Order fulfiled by Printful (AOP garment shipped to you or to a 3PL)
2. Your team / 3PL applies NFC tag (iron-on: 30 seconds, ~160°C) or sew-on patch
3. NFC tag is pre-encoded or programmed with `emotivx.com/moment/{uid}` URL via smartphone (iOS/Android NFC write)
4. Garment shipped to customer

**NTAG424 DNA for EmotivX:** This chip generates a cryptographic challenge-response on each scan, making counterfeiting impossible. Ideal for certificates of authenticity. Seritag sells them. Slightly more expensive but appropriate for premium positioning.

#### QR label vs NFC tag comparison

| Feature | QR Code (on label) | NFC Tag (Seritag) |
|---------|-------------------|-------------------|
| **Scan device** | Any camera (2013+ smartphones) | NFC-enabled smartphone (2016+) |
| **Setup cost** | ~£0 (label already printed) | ~£0.37–£2 per garment |
| **Durability** | Fades with washing if on external tag | 100+ washes |
| **Copy protection** | None — URL can be shared/reused | NTAG424: cryptographic, unclonable |
| **User experience** | Familiar to all users | Frictionless tap (no app needed on modern iOS/Android) |
| **Premium feel** | Standard | High — "tap to authenticate" is premium |
| **Works through fabric** | N/A (on label, inside) | ✅ Yes (NTAG reads through 2–4mm fabric) |
| **Post-production effort** | None (baked into label order) | ✅ Requires physical application step |
| **Cost at scale (1000 units)** | £0 extra | ~£370–£2000 extra |

**Verdict:** Start with QR-on-label (zero marginal cost, zero operational complexity). Add NFC as a premium tier upsell (e.g., "Authenticated Edition" with NTAG424 patch). NTAG424 is ideal for the EmotivX certificate of authenticity narrative.

---

### 4d) 'Moment Badge' / Woven Patch

#### Physical production options

EmotivX's PlayerBadge (steampunk metal engraving style, match data) as a physical item:

**Option 1: Woven Patch**
- Woven patches use thin thread woven directly into fabric — can reproduce fine detail including numbers and names
- Suitable for the badge artwork if simplified slightly (woven thread = limited colour depth vs full digital artwork)
- UK suppliers:
  - **Bespoke Patches UK** (bespokepatches.co.uk): True no minimum, single patches, custom shapes
  - **Badges Plus Ltd** (badgesplus.co.uk): No minimum, Birmingham-based, woven + embroidered
  - **Made by Cooper** (madebycooper.co.uk): 4–5 week turnaround, woven/embroidered
- Pricing: ~£1–9/patch depending on size and quantity
- Sew-on or iron-on backing

**Option 2: Embroidered Badge**
- Raised texture, more traditional "team badge" look
- Less detail than woven (thread diameter limits fine lines)
- Same UK suppliers as above

**Option 3: Printed Patch (Sublimation on felt/fabric)**
- Full colour, photo-quality reproduction of the PlayerBadge digital artwork
- Best for reproducing the steampunk metallic/engraving aesthetic
- Suppliers: Ninja Patches, StickerYou, Printful (patches available as separate product)
- POD-friendly: Printful sells custom patches via their catalog — no minimum

**Option 4: Engraved Metal Pin/Badge**
- Closest to the "metal engraving" aesthetic of the PlayerBadge design
- Not POD — requires batch production (min ~50–100 units)
- Suppliers: EasyPins.co.uk, The Badge Centre UK

**Can POD providers add patches to garments during fulfilment?**
- **Apliiq:** ✅ Yes — patches as a service. Apliiq can source/apply patches to garments during fulfilment
- **Printful:** Patches sold as separate products only — not applied to garments during fulfilment
- **Most others:** ❌ No patch attachment during fulfilment

**Recommended EmotivX approach:** Produce PlayerBadge as a **printed patch** (sublimation on fabric, no min order via Printful) included in the packaging as a collectible, not sewn on. Customer can apply themselves. This avoids the complexity of patch-on-garment during POD fulfilment, and the badge becomes a standalone collectible item — stronger emotionally.

---

### 4e) Team Logo on Chest

#### Technical feasibility

Technically straightforward via Printful's multi-placement API:
- All-over print base (your AI artwork)
- Chest logo as secondary placement (embroidery preferred for durability and premium feel on AOP polyester)

#### Licensing — official team logos

**DO NOT use official Premier League, La Liga, UEFA, or club trademarks without a licence.** This is a hard legal wall:

- UK trademark law (TMA 1994) protects club badges and league logos in Class 25 (clothing)
- Premier League enforcement is aggressive — they actively pursue unauthorised merchandise
- No POD provider will protect you from IP infringement
- Licensing is selective, expensive ($50k–$500k+ annually), and tied to exclusive partnerships
- There is no open "apply online and get approved" licensing programme for POD merch

**Fan-stylised / AI-abstracted artwork: the correct path**
- Create original, stylised interpretations inspired by team identity (colours, stadium imagery, abstract crest shapes)
- Do NOT reproduce the actual crest/badge
- Use "inspired by" language, not official marks
- This is how successful fan merchandise businesses operate (e.g., Football Casual Terrace brands)
- EmotivX's AI-generated artwork approach is actually perfect for this — the AI can generate abstract representations that evoke the team without infringing

**Historical precedent:** The EU and UK allow "comparative advertising" and "fan expression" to a degree, but garment decoration with a recognisable crest is infringement regardless.

---

## Section 5: Digital Product Companion

### Certificate of Authenticity — Industry Standards

There is no single dominant standard yet, but several frameworks are emerging:

**EU Digital Product Passport (DPP)**
- Required by EU ESPR (Ecodesign for Sustainable Products Regulation) for textiles by 2027–2028
- Mandates a QR code on each garment linking to product lifecycle data
- This regulation aligns perfectly with EmotivX's QR-on-label concept
- **EmotivX should build its label QR system to be DPP-compatible from day one** — this becomes a regulatory advantage

**GS1 Digital Link**
- International standard for product-linked QR codes
- Format: `https://emotivx.com/01/{GTIN}/21/{serial}` — machine-readable product + serial
- Interoperable with inventory, supply chain, and retail systems
- Worth adopting as the QR URL format for future-proofing

**Fashion brand implementations:**
- Ralph Lauren: 200M+ garments serialised with QR codes
- Gucci: Unique per-item QR codes with manufacturing dates
- Trimco Group: Woven or printed unique QR labels for digital product passports

### NFT Certificate of Authenticity

**Is it worth exploring for EmotivX?**

**Case for:**
- Creates verifiable, transferable ownership of "match moment" — the NFT IS the certificate
- Premium positioning: "This jersey captures the 73rd-minute goal. NFT included."
- Resale market: if EmotivX items gain collectible value, NFT enables authentic resale verification
- Solana is ideal: near-zero fees ($0.001/mint), fast, strong sports NFT ecosystem (Blockasset, etc.)
- Metaplex (Solana) has standard NFT structures for physical-backed tokens

**Case against:**
- NFT market sentiment is negative with mainstream consumers (2024–2025)
- Adds technical complexity and requires a crypto wallet for redemption
- Legal uncertainty around NFT utility in UK/EU
- Many "phygital NFT" projects have failed commercially

**Recommended approach:** Build the digital moment page first (QR → branded web experience). Design the data structure so it can be minted as an NFT later if the market recovers. Solana's Compressed NFTs make bulk minting trivially cheap if/when you choose to activate it.

### QR → Digital Moment Page: Technical Implementation

```
Flow:
Customer receives garment
  → Scans QR on inside label
  → Lands on: emotivx.com/moment/{match-id}-{order-serial}
  → Page shows:
      - AI artwork (the design on their garment)
      - Match data (scoreline, timestamp, player stats)
      - 3D model of their specific garment
      - PlayerBadge animated render
      - Certificate of authenticity (signed by EmotivX)
      - Social sharing (image card generated on-the-fly)
      - "Register your item" CTA (email capture)
```

**Tech stack:**
- QR generation: `qrcode` npm + `sharp` (Node.js) — server-side per order
- Unique page: Next.js dynamic route `/moment/[id]` — SSG with ISR or SSR
- Open Graph image: Satori or Vercel OG for dynamic social cards
- Data store: Your existing match data DB + order ID → serial number mapping

---

## Section 6: Recommended Platform Architecture for EmotivX

### Primary POD Strategy: Dual-Provider

**For AOP cut-and-sew garments (core product):**

**→ Printful as primary AOP provider**
- Best API, best AOP range, multi-placement support, inside label via API
- Use `label_inside` placement with QR code generated server-side
- Use `embroidery_chest_left` for any team-inspired chest mark (stylised, original artwork)
- Player number baked into AOP artwork layer (server-side generative)
- Migrate to Prodigi or add as secondary provider once Prodigi's AOP garment SKUs are confirmed

**→ Apliiq as secondary provider for non-AOP products**
- Placement print tees and hoodies with premium neck prints
- Private label (sewn satin) for flagship products wanting physical woven label feel
- Patches/embroidery on standard garments

### Chest Logo + Back Number + AOP in One Product

**Recommended approach (Printful):**

1. AOP dye-sub covers entire garment (front, back, sleeves) — this is the AI artwork
2. Player number is **part of the AOP artwork** (generated by AI pipeline) — not a separate placement
3. Team-inspired chest mark is **embroidery** via `embroidery_chest_left` placement — added on top of AOP
4. API call specifies two placements: `front` (AOP), `embroidery_chest_left` (embroidery)

**Why embroidery over DTG/DTF for chest overlay on AOP polyester:**
- DTG doesn't bond well to polyester
- DTF (heat transfer) can work but look cheap long-term
- Embroidery on AOP polyester is premium, durable, tactile — worth the $5–8 extra

### Inside Label with QR Code

**Provider:** Printful `label_inside` placement  
**Spec:** 3″ × 3″, 150 DPI min, RGB PNG with transparent background  
**Flow:**
1. Order received → extract match ID + order serial
2. Generate unique URL: `emotivx.com/moment/{match-id}/{serial}`
3. Generate QR PNG (300×300px minimum) via `qrcode` npm
4. Composite into label template (brand logo + QR + "Scan to relive the moment" text)
5. Upload to CDN → pass URL to Printful API order as `label_inside` layer
6. Cost: ~$0.99–1.25 per garment

**Alternative for more premium label:** Contrado (UK-based) for custom satin label with full colour QR — but requires more manual integration work.

### NFC Tag — Separate Supplier

**Provider:** Seritag (UK)  
**Tag:** 35mm NTAG424 DNA woven patch (authentication-grade)  
**Workflow:** 
- Order Seritag tags pre-encoded with your URL scheme
- Apply via iron-on at packing step (your facility or a 3PL)
- Or include as loose patch inside packaging for customer self-apply (simplest for POD)
- Cost: ~£0.50–1.50/unit at moderate volume

**For launch:** Skip NFC. Use QR-only. Add NFC as premium tier once volume justifies the 3PL step.

### 3D Viewer GLB Model Sources

| Priority | Source | Use Case |
|----------|--------|----------|
| **1. Custom (Blender/CLO3D)** | Your own models | Production-grade, UV-mapped to Printful AOP template dimensions |
| **2. Fab.com (paid packs)** | Commercial license packs | High-quality base meshes to modify in Blender |
| **3. Quaternius** | CC0 free | Prototype/development placeholders |
| **4. Sketchfab CC-BY** | Attribution required | Development only, not production |

**For caps/hats specifically:** No good free CC0 source found. Commission a custom Blender model (~£150–300 from a freelancer) — this is the most efficient path given the specificity required.

**Conversion pipeline:** FBX/OBJ → Blender → adjust UV mapping → export GLB with Draco compression → optimise to <5MB per model → serve via Cloudflare CDN.

### PlayerBadge Physical Implementation

**Recommended:** Sublimation-printed patch on woven polyester fabric  
**Provider:** Printful custom patch product (no minimum) or Ninja Patches  
**Included as:** Loose collectible in packaging, not sewn on  
**Production flow:** Printful generates patch separately → included in same shipment or via fulfilment insert  
**Cost:** ~£2–4 per patch at low volume

### Full Order Pipeline Architecture

```
Customer customises garment in EmotivX 3D viewer
  ↓
Selects match moment, player, garment type, size
  ↓
Server-side artwork generation:
  - AI generates AOP design (includes player number in artwork)
  - Generates QR code PNG for inside label
  - Generates PlayerBadge artwork for patch
  ↓
Parallel API calls:
  - Printful order: AOP garment + inside label + chest embroidery
  - Printful order (separate): PlayerBadge printed patch
  ↓
Printful fulfilment (both items) → shipped to customer
  ↓
EmotivX system registers serial → moment page goes live
  ↓
Customer scans QR → digital moment experience
```

**If adding NFC post-launch:**
```
Printful ships to EmotivX / 3PL
  ↓
NFC tag (Seritag, pre-encoded) applied via iron-on
  ↓
Repackaged + shipped to customer
```

---

## Gaps & Uncertainties

1. **Prodigi AOP garment range** — unclear which specific cut-and-sew sublimation SKUs are available via API. Direct sales contact needed.
2. **Printful multi-placement on AOP** — the API spec exists but real-world testing with specific AOP product IDs is required. Some combinations may not be physically available per garment.
3. **Apliiq UK fulfilment** — US-only. Makes Apliiq unsuitable as a primary provider for UK-first launch. International shipping adds cost and time. May be worth for specific premium products.
4. **Gelato AOP specifics** — Gelato's AOP cut-and-sew catalogue is not prominently documented. May have limited SKUs vs Printful.
5. **QR code durability on Printful inside label** — the inside DTG label is wash-resistant but not indefinite. Long-term scan reliability over 50+ washes is not published.
6. **NTAG424 scan reliability through multiple fabric layers** — generally reliable, but depends on garment construction. Test with actual garments before committing.

---

## Sources

1. Shopify Developer Documentation — Storefront API, Model3d objects (shopify.dev)
2. Printful API v2 Documentation (printful.com/docs)
3. Apliiq API Documentation & Help Portal (apliiq.com/help)
4. Seritag NFC Garment Tags (seritag.com/nfc-tags/garment)
5. Gelato API Documentation (gelato.com/api-docs)
6. Printify API Documentation (developers.printify.com)
7. SPOD Spreadconnect API (api.spreadshirt.net)
8. Prodigi API v4.0 (prodigi.com/api)
9. Gooten API Documentation (gooten.com/api)
10. Quaternius 3D Model Library (quaternius.com)
11. Sketchfab Free 3D Models (sketchfab.com)
12. Fab.com 3D Asset Marketplace (fab.com)
13. EU ESPR Digital Product Passport Regulation (ec.europa.eu) — July 2024
14. Blockasset Solana NFT Sports Platform (blockasset.co)
15. Bespoke Patches UK (bespokepatches.co.uk)
16. Badges Plus Ltd (badgesplus.co.uk)
17. FBX2glTF CLI Tool (github.com/facebookincubator/FBX2glTF)
18. Premier League IP Licensing (premierleague.com/partners)
19. Subliminator Shopify App Reviews (apps.shopify.com)
20. Contrado UK POD Platform (contrado.co.uk)
21. Perplexity Sonar Pro Search — research synthesis, March 2026

---

## Confidence Assessment

| Section | Confidence | Notes |
|---------|-----------|-------|
| Shopify 3D viewer/GLB | HIGH | Storefront API is well-documented; ToS analysis solid |
| Free GLB model sources | HIGH | Catalogue well-researched; specific product gaps confirmed |
| Printful API capabilities | HIGH | Documented and specific |
| Apliiq API + label specs | HIGH | Specific pricing and specs confirmed |
| Gelato/Printify/Prodigi | MEDIUM | General info solid; AOP-specific details need verification |
| SPOD/Gooten | MEDIUM | API details confirmed; AOP depth less certain |
| Subliminator | HIGH | Clear: Shopify-only, not headless |
| NFC tag options | HIGH | Seritag pricing and specs confirmed from primary source |
| Team logo licensing | HIGH | UK trademark law is unambiguous |
| NFT/DPP digital companion | MEDIUM | Trends clear; specific implementation choices are advisory |
| Recommended architecture | MEDIUM-HIGH | Based on research + engineering reasoning; real-world testing required |
