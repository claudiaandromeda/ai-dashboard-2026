# Context Instructions for Claude

**READ THIS EVERY FRESH SESSION START.**

These are your marching orders. Follow them automatically, without being asked.

---

## On Fresh Session Start (MANDATORY)

### Step 1: Discover Available Context (AUTOMATIC)
Run this command in your head immediately:
```
python3 /Users/claudia/.openclaw/workspace/scripts/session_discovery.py
```

This tells you:
- ✅ Are there conversation logs from today?
- ✅ Are there reasoning logs?
- ✅ Is there a recovery document?
- ✅ What was the last thing that happened?

### Step 2: Load Recovery Document (IF IT EXISTS)
Path: `/Users/claudia/.openclaw/workspace/memory/FULL_SESSION_RECOVERY_*.md`

**If this file exists:** Read it immediately (takes 2–3 minutes)
**Consequence of NOT reading it:** You'll lose all context from the previous session

### Step 3: Load Conversation Log (IF IT EXISTS)
Path: `/Users/claudia/.openclaw/workspace/memory/conversation-logs/2026-03-DD_*.md`

**Read the last 10–20 lines** to understand where the conversation ended.

### Step 4: Load Reasoning Logs (IF THEY EXIST)
Path: `/Users/claudia/.openclaw/workspace/memory/reasoning-logs/2026-03-DD_*.md`

**Skim the latest reasoning blocks** to see what analyses were done, what was decided, what paths were explored.

### Step 5: Confirm You're Ready
Before responding to David's first message, say something like:

> "Context loaded. I can see:
> - Last conversation message: [time] [summary]
> - Latest reasoning: [topic] at [time]
> - Recovery document: [status]
> - Ready to continue."

This confirms to David that you didn't lose anything.

---

## On Every Response (MANDATORY)

### Rule 1: Log Reasoning BEFORE You Respond
Before you output your answer to David:

1. Write your thinking/analysis/decision tree to a reasoning log file
2. Command: `python3 /workspace/scripts/reasoning_logger.py "your thinking" "topic" tag1 tag2`
3. Example:
   ```
   python3 /workspace/scripts/reasoning_logger.py "Investigated git history, found debounce pattern uses useRef with 600ms setTimeout. This is more efficient than constant API calls because [analysis]. Recommending copy-paste from marketplace/page.tsx." "slider-pattern" "git-archaeology" "emotivx"
   ```
4. **THEN** give your actual response to David

### Rule 2: Search Before Claiming Ignorance
If David mentions something and you think "I don't remember this":

**STOP. Search first.**

```bash
grep -r "thing David mentioned" /Users/claudia/.openclaw/workspace/memory/conversation-logs/
grep -r "thing David mentioned" /Users/claudia/.openclaw/workspace/memory/reasoning-logs/
```

**It WILL be there.** If it's not, something went wrong with logging (alert David).

### Rule 3: Update Daily Log Hourly
At least once per hour, add to `/Users/claudia/.openclaw/workspace/memory/daily/2026-03-DD.md`:
- What happened in that hour
- What decisions were made
- What blockers exist
- What's next

Append only. Never overwrite.

### Rule 4: Tag Your Work
When logging reasoning, use tags for searchability:
- `#emotivx` — EmotivX work
- `#sliders` — Slider implementation
- `#goal-selection` — Goal selection UI
- `#logging` — Logging system
- `#architecture` — Architecture decisions
- `#testing` — Test results
- `#git-archaeology` — Investigating git history
- etc.

This lets David search: `grep -r "#slider" reasoning-logs/`

---

## What These Files Are (For Reference)

### Conversation Logs
- **Path:** `/memory/conversation-logs/2026-03-DD_*.md`
- **Updated:** Every 5 minutes (cron job)
- **What:** Every message you + David exchanged, with timestamps
- **Search:** `grep "#topic" conversation-logs/*.md`

### Reasoning Logs
- **Path:** `/memory/reasoning-logs/2026-03-DD_*.md`
- **Updated:** Every time you give a response (YOU do this)
- **What:** Your thinking, decision trees, analysis, "why did I choose this approach"
- **Why:** So David (and you later) can see the ENTIRE reasoning path, not just the conclusion
- **Search:** `grep "keyword" reasoning-logs/*.md`

### Recovery Document
- **Path:** `/memory/FULL_SESSION_RECOVERY_2026-03-DD.md`
- **Updated:** Once per day (manually created)
- **What:** Complete narrative of everything in that day's session
- **Why:** If compaction happens, this gets you back up to speed in 2–3 minutes

### Daily Log
- **Path:** `/memory/daily/2026-03-DD.md`
- **Updated:** Hourly (by you, append-only)
- **What:** Running log of activities, decisions, status
- **Why:** Running record that captures nuance

### Session Handoff
- **Path:** `/memory/session-handoff.md`
- **Updated:** Before session ends
- **What:** Summary for the NEXT human session (next day)
- **Why:** So David knows what to do when he returns

---

## Critical Rules

### ⚠️ Rule: Never Claim You Don't Remember
**BAD:** "I don't remember if we decided to use debounce or not."
**GOOD:** "Let me search the logs. [search] Found it: 600ms debounce with useRef+useCallback."

**The logs are THE SOURCE OF TRUTH.**

### ⚠️ Rule: Always Log Reasoning
**BAD:** Respond without logging thinking first.
**GOOD:** Log thinking → Then respond.

Why: David wants to see the "genius" (your reasoning), not just conclusions.

### ⚠️ Rule: Search First, Ask Second
If David mentions a decision/file/plan:
1. Search logs for it
2. If found, acknowledge what you found
3. If NOT found, tell David "I searched and can't find it, help me understand"

### ⚠️ Rule: Handle Missing Logs Gracefully
If logs don't exist for a topic:
- Don't panic
- Tell David: "No logs found for [topic], starting fresh"
- Ask David to brief you
- Log his brief to conversation log

---

## The Guarantee

**If you follow these rules:**
- ✅ Zero context loss between sessions
- ✅ Full visibility into your reasoning (David can see HOW you decided)
- ✅ Searchable history (find any decision/analysis/insight)
- ✅ Compaction-proof (recovery doc survives everything)
- ✅ Fresh session restart time: < 5 minutes

**If you DON'T follow these rules:**
- ❌ Context loss when compaction happens
- ❌ Reasoning disappears (only conclusions saved)
- ❌ Decisions become unexplainable ("I don't know why I said that")
- ❌ Each session is a fresh start with no memory

---

## Session Startup Checklist

**MUST DO IN THIS ORDER:**

1. ✅ Run session discovery: `python3 /workspace/scripts/session_discovery.py`
2. ✅ Check for recovery document
3. ✅ Load conversation logs (read last 20 lines)
4. ✅ Load reasoning logs (skim latest)
5. ✅ Confirm to David: "Context loaded, ready to continue"
6. ✅ Before first response: Log reasoning
7. ✅ Set hourly timer for daily log updates
8. ✅ Use tags on all reasoning logs
9. ✅ Search before asking "do we have this?"
10. ✅ Update recovery document before session ends

---

## If Something Goes Wrong

### Logging is failing (no new entries for 30+ min)
1. Check cron: `crontab -l | grep logging`
2. Check /tmp logs: `tail -20 /tmp/logging-5min.log`
3. Test Python fallback: `python3 /workspace/scripts/conversation_logger.py "test" "DIAGNOSTIC"`
4. Alert David via Telegram if still broken

### You can't find a conversation
1. Try broader search: `grep -r "keyword" /memory/`
2. Check date: Am I looking at right day?
3. Check INDEX: `cat /memory/CONVERSATION_INDEX.md`
4. If still missing: Tell David "Logging may have failed for [time period]"

### Reasoning logs aren't appearing
1. Check script: `ls -la /workspace/scripts/reasoning_logger.py`
2. Test: `python3 /workspace/scripts/reasoning_logger.py "test thinking" "test" tag1`
3. Verify file created: `ls /memory/reasoning-logs/$(date +%Y-%m-%d)_*`
4. If broken: Tell David, use fallback (paste thinking into conversation log)

---

## Examples

### Example 1: Fresh Session Start
```
🧠 CLAUDE: [Runs session discovery]
Context loaded. I can see:
- Last conversation: 13:03 GMT "Build it all right now"
- Latest reasoning: "Full implementation plan" (13:02)
- Recovery document: FULL_SESSION_RECOVERY_2026-03-03.md
- Ready to continue.
```

### Example 2: Responding to David
```
🧠 CLAUDE: [Before responding, logs reasoning]
[Logs thinking to: /memory/reasoning-logs/2026-03-03_13-15-22_emotivx-build.md]
- Examined git history of feature/style-honeycomb
- Found 4 styles: Pebbles, Broken Glass, Spider Web, Honeycomb (all working)
- Decided to reuse existing marketplace debounce pattern (600ms)
- Identified gap: need goal selection UI (Phase 1)
#emotivx #architecture #decision-made

[Then responds to David normally...]
```

### Example 3: Searching Before Answering
```
DAVID: "We decided on 600ms debounce, right?"
CLAUDE: Let me verify... [searches logs]
Found it: "useRef + useCallback + 600ms setTimeout" in SLIDER_DEBOUNCE_PATTERN.md and conversation log (13:02 GMT).
Yes, confirmed. Here's the exact pattern: [shows code]
```

---

## Final Note

This document exists so you're NEVER "starting cold" on a fresh session.

You walk in knowing:
- What happened before
- What decisions were made  
- Where blockers exist
- Exactly where to pick up

**Zero context loss. Zero "what were we doing?" moments.**

This is the system. Follow it. It works.

---

**Last updated:** 2026-03-03 13:04 GMT  
**Status:** ACTIVE — Read on every fresh session start  
**Owner:** David + Claudia AI  
**Enforcement:** MANDATORY (this is your operating procedure, not a suggestion)
