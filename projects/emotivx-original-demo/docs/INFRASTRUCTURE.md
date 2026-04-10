# EmotivX Infrastructure

*Last updated: 2026-03-06*

## Architecture Overview

```
User Browser
     │
     ▼
Vercel (Next.js frontend + API routes)
     │
     ├── Supabase (Postgres DB + Storage CDN)
     │     ├── models/          ← GLB garment models
     │     ├── generated-art/   ← Generated artwork (permanent URLs)
     │     └── moment-art/      ← Moment artwork
     │
     ├── Printful API           ← POD fulfilment + mockup generation
     │
     └── Claudia (Mac mini)     ← Art generation server
           └── FastAPI + Python art engine
                 exposed via Cloudflare Tunnel
```

---

## Nodes

### Vercel — Frontend + API Layer
- **What:** Next.js app, all UI, API routes, business logic
- **Limitations:** Serverless — no Python, no long-running processes, no file system
- **URL:** `https://emotivx-app-1.vercel.app`
- **Deploys:** via `vercel --prod` from Mac mini (webhook TBD)
- **Env vars:** Supabase keys, Printful keys, ART_ENGINE_URL

### Supabase — Database + Storage
- **What:** Postgres (moments, matches, orders, users), Storage CDN (models, art)
- **Buckets:**
  - `models` — GLB garment files (hoodie, tshirt, longsleeve)
  - `generated-art` — AI-generated artwork, permanent public URLs
  - `moment-art` — per-moment artwork
- **Why not git:** Binary files bloat git history permanently
- **Access:** Public CDN for models/art; service role key server-side only

### Claudia (Mac mini) — Art Generation Server
- **What:** FastAPI wrapping the Python art engine
- **Specs:** Apple Silicon, 55GB RAM available, always on
- **Exposed via:** Cloudflare Tunnel (free, no port forwarding, HTTPS auto)
- **Endpoint:** `ART_ENGINE_URL` env var in Vercel
- **Why here:** Python art engine can't run in Vercel serverless; Mac mini has
  the RAM and is always on; no cloud GPU cost for PoC
- **Upgrade path:** Move to dedicated GPU server (Elliot or cloud) when volume demands it

### Elliot (Linux machine) — GPU Reserve
- **What:** Ollama, local LLMs, GPU compute
- **Specs:** Ubuntu, GPU, 192.168.0.85
- **Current role:** Local AI inference, not yet in EmotivX pipeline
- **Future role:** Heavy art generation if Mac mini becomes a bottleneck;
  ComfyUI diffusion pipeline for photo-realistic art styles

### Printful — Print On Demand
- **What:** All physical fulfilment (print, pack, ship)
- **Integration:** Direct API v2 (no Shopify)
- **Key flows:**
  - Mockup Generator → photorealistic product previews → stored in Supabase
  - Order creation → draft → confirm → track
- **Products:** AOP hoodie, t-shirt, long sleeve (IDs TBC once catalogue confirmed)

---

## Data Flow — Art Generation

```
1. User selects style + moment on merch-preview page
2. Browser POSTs to Vercel /api/moments/generate
3. Vercel forwards to Claudia (ART_ENGINE_URL) via HTTP
4. Claudia runs Python art engine → generates PNG
5. Claudia uploads PNG to Supabase generated-art bucket
6. Claudia returns Supabase public URL to Vercel
7. Vercel returns URL to browser
8. Browser loads image from Supabase CDN → applies to 3D garment
```

## Data Flow — Merch Order

```
1. User happy with design → clicks "Order"
2. Vercel /api/printful/mockup → generates photorealistic mockup
3. User confirms → Vercel /api/orders → creates draft Printful order
4. User pays → order confirmed → Printful prints + ships
5. Tracking updates pulled via Printful webhook → stored in Supabase
```

---

## GLB Models

| Model | Size | Source | Location |
|-------|------|---------|----------|
| hoodie.glb | 527KB | Free model (Draco compressed) | Supabase models bucket |
| tshirt.glb | 417KB | Free model (Draco compressed) | Supabase models bucket |
| longsleeve.glb | 4.4MB | Free model (Draco compressed) | Supabase models bucket |

**Draco decoder:** Local at `/public/draco/` — no CDN dependency (works on school/corp networks)

**Upgrade path:** Commission Marvelous Designer/CLO3D models via Upwork (~£150-250/model)
matching Printful's exact tech pack dimensions.

---

## Security

- All keys in `~/.openclaw/.env` and `projects/emotivx_app/.env.local`
- Rotation script: `scripts/rotate-keys.sh`
- Redaction script: `scripts/redact-transcripts.sh`
- Service role key: server-side only, never in client bundle
- Supabase anon/publishable key: safe for client (RLS enforced)
- `NEXT_PUBLIC_` prefix = client-safe only

---

## Cost (PoC)

| Service | Cost |
|---------|------|
| Vercel | Free (Hobby) |
| Supabase | Free tier |
| Cloudflare Tunnel | Free |
| Printful | Per order only (no subscription) |
| Claudia Mac mini | Already running |
| **Total monthly** | **£0** |

---

## Upgrade Triggers

| Trigger | Action |
|---------|--------|
| >100 art generations/day | Move art engine to Elliot GPU or cloud |
| >500MB Supabase storage | Upgrade Supabase plan (~£20/mo) |
| Vercel function timeouts | Move to Vercel Pro or self-host |
| Wrexham partnership live | Dedicated VPS for art engine |
