#!/bin/bash
# ============================================================
# Redact exposed API keys from session transcript files
# Replaces actual key values with [REDACTED: KEY_NAME]
# Safe: never prints key values, operates entirely in-place
# ============================================================

ENV_LOCAL="/Users/claudia/.openclaw/workspace/projects/emotivx_app/.env.local"
ENV_OPENCLAW="/Users/claudia/.openclaw/.env"
TRANSCRIPT_DIRS=(
  "/Users/claudia/.openclaw/workspace/transcripts"
  "/Users/claudia/.openclaw/workspace/memory/session-transcripts"
  "/Users/claudia/.openclaw/agents"
)

total_files=0
total_replacements=0

redact_key() {
  local key_name="$1"
  local key_value="$2"

  [ -z "$key_value" ] && return
  [ ${#key_value} -lt 10 ] && return  # skip if too short (likely empty/placeholder)

  local label="[REDACTED: $key_name]"
  local count=0

  for dir in "${TRANSCRIPT_DIRS[@]}"; do
    [ -d "$dir" ] || continue
    while IFS= read -r -d '' file; do
      if grep -qF "$key_value" "$file" 2>/dev/null; then
        sed -i '' "s|$key_value|$label|g" "$file" 2>/dev/null
        count=$((count + 1))
      fi
    done < <(find "$dir" -type f \( -name "*.md" -o -name "*.txt" -o -name "*.jsonl" -o -name "*.json" \) -print0 2>/dev/null)
  done

  if [ "$count" -gt 0 ]; then
    echo "  ✓ $key_name — redacted from $count file(s)"
    total_files=$((total_files + count))
    total_replacements=$((total_replacements + 1))
  fi
}

echo ""
echo "🔍 EmotivX — Transcript Key Redactor"
echo "======================================"
echo "Reading keys and redacting from transcripts..."
echo ""

# ── Read and redact each key ────────────────────────────────

# From .env.local
while IFS='=' read -r key val; do
  [[ "$key" =~ ^#.*$ || -z "$key" || -z "$val" ]] && continue
  redact_key "$key" "$val"
done < <(grep -v "^#" "$ENV_LOCAL" 2>/dev/null | grep "=")

# From ~/.openclaw/.env
while IFS='=' read -r key val; do
  [[ "$key" =~ ^#.*$ || -z "$key" || -z "$val" ]] && continue
  redact_key "$key" "$val"
done < <(grep -v "^#" "$ENV_OPENCLAW" 2>/dev/null | grep "=")

# Also redact the previously hardcoded Notion key (already removed from code
# but may still be in old transcripts — value known from git history)
# Value sourced externally — check git history of notion_populate.py if needed
KNOWN_EXPOSED=$(git -C /Users/claudia/.openclaw/workspace show bec4374:scripts/notion_populate.py 2>/dev/null | grep "NOTION_KEY = " | cut -d'"' -f2)
redact_key "NOTION_API_KEY_OLD_HARDCODED" "$KNOWN_EXPOSED"

echo ""
echo "======================================"
echo "✅ Done."
echo "   Keys processed:     $total_replacements"
echo "   Files with matches: $total_files"
echo ""
echo "⚠️  Run this again after rotating keys to catch new values too."
echo "   (The new keys won't be in old transcripts, but good habit.)"
echo ""
