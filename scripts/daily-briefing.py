#!/usr/bin/env python3
"""
Daily Morning Briefing — sends a punchy Telegram summary to David at 8:30am.
Reads: memory/commitments.json + memory/session-handoff.md
Model: google/gemini-2.5-flash (free tier)
"""

import json, os, sys, subprocess, urllib.request, urllib.parse, datetime, re

WORKSPACE   = os.path.expanduser("~/.openclaw/workspace")
ENV_PATH    = os.path.expanduser("~/.openclaw/.env")
COMMITMENTS = os.path.join(WORKSPACE, "memory/commitments.json")
HANDOFF     = os.path.join(WORKSPACE, "memory/session-handoff.md")
TELEGRAM_ID = "8309977390"

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

def load_commitments():
    with open(COMMITMENTS) as f:
        data = json.load(f)
    return data.get("commitments", [])

def load_handoff():
    try:
        with open(HANDOFF) as f:
            return f.read()
    except FileNotFoundError:
        return ""

def build_briefing_prompt(commitments, handoff, today):
    today_str = today.strftime("%Y-%m-%d")
    day_name  = today.strftime("%A")
    in_3_days = (today + datetime.timedelta(days=3)).strftime("%Y-%m-%d")

    overdue, due_today, high_priority, upcoming = [], [], [], []

    for c in commitments:
        if c.get("status") in ("completed", "parked"):
            continue
        desc  = c.get("description") or c.get("task") or ""
        nad   = c.get("next_action_date") or c.get("deadline") or ""
        prio  = c.get("priority", "medium")
        cid   = c.get("id", "")

        if nad:
            if nad < today_str:
                overdue.append(f"[{cid}] {desc[:80]}")
            elif nad == today_str:
                due_today.append(f"[{cid}] {desc[:80]}")
            elif nad <= in_3_days:
                upcoming.append(f"[{cid}] {desc[:80]} (due {nad})")

        if prio in ("critical", "high") and nad not in (today_str,) and (not nad or nad > today_str):
            high_priority.append(f"[{cid}] {desc[:80]}")

    # Cap high priority at 5, exclude ones already in due_today/overdue
    due_ids = set(x.split("]")[0].strip("[") for x in overdue + due_today)
    high_priority = [x for x in high_priority if x.split("]")[0].strip("[") not in due_ids][:5]

    # Pull top 3 priorities from handoff
    handoff_snippet = ""
    if handoff:
        lines = handoff.splitlines()
        top_section = False
        top_lines = []
        for line in lines:
            if "TOP PRIORITIES" in line.upper() or "NEXT SESSION" in line.upper():
                top_section = True
                continue
            if top_section:
                if line.startswith("##"):
                    break
                if line.strip().startswith(("1.", "2.", "3.", "-", "*", "⚡")):
                    top_lines.append(line.strip())
                    if len(top_lines) >= 3:
                        break
        if top_lines:
            handoff_snippet = "\n".join(top_lines[:3])

    prompt = f"""Write a concise morning briefing for David. Today is {day_name} {today_str}.

Format for Telegram — use emojis sparingly, bullets, no markdown headers. Keep it punchy. Max 20 lines total.

Structure:
1. One-line greeting with the day/date
2. OVERDUE items (if any) — flag clearly
3. DUE TODAY items (if any)
4. Top high-priority pending items (max 5)
5. Upcoming deadlines in next 3 days (if any)
6. Top 3 focus areas from last session handoff (if available)
7. One closing line — brief, practical, not motivational-poster

Data:

OVERDUE ({len(overdue)}):
{chr(10).join(overdue) if overdue else 'None'}

DUE TODAY ({len(due_today)}):
{chr(10).join(due_today) if due_today else 'None'}

HIGH PRIORITY PENDING ({len(high_priority)}):
{chr(10).join(high_priority) if high_priority else 'None'}

UPCOMING DEADLINES ({len(upcoming)}):
{chr(10).join(upcoming) if upcoming else 'None'}

LAST SESSION TOP PRIORITIES:
{handoff_snippet if handoff_snippet else 'Not available'}

Write the briefing now. No preamble, just the message."""

    return prompt

def call_gemini_flash(prompt, api_key):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 512, "temperature": 0.5}
    }).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read())
    text = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
    # Strip markdown bold/italic — we're sending plain text via Telegram
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    return text

def send_telegram(message, bot_token, chat_id):
    url = "https://api.telegram.org/bot{}/sendMessage".format(bot_token)
    body = json.dumps({"chat_id": chat_id, "text": message}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

def main():
    env         = parse_env(ENV_PATH)
    google_key  = env.get("GOOGLE_API_KEY") or env.get("GEMINI_API_KEY")
    bot_token   = env.get("TELEGRAM_BOT_TOKEN") or env.get("CLAUDIA_TELEGRAM_BOT_TOKEN")
    today       = datetime.date.today()

    if not google_key:
        print("ERROR: No Google/Gemini API key found in .env", file=sys.stderr)
        sys.exit(1)
    if not bot_token:
        print("ERROR: No Telegram bot token found in .env", file=sys.stderr)
        sys.exit(1)

    print(f"[briefing] Loading commitments...")
    commitments = load_commitments()
    handoff     = load_handoff()

    print(f"[briefing] Building prompt ({len(commitments)} commitments)...")
    prompt = build_briefing_prompt(commitments, handoff, today)

    print(f"[briefing] Calling Gemini Flash...")
    message = call_gemini_flash(prompt, google_key)

    print(f"[briefing] Sending to Telegram ({TELEGRAM_ID})...")
    result = send_telegram(message, bot_token, TELEGRAM_ID)

    if result.get("ok"):
        print(f"[briefing] ✅ Sent successfully")
        print(f"\n--- Preview ---\n{message}\n---")
    else:
        print(f"[briefing] ❌ Telegram error: {result}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
