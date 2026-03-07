# ENV_KEYS.md — Key Map

**Two env files, one Vercel project. This document is the canonical record of what lives where.**

Last updated: 2026-03-07

---

## File 1: `~/.openclaw/.env`
**Scope:** OpenClaw system, bots, and AI provider access. NOT project-specific.
**Permissions:** 600. Never in git. Never in workspace.

| Key | What It Is | Used By |
|-----|-----------|---------|
| `DISCORD_BOT_TOKEN` | Claudia Discord bot token | OpenClaw Discord provider |
| `TELEGRAM_BOT_TOKEN` | Claudia Telegram bot token | OpenClaw Telegram provider |
| `GATEWAY_AUTH_TOKEN` | OpenClaw gateway auth token | Gateway daemon |
| `NOTION_API_KEY` | Notion integration key | Notion skill, NOTION_TOKEN alias |
| `NOTION_TOKEN` | ⚠️ DUPLICATE of NOTION_API_KEY | Remove one — keep NOTION_API_KEY |
| `OPENAI_API_KEY` | OpenAI direct API key | Whisper, image gen, fallback |
| `MEM0_API_KEY` | Mem0 long-term memory API | Memory tools |
| `GEMINI_API_KEY` | Google Gemini direct key | Gemini skill |
| `GOOGLE_API_KEY` | ⚠️ Likely same as GEMINI_API_KEY | Confirm — may be duplicate |
| `CLIVE_OPENROUTER_KEY` | OpenRouter key for Claudia bot | OpenClaw model routing |
| `ELLIOT_OPENROUTER_KEY` | OpenRouter key for Elliot bot | Elliot's OpenClaw instance |
| `PERPLEXITY_API_KEY` | Perplexity direct API key | Web search (direct) |
| `PERPLEXITY_OPENROUTER_KEY` | Perplexity via OpenRouter | Web search (via OpenRouter) |
| `OLLAMA_API_KEY` | Ollama local API key | Local model inference (Elliot) |

**⚠️ Known issues:**
- `OLLAMA_API_KEY` appears **twice** in the file — deduplicate
- `NOTION_TOKEN` / `NOTION_API_KEY` — likely same key, two names — verify and remove one

---

## File 2: `projects/emotivx_app/.env.local`
**Scope:** EmotivX Next.js app, local development only.
**Permissions:** gitignored. Never committed.

| Key | What It Is | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Public — safe in browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon JWT | Public — safe in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role JWT | **Secret** — server-side only |
| `SUPABASE_ACCESS_TOKEN` | Supabase Management API token | For CLI/admin ops — NOT the same as service role |
| `PRINTFUL_API_KEY` | Printful API key (v2) | Server-side only |
| `PRINTFUL_STORE_ID` | Printful store ID | Used with API calls |
| `ART_ENGINE_URL` | URL to local FastAPI art server | Currently: Cloudflare tunnel (changes on restart) |

**⚠️ Known issue:**
- `ART_ENGINE_URL` is a Cloudflare tunnel URL that changes on restart — fix: persistent named tunnel → update this + Vercel env var once

---

## Vercel Environment Variables (Production)
**Set via:** `vercel env add <KEY>` or Vercel dashboard → Project → Settings → Environment Variables
**Project:** `emotivx-app-1`

| Key | Value Source | Type |
|-----|-------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `.env.local` | Plain |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as `.env.local` | Plain |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as `.env.local` | Secret |
| `PRINTFUL_API_KEY` | Same as `.env.local` | Secret |
| `PRINTFUL_STORE_ID` | Same as `.env.local` | Plain |
| `ART_ENGINE_URL` | Persistent Cloudflare tunnel URL | Plain — **update when tunnel is made permanent** |

**Note:** `SUPABASE_ACCESS_TOKEN` is for local CLI/admin use only — do NOT add to Vercel.

---

## Rules

1. **OpenClaw system keys → `~/.openclaw/.env` only.** Never in the workspace or git.
2. **EmotivX app keys → `projects/emotivx_app/.env.local` for local dev, Vercel dashboard for prod.**
3. **No key lives in two places with different values.** If a key is needed in both files, it should be the same value — document it here.
4. **`ART_ENGINE_URL` is the only key expected to change** — update both `.env.local` and Vercel when the persistent tunnel is set up.
5. **After rotating any key:** run `scripts/redact-transcripts.sh` to clean transcripts, then re-run `scripts/scan-secrets.sh` to verify.

---

## Pending Cleanup

- [ ] Deduplicate `OLLAMA_API_KEY` in `~/.openclaw/.env`
- [ ] Confirm `NOTION_TOKEN` vs `NOTION_API_KEY` — same key? Remove the alias.
- [ ] Confirm `GOOGLE_API_KEY` vs `GEMINI_API_KEY` — same key? Remove the alias.
- [ ] Set up persistent Cloudflare tunnel → update `ART_ENGINE_URL` everywhere
- [ ] Update `.env.example` in emotivx_app to reflect all current keys
