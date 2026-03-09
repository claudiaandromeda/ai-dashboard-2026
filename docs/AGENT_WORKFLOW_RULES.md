# Agent Workflow Rules — When to Use What

**Created:** 2026-03-09  
**Context:** EmotivX rapid development, multiple sequential code changes

---

## The Decision Rule

### **Use OpenClaw Subagents For:**
- ✅ **Sequential one-off tasks** (editing 1-3 files per task)
- ✅ **Quick fixes** (< 5 minutes execution time each)
- ✅ **When context is healthy** (< 180k tokens in coordinator session)
- ✅ **Multiple small changes** in a row (8-10 tasks total)
- ✅ **Simple edits** (add function, fix bug, update config)

**Why:** Zero setup, push-based completion, auto-tracked, proven reliable.

**Example:** Tonight's 8 quick wins (xG removal, Printful naming, navigation links, etc.)

---

### **Use Claude Code CLI For:**
- ✅ **Heavy iteration** (20+ sequential tasks, context bloat risk)
- ✅ **Long-running work** (need real-time progress visibility)
- ✅ **Complex refactors** (touching 10+ files, need interactive TUI)
- ✅ **When coordinator session is heavy** (> 180k tokens)
- ✅ **Exploratory work** (trying multiple approaches, need fast feedback)

**Why:** No context bloat, real-time streaming, interactive TUI, faster for large batches.

**Example:** Full codebase refactor, security audit with 50+ file changes, multi-hour coding session.

**Setup required:** One-time `claude login` (interactive auth in terminal).

---

## Implementation

### Subagent Workflow (Default)
```typescript
// Coordinator writes task
Write("/tmp/task.md", taskDescription)

// Spawn subagent
sessions_spawn({
  runtime: "subagent",
  mode: "run",
  task: taskDescription,
  cwd: projectPath,
  runTimeoutSeconds: 180
})

// Wait for push-based completion (NO polling needed)
// Completion event arrives as user message → reply with result
```

**Pros:**
- Clean code (no polling loops)
- Structured completion events
- Token usage tracked
- Auto-announces when done

**Cons:**
- Adds ~500-1k tokens per completion to coordinator session
- Less interactive (no live progress)

---

### Claude Code CLI Workflow (Heavy Lifting)
```typescript
// Write task to file
Write("/tmp/task.md", taskDescription)

// Spawn Claude Code with PTY
exec({
  command: `cd ${projectPath} && claude --dangerously-skip-permissions -p "$(cat /tmp/task.md)"`,
  pty: true,
  background: true
})

// Poll for completion
process({
  action: "poll",
  sessionId: sessionId,
  timeout: 90000
})

// Read result from logs
process({
  action: "log",
  sessionId: sessionId
})
```

**Pros:**
- Zero context bloat (runs in separate PTY)
- Real-time progress visibility
- Interactive TUI (if needed)
- Faster for large batches

**Cons:**
- Requires `claude login` first (one-time setup)
- Manual polling needed (no push-based completion)
- Results in PTY logs (less structured)

---

## Decision Tree

```
Is this a single quick fix (< 5 min)?
├─ Yes → Subagent ✅
└─ No ↓

Is coordinator session heavy (> 180k tokens)?
├─ Yes → Claude Code CLI ✅
└─ No ↓

Is this part of a batch (< 10 tasks)?
├─ Yes → Subagent ✅
└─ No ↓

Is this exploratory/iterative work (20+ tasks)?
├─ Yes → Claude Code CLI ✅
└─ No → Default to Subagent ✅
```

---

## Current Session Stats (2026-03-09 20:09 GMT)

- **Tokens:** 108k / 200k (54%)
- **Tasks completed:** 8 quick wins via subagents
- **Workflow:** Subagents working perfectly
- **Next task:** Art engine texture loading (subagent, ~3 min)
- **Switch to CLI if:** Session hits 180k+ tokens or we queue 10+ more tasks

---

## Setup Checklist

### Subagents (Ready Now ✅)
- [x] OpenClaw authenticated
- [x] sessions_spawn available
- [x] Default model set (sonnet-4-6)

### Claude Code CLI (Needs Setup ⚠️)
- [ ] Run `claude login` (one-time, interactive)
- [ ] Verify `claude --version` (should show 2.1.39+)
- [ ] Test with dummy task
- [ ] Set preferred model (if not default sonnet)

---

## Notes

- **Subagents inherit workspace directory** automatically (no `cwd` conflicts)
- **Claude Code requires explicit `cd`** before commands
- **Both use same OpenClaw API keys** (no separate auth needed for providers)
- **Subagent completion events are structured** (easy to parse result)
- **Claude Code logs are raw text** (need manual parsing)

**Bottom line:** Start with subagents, switch to Claude Code when you hit scale/bloat issues. Simple, fast, clean.

---

**Last updated:** 2026-03-09 20:09 GMT (during EmotivX art engine build)
