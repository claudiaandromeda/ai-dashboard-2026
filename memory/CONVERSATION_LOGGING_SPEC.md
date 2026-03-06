# Conversation Logging System Specification

**Purpose:** Capture ALL conversations (webUI, Telegram, Discord) to prevent data loss from compaction.

**Status:** ACTIVATED 2026-03-03 11:28 GMT

---

## Architecture

### Three-Tier Logging

#### Tier 1: Real-Time Local Files (THIS SESSION)
- **Location:** `/Users/claudia/.openclaw/workspace/memory/conversation-logs/`
- **Format:** `YYYY-MM-DD_HH-MM_TOPIC.md` (one file per conversation session)
- **Content:**
  - [HH:MM:SS] SPEAKER: message
  - #topic-keywords for searchability
  - Timestamps on every message
  - Speaker identification (Claudia/David/Claude AI)
- **Update Frequency:** Every message (real-time)
- **Storage:** Plain text markdown (survives any compaction)

#### Tier 2: Searchable Index
- **Location:** `/Users/claudia/.openclaw/workspace/memory/CONVERSATION_INDEX.md`
- **Content:** Master index of all logged sessions
  - Date, time, duration, topics
  - Keywords for search
  - Link to full transcript file
- **Updated:** After each session ends
- **Purpose:** Find conversations by topic/date without reading all files

#### Tier 3: Cross-Session Memory (Mem0)
- **Purpose:** Critical decisions, action items, learnings
- **Scope:** Only high-value summaries (not full transcripts)
- **Location:** Mem0 cloud storage
- **Usage:** `memory_store` tool for key decisions

---

## Message Format

Each message logged as:
```
[HH:MM:SS] SPEAKER (role): message text
```

**Example:**
```
[11:28:15] CLAUDIA (user): Check the git for slider auto-regeneration
[11:28:45] CLAUDE (assistant): Found it! useRef + debounce 600ms pattern
[11:29:02] CLAUDIA (user): Build conversation logging NOW
```

**Speakers:**
- CLAUDIA = user (David)
- CLAUDE = assistant (me)
- ELLIOT = third-party bot (rare in webUI)
- TELEGRAM/DISCORD = source annotation for cross-channel conversations

---

## Channel Coverage

### ✅ WebUI (THIS CHANNEL)
- **Status:** ACTIVE NOW
- **Capture:** All messages in real-time
- **Method:** Persistent subagent reading session history
- **File:** `2026-03-03_11-28_emotivx-rebuild.md`

### ⏳ Telegram DMs
- **Status:** QUEUED FOR INTEGRATION
- **Target:** When David travels or wants async comms
- **Method:** Telegram bot API polling (requires TELEGRAM_BOT_TOKEN)
- **File:** `YYYY-MM-DD_telegram-chats.md`
- **Limitation:** Must ensure bot has read-only access (no sending)

### ⏳ Discord Channels
- **Status:** QUEUED FOR INTEGRATION
- **Target:** #family-matters, #emotivx-build, etc.
- **Method:** Discord bot API polling (read-only)
- **File:** `YYYY-MM-DD_discord-#channel-name.md`
- **Limitation:** Must ensure bot has read-only permissions

### ⏳ Session Transcripts (Auto-Archive)
- **Status:** AVAILABLE
- **Source:** OpenClaw `sessions_history` tool
- **Method:** Archive full session transcripts at end of day
- **File:** `.archive/sessions/YYYY-MM-DD_HH-MM_transcript.md`

---

## Search & Retrieval

### Finding a Conversation
1. **By date:** Check `CONVERSATION_INDEX.md` → find date
2. **By topic:** Index has tags (e.g., #sliders, #goal-selection, #team-patterns)
3. **By keyword:** grep all files in `conversation-logs/` directory
4. **Command:** `grep -r "#slider" /Users/claudia/.openclaw/workspace/memory/conversation-logs/`

### Example Queries
```bash
# Find all slider discussions
grep -r "slider\|debounce" memory/conversation-logs/

# Find all goal-selection work
grep -r "#goal-selection" memory/conversation-logs/

# Find conversations from March 2
grep "2026-03-02" memory/CONVERSATION_INDEX.md
```

---

## Retention & Archival

### Active Logs (Current Session)
- **Duration:** Live while conversation ongoing
- **Location:** `conversation-logs/YYYY-MM-DD_*.md`
- **Auto-cleanup:** None (keep all)

### Historical Logs (Previous Sessions)
- **Duration:** Keep all (no expiry)
- **Location:** Same `conversation-logs/` directory
- **Index:** Updated in `CONVERSATION_INDEX.md`
- **Backup:** Git-committed monthly

### Cleanup Policy
- **Delete:** Never (privacy + archival)
- **Move:** To `.archive/` after 6 months if needed (not yet)
- **Git:** Commit all logs to git weekly (prevents loss if local disk fails)

---

## Critical Safety Rules

### What Gets Logged
✅ All conversation messages (user + assistant)  
✅ Timestamps on every message  
✅ Topic tags for search  
✅ Code snippets, decisions, plans  
✅ Technical discussions  

### What Does NOT Get Logged
❌ API keys, tokens, credentials (use env vars)  
❌ Personal phone numbers, addresses  
❌ Private family info (use common sense)  
❌ One-off debugging commands (ok to skip)  

### Compaction Safety
- **Problem:** OpenClaw compaction deletes message history from session context
- **Solution:** This logging system stores FULL transcripts to disk
- **Verification:** If compaction occurs, full history still in `conversation-logs/`
- **Recovery:** Read the dated file, continue where you left off

---

## Implementation Timeline

### Phase 1: WebUI (NOW - 11:28 GMT)
- ✅ Directory structure created
- ✅ Index file created
- ✅ Spec written (this file)
- ⏳ Spawn persistent Haiku subagent to capture messages

### Phase 2: Telegram Integration (This Week)
- Create Telegram bot (read-only)
- Set up polling loop
- Log to `telegram-chats.md`

### Phase 3: Discord Integration (This Week)
- Extend bot permissions (read-only for #family-matters, #emotivx-build)
- Set up polling loop
- Log to `discord-#channel.md` per channel

### Phase 4: Cross-Channel Search (Next Week)
- Single command to search all channels at once
- Build master "what happened when" timeline
- Automated digest generation

---

## Files

| File | Purpose | Status |
|------|---------|--------|
| `conversation-logs/` | All conversation transcripts | ✅ Ready |
| `CONVERSATION_INDEX.md` | Searchable master index | ✅ Ready |
| `CONVERSATION_LOGGING_SPEC.md` | This file | ✅ Ready |
| Haiku subagent (persistent) | Capture messages in real-time | ⏳ Spawning now |

---

## Testing & Verification

**Before considering this "done":**
1. ✅ Log directory created and writable
2. ✅ Index file created and readable
3. ⏳ Subagent spawned and logging messages
4. ⏳ Manual verify: check dated log file contains real conversation
5. ⏳ Verify timestamps are correct
6. ⏳ Verify topic tags are applied
7. ⏳ Test: trigger compaction, verify log file still readable

---

## Questions & Decisions

**Q: What if conversation gets very long (1000+ messages)?**  
A: Single file per session. If unwieldy, split by hour at end of session.

**Q: What if we want to merge multiple channels into one view?**  
A: Grep across files. Eventually build a unified view tool.

**Q: Privacy: is this safe to commit to git?**  
A: Treat like daily logs (already committed to git). Exclude `.env` and `.git/` only.

**Q: Will this cause performance issues?**  
A: No. Logging is async, file writes are tiny. Haiku model minimal cost.

**Q: What about existing session history?**  
A: Can use `sessions_history` tool to archive past sessions. Do this separately.

---

**Status:** LIVE as of 2026-03-03 11:28 GMT  
**Owner:** David + Claudia AI  
**Last Updated:** 2026-03-03 11:28 GMT
