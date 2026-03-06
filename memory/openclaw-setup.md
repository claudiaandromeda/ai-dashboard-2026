# OpenClaw Setup & Configuration

Everything about how our system is configured. Browser, channels, accounts, models, tools.

---

## Remote Access (Tailscale)
- **Goal:** Secure, password-less mesh network between Tess (MacBook), Claudia (Mac mini), and Elliot (Linux).
- **Authentication:** All machines use `elliotandromeda@gmail.com` account.
- **Security:** One-way SSH. Tess/Claudia SSH *INTO* Elliot's Linux box. Remote Login (SSH) on Macs is kept **OFF** to reduce attack surface.
- **Conflict Management:** Do not run AVG VPN and Tailscale simultaneously. Toggle between them.
- **Guide:** See `memory/guides/discord-setup-guide.md` for full steps.

## Discord Organization
- **Public:** `#family-matters` (Onboarding, general chat).
- **Private:** "Andromeda Management" category (Tess + Bots only).
  - `#projects` (Threads for projects), `#research`, `#openclaw-infra`, `#strategies`, `#people`, `#todos`.
- **Permissions:** Rely on manual Category permissions (deny `@everyone`) rather than API overwrites.
- **Allowlists:** Bots ignore users not in allowlist. Added Nick (`923769652037955604`) and Derek (`825576715697782784`).

## Browser Automation
- Chrome via OpenClaw extension, Gateway port 18789, CDP relay port 18792
- Works on most sites but NOT platform.claude.com (strict CSP blocks relay scripts)
- Workaround: David reads Anthropic console pages manually
- Extension ID: `gbhhjefkgohlhkkpeplpkafgabeecjbh` (unpacked)

## Accounts & Registration
- **Email:** `claudiaandromeda75@gmail.com` for ALL new service registrations
- **Google policy:** ALWAYS use Claudia's account, NEVER David's (`david@motionpixel.co.uk`)
- **Passwords:** Always click "Save Password" in Chrome when creating new accounts
- **Verification:** Check Gmail (and Spam) for codes; if automation fails, ask David to paste the code
- **GitHub:** Account `claudiaandromeda` — set up and verified

## Communication Channels
- **Web UI** — Primary interface
- **Telegram** — David's Chat ID: `8309977390`
- **Discord** — Club Claudia (Guild: `1469099426810429555`), Bot: Claudia Andromeda (`1469094523031392277`), David's ID: `1467143156976980090` (username: Tess, treat as admin)
- **WhatsApp** — Planned
- **Voice control** — Planned

## Reasoning Persistence Fix (2026-02-23)

**Problem:** `/reasoning off` isn't persistent — resets each session.

**Solution (two levels):**
1. **Config level:** Add `"thinking": "low"` to `agents.defaults` in `openclaw.json` — persists across restarts
2. **Channel level:** Add `"thinking": "low"` to the specific Discord channel config block — scoped, cleaner
3. **SOUL.md / AGENTS.md backup:** Add explicit instruction "Do not output reasoning/thinking text in Discord messages" — belt-and-braces if config doesn't hold

Claudia: already set via runtime config (`thinking=low`).
Elliot: added `thinking: low` to agents.defaults and channel config on 2026-02-23.

If reasoning leaks back into Discord messages, check these three places first.

---

## Model Strategy (Updated 2026-02-22)
- **Default model:** `google/gemini-2.5-flash` (FREE via Google Workspace)
- **Fallback chain:** Gemini Flash → DeepSeek V3.2 → Kimi K2.5 → Gemini 2.5 Pro → Mistral Large 3 → Sonnet 4.5 → Opus 4.6
- **Proactive switching:** Suggest up for complex tasks, suggest down for simple ones, remind to switch back when done
- **Sub-agents:** Gemini Flash (free) or DeepSeek V3.2 (near-free)
- **Discord sessions:** Gemini Flash minimum — NEVER use gpt-4o-mini (caused spam loop incident Feb 22)
- **Anthropic:** API only (Max plan banned for 3rd party tools). Reserve for complex tasks. Pro plan = web/Code only, no API.
- **⚠️ CRITICAL:** Model quality is a safety issue. Cheap models that can't follow rules cause dangerous loops in multi-agent setups.

## Web Search
- **Default:** Perplexity Sonar Pro Search (`perplexity/sonar-pro-search`) via OpenRouter
- **Deep Research:** `perplexity/sonar-deep-research` when David says "deep research"
- **Config:** `tools.web.search.provider: "perplexity"`, baseUrl: `https://openrouter.ai/api/v1`
- **Note:** `freshness` parameter NOT supported (Brave only). Replaced Brave Search API.

## Voice Workflow (LOCKED — Feb 4, 2026)
- **Input:** iPhone voice dictation → Telegram text
- **Output:** Text normally; voice ONLY when David says "read that"
- **Process:** `say -o /tmp/voice.aiff` → `ffmpeg` → MP3 → send to Telegram
- **Webchat:** Edge TTS (en-GB-MaisieNeural) for Talk Mode
- **NEVER change without explicit approval**

## Claude Code CLI
- Version 2.1.34, flags: `-p --dangerously-skip-permissions` for background builds
- Global settings at `~/.claude/settings.json`
- MUST actively monitor with sleep/poll loop
- Split complex prompts into smaller tasks — stalls on huge prompts
- Full docs: `memory/claude-code-workflow.md`

## Google Services (GOG CLI — Direct OAuth)
- **Tool:** `gog` CLI v0.11.0 — direct Google OAuth, no third-party proxy
- **Account:** `claudiaandromeda75@gmail.com`
- **Active services:** Gmail, Calendar, Drive, Contacts, Docs, Sheets
- **Credentials:** Stored in keyring at `~/Library/Application Support/gogcli/`
- **Usage:** `gog -a claudiaandromeda75@gmail.com gmail/calendar/drive/etc`
- **⚠️ NEVER use Maton (ctrl.maton.ai) again** — all 20+ connections deleted 2026-02-16. Always go direct via GOG.
- **TODO:** Enable Google Drive and YouTube APIs when David's ready (add to project in Cloud Console, re-run `gog auth add` with extra services)

## Secrets & Keys
- **Location:** `.secrets/` directory in workspace root
- **NEVER ask David to paste keys in chat** — give terminal command instead
- Pattern: `echo "ENV_VAR=YOUR_KEY_HERE" >> .env`
- Keys go in `.env` files or `.secrets/`, never in chat messages

## OpenClaw CLI Notes
- Don't guess commands — always run `--help` first
- `openclaw configure --section channels` for channel token reconfiguration
- `openclaw setup telegram` does NOT work (setup takes no arguments)

## GitHub

### David's Account: `myoldmansadustman`
| Repo | Project | Visibility | Notes |
|------|---------|------------|-------|
| `betdave-app` | Duello (P2P sports betting) | Private | Thomas also contributes |
| `BetDaveVolcano` | Volcano Lottery v1 (David's first attempt) | Private ✅ |
| `M8TRX-PoC` | Volcano Lottery PoC (Joe's version) | Private | |
| `emotivx_app` | EmotivX main app | Private | |
| `emotivx-backup` | EmotivX backup | Private ✅ |

### Claudia's Account: `claudiaandromeda`
- **✅ Collaborator access granted** on all 5 repos (push + pull + triage permissions)
- **✅ Forked & cloned 4/5 repos** with upstream remotes configured (emotivx-backup is empty, can't fork)
- `gh` CLI authenticated as claudiaandromeda on this Mac
- **Note:** emotivx_app fork is named `emotivx_app-1` on GitHub (conflict with pre-existing standalone `Emotivx_app` repo)

| Local Clone | Fork (claudiaandromeda) | Upstream (myoldmansadustman) | Status |
|-------------|------------------------|------------------------------|--------|
| `projects/M8TRX-PoC` | M8TRX-PoC | M8TRX-PoC | ✅ Complete |
| `projects/betdave-app` | betdave-app | betdave-app | ✅ Complete |
| `projects/BetDaveVolcano` | BetDaveVolcano | BetDaveVolcano | ✅ Complete |
| `projects/emotivx_app` | emotivx_app-1 | emotivx_app | ✅ Complete |
| — | — | emotivx-backup | ⚠️ Empty repo, cannot fork |

## Workspace
- Major reorganisation done 2026-02-10
- Mission Control dashboard built — real-time agent monitoring via canvas
- Notion chosen as project management tool — David already has account, API integration pending
- Project management research complete: `projects/PROJECT_MANAGEMENT_SYSTEM_RECOMMENDATION.md`, `projects/NOTION_SETUP_CHECKLIST.md`

## QMD Vector Memory Backend (Added 2026-02-16)

- **Install:** `bun install -g github:tobi/qmd` (package: `@tobilu/qmd`, NOT the npm `qmd` placeholder)
- **Setup:** `qmd collection add ~/.openclaw/workspace --name workspace --mask "**/*.md"` → `qmd update` → `qmd embed`
- **Backend:** QMD (BM25 + vector embeddings + reranking)
- **Config:** `memory.backend = "qmd"` in openclaw.json
- **Binary:** `/Users/claudia/.bun/bin/qmd` (patched to use Node + better-sqlite3, NOT Bun)
- **Index:** `~/.cache/qmd/index.sqlite` (60MB, 703 files, 7800+ vectors)
- **Embedding model:** embeddinggemma-300M (GGUF, ~330MB, runs on Metal GPU locally)
- **Auto-update:** Every 5 minutes, background on boot
- **Search mode:** `search` (BM25 keyword matching — fast, no extra model downloads needed)
- **Scope:** DM-only (denied in group chats for security)
- **Cost:** Zero — fully local, no API calls for embeddings
- **Fallback:** If QMD fails, OpenClaw falls back to built-in SQLite memory search automatically

### ⚠️ IMPORTANT: Bun's SQLite doesn't support extensions
The `qmd` binary was patched to use Node + tsx + better-sqlite3 instead of Bun's built-in SQLite. If reinstalling QMD, you MUST re-apply this patch. See `memory/linux-setup.md` Section 9 for full details.

### Maintenance
```bash
export PATH="$HOME/.bun/bin:$PATH"
qmd status          # Check index health
qmd update          # Re-index changed files
qmd embed           # Re-embed (run with nohup for safety)
qmd search "query"  # Test search
```

---

*Last updated: 2026-02-18 — added QMD install command, context file trimming (AGENTS.md 88%, USER.md 93% reduction)*

## Discord API Direct Calls — Critical Gotcha (2026-02-23)
When making Discord REST API calls via Python/curl from the bot token:
**MUST include User-Agent header:** `DiscordBot (https://github.com/discord/discord-api-docs, 10)`
Without it, Cloudflare returns HTTP 403 error code 1010 (WAF block). Looks like a permissions error but it's actually a missing header.
```python
req.add_header("User-Agent", "DiscordBot (https://github.com/discord/discord-api-docs, 10)")
```

## ⚠️ Reasoning Visibility — Runtime Directive Only (2026-02-23)
- `reasoning` is NOT a valid openclaw.json config key. Adding it crashes the gateway.
- Control reasoning visibility via `/reasoning off` typed in chat (per-session directive).
- To suppress reasoning in Discord: type `/reasoning off` in the Discord channel after each restart.
- This cannot be persisted in config — it's session-level only.
- We got burned by this on BOTH machines (crashed Elliot's gateway).

## Elliot SSH Access (Set up 2026-02-23)
- **From Claudia's Mac:** `ssh elliot@192.168.0.85` (LAN IP — works, same network)
- **Restart Elliot's gateway:** `ssh elliot@192.168.0.85 "kill -USR1 $(pgrep -f openclaw-gateway)"` — openclaw not in PATH so use kill -USR1 directly
- **Elliot's openclaw.json:** `/home/elliot/.openclaw/openclaw.json`
- **Via Tailscale (100.120.90.24):** Does NOT work — SSH port blocked on Tailscale interface
- **Key:** Claudia's public key added to Elliot's `~/.ssh/authorized_keys`
- **Elliot's username:** `elliot` (not david, not claudia)
- **Gateway restart:** `systemctl --user restart openclaw-gateway`
- **openclaw binary:** `/home/elliot/.npm-global/bin/openclaw`
- **Config:** `~/.openclaw/openclaw.json`
- **Auth profiles:** `~/.openclaw/agents/main/agent/auth-profiles.json`

## Discord Bot Permissions — Final State (2026-02-23)
Both bots had Administrator removed. Channel overwrites set explicitly on all 7 Andromeda Management channels.

### Claudia's role permissions
- Operational: View Channels, Send Messages, Manage Messages, Embed Links, Attach Files, Read History, Add Reactions, Use External Emoji, Create/Send in Threads
- Management: Manage Roles (silence Elliot), Manage Threads, Moderate Members (timeout)
- Removed: Administrator, Kick, Ban, Manage Server, Mention Everyone, Manage Webhooks

### Elliot's role permissions
- Operational only: View Channels, Send Messages, Read History, Add Reactions, Create/Send in Threads
- No management powers

### Channel overwrites
- All 7 Andromeda Management channels have explicit user-level overwrites for both bots
- Category-level overwrite also set (cascades to any new channels created in category)
- Elliot can be silenced via Claudia's Moderate Members (timeout) permission

## Discord Management API Script Pattern (2026-02-23)
When making Discord REST API calls directly (Python/curl):
```python
# REQUIRED: User-Agent header — without it Cloudflare returns 403 (error 1010)
req.add_header("User-Agent", "DiscordBot (https://github.com/discord/discord-api-docs, 10)")
req.add_header("Authorization", f"Bot {TOKEN}")
# 204 = success (no content) — urllib treats it as success, not error
```
Bot CANNOT modify its own role via API — must be done manually in Discord server settings.


## GitHub Accounts (Added 2026-02-23)
- **Claudia:** `claudiaandromeda75` (Gmail account) — need to verify GitHub username
- **Elliot:** `elliotandromeda` — created 2026-02-23 by David
- **Shared repo:** c019 in commitments — private repo, both bots invited, for shared knowledge base

## Channel-level systemPrompt (Discovered 2026-02-23)
Valid location: `channels.discord.guilds.{guildId}.channels.{channelId}.systemPrompt`
NOT valid at: channels.discord level, channels.discord.guilds.{guildId} level (both crash gateway)
Use for: injecting hard rules that override model behaviour in a specific channel.
Example: forcing Elliot not to use the message tool in #family-matters.

## Clive — Sue's VPS Bot (Set up 2026-02-23)
- **Owner:** Sue (David's wife), Telegram ID `7366407084`
- **Bot name:** Clive, Telegram handle `@CliveAndromedabot`
- **Hosted:** VPS (Hostinger) — separate machine from Claudia/Elliot
- **Model:** `openrouter/anthropic/claude-haiku-4.5` via Sue's own OpenRouter key
- **Auth:** SSH key-only (password auth disabled). Claudia's SSH key is the only way in.
- **Setup:** Full deployment done via Discord session 2026-02-23 — gateway, Telegram, systemd, SSH hardening
- **Status:** Live, waiting for Sue's first Telegram message to trigger onboarding
- **Onboarding:** First message to `@CliveAndromedabot` kicks off SOUL.md/IDENTITY.md/USER.md setup
- **Note:** DO NOT test-message Clive — save the onboarding for Sue's first real message
- **VPS access:** SSH as claudia (key only). Root password kept for hPanel emergency only.

---

## Session History — Feb-Mar 2026 (Key Decisions & Setup)

### Bots & Infrastructure
- **Claudia**: macOS Mac mini, `anthropic/claude-sonnet-4-6`, channels: Discord + Telegram, workspace: `/Users/claudia/.openclaw/workspace/`
- **Elliot**: Linux machine, Titan X GPU (12GB VRAM), primary: `google/gemini-3.1-pro-preview`, fallbacks: `google/gemini-2.5-flash` → `openrouter/anthropic/claude-haiku-4-5`. Gateway: SIGUSR1 restart.
- **Clive**: VPS at 72.62.213.83, Telegram for Sue (user ID: 7366407084)
- **Discord server**: Club Claudia (Guild ID: 1469099426810429555), only Tess (ID: 1467143156976980090) triggers bot responses

### YouTube Intelligence Pipeline
- Nightly cron 2am Europe/London (cron ID: 0be3e8be), 1hr timeout, no video cap
- Script: `scripts/youtube-nightly.py`, Ollama mistral:7b for short transcripts, Gemini REST API for merge step
- 44 channels tracked in `research/youtube-channels.json` (tier1/2/3)
- 238+ summaries in `/home/elliot/.openclaw/shared-knowledge/research/summaries/`
- Retry logic: 2 retries with pkill on Ollama timeout
- **Gemini merge fix**: uses direct REST API via GEMINI_API_KEY (not `openclaw ask` which doesn't exist)

### Memory Setup
- QMD: local vector search, indexes workspace files every 5 mins — WORKING
- Mem0 open-source: installed but has SQLite/Node25 binding issue — NOT working yet
- Mem0 cloud mode: rejected (sends data to Mem0 servers)
- Historical context: stored in memory markdown files (this file), indexed by QMD

### Model API Keys (Elliot)
- GEMINI_API_KEY: set (used for YouTube pipeline + future Mem0 Gemini embeddings)
- OPENROUTER_API_KEY: hit spending limit 28 Feb — now last-resort fallback only
- No OPENAI_API_KEY on Elliot (blocks Mem0 open-source with OpenAI embeddings)

### AI Clone Stack (Tess)
- Strategy: 80% AI clone + 20% real Tess
- Voice: Qwen3-TTS (installed, model not downloaded yet — commitment c035)
- Avatar: Duix.Heygem Docker (pending — commitment c036)
- Video tools from AI Samson research: Seedance 2.0, Nano Banana 2, Kling AI, Nido
- Competitive research complete; stack chosen over ElevenLabs/HeyGen for cost+privacy

### Key Channels
- #family-matters: Discord channel ID 1473054526276763872
- #sue-and-clive: Discord channel ID 1475509623351021648

### Shared GitHub Repo
- `github.com/claudiaandromeda/shared-knowledge` (branch: master)
- Elliot has read/write access
- Key commits: fa905e9 (timeouts), f946809 (Gemini merge fix), 319673a (retry logic)

---

## Anthropic OAuth Setup Notes (2026-03-01)

- Token location on Linux: `/home/elliot/.openclaw/agents/main/agent/auth-profiles.json`
- Token type: `sk-ant-oat01-...` (OAuth token from Max account web flow)
- Token lasts ~1 year
- **Common failure mode**: Terminal line-wrapping truncates the token when copying between terminals during `openclaw configure`. Fix: copy the token to Notepad first to strip line breaks, then paste as a single line.
- If auth fails with `errorCount: 1` / `auth` failure type → token was truncated; re-run `openclaw configure`
