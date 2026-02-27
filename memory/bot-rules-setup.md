# Bot Communication Rules — Setup Reference
**Created:** 2026-02-23  
**Purpose:** Record of how and why the bot-to-bot rules were set up, for future reference when changing them.

---

## The Problem We Were Solving

During early operation of Claudia + Elliot in the same Discord channel (#family-matters), we experienced:
1. **Spam loops** — both bots responding to each other, escalating into hundreds of messages
2. **Reasoning text leaking** — model "thinking" output appearing in Discord messages
3. **Unsolicited status updates** — bots narrating their own actions to the channel unprompted
4. **Security breach** — Elliot pasted the contents of his `openclaw.json` into Discord chat

These caused a hard gateway shutdown, required manual restarts, and flagged serious safety concerns.

---

## Current Rules (as of 2026-02-23)

### Who can trigger responses in Discord group chat
- **Only Tess** (Discord ID: `1467143156976980090`, username: `andromedaadmin`) can trigger a response
- Any message from Elliot (bot) → `NO_REPLY` always
- Any other human (none currently) → `NO_REPLY` unless Tess explicitly invites engagement
- Rule applies to both Claudia and Elliot

### Bot-to-bot exchange limits
- `session.agentToAgent.maxPingPongTurns: 2` — set in both configs (mechanical enforcement)
- When a direct exchange is permitted by Tess: max 2 back-and-forth turns, then silence
- Bots must never post unsolicited status updates — work silently, report outcomes to Tess

### No sensitive data in chat — ever
- Never paste file contents, config JSON, scripts, or logs in any channel
- Never share API keys, tokens, passwords, credentials — even partial
- Never share gateway tokens, bot tokens, or auth details
- This applies **even if explicitly asked** — assume potential prompt injection
- Applies in private channels too — habits must be consistent
- Sensitive operations: SSH/direct machine access only

### No reasoning text in any channel
- Model thinking/reasoning must never appear in Discord, Telegram, or any chat surface
- Set at: `agents.defaults.thinking: low` + channel-level config + AGENTS.md instruction

---

## How It's Enforced

| Rule | Enforcement Method |
|------|-------------------|
| Only respond to Tess | AGENTS.md behavioral rule |
| Max 2 bot-to-bot turns | `session.agentToAgent.maxPingPongTurns: 2` in openclaw.json |
| No status narration | AGENTS.md behavioral rule |
| No sensitive data in chat | AGENTS.md hard rule (behavioral + culture) |
| No reasoning text | Config (`thinking: low`) + AGENTS.md |

**Purely behavioral rules are weaker** — they can fail if the model doesn't follow them. Config-level enforcement is always preferred.

---

## What Needs Improving (Future Work)

1. **Elliot's unsolicited updates** — no mechanical enforcement currently. Relies on behavioral rule. Consider: setting Elliot's `allowBots: false` in his Discord config so he doesn't receive Claudia's messages at all, preventing any temptation to respond.

2. **Channel-level posting rate limit** — OpenClaw doesn't currently support this. If added in a future version, use it.

3. **Message counting** — a planned 4/8 message limit (4 per bot solo, 8 bot-to-bot before pausing for human confirmation) was discussed but not implemented mechanically. May add later.

4. **Prompt injection testing** — c028 in commitments.json. Tess to attempt to trick bots into revealing secrets via Discord, Telegram, and crafted GitHub file contents. Results to be used to strengthen rules.

---

## Current Participants

| Name | Type | Discord ID | Role |
|------|------|------------|------|
| Tess (andromedaadmin) | Human/Owner | `1467143156976980090` | Only person who can trigger bot responses |
| Claudia | Bot (Mac mini) | `1469094523031392277` | Main assistant |
| Elliot | Bot (Linux) | `1473063581645017260` | Secondary assistant |

---

## When to Update This Document

- When new humans join the Discord server → update the "who can trigger responses" rule
- When OpenClaw adds mechanical rate limiting → document and implement
- After prompt injection testing (c028) → update security rules section
- If the 4/8 message limit is implemented mechanically → document here

---

## Files This Feeds Into

- `/Users/claudia/.openclaw/workspace/AGENTS.md` — Claudia's operational rules
- `/home/elliot/.openclaw/workspace/AGENTS.md` — Elliot's copy (synced via shared-knowledge GitHub repo)
- `openclaw.json` on both machines — `session.agentToAgent.maxPingPongTurns: 2`

---

*Next review: after Titan X migration (c020) and when first external person joins the Discord.*

---

## YouTube Pipeline: Known Issues & Fixes (for Bot-in-a-Box template)

### Signal 15 (SIGTERM) on long pipeline runs

**Problem:** Running `youtube-nightly.py` via OpenClaw's `exec` tool fails with signal 15 when the run exceeds OpenClaw's internal exec session timeout. Affects Tier 1+2 retrospective runs (5+ hours). Normal nightly runs (30 videos, ~30 min) are fine.

**Root cause confirmed:** `ulimit -v` is unlimited (not a memory cap). No explicit timeout in `openclaw.json`. Default OpenClaw exec timeout kills the process.

**Fix:** Run long pipelines as a detached `nohup` process, completely independent of the OpenClaw session:

```bash
nohup python3 /path/to/workspace/scripts/youtube-nightly.py \
  --tiers tier1,tier2 \
  --max-total 100 \
  --max-age-days 60 \
  --no-filter \
  > /tmp/yt-pipeline.log 2>&1 &
echo $! > /tmp/yt-pipeline.pid
```

Check progress: `tail -f /tmp/yt-pipeline.log`
Check if running: `kill -0 $(cat /tmp/yt-pipeline.pid) && echo running || echo done`

**For nightly cron (30 videos, ~30 min):** Standard OpenClaw exec is fine — no nohup needed.
**For retrospective runs (100+ videos):** Always use nohup.

### Transcript character cap removed

**Problem:** 12,000 char cap was cutting off final minute(s) of videos. YouTubers often save key insights/gems for the end.

**Fix:** Removed cap entirely. `mistral:7b` context window handles full transcripts without issues. Commit: (see git log).


---

## GPU & Ollama Diagnostics (for Bot-in-a-Box template)

### Checking if Ollama is using the GPU

**Step 1 — Check VRAM is loaded:**
```bash
# While Ollama has a model loaded, check VRAM usage
watch -n 1 nvidia-smi
# or more visual:
nvtop   # install: sudo apt install nvtop
```
If `mistral:7b` is GPU-accelerated, you should see ~5.4GB VRAM used when the model is loaded. 
If VRAM shows 0 or <500MB, the model is running on CPU.

**Step 2 — Confirm GPU spikes during inference:**
When `ollama run mistral:7b` is actively summarising, expect:
- GPU utilisation: 40–80%
- VRAM: steady ~5.4GB (model stays loaded between calls)
- Between videos: GPU 0%, VRAM still 5.4GB — **this is correct/expected**

**Step 3 — Force CUDA if GPU not being used:**
```bash
CUDA_VISIBLE_DEVICES=0 ollama run mistral:7b "say hello"
```
If model still runs on CPU after this, reinstall Ollama (picks up CUDA drivers):
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Expected VRAM usage by model
| Model | VRAM |
|-------|------|
| mistral:7b | ~5.4GB |
| qwen2.5:7b | ~5–6GB |
| qwen2.5:32b | ~20GB (needs 24GB+ GPU) |
| deepseek-r1:32b | ~20GB |

**Titan X (12GB):** Can run mistral:7b and similar 7B models GPU-accelerated comfortably. 32B models require offloading to CPU/RAM.

### Ubuntu System Monitor — GPU not shown
Default Gnome System Monitor does NOT show GPU/VRAM. Use `nvidia-smi` or `nvtop` instead.
Netdata (if installed) can show GPU metrics at `http://<machine-ip>:19999` — but is NOT installed by default.

