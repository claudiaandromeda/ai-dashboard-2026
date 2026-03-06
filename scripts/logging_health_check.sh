#!/bin/bash
# Layer 4: Health Check (runs every 10 minutes)
# Alerts David via Telegram if logging is stale or failed

set -e

WORKSPACE="/Users/claudia/.openclaw/workspace"
LOG_DIR="$WORKSPACE/memory/conversation-logs"
TODAY=$(date +%Y-%m-%d)
LOG_FILE="$LOG_DIR/${TODAY}_emotivx-rebuild.md"

# Check if log file exists
if [ ! -f "$LOG_FILE" ]; then
    # No log file yet today (this is OK if it's early in the day)
    # Only alert if it's after 10:00 AM
    HOUR=$(date +%H)
    if [ "$HOUR" -gt 10 ]; then
        echo "⚠️  WARNING: No log file at $HOUR:00 (after 10 AM)"
        exit 0  # Don't alert yet, just log
    fi
    exit 0
fi

# Get last modification time
LAST_MOD=$(stat -f %m "$LOG_FILE" 2>/dev/null || echo 0)
NOW=$(date +%s)
AGE_SECS=$((NOW - LAST_MOD))
AGE_MINS=$((AGE_SECS / 60))

# Status determination
if [ $AGE_MINS -lt 5 ]; then
    STATUS="✅ HEALTHY"
    LOG_LEVEL="debug"
elif [ $AGE_MINS -lt 10 ]; then
    STATUS="⚠️  STALE"
    LOG_LEVEL="warning"
else
    STATUS="❌ FAILED"
    LOG_LEVEL="critical"
fi

echo "[$TIMESTAMP] $STATUS (age: ${AGE_MINS}m)" >> /tmp/logging_health.log

# Only alert if critical (> 10 minutes)
if [ $AGE_MINS -gt 10 ]; then
    echo "🚨 ALERT: Logging stale for $AGE_MINS minutes"
    
    # Get last few lines for context
    LAST_LINES=$(tail -10 "$LOG_FILE" | sed 's/$/\n/' | head -c 500)
    
    # Build Telegram message
    MESSAGE="🚨 **LOGGING ALERT**
    
**Status:** ❌ Conversation logging stale
**Age:** ${AGE_MINS} minutes since last update
**Log file:** \`$LOG_FILE\`

**Last entries:**
\`\`\`
$LAST_LINES
...
\`\`\`

**Action required:** Check if Ollama agent is running or if fallback is working.

Run diagnostics:
\`\`\`
ps aux | grep mistral
python3 /workspace/scripts/conversation_logger.py \"test\" \"DIAGNOSTIC\"
\`\`\`"
    
    # Send via openclaw message tool (if available)
    if command -v openclaw &> /dev/null; then
        openclaw message send \
            --target "8309977390" \
            --message "$MESSAGE" \
            --channel telegram 2>/dev/null || echo "Failed to send Telegram alert"
    fi
fi
