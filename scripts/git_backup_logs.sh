#!/bin/bash
# Layer 3: Git Auto-Commit (hourly backup)
# Ensures all logs are version-controlled and recoverable

set -e

WORKSPACE="/Users/claudia/.openclaw/workspace"
cd "$WORKSPACE"

# Timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "📦 Backing up conversation logs to git..."

# Add all conversation logs
git add memory/conversation-logs/*.md 2>/dev/null || true
git add memory/reasoning-logs/*.md 2>/dev/null || true
git add memory/CONVERSATION_INDEX.md 2>/dev/null || true

# Commit with timestamp (--allow-empty in case no changes)
git commit -m "chore: Auto-backup conversation logs ($TIMESTAMP)" --allow-empty 2>/dev/null || true

# Push to remote (fails gracefully if no remote)
git push origin main 2>/dev/null || echo "⚠️  Git push failed (offline?)"

echo "✅ Logs backed up to git: $TIMESTAMP"
