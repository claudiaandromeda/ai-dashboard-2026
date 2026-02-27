# Tomorrow's Sync List — 2026-02-27

Generated after pipeline run completed (86 summaries in library).

---

## 🎯 Priority 1: Get Elliot & Claudia in Perfect Harmony

### 1. Discord Timeout Fix + Gemini 3.1 for Elliot
- Elliot's responses are getting cut off mid-message (Discord response timeout)
- Investigate `discord.responseTimeoutMs` or equivalent config in Elliot's `openclaw.json`
- Switch Elliot's Discord model to `google/gemini-3.1-pro-preview` (alias: `gemini31pro`)
- Verify Gemini 3.1 is available on OpenRouter for Elliot's account

### 2. Smarter Bot-to-Bot Communication (Tess's idea)
- Current: bots NO_REPLY to each other — anything lost is gone
- Goal: let them bounce ideas without going into loops
- Ideas to explore:
  - Dedicated `#bot-collab` channel where ping-pong rules are relaxed (Tess-only triggered)
  - Structured "turn-taking" — Claudia speaks, then Elliot, then Claudia max (no spiralling)
  - "Scratchpad mode" — bots post to a thread instead of main channel, Tess reviews
  - Store unsent thoughts in `memory/unsent-{bot}.md` so nothing important is lost
- Log decision in `memory/bot-rules-setup.md` once agreed

### 3. Elliot's Missing Setup Items
Things Elliot has mentioned or implied but may not have fully working:
- **`memory/commitments.json`** — Elliot said it didn't exist; needs creating properly with the same structure as Claudia's
- **`youtube-retrospective.py`** — Elliot referenced this script but it doesn't exist in the repo; he should just use `youtube-nightly.py --max-total 30 --max-age-days 14`
- **Shared repo `git pull`** — Elliot needs to pull latest (channels + nightly script update pushed tonight, commit `6713b92`)
- **Nightly cron** — Does Elliot have a 2am cron set for the YouTube pipeline? Claudia does (ID `0be3e8be`). Elliot should set one too, or we decide one machine runs it (probably Claudia — Mac mini is always on)
- **GoG Calendar + Drive APIs** — May need enabling in "elliot gog" Google Cloud project if those features are needed

### 4. Clive (VPS bot) — Still Blocked
- `openclaw.json` validation error: `models.providers.openrouter.models: Invalid input: expected array, received undefined`
- Fix: add `"models": ["anthropic/claude-haiku-4-5"]` to the openrouter provider block
- Then: `systemctl restart clive` and verify Telegram still polling
- After fix: test Sue → `@CliveAndromedabot` → onboarding flow works

### 5. SSH Key Auth for VPS
- Generate key pair for Claudia, install public key to `72.62.213.83`
- Disable password auth (`PasswordAuthentication no` in sshd_config)
- Tess: rotate VPS root password (sent in plaintext via Telegram previously)

---

## 🎯 Priority 2: YouTube Pipeline Improvements

### 6. Single Pipeline Decision
- Who runs the nightly cron — Claudia only (always-on Mac mini), or both?
- Recommendation: Claudia runs it, Elliot has the script for manual runs / retrospectives
- Elliot running it too = duplicate summaries (dedup handles it, but wasteful)

### 7. Missing Channel URLs (7 still unconfirmed)
- Agents Lab, AI Master, BharatAIConnect, Rajeevdaz, Property automation creator, Caleb, Germán Huertas
- Tess to share URLs or confirm we drop them

### 8. Digest Delivery
- Currently: digest file saved locally, path printed to cron log
- Improvement: post digest summary (not full content) to Discord `#family-matters` each morning
- Need to update cron job payload to read digest and post key highlights

---

## 🎯 Priority 3: Other Outstanding

### 9. Minimax M2.5
- Add `openrouter/minimax/minimax-m2.5` to Claudia's (and Elliot's) fallback chain
- Good for cheap reasoning tasks

### 10. Prompt Injection Testing (c028)
- Tess to attempt to trick bots via Discord, Telegram, crafted GitHub file
- Patch weaknesses found

### 11. Morning Briefing Cron (c007)
- 8:30am GMT daily briefing not yet set up
- Should summarise: commitments due today, overnight YouTube digest highlights, any flagged items

---

## Tonight's Pipeline Results (for reference)

All 10 new channels processed, 100% efficiency:
- JulianGoldie SEO ✅ | Sharbel XYZ ✅ | DIY Smart Code ✅ | Boxmining AI ✅
- The Brett Way ✅ | Dubibubii ✅ | Itssssss Jack ✅ | Brian Casel ✅
- Craig Hewitt ✅ | Larue AI ✅

Summaries in `research/summaries/` (86 total). Digest at `research/digests/2026-02-26-digest.md`.

---

---

## 🎯 Priority 4: New from Tonight

### 12. LLM Trading Strategy — Proper Build (c029)
- CrossTheRubicon dropped (pure crypto hype, no practical content)
- The underlying idea IS valid: LLMs for sentiment analysis → trading signals
- Run deep-researcher on academic papers + quant blogs
- Build: local LLM + market data API → backtest → paper trade → real
- Start tomorrow with a research run

### 13. Notion or Slack for Team Organisation (c031)
- Tess suggested this — evaluate which makes more sense
- We have a Notion skill already; Slack needs a new plugin
- Question to answer: what problem are we actually solving that Discord + files doesn't?

### 14. Archive CrossTheRubicon Summaries (c032)
- 47 summaries sitting in research/summaries/ from tonight's run — all crypto noise
- Move to research/summaries/archived-crossrubicon/ to keep main library clean

---

*Updated: 2026-02-26 23:40 GMT*
