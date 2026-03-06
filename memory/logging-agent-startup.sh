#!/bin/bash
# Conversation Logging Agent Startup
# Logs ALL conversations from webUI, Telegram, Discord to persistent local files
# Prevents data loss from compaction

set -e

WORKSPACE="/Users/claudia/.openclaw/workspace"
LOG_DIR="$WORKSPACE/memory/conversation-logs"
AGENT_LABEL="conversation-logger-persistent"

echo "🚀 Starting persistent conversation logging agent..."
echo "   Workspace: $WORKSPACE"
echo "   Log directory: $LOG_DIR"
echo ""

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

echo "✅ Log directory ready"
echo ""
echo "📝 Spawning persistent Haiku subagent..."
echo "   This agent will:"
echo "   - Capture ALL messages (user + claude) with timestamps"
echo "   - Log to dated files in $LOG_DIR"
echo "   - Maintain searchable index"
echo "   - Tag messages with topics"
echo ""

# Spawn the conversation logger as a persistent session-mode subagent
echo "Starting logging agent now..."
