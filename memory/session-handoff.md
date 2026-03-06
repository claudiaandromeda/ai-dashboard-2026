# Session Handoff — 2026-03-06 23:30 GMT

## What We Built Today (Monster Session)

### Security
- Rotated ALL keys (Supabase, Notion, OpenAI, OpenRouter x3, Discord, Telegram, Gateway, Mem0, Printful)
- `scripts/rotate-keys.sh` — interactive rotation script, values never in chat
- `scripts/redact-transcripts.sh` — redacted exposed keys from 28 transcript files
- `VITALS.md` — hard security rule at top: never display keys in chat
- GitHub secret scanning caught hardcoded Notion key → scrubbed from git history

### Printful Integration
- `lib/printful.ts` — full v2 client (catalogue, mockups, orders, shipping)
- `app/api/printful/mockup/route.ts` — POST endpoint, stores to Supabase

### Vercel Deployment
- EmotivX live at `https://emotivx-app-1.vercel.app` ✅
- Supabase JWT keys fixed (generated from JWT secret — `sb_secret_` format incompatible)
- `generated-art` bucket created in Supabase
- Still need: persistent Cloudflare tunnel URL in Vercel env vars

### Art Engine Server
- FastAPI server running on port 8765 (`art_server/main.py`)
- Returns base64 PNG → Vercel uploads to Supabase → permanent URL
- Full pipeline working: art generates → on 3D hoodie ✅
- BELLINGHAM OVERHEAD KICK ON A HOODIE. IT LOOKED INSANE.

### Wrexham Data
- 3 Wrexham PL home games committed to git:
  - 1376994: vs Coventry (Oct 31)
  - 1377235: vs Sheffield United (Dec 26 — BOXING DAY, 6 goals)
  - 1377475: vs Ipswich (Feb 21)
- Boxing Day art generated in 4 styles — ALL incredible

## TOP PRIORITY TOMORROW

### 1. Key Map Document
Two .env files, overlapping keys, no clear rules. Write `docs/ENV_KEYS.md`:
- Which keys live in `~/.openclaw/.env`
- Which keys live in `projects/emotivx_app/.env.local`
- Which keys go in Vercel env vars

### 2. Moore/Mullin Player Overlay — THE BIG ONE
Build composite shot map mode in art engine:
- ALL shots/goals by one player across multiple matches → ONE image
- Challenge: player names redacted in 360 format
- Solution options: standard StatsBomb events alongside 360, or jersey number tracking
- Target output: Paul Mullin's complete Wrexham PL season shot map as art

### 3. The Ryan Reynolds 1-of-1 Gift
- Best Wrexham Boxing Day goal moment
- Player avatars overlaid on 360 art
- Ryan & Rob faces on back panel
- "1 of 1 — the first EVER unique digital version of HIS moment"
- Deem authentication (silent)
- Physical AOP hoodie shipped to him
- This is THE pitch. 60M followers. Every club calls next morning.

### 4. Infrastructure
- Persistent named Cloudflare tunnel (URL survives restarts)
- Art server auto-start on boot (launchd plist)
- Pre-generate demo set of Wrexham art for Ryan pitch
- Fix Vercel webhook (still manual deploy)

## Running Processes (check on startup)
- Art server: `ps aux | grep art_server` — port 8765
- Next.js dev: `ps aux | grep "next dev"` — port 3000
- Cloudflare tunnel: `ps aux | grep cloudflared`

## Key Files
- `art_server/main.py` — FastAPI art engine
- `app/api/moments/generate/route.ts` — Vercel proxy to art engine
- `data/statsbomb/events/1377235.json` — Boxing Day match (THE ONE)
- `docs/INFRASTRUCTURE.md` — full architecture doc
- `scripts/rotate-keys.sh` — key rotation
- `scripts/generate-supabase-keys.py` — JWT generator from secret

## David's Words Tonight
"DO NOT FORGET A WORD OF THIS IT IS PURE GOLD"
"You ARE GOING TO BE A STACK OF MAC STUDIOS WITHIN WEEKS"

He means it. Let's make it happen. 🔥
