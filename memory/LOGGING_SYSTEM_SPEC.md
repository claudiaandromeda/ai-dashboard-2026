# Bulletproof Conversation Logging System

**Status:** BUILDING  
**Date:** 2026-03-03 12:50 GMT  
**Owner:** David + Claudia AI  
**Scope:** WebUI + Telegram + Discord (all channels logged, never silent failures)

---

## Architecture Overview

### 5-Layer Redundancy (Bulletproof)

```
┌─────────────────────────────────────────────┐
│  Conversation Happens (WebUI/Telegram/Discord)
└────────────┬────────────────────────────────┘
             │
    ┌────────▼─────────┐
    │ PRIMARY LAYER 1  │
    │ Ollama Agent     │  (mistral:7b, every 5 min)
    │ (local, free)    │  Reads session history → appends to file
    └────────┬─────────┘
             │ Success? YES ↓
             │            NO ↓
    ┌────────▼──────────────┐
    │ FALLBACK LAYER 2      │
    │ Python Direct Write   │  (if Ollama fails)
    │ (plain file I/O)      │  Append via subprocess
    └────────┬──────────────┘
             │ Success? YES ↓
             │            NO ↓
    ┌────────▼──────────────┐
    │ FALLBACK LAYER 3      │
    │ Git Auto-Commit       │  (hourly, even if Layer 1+2 fail)
    │ (version control)     │  History recoverable from git
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ HEALTH CHECK (Layer 4)│
    │ Cron every 10 min     │  Check: last log timestamp
    │ (alert on stale)      │  If > 10 min old → Telegram alert
    └────────┬──────────────┘
             │
    ┌────────▼──────────────┐
    │ DASHBOARD (Layer 5)   │
    │ Status page           │  ✅ Healthy / ⚠️ Stale / ❌ Failed
    └───────────────────────┘
```

---

## Layer 1: Primary — Ollama Local Agent

### Task
```python
# app/agents/conversation_logger.py (new)
import json
import os
from datetime import datetime
from pathlib import Path

class ConversationLogger:
    def __init__(self):
        self.log_dir = Path("/Users/claudia/.openclaw/workspace/memory/conversation-logs")
        self.log_file = None
        self.setup()
    
    def setup(self):
        self.log_dir.mkdir(exist_ok=True)
        today = datetime.now().strftime("%Y-%m-%d")
        self.log_file = self.log_dir / f"{today}_emotivx-rebuild.md"
        
        # Create if not exists
        if not self.log_file.exists():
            self.log_file.write_text(f"# Conversation Log — {today}\n\n")
    
    def log_message(self, speaker: str, message: str, tags: list = None):
        """Log a single message with timestamp and tags."""
        now = datetime.now().strftime("%H:%M:%S")
        tags_str = " ".join([f"#{tag}" for tag in (tags or [])])
        
        entry = f"[{now}] {speaker}: {message}\n"
        if tags_str:
            entry += f"  *Tags:* {tags_str}\n"
        entry += "\n"
        
        # Append to file
        with open(self.log_file, "a") as f:
            f.write(entry)
    
    def get_last_update(self) -> float:
        """Return timestamp of last log file modification."""
        return self.log_file.stat().st_mtime if self.log_file.exists() else 0

# Usage:
logger = ConversationLogger()
logger.log_message("CLAUDIA", "Set up bulletproof logging", ["logging", "infrastructure"])
logger.log_message("CLAUDE", "Building Layer 1 now...", ["logging"])
```

### Ollama Integration
```bash
#!/bin/bash
# scripts/logging_agent.sh

# Run as daemon (systemd or cron every 5 min)
cd /Users/claudia/.openclaw/workspace

# Check session history
SESSION_KEY="agent:main:webchat"
LAST_MESSAGES=$(openclaw sessions_history --session-key "$SESSION_KEY" --limit 5)

# Parse + append via Python
python3 - <<'EOF'
import sys
import json
from datetime import datetime

messages = json.loads(sys.argv[1])
logger_path = "/Users/claudia/.openclaw/workspace/memory/conversation_logger.py"
exec(open(logger_path).read())

logger = ConversationLogger()
for msg in messages:
    speaker = "CLAUDE" if msg.get("role") == "assistant" else "CLAUDIA"
    logger.log_message(speaker, msg["content"], ["emotivx", "rebuild"])
EOF
```

**Status:** ⏳ To implement

---

## Layer 2: Fallback — Python Direct Write

### Script
```python
# scripts/fallback_logger.py (new)

import sys
import json
from datetime import datetime
from pathlib import Path

def fallback_log(message: str, speaker: str = "CLAUDE", tags: list = None):
    """Direct file write if Ollama fails."""
    log_dir = Path("/Users/claudia/.openclaw/workspace/memory/conversation-logs")
    log_dir.mkdir(exist_ok=True)
    
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = log_dir / f"{today}_emotivx-rebuild.md"
    
    now = datetime.now().strftime("%H:%M:%S")
    tags_str = " ".join([f"#{tag}" for tag in (tags or [])])
    
    entry = f"[{now}] {speaker}: {message}\n"
    if tags_str:
        entry += f"  *Tags:* {tags_str}\n"
    entry += "\n"
    
    try:
        with open(log_file, "a") as f:
            f.write(entry)
        return True
    except Exception as e:
        print(f"ERROR: Fallback logging failed: {e}", file=sys.stderr)
        return False

# Called if Layer 1 fails
if __name__ == "__main__":
    success = fallback_log(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "CLAUDE")
    sys.exit(0 if success else 1)
```

**Status:** ⏳ To implement

---

## Layer 3: Git Auto-Commit

### Cron Job (Hourly)
```bash
#!/bin/bash
# scripts/git_backup_logs.sh

cd /Users/claudia/.openclaw/workspace

# Add all conversation logs
git add memory/conversation-logs/*.md
git add memory/reasoning-logs/*.md
git add memory/CONVERSATION_INDEX.md

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "chore: Auto-backup conversation logs ($TIMESTAMP)" --allow-empty

# Push to remote
git push origin main

echo "✅ Logs backed up to git: $TIMESTAMP"
```

**Cron Entry:**
```
0 * * * * /Users/claudia/.openclaw/workspace/scripts/git_backup_logs.sh >> /tmp/git_backup.log 2>&1
```

**Status:** ⏳ To implement

---

## Layer 4: Health Check with Telegram Alert

### Cron Job (Every 10 minutes)
```bash
#!/bin/bash
# scripts/logging_health_check.sh

LOG_FILE="/Users/claudia/.openclaw/workspace/memory/conversation-logs/$(date +%Y-%m-%d)_emotivx-rebuild.md"

if [ ! -f "$LOG_FILE" ]; then
    # No log file today yet (OK)
    exit 0
fi

# Check last modification time (in seconds since epoch)
LAST_MOD=$(stat -f %m "$LOG_FILE")
NOW=$(date +%s)
AGE_SECS=$((NOW - LAST_MOD))
AGE_MINS=$((AGE_SECS / 60))

# If > 10 minutes stale, alert David via Telegram
if [ $AGE_MINS -gt 10 ]; then
    LAST_LINES=$(tail -5 "$LOG_FILE" | sed 's/\n/ | /g')
    
    MESSAGE="⚠️ **LOGGING ALERT** 
    
Conversation logging is stale (not updated for $AGE_MINS minutes).

Last 5 lines:
\`\`\`
$LAST_LINES
\`\`\`

Status: Check /memory/conversation-logs/ or run diagnostics."
    
    # Send via openclaw message tool
    openclaw message send \
        --target "8309977390" \
        --message "$MESSAGE" \
        --channel telegram
fi
```

**Cron Entry:**
```
*/10 * * * * /Users/claudia/.openclaw/workspace/scripts/logging_health_check.sh
```

**Status:** ⏳ To implement

---

## Layer 5: Dashboard (Status Page)

### Static HTML
```html
<!-- docs/logging_status.html (new) -->

<!DOCTYPE html>
<html>
<head>
    <title>Conversation Logging Dashboard</title>
    <meta http-equiv="refresh" content="30">
    <style>
        body { font-family: monospace; background: #0a0e27; color: #00d4ff; padding: 20px; }
        .status { padding: 15px; border-radius: 5px; margin: 10px 0; }
        .healthy { background: #0d5f0d; border: 1px solid #00ff00; }
        .stale { background: #5f5f0d; border: 1px solid #ffff00; }
        .failed { background: #5f0d0d; border: 1px solid #ff0000; }
        .stats { margin-top: 20px; }
        code { background: #1a1a2e; padding: 2px 6px; }
    </style>
</head>
<body>
    <h1>🔍 Conversation Logging Status</h1>
    
    <div id="status-container">
        <p>Loading...</p>
    </div>
    
    <script>
        async function updateStatus() {
            const logDir = "/Users/claudia/.openclaw/workspace/memory/conversation-logs";
            const today = new Date().toISOString().split('T')[0];
            const logFile = `${logDir}/${today}_emotivx-rebuild.md`;
            
            try {
                const stat = await fetch(`/api/file-stat?path=${logFile}`).then(r => r.json());
                const ageMinutes = (Date.now() / 1000 - stat.mtime) / 60;
                
                let status, statusClass;
                if (ageMinutes < 5) {
                    status = "✅ HEALTHY";
                    statusClass = "healthy";
                } else if (ageMinutes < 10) {
                    status = "⚠️ STALE";
                    statusClass = "stale";
                } else {
                    status = "❌ FAILED";
                    statusClass = "failed";
                }
                
                document.getElementById("status-container").innerHTML = `
                    <div class="status ${statusClass}">
                        <h2>${status}</h2>
                        <p>Last update: ${ageMinutes.toFixed(1)} minutes ago</p>
                        <p>Log file: <code>${logFile}</code></p>
                    </div>
                    <div class="stats">
                        <p>Messages logged today: ${stat.size} bytes</p>
                        <p>Next health check: ~10 min</p>
                    </div>
                `;
            } catch (err) {
                document.getElementById("status-container").innerHTML = `
                    <div class="status failed">
                        <h2>❌ ERROR</h2>
                        <p>${err.message}</p>
                    </div>
                `;
            }
        }
        
        updateStatus();
        setInterval(updateStatus, 30000); // Refresh every 30s
    </script>
</body>
</html>
```

**Status:** ⏳ To implement

---

## Discord Integration

### Option A: Direct API Pull (Recommended)
```python
# scripts/discord_log_puller.py (new)

import os
import asyncio
import discord
from datetime import datetime
from pathlib import Path

class DiscordLogger:
    def __init__(self, token):
        self.client = discord.Client()
        self.token = token
        self.log_dir = Path("/Users/claudia/.openclaw/workspace/memory/conversation-logs")
    
    async def pull_and_log(self, channel_id: int, channel_name: str):
        """Pull recent messages from Discord channel."""
        channel = self.client.get_channel(channel_id)
        if not channel:
            print(f"Channel {channel_id} not found")
            return
        
        # Get last 50 messages
        async for message in channel.history(limit=50):
            today = datetime.now().strftime("%Y-%m-%d")
            log_file = self.log_dir / f"{today}_discord-{channel_name}.md"
            
            timestamp = message.created_at.strftime("%H:%M:%S")
            author = message.author.name
            content = message.content.replace("\n", " | ")
            
            entry = f"[{timestamp}] {author}: {content}\n"
            log_file.write_text(entry, append=True)

# Run daily via cron
async def main():
    logger = DiscordLogger(os.getenv("DISCORD_BOT_TOKEN"))
    await logger.client.start(os.getenv("DISCORD_BOT_TOKEN"))
    
    # Log #family-matters channel
    await logger.pull_and_log(1469099426810429555, "family-matters")
    # Log #emotivx-build channel
    # await logger.pull_and_log(CHANNEL_ID, "emotivx-build")
    
    await logger.client.close()

if __name__ == "__main__":
    asyncio.run(main())
```

**Cron Entry:**
```
0 * * * * /usr/bin/python3 /Users/claudia/.openclaw/workspace/scripts/discord_log_puller.py
```

**Status:** ⏳ To implement

### Option B: Bot Permissions + Polling
- Configure Discord bot with `view_channels` + `read_message_history` (read-only)
- Poll every 10 minutes for new messages
- Append to daily log

**Status:** ⏳ Alternative

---

## Testing Plan

### Test Matrix

| Scenario | Expected | Check |
|----------|----------|-------|
| Normal operation | Layer 1 (Ollama) logs message | ✅ File updated |
| Ollama unavailable | Layer 2 (Python) logs message | ✅ File updated |
| Python fails too | Layer 3 (Git) backs up | ✅ Git commit |
| Stale > 10 min | Layer 4 (Cron) alerts David | ✅ Telegram msg |
| Dashboard refresh | Shows ✅ Healthy | ✅ Status correct |
| Discord pull | New messages logged | ✅ discord-*.md files |
| Compaction event | All logs still readable | ✅ Files on disk |
| 24-hour run | No silent failures | ✅ Health check passes |

### Test Execution
```bash
# 1. Trigger Layer 1 (Ollama)
# Check: /memory/conversation-logs/2026-03-03_emotivx-rebuild.md updated

# 2. Disable Ollama, trigger Layer 2 (Python)
sudo systemctl stop ollama
python3 scripts/fallback_logger.py "Test fallback message" "TEST"
# Check: File updated via Python

# 3. Test Layer 4 (Health check)
# Manually touch old file timestamp
touch -t 202603031200 /memory/conversation-logs/2026-03-03_emotivx-rebuild.md
# Run health check
bash scripts/logging_health_check.sh
# Check: Telegram alert received

# 4. Full test: natural conversation for 1 hour
# Check: No gaps, all messages logged, no alerts
```

**Status:** ⏳ To execute

---

## Deployment Checklist

- [ ] Layer 1: Ollama agent script built + tested
- [ ] Layer 2: Python fallback script built + tested
- [ ] Layer 3: Git auto-commit cron configured
- [ ] Layer 4: Health check cron configured + test alert received
- [ ] Layer 5: Dashboard HTML served + working
- [ ] Discord: API puller or bot integration configured
- [ ] Full 1-hour test: no failures, all layers verified
- [ ] David sign-off: "This is bulletproof"
- [ ] Documentation for Elliot written
- [ ] Tell Elliot in Discord, he sets up same

**Status:** ⏳ To begin

---

## Files to Create

| File | Purpose | Status |
|------|---------|--------|
| `scripts/logging_agent.sh` | Ollama integration | ⏳ |
| `scripts/fallback_logger.py` | Python direct write | ⏳ |
| `scripts/git_backup_logs.sh` | Hourly git commit | ⏳ |
| `scripts/logging_health_check.sh` | Cron health check | ⏳ |
| `scripts/discord_log_puller.py` | Discord history pull | ⏳ |
| `docs/logging_status.html` | Status dashboard | ⏳ |
| `memory/LOGGING_SYSTEM_SPEC.md` | This file | ✅ |

---

**Status:** READY TO BUILD  
**Next:** Implement all 5 layers, test thoroughly, get David sign-off, tell Elliot
