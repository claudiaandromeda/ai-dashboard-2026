#!/bin/bash
# Daily Log Generator — runs at 11:55pm, creates daily log from gateway activity
# Ensures we NEVER have a missing day again.

set -uo pipefail

DATE="${1:-$(date '+%Y-%m-%d')}"
LOG_DIR="$HOME/.openclaw/workspace/memory/daily"
LOG_FILE="$LOG_DIR/$DATE.md"
GATEWAY_LOG="$HOME/.openclaw/logs/gateway.log"
GATEWAY_ERR="$HOME/.openclaw/logs/gateway.err.log"
NIGHTLY_LOG="$HOME/.openclaw/nightly.log"

mkdir -p "$LOG_DIR"

# If log already exists and has content beyond the stub, don't overwrite
if [ -f "$LOG_FILE" ] && [ "$(wc -l < "$LOG_FILE")" -gt 10 ]; then
    echo "[daily-log] $LOG_FILE already has content ($(wc -l < "$LOG_FILE") lines), appending activity summary"
    echo "" >> "$LOG_FILE"
    echo "---" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    echo "## Auto-Generated Activity Summary" >> "$LOG_FILE"
    APPEND_MODE=true
else
    # Create fresh log
    cat > "$LOG_FILE" << EOF
# Daily Log — $DATE

> ⚠️ Auto-generated from gateway logs. No manual session log was written today.

---

EOF
    APPEND_MODE=false
fi

{
    # Section: Session Activity
    echo "## Session Activity"
    echo ""
    SESSION_COUNT=$(grep -c "$DATE.*agent\.wait" "$GATEWAY_LOG" 2>/dev/null || echo "0")
    echo "- Agent turns detected: $SESSION_COUNT"
    
    # Webchat connections
    WEBCHAT=$(grep -c "${DATE}.*webchat connected" "$GATEWAY_LOG" 2>/dev/null || true)
    echo "- Webchat connections: ${WEBCHAT:-0}"
    
    # Telegram activity
    TELEGRAM=$(grep -c "${DATE}.*\[telegram\].*starting" "$GATEWAY_LOG" 2>/dev/null || true)
    echo "- Telegram provider starts: ${TELEGRAM:-0}"
    
    echo ""

    # Section: Discord Status
    echo "## Discord Status"
    echo ""
    DISCORD_RESUME=$(grep -c "$DATE.*Attempting resume" "$GATEWAY_LOG" 2>/dev/null || echo "0")
    DISCORD_CLOSE=$(grep -c "$DATE.*WebSocket connection closed" "$GATEWAY_LOG" 2>/dev/null || echo "0")
    DISCORD_STALL=$(grep -c "$DATE.*connection stalled" "$GATEWAY_LOG" 2>/dev/null || echo "0")
    echo "- Resume attempts: $DISCORD_RESUME"
    echo "- WebSocket closes: $DISCORD_CLOSE"
    echo "- Connection stalls: $DISCORD_STALL"
    
    if [ "$DISCORD_RESUME" -gt 50 ]; then
        echo "- ⚠️ **HIGH RECONNECTION COUNT** — possible Discord connectivity issue"
    fi
    echo ""

    # Section: Errors
    echo "## Errors"
    echo ""
    ERR_COUNT=$(grep -c "$DATE" "$GATEWAY_ERR" 2>/dev/null || echo "0")
    if [ "$ERR_COUNT" -gt 0 ]; then
        echo "- Error log entries: $ERR_COUNT"
        echo ""
        echo '```'
        grep "$DATE" "$GATEWAY_ERR" 2>/dev/null | head -20
        echo '```'
    else
        echo "- No errors logged ✅"
    fi
    echo ""

    # Section: Cron/Pipeline Status
    echo "## Pipeline Status"
    echo ""
    if [ -f "$NIGHTLY_LOG" ]; then
        PIPELINE_TODAY=$(grep "$DATE" "$NIGHTLY_LOG" 2>/dev/null || true)
        if [ -n "$PIPELINE_TODAY" ]; then
            echo '```'
            echo "$PIPELINE_TODAY"
            echo '```'
        else
            echo "- No pipeline activity for $DATE"
        fi
    else
        echo "- Nightly log not found"
    fi
    echo ""

    # Section: Gateway restarts
    echo "## Gateway Restarts"
    echo ""
    RESTART_COUNT=$(grep -c "$DATE.*Gateway failed to start\|$DATE.*Port.*already in use" "$GATEWAY_ERR" 2>/dev/null || echo "0")
    if [ "$RESTART_COUNT" -gt 0 ]; then
        echo "- ⚠️ **$RESTART_COUNT failed restart attempts detected**"
    else
        echo "- No restart issues ✅"
    fi
    echo ""

    echo "---"
    echo ""
    echo "*Auto-generated at $(date '+%Y-%m-%d %H:%M:%S %Z') by daily-log-generator.sh*"

} >> "$LOG_FILE"

echo "[daily-log] Written $LOG_FILE ($(wc -l < "$LOG_FILE") lines)"
