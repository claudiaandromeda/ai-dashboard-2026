#!/usr/bin/env python3
"""
Daily Discord Digest — fetches last 24h of messages from all active channels,
summarises with Gemini Flash, appends to today's daily log.
Runs at 11pm GMT via cron.
"""

import json, os, sys, urllib.request, urllib.error, datetime, re

WORKSPACE   = os.path.expanduser("~/.openclaw/workspace")
ENV_PATH    = os.path.expanduser("~/.openclaw/.env")
DAILY_DIR   = os.path.join(WORKSPACE, "memory/daily")

# Channels to monitor
CHANNELS = {
    "family-matters":  "1473054526276763872",
    "projects":        "1473803534184218768",
    "research":        "1473803535303835893",
    "openclaw-infra":  "1473803536449142911",
    "strategies":      "1473803537786867725",
    "todos":           "1473803540504907910",
}

BOT_NAMES = {"Claudia Andromeda", "Elliot"}  # skip bot-only channels in summary

def parse_env(path):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return env

def discord_get(url, token):
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bot {token}",
        "User-Agent": "DiscordBot (https://github.com/discord/discord-api-docs, 10)"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code} for {url}", file=sys.stderr)
        return []

def fetch_channel_messages(channel_id, token, since_ts):
    """Fetch all messages in a channel since since_ts (ISO string)."""
    messages = []
    before = None
    while True:
        url = f"https://discord.com/api/v10/channels/{channel_id}/messages?limit=100"
        if before:
            url += f"&before={before}"
        batch = discord_get(url, token)
        if not batch:
            break
        # Filter to messages after since_ts
        new = [m for m in batch if m["timestamp"] >= since_ts]
        messages.extend(new)
        if len(new) < len(batch):
            break  # hit the time boundary
        before = batch[-1]["id"]
    return list(reversed(messages))

def format_messages_for_prompt(messages, channel_name):
    lines = []
    for m in messages:
        ts = m["timestamp"][:16].replace("T", " ")
        author = m["author"]["username"]
        content = m.get("content", "").replace("\n", " ").strip()
        if content:
            lines.append(f"[{ts}] {author}: {content[:200]}")
    return lines

def call_gemini_flash(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 600, "temperature": 0.3}
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
    text = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
    # Strip markdown bold/italic
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    return text

def summarise_channel(messages, channel_name, api_key):
    if not messages:
        return None

    convo = "\n".join(format_messages_for_prompt(messages, channel_name))
    human_messages = [m for m in messages if m["author"]["username"] not in BOT_NAMES]

    if not human_messages:
        return None  # skip bot-only activity

    prompt = f"""Summarise the key topics, decisions, and actions from this Discord conversation in #{channel_name}.

Be concise — bullet points only, max 8 bullets. Focus on:
- What was discussed or decided
- Any actions taken or committed to
- Any problems found or solved
- Any notable info

Skip filler chat. If nothing meaningful happened, say so briefly.

Conversation:
{convo[:3000]}

Write the summary now. No preamble."""

    return call_gemini_flash(prompt, api_key)

def append_to_daily_log(date_str, content):
    log_path = os.path.join(DAILY_DIR, f"{date_str}.md")
    os.makedirs(DAILY_DIR, exist_ok=True)

    section = f"\n\n---\n\n## Discord Activity — {date_str}\n\n{content}\n\n*Digest generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')} GMT*\n"

    # Check if section already exists
    if os.path.exists(log_path):
        with open(log_path) as f:
            existing = f.read()
        if "## Discord Activity" in existing:
            # Replace existing section
            existing = re.sub(
                r'\n---\n\n## Discord Activity.*?(?=\n---|\Z)',
                section,
                existing,
                flags=re.DOTALL
            )
            with open(log_path, "w") as f:
                f.write(existing)
        else:
            with open(log_path, "a") as f:
                f.write(section)
    else:
        with open(log_path, "w") as f:
            f.write(f"# Daily Log — {date_str}\n{section}")

    return log_path

def main():
    env        = parse_env(ENV_PATH)
    google_key = env.get("GEMINI_API_KEY") or env.get("GOOGLE_API_KEY")
    bot_token  = env.get("DISCORD_BOT_TOKEN")
    today      = datetime.date.today()
    today_str  = today.strftime("%Y-%m-%d")
    since_ts   = today_str + "T00:00:00"  # from midnight today

    if not google_key:
        print("ERROR: No Gemini API key in .env", file=sys.stderr)
        sys.exit(1)
    if not bot_token:
        print("ERROR: No DISCORD_BOT_TOKEN in .env", file=sys.stderr)
        sys.exit(1)

    summaries = []
    total_messages = 0

    for channel_name, channel_id in CHANNELS.items():
        print(f"[digest] Fetching #{channel_name}...")
        messages = fetch_channel_messages(channel_id, bot_token, since_ts)
        total_messages += len(messages)

        if messages:
            print(f"  → {len(messages)} messages, summarising...")
            summary = summarise_channel(messages, channel_name, google_key)
            if summary:
                summaries.append(f"### #{channel_name}\n{summary}")
        else:
            print(f"  → No activity today")

    if summaries:
        combined = "\n\n".join(summaries)
        log_path = append_to_daily_log(today_str, combined)
        print(f"\n[digest] ✅ Summary written to {log_path}")
        print(f"[digest] Processed {total_messages} messages across {len(CHANNELS)} channels")
        print(f"\n--- Preview (first channel) ---\n{summaries[0][:400]}\n---")
    else:
        print("[digest] No meaningful Discord activity today — nothing written")

if __name__ == "__main__":
    main()
