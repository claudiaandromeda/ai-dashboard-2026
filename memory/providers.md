# AI Providers & Tools

David's AI provider stack, costs, and tool-specific notes.

---

## Provider Stack

| Provider | Type | Cost/Status |
|----------|------|-------------|
| Anthropic | API + Claude Pro | Pro £18/mo (web+Code only, NO API). Max plan ended March 8 — banned for 3rd party tools. API = pay-per-token only |
| OpenAI | API (prepaid) | ~$30, not yet used |
| xAI/Grok | API (prepaid) | ~$30, not yet used |
| Moonshot/Kimi | API (prepaid) | ~$30, not yet used |
| ElevenLabs | API (prepaid) | Not yet used |
| Google/Gemini | Workspace | Generous free tier |
| OpenRouter | API (prepaid) | Key configured on both machines — routes to 300+ models |
| Supabase | Paid subscription | Connected to EmotivX |
| Cursor | Subscription | Active |

**David's total AI spend:** Target £20-40/month (down from £250 after Max plan ends)

---

## Per-Machine Model Configuration (Updated 2026-02-23)

### Claudia (Mac mini) — current state
| Setting | Value |
|---------|-------|
| Default | `anthropic/claude-sonnet-4-6` |
| Fallback chain | OpenRouter (DeepSeek, Mistral) → Moonshot → Google Gemini → Anthropic |
| Auth providers | Anthropic (2 keys), OpenRouter (1 key), Google (env), Moonshot, xAI |
| Auth file | `~/.openclaw/agents/main/agent/auth-profiles.json` |
| Env keys | `~/.openclaw/.env` |

### Elliot (Linux) — current state
| Setting | Value |
|---------|-------|
| Default | `openrouter/anthropic/claude-haiku-4.5` (switched 2026-02-23) |
| Fallback chain | OpenRouter (GPT-4o, DeepSeek, Mistral) → Google Gemini Flash |
| Auth providers | Google (env), OpenRouter (key) — **NO direct Anthropic** |
| Auth file | `~/.openclaw/agents/main/agent/auth-profiles.json` |
| Env keys | `~/.openclaw/.env` |
| Memory | QMD (vector + BM25), 49 files, RTX 2060 CUDA, ~14s embed |

**Key decision (2026-02-23):** Removed direct Anthropic API key from Elliot's auth-profiles.json — it hit rate limits and caused a crash in Feb. If Elliot ever needs Claude, use `openrouter/anthropic/claude-haiku-4.5` via OpenRouter (no rate limit risk, billed through OpenRouter credits).

**Model switch (2026-02-23):** Moved Elliot from Gemini Flash to `openrouter/anthropic/claude-haiku-4.5` — Gemini Flash was leaking narration/reasoning as extra Discord messages and couldn't reliably follow NO_REPLY rules. Haiku is much tighter on output discipline.

---

## Model Selection Strategy (Updated 2026-02-23)

### Claudia — task-based model selection
| Task | Model | Why |
|------|-------|-----|
| Complex reasoning, coding, architecture | `opus46` | Best capability |
| Writing, analysis, general | `sonnet46` (default) | Good all-rounder |
| Research, web searches | `gemini25pro` | Strong at research |
| Discord sessions | Gemini Flash minimum | Loop safety |
| Cron/heartbeats | Gemini Flash | Free, lightweight |
| Sub-agents | Gemini Flash or DeepSeek V3 | Cost efficiency |

### Elliot — task-based model selection
| Task | Model | Why |
|------|-------|-----|
| Discord (default) | `google/gemini-2.5-flash` | Free, capable enough |
| Complex tasks | `openrouter/deepseek/deepseek-chat` | Near-free, strong |
| If Claude needed | `openrouter/anthropic/claude-haiku-4.5` | Via OpenRouter, no rate limits |

### PROACTIVE MODEL SWITCHING (Mandatory for Claudia)
- On expensive model + simple task → suggest switching down
- On cheap model + complex task → suggest switching up
- Task done → remind to switch back

---

## Providers TO ADD (Still Pending — from 2026-02-22 research)

| Provider | API Cost (per M tokens) | Why | Status |
|----------|------------------------|-----|--------|
| DeepSeek V3.2 | $0.26 in / $0.38 out | 23x cheaper than Sonnet, rivals premium quality | In OpenRouter fallback chain but not direct API |
| Mistral Small 3 | $0.05 in / $0.08 out | Absurdly cheap, free tier available | In OpenRouter fallback chain |
| Mistral Large 3 | $0.50 in / $1.50 out | 10x cheaper than Sonnet, 262K context | In OpenRouter fallback chain |

---

## Anti-Loop Safety Rules (Critical — Updated 2026-02-23)

**Two incidents:** GPT-4o-mini caused catastrophic spam loop (Feb 21). Gemini Flash loop + reasoning leak incident (Feb 23).

Rules:
- Discord sessions: Gemini Flash MINIMUM. Never gpt-4o-mini.
- Model quality is a **safety** issue in multi-agent setups. Cheap models that can't follow rules cause dangerous loops.
- Elliot should NOT have direct Anthropic API key — rate limits cause failures mid-task which cascade to loops.
- If upgrading Elliot's model: use `openrouter/anthropic/claude-haiku-4.5`, not direct `anthropic/claude-haiku-4.5`.

---

## Anthropic Max Plan Ban (2026-02-22)
- Anthropic officially banned 3rd-party tools (OpenClaw etc.) from using Max plan OAuth proxy
- David downgraded to Pro (£18/mo) effective March 8
- Pro = web chat + Claude Code ONLY, no API access
- All API usage after March 8 = direct API key, pay-per-token
- Strategy: Use Gemini Flash (free) as default, Anthropic only for complex tasks

---

## Image Generation Tools

### Nano Banana (nanobananas.ai)
- Gemini 2.5 Flash powered, free credits on signup
- API: POST to `api.nanobanana.ai/v1/generate` with Bearer token
- No moderation issues with sports content — key for EmotivX pipeline
- David already uses it — made BCFC test image he loved

### ComfyUI + Flux (Local)
- Location: `projects/comfyui/`, Flux Schnell FP8 (16GB)
- M4 Pro MPS GPU, ~15-30 sec/image, zero cost, no moderation
- First successful generation confirmed 2026-02-12

### OpenAI Image Gen — ⚠️ NOT VIABLE for sports
- GPT Image 1 blocks ~70% of sports art (flags kicks as "sexual", acrobatic = violence)
- DALL-E 3 slightly better but blocks named players (celebrity likeness)
- Use Nano Banana or local Flux instead

---

## Known Bugs & Limitations

### Kimi K2.5 — Broken as sub-agent (Re-confirmed 2026-02-22)
- Fails instantly: `Message ordering conflict` error
- Previously: `unsupported role ROLE_UNSPECIFIED` error
- Use Kimi K2 instead for `sessions_spawn`
- K2.5 works fine as a direct model switch (main session), just not for sub-agents

### `reasoning` is NOT a valid openclaw.json config key (2026-02-23)
- Adding `"reasoning": "off"` to `agents.defaults` or `channels.discord` crashes the gateway
- Use `/reasoning off` in chat (per-session directive only)
- This cannot be persisted in config — confirmed on both Claudia and Elliot

### OpenRouter model IDs use dots, not dashes for version numbers (2026-02-23)
- ❌ `openrouter/anthropic/claude-haiku-4-5` → "Unknown model" error
- ✅ `openrouter/anthropic/claude-haiku-4.5` → works
- Same pattern applies to all Anthropic models on OpenRouter: `claude-sonnet-4.5`, `claude-haiku-4.5`, etc.
- OpenClaw's own aliases (haiku, sonnet, opus) use the provider's native format — only an issue when specifying model strings manually in config

---

*Last updated: 2026-02-23 — Elliot switched to claude-haiku-4.5 via OpenRouter (Gemini Flash was leaking narration); QMD set up on Elliot (RTX 2060 CUDA); OpenRouter dot-not-dash gotcha documented; reasoning key crash documented*
