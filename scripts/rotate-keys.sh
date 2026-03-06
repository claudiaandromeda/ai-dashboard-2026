#!/bin/bash
# ============================================================
# EmotivX / OpenClaw — Secure Key Rotation Script
# Run this locally in your terminal after rotating keys in
# the relevant dashboards. Values are never typed into chat.
# ============================================================

ENV_LOCAL="/Users/claudia/.openclaw/workspace/projects/emotivx_app/.env.local"
ENV_OPENCLAW="/Users/claudia/.openclaw/.env"

set -e

echo ""
echo "🔐 EmotivX Secure Key Rotation"
echo "================================"
echo "Press Enter to skip any key you haven't rotated yet."
echo "Values are entered directly in this terminal — never in chat."
echo ""

update_key() {
  local file="$1"
  local key="$2"
  local label="$3"

  echo -n "  → $label (last 4 of current: $(grep "^$key=" "$file" 2>/dev/null | sed 's/.*.\{4\}//' | head -1)): "
  read -rs new_val
  echo ""

  if [ -z "$new_val" ]; then
    echo "    Skipped."
    return
  fi

  # Replace the value in the file
  if grep -q "^$key=" "$file" 2>/dev/null; then
    sed -i '' "s|^$key=.*|$key=$new_val|" "$file"
  else
    echo "$key=$new_val" >> "$file"
  fi

  echo "    ✅ Updated (ends in ...${new_val: -4})"
}

# ── .env.local (EmotivX app) ─────────────────────────────────
echo "📁 EmotivX app (.env.local):"
update_key "$ENV_LOCAL" "NEXT_PUBLIC_SUPABASE_ANON_KEY"  "Supabase Publishable Key (was: Anon Key)"
update_key "$ENV_LOCAL" "SUPABASE_SERVICE_ROLE_KEY"       "Supabase Secret Key (was: Service Role Key)"
update_key "$ENV_LOCAL" "SUPABASE_ACCESS_TOKEN"           "Supabase Access Token (Account → Access Tokens)"
update_key "$ENV_LOCAL" "PRINTFUL_API_KEY"                "Printful API Key"

echo ""
echo "📁 OpenClaw (.env):"
update_key "$ENV_OPENCLAW" "OPENAI_API_KEY"               "OpenAI API Key"
update_key "$ENV_OPENCLAW" "GOOGLE_API_KEY"               "Google / Gemini API Key"
update_key "$ENV_OPENCLAW" "GEMINI_API_KEY"               "Gemini API Key (if separate)"
update_key "$ENV_OPENCLAW" "NOTION_API_KEY"               "Notion API Key"
update_key "$ENV_OPENCLAW" "NOTION_TOKEN"                 "Notion Token (if separate)"
update_key "$ENV_OPENCLAW" "PERPLEXITY_API_KEY"           "Perplexity API Key"
update_key "$ENV_OPENCLAW" "PERPLEXITY_OPENROUTER_KEY"    "Perplexity/OpenRouter Key"
update_key "$ENV_OPENCLAW" "ELLIOT_OPENROUTER_KEY"        "Elliot OpenRouter Key"
update_key "$ENV_OPENCLAW" "CLIVE_OPENROUTER_KEY"         "Clive OpenRouter Key"
update_key "$ENV_OPENCLAW" "DISCORD_BOT_TOKEN"            "Discord Bot Token"
update_key "$ENV_OPENCLAW" "TELEGRAM_BOT_TOKEN"           "Telegram Bot Token"
update_key "$ENV_OPENCLAW" "GATEWAY_AUTH_TOKEN"           "Gateway Auth Token"
update_key "$ENV_OPENCLAW" "MEM0_API_KEY"                 "Mem0 API Key"

echo ""
echo "✅ Done. Remember to:"
echo "   1. Restart the OpenClaw gateway:  openclaw gateway restart"
echo "   2. Redeploy EmotivX to Vercel (update env vars in Vercel dashboard too)"
echo "   3. Update Vercel env vars at vercel.com → Project → Settings → Environment Variables"
echo ""
