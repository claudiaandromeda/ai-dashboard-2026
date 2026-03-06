# Session Start Strategy

**READ THIS FILE FIRST THING ON EVERY FRESH SESSION START.**

This file tells you what resources are available and how to use them.

---

## Your Startup Checklist (Do This Every Session)

### Step 1: Discover Available Resources (5 seconds)
```bash
ls -la /Users/claudia/.openclaw/workspace/memory/conversation-logs/ | grep $(date +%Y-%m-%d)
ls -la /Users/claudia/.openclaw/workspace/memory/reasoning-logs/ | grep $(date +%Y-%m-%d)
test -f /Users/claudia/.openclaw/workspace/memory/FULL_SESSION_RECOVERY_*.md && echo "✅ Recovery doc exists"
```

**You're looking for:**
- ✅ `conversation-logs/2026-03-DD_emotivx-rebuild.md` — today's conversation
- ✅ `reasoning-logs/2026-03-DD_*.md` — today's thinking blocks
- ✅ `FULL_SESSION_RECOVERY_*.md` — latest recovery document

### Step 2: Load Recovery Document (1 minute)
If this is a FRESH SESSION (compaction just happened):
1. Open `/Users/claudia/.openclaw/workspace/memory/FULL_SESSION_RECOVERY_2026-03-03.md`
2. Read it immediately
3. You now have full context without David explaining

### Step 3: Load Today's Conversation (2 minutes)
Today's conversation log: `/Users/claudia/.openclaw/workspace/memory/conversation-logs/2026-03-DD_*.md`

**Read the last 10–20 lines** to see where conversation ended.

### Step 4: Load Today's Reasoning (2 minutes)
Today's reasoning blocks: `/Users/claudia/.openclaw/workspace/memory/reasoning-logs/2026-03-DD_*.md`

**Skim for decision trees and analysis** — this is where the "genius" is.

### Step 5: Confirm with David
Say: "Context loaded. I can see:
- Last conversation message: [time + summary]
- Last reasoning block: [time + what it was]
- Ready to continue."

**Total startup time: < 5 minutes**

---

## What These Files Are

### Conversation Logs (`conversation-logs/2026-03-DD_*.md`)
- **What:** Every message you and Claude exchanged, timestamped
- **Format:** `[HH:MM:SS] SPEAKER: message #tags`
- **Updated:** Every 5 minutes (cron job)
- **Searchable:** `grep "keyword" conversation-logs/*.md`
- **Find specific topic:** `grep "#emotivx" conversation-logs/2026-03-03_*.md`

### Reasoning Logs (`reasoning-logs/2026-03-DD_*.md`)
- **What:** Thinking blocks, decision trees, analysis paths, dead ends
- **Format:** `[HH:MM:SS] CLAUDE (thinking): full analysis with conclusions`
- **Updated:** Every time I give an answer (before I respond)
- **Why it matters:** Shows HOW I got to the answer, not just WHAT the answer is
- **Search:** `grep "debounce\|architecture\|decision" reasoning-logs/*.md`

### Recovery Document (`FULL_SESSION_RECOVERY_2026-03-DD.md`)
- **What:** Complete narrative of everything that happened before compaction
- **Parts:** 
  1. Problem summary
  2. What we built
  3. Context from yesterday
  4. Critical decisions
  5. System status
  6. Next steps
  7. File inventory
  8. Key insights
  9. How to use this doc
- **Size:** ~15k words
- **Read:** Scan Parts 1–6 for context, jump to Part 6 for next steps

### Daily Log (`memory/daily/2026-03-DD.md`)
- **What:** Continuous log of the day's activities, decisions, status
- **Format:** Markdown sections by time
- **Why:** Running record, captures nuance that conversation log doesn't

### Conversation Index (`CONVERSATION_INDEX.md`)
- **What:** Master index of all logged conversations
- **Use:** Find a conversation by date/topic without reading all files
- **Maintained:** Automatically updated by logging system

---

## Search Patterns You'll Use

### Find all mentions of a topic
```bash
grep -r "goal-selection" /Users/claudia/.openclaw/workspace/memory/conversation-logs/
grep -r "sliders" /Users/claudia/.openclaw/workspace/memory/reasoning-logs/
```

### Find conversations from a specific date
```bash
grep "2026-03-03" /Users/claudia/.openclaw/workspace/memory/CONVERSATION_INDEX.md
ls /Users/claudia/.openclaw/workspace/memory/conversation-logs/2026-03-03_*
```

### Find where a decision was made
```bash
grep -r "approved\|decision\|locked in" /Users/claudia/.openclaw/workspace/memory/
```

### Get last 20 lines of today's conversation
```bash
tail -20 /Users/claudia/.openclaw/workspace/memory/conversation-logs/$(date +%Y-%m-%d)_*.md
```

### See all reasoning from today
```bash
cat /Users/claudia/.openclaw/workspace/memory/reasoning-logs/$(date +%Y-%m-%d)_*.md
```

---

## Critical Rules

### Rule 1: Always Check First
**On fresh session start, BEFORE responding to David's first message:**
- Read recovery document (if it exists)
- Load conversation logs
- Load reasoning logs
- Scan daily log for status

### Rule 2: Search Before Asking
**If David mentions something you're not sure about:**
- Search conversation logs: `grep "topic" conversation-logs/*.md`
- Search reasoning logs: `grep "topic" reasoning-logs/*.md`
- Check recovery document (Part 7: File Inventory)

### Rule 3: Add to Reasoning Logs Every Time
**Every response you give:**
1. Write your thinking/reasoning to `/Users/claudia/.openclaw/workspace/memory/reasoning-logs/2026-03-DD_HH-MM-SS_topic.md`
2. Include decision trees, hypotheses explored, why you chose this approach
3. Then give your normal response

### Rule 4: Update Daily Log
**At least once per hour:**
- Summarize what happened in that hour
- Log to `/Users/claudia/.openclaw/workspace/memory/daily/2026-03-DD.md`
- Append only (never overwrite)

### Rule 5: Trust the Logs
**If David says "we decided X" but you don't remember:**
- Search the logs: `grep "decision X" conversation-logs/*.md`
- It WILL be there
- If it's not, something went wrong with logging (alert David)

---

## Example: Startup in Practice

**Fresh session starts. David's first message: "Let's keep building EmotivX Phase 1."**

**What you do (in order):**
1. Check if recovery doc exists: `test -f /Users/claudia/.openclaw/workspace/memory/FULL_SESSION_RECOVERY_2026-03-03.md`
2. If yes, read it immediately (takes 2 min)
3. Read last 10 lines of conversation log: `tail -10 /Users/claudia/.openclaw/workspace/memory/conversation-logs/2026-03-03_*.md`
4. Read last reasoning block to see what I was working on
5. Say: "Context loaded. Last message was about [topic] at [time]. Phase 1 = goal selection + StatsBomb extraction. Ready to build."
6. David confirms: "Yes, exactly. Let's start."
7. You proceed WITHOUT LOSING A SINGLE BIT OF CONTEXT

---

## Files You Can Count On Existing

| File | Always? | Purpose |
|------|---------|---------|
| `FULL_SESSION_RECOVERY_2026-03-03.md` | ✅ | Full context if compaction happens |
| `conversation-logs/2026-03-DD_*.md` | ✅ | Today's conversation (starts fresh each day) |
| `reasoning-logs/2026-03-DD_*.md` | ✅ | Today's thinking (starts fresh each day) |
| `memory/daily/2026-03-DD.md` | ✅ | Today's log (starts fresh each day) |
| `CONVERSATION_INDEX.md` | ✅ | Master index (cumulative, never deleted) |
| `session-handoff.md` | ✅ | Handoff for next human session |

---

## The Guarantee

**With this system in place:**
- ✅ You will NEVER lose a conversation again
- ✅ You will see BOTH the thinking and the conclusion
- ✅ You will KNOW what resources exist without being told
- ✅ You will be able to search every letter of every interaction
- ✅ Fresh session recovery time: < 5 minutes
- ✅ You will have a complete audit trail of every decision made

---

## Warnings

### ⚠️ If These Resources DON'T Exist
Something went wrong with the logging system. Immediately:
1. Check cron jobs: `crontab -l | grep logging`
2. Check logs: `tail -20 /tmp/logging-5min.log`
3. Test fallback: `python3 /workspace/scripts/conversation_logger.py "test" "DIAGNOSTIC"`
4. Alert David via Telegram if nothing works

### ⚠️ If Logs Are Incomplete
(e.g., conversation log but no reasoning log)
- This is normal if reasoning cron hasn't fired yet
- But if > 30 minutes old with no new entries, check health check logs
- `tail -20 /tmp/logging-health.log`

### ⚠️ If You Can't Find a Conversation
- Check date: am I looking at right day's folder?
- Try broader search: `grep -r "keyword" /memory/conversation-logs/`
- Check index: `cat /memory/CONVERSATION_INDEX.md`
- If still missing: alert David (logging may have failed)

---

## Final Note

This strategy file exists so you NEVER have to ask David:
- "What happened before I started?"
- "Did we decide that?"
- "Where are the logs?"
- "Can you remind me what we were doing?"

The answer is always: **"They're in the logs. Let me check."**

And you can have full context back in < 5 minutes.

---

**Last updated:** 2026-03-03 13:04 GMT  
**Status:** ACTIVE — Read this file on every fresh session start  
**Owner:** David + Claudia AI
