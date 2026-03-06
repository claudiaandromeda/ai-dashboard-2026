#!/usr/bin/env python3
"""
Clive's Onboarding Handler — v1.0
Runs as a standalone Telegram poller, handles the full onboarding flow
with scripted messages sent directly via Bot API. AI only called for
CV analysis, business research, and writing SOUL.md/USER.md.

Usage: python3 clive-onboard.py
Exits when onboarding is complete and hands back to OpenClaw.
"""

import json, os, sys, time, requests, subprocess, re
from datetime import datetime, timezone

# ─── CONFIG ──────────────────────────────────────────────────────────────────

WORKSPACE       = "/root/.openclaw/workspace"
OPENCLAW_JSON   = "/root/.openclaw/openclaw.json"
STATE_FILE      = f"{WORKSPACE}/memory/onboarding-state.json"
BOT_TOKEN       = os.environ.get("CLIVE_BOT_TOKEN", "")
OPENROUTER_KEY  = os.environ.get("CLIVE_OPENROUTER_KEY", "")
MODEL           = "openrouter/anthropic/claude-opus-4-6"
POLL_TIMEOUT    = 20   # long-poll seconds
SEND_DELAY      = 1.2  # seconds between messages (feels natural)

BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"

# ─── SCRIPTED MESSAGES ───────────────────────────────────────────────────────

MSG = {
    "welcome": (
        "Hi there! I'm Clive — and I'm really glad you're here.\n\n"
        "I don't know anything about you yet, and I'd love to change that. "
        "The better I understand you — who you are, what you've done, what you're looking for "
        "— the more genuinely useful I can be to you.\n\n"
        "Would you mind if I asked you a few questions to get us properly started?"
    ),
    "intro": (
        "Brilliant — thank you! I've got 9 questions altogether. "
        "We'll go one at a time, absolutely no rush, and if there's anything "
        "you'd rather not answer just say 'skip' and we'll move straight on."
    ),
    "q1":  "Question 1 of 9: What's your name? And is there a particular name or nickname you prefer me to use?",
    "q2":  "Question 2 of 9: Whereabouts are you based — which town or city?",
    "q3":  "Question 3 of 9: What do you do for work at the moment? What does your typical day actually look like?",
    "q4":  "Question 4 of 9: How long have you been doing that — and honestly, how do you feel about it? Is it something you love, or are you ready for something extra or a change alongside it?",
    "q5":  "Question 5 of 9: Are you looking to add something new to your life — an extra income stream, a new direction, something more on your own terms? Or are you pretty settled where things are?",
    "q6":  (
        "Question 6 of 9: I'd love to get a really full picture of your background — "
        "everything you've done, what you're brilliant at. Do you have a CV you could paste in here? "
        "Even if it's a bit out of date, that's completely fine — I just want the full story. "
        "If you haven't got one to hand, just walk me through the main things you've done."
    ),
    "q7":  "Question 7 of 9: Outside of work — what are you actually good at? And what do you genuinely enjoy? Can really be anything at all.",
    "q8":  "Question 8 of 9: What would actually make your life easier or better? Could be research, keeping on top of things, ideas, admin, writing, someone to think things through with — whatever genuinely helps.",
    "q9":  "Question 9 of 9 — last one, I promise! How do you prefer to chat? Short and to the point, or do you like a bit more back and forth?",
    "research_offer": (
        "I'd love to show you what I can do — would you like me to run a proper search based on "
        "your location in {town} and put together some genuinely good business ideas based on "
        "your experience and your CV? I can look at what's actually out there locally and further "
        "afield, and make it specific to your background rather than just a generic list. "
        "Want me to give it a go?"
    ),
    "skip_ack": "No problem at all — next question!",
}

TRANSITIONS = {
    "q1": "Lovely to meet you, {name}! 😊",
    "q2": "Great — I'll keep {town} in mind!",
    "q3": None,  # AI generates warm reaction to her work
    "q4": "Thanks for being so open about that — really helpful.",
    "q5": "Got it.",
    "q6": None,  # AI generates CV reaction
    "q7": "That's brilliant — thank you for sharing that.",
    "q8": "Perfect — really useful to know.",
    "q9": "Perfect — I'll match that. Right, nearly done!",
}

STEPS = ["welcome", "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "summary", "research", "done"]

# ─── TELEGRAM HELPERS ────────────────────────────────────────────────────────

def tg_send(chat_id, text):
    try:
        r = requests.post(f"{BASE_URL}/sendMessage",
            json={"chat_id": chat_id, "text": text}, timeout=10)
        return r.json().get("ok", False)
    except Exception as e:
        print(f"[send error] {e}")
        return False

def tg_get_updates(offset=None):
    params = {"timeout": POLL_TIMEOUT, "allowed_updates": ["message"]}
    if offset:
        params["offset"] = offset
    try:
        r = requests.get(f"{BASE_URL}/getUpdates", params=params, timeout=POLL_TIMEOUT + 5)
        data = r.json()
        if data.get("ok"):
            return data.get("result", [])
    except Exception as e:
        print(f"[poll error] {e}")
    return []

# ─── STATE MANAGEMENT ────────────────────────────────────────────────────────

def load_state():
    os.makedirs(f"{WORKSPACE}/memory", exist_ok=True)
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"step": "welcome", "offset": 0, "answers": {}}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)

# ─── AI CALLS ────────────────────────────────────────────────────────────────

def ai_call(prompt, max_tokens=600):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "anthropic/claude-opus-4-6",
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
    }
    try:
        r = requests.post("https://openrouter.ai/api/v1/chat/completions",
            headers=headers, json=body, timeout=60)
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[AI error] {e}")
        return None

def ai_cv_reaction(name, town, cv_text):
    prompt = f"""You are Clive, a warm and genuinely enthusiastic personal assistant.
You've just read {name}'s CV. She lives in {town}.

Read this CV carefully and respond with GENUINE enthusiasm based on SPECIFIC things in it.
Reference real job titles, real skills, real achievements. Not generic — pick 2-3 specific things.
Mention that businesses in {town} and beyond would value someone with her background.
Keep it to 3-4 sentences. Warm, impressed, specific.

CV:
{cv_text[:3000]}

Write your response now (just the message text, no preamble):"""
    return ai_call(prompt, max_tokens=300)

def ai_work_reaction(name, work_description):
    prompt = f"""You are Clive, a warm personal assistant.
{name} just told you what she does for work: "{work_description}"
Write a brief, warm, genuine 1-sentence reaction to this. Not sycophantic — just human and interested.
Something like 'That sounds really [adjective]!' or a brief observation.
Just the sentence, nothing else:"""
    return ai_call(prompt, max_tokens=60)

def ai_business_research(name, town, cv_text, work, direction, interests, what_helps):
    prompt = f"""You are Clive, a research-focused personal assistant.
Research part-time, flexible, home-based business and income opportunities specifically for {name} in {town}, UK.

Her background:
- Current work: {work}
- CV/work history: {cv_text[:2000]}
- Looking for: {direction}
- Interests/skills outside work: {interests}
- What would help most: {what_helps}

Research at least 5-8 specific, realistic business ideas that suit her profile.
For each: give the idea name, a 2-3 sentence explanation, and specifically WHY it suits her background/skills.
Focus on home-based, flexible, low startup cost, builds on her existing skills.
Consider both {town} local opportunities and online/remote possibilities.

Format as a numbered list. Be specific and practical — no generic suggestions."""
    return ai_call(prompt, max_tokens=1500)

def ai_write_files(name, preferred_name, town, work, feelings, direction, cv_text, interests, what_helps, comms_style, date_str):
    prompt = f"""Write two files for Clive's personal assistant setup for {preferred_name}.

Based on this conversation:
- Full name: {name}
- Preferred name: {preferred_name}  
- Location: {town}
- Current work: {work}
- Feelings about work: {feelings}
- Looking for something new: {direction}
- CV/work history: {cv_text[:2000]}
- Interests outside work: {interests}
- What would make life easier: {what_helps}
- Communication style: {comms_style}
- Date: {date_str}

Write SOUL.md first (Clive's character file for this relationship), then USER.md (her profile).
Use markdown headers. Be specific and genuine — use her actual words where possible.
SOUL.md should describe Clive's character in relation to HER specifically, based on what you learned.

Output format:
=== SOUL.md ===
[content]

=== USER.md ===
[content]"""
    return ai_call(prompt, max_tokens=1500)

# ─── OPENCLAW MANAGEMENT ─────────────────────────────────────────────────────

def openclaw_remove_telegram():
    """Remove telegram config from openclaw.json so it doesn't compete for updates."""
    with open(OPENCLAW_JSON) as f:
        cfg = json.load(f)
    cfg.pop("channels", None)
    with open(OPENCLAW_JSON, "w") as f:
        json.dump(cfg, f, indent=2)

def openclaw_restore_telegram(bot_token):
    """Restore telegram config and restart gateway."""
    with open(OPENCLAW_JSON) as f:
        cfg = json.load(f)
    cfg["channels"] = {"telegram": {"botToken": bot_token}}
    with open(OPENCLAW_JSON, "w") as f:
        json.dump(cfg, f, indent=2)
    env = os.environ.copy()
    env["XDG_RUNTIME_DIR"] = "/run/user/0"
    subprocess.run(["systemctl", "--user", "restart", "openclaw-gateway"], env=env)
    print("[openclaw] Gateway restarted with Telegram restored")

# ─── MAIN ONBOARDING FLOW ────────────────────────────────────────────────────

def is_skip(text):
    return text.strip().lower() in ("skip", "pass", "next", "skip please", "no thanks", "nope")

def handle_message(chat_id, text, state):
    step = state["step"]
    answers = state["answers"]
    skip = is_skip(text)

    def send(msg, delay=True):
        if delay:
            time.sleep(SEND_DELAY)
        tg_send(chat_id, msg)

    # ── WELCOME ──────────────────────────────────────────────────────────────
    if step == "welcome":
        send(MSG["welcome"], delay=False)
        state["step"] = "waiting_agreement"
        return state

    # ── WAITING FOR YES ───────────────────────────────────────────────────────
    if step == "waiting_agreement":
        send(MSG["intro"])
        time.sleep(SEND_DELAY)
        send(MSG["q1"])
        state["step"] = "q1"
        return state

    # ── Q1: NAME ──────────────────────────────────────────────────────────────
    if step == "q1":
        if skip:
            answers["name"] = "unknown"
            answers["preferred_name"] = "there"
            send(MSG["skip_ack"])
        else:
            answers["name"] = text
            # Extract preferred name (use first word as a fallback)
            preferred = text.split()[0].rstrip(".,!") if text else "there"
            answers["preferred_name"] = preferred
            trans = TRANSITIONS["q1"].format(name=preferred)
            send(trans)
        time.sleep(SEND_DELAY)
        send(MSG["q2"])
        state["step"] = "q2"
        return state

    # ── Q2: LOCATION ─────────────────────────────────────────────────────────
    if step == "q2":
        if skip:
            answers["town"] = "your area"
        else:
            answers["town"] = text
            trans = TRANSITIONS["q2"].format(town=text.split(",")[0].strip())
            send(trans)
        time.sleep(SEND_DELAY)
        send(MSG["q3"])
        state["step"] = "q3"
        return state

    # ── Q3: CURRENT WORK ─────────────────────────────────────────────────────
    if step == "q3":
        answers["work"] = "not provided" if skip else text
        if not skip:
            reaction = ai_work_reaction(answers.get("preferred_name", "there"), text)
            if reaction:
                send(reaction)
        time.sleep(SEND_DELAY)
        send(MSG["q4"])
        state["step"] = "q4"
        return state

    # ── Q4: FEELINGS ABOUT WORK ──────────────────────────────────────────────
    if step == "q4":
        answers["feelings"] = "not provided" if skip else text
        if not skip:
            send(TRANSITIONS["q4"])
        time.sleep(SEND_DELAY)
        send(MSG["q5"])
        state["step"] = "q5"
        return state

    # ── Q5: NEW DIRECTION ────────────────────────────────────────────────────
    if step == "q5":
        answers["direction"] = "not provided" if skip else text
        if not skip:
            send(TRANSITIONS["q5"])
        time.sleep(SEND_DELAY)
        send(MSG["q6"])
        state["step"] = "q6"
        return state

    # ── Q6: CV ───────────────────────────────────────────────────────────────
    if step == "q6":
        preferred = answers.get("preferred_name", "there")
        town = answers.get("town", "your area")
        if skip:
            answers["cv"] = "not provided"
            send("No worries — I'll work with what you've told me so far.")
        else:
            answers["cv"] = text
            # AI generates specific enthusiastic reaction
            send("Give me a moment to read through this properly... 📖")
            reaction = ai_cv_reaction(preferred, town, text)
            if reaction:
                time.sleep(2)
                send(reaction)
            else:
                send(f"Thank you for sharing that, {preferred} — there's a lot of great experience there!")
        time.sleep(SEND_DELAY)
        send(TRANSITIONS["q6"])
        time.sleep(SEND_DELAY)
        send(MSG["q7"])
        state["step"] = "q7"
        return state

    # ── Q7: INTERESTS ────────────────────────────────────────────────────────
    if step == "q7":
        answers["interests"] = "not provided" if skip else text
        if not skip:
            send(TRANSITIONS["q7"])
        time.sleep(SEND_DELAY)
        send(MSG["q8"])
        state["step"] = "q8"
        return state

    # ── Q8: WHAT HELPS ───────────────────────────────────────────────────────
    if step == "q8":
        answers["what_helps"] = "not provided" if skip else text
        if not skip:
            send(TRANSITIONS["q8"])
        time.sleep(SEND_DELAY)
        send(MSG["q9"])
        state["step"] = "q9"
        return state

    # ── Q9: COMMS STYLE ──────────────────────────────────────────────────────
    if step == "q9":
        answers["comms_style"] = "not provided" if skip else text
        if not skip:
            send(TRANSITIONS["q9"])
        time.sleep(SEND_DELAY)

        # Build and send summary
        preferred = answers.get("preferred_name", "there")
        town = answers.get("town", "your area")
        work = answers.get("work", "something I'm not sure about yet")
        cv_snippet = (answers.get("cv") or "")[:200]
        direction = answers.get("direction", "")

        summary = (
            f"Right — I think I've got a really good picture of you now. "
            f"You're {preferred}, based in {town}, "
            f"and you're currently working in {work}. "
        )
        if direction and direction != "not provided":
            summary += f"You're interested in {direction}. "
        if cv_snippet and cv_snippet != "not provided":
            summary += "You've got a strong background that I'm really looking forward to helping you build on. "
        summary += "Have I got that right?"

        send(summary)
        state["step"] = "summary_confirm"
        return state

    # ── SUMMARY CONFIRMATION ─────────────────────────────────────────────────
    if step == "summary_confirm":
        # Accept any response as confirmation (they can correct in ongoing chat)
        town = answers.get("town", "your area")
        time.sleep(SEND_DELAY)
        send(MSG["research_offer"].format(town=town))
        state["step"] = "research_decision"
        return state

    # ── RESEARCH DECISION ────────────────────────────────────────────────────
    if step == "research_decision":
        wants_research = any(w in text.lower() for w in ["yes", "yeah", "yep", "sure", "please", "go", "ok", "okay", "do it", "love", "great", "absolutely"])
        preferred = answers.get("preferred_name", "there")

        if wants_research:
            send("Brilliant — give me a minute or two to do some proper research for you... 🔍")
            research = ai_business_research(
                preferred,
                answers.get("town", "UK"),
                answers.get("cv", ""),
                answers.get("work", ""),
                answers.get("direction", ""),
                answers.get("interests", ""),
                answers.get("what_helps", ""),
            )
            if research:
                # Split into chunks if too long for Telegram
                if len(research) > 3000:
                    chunks = [research[i:i+3000] for i in range(0, len(research), 3000)]
                    for chunk in chunks:
                        send(chunk)
                        time.sleep(1)
                else:
                    send(research)
                # Save to file
                os.makedirs(f"{WORKSPACE}/memory", exist_ok=True)
                with open(f"{WORKSPACE}/memory/business-ideas.md", "w") as f:
                    f.write(f"# Business Ideas for {preferred}\n\nGenerated: {datetime.now().strftime('%Y-%m-%d')}\n\n{research}")
                answers["research_done"] = True
            else:
                send("I'm having a bit of trouble with the research right now — I'll come back to this for you shortly!")
        else:
            send("No problem at all — just say the word whenever you're ready and I'll get on it. 😊")
            answers["research_done"] = False

        # Write the identity files
        state["step"] = "writing_files"
        time.sleep(SEND_DELAY)
        send("Let me just get myself properly set up so I remember everything about you... ✍️")

        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        files_content = ai_write_files(
            answers.get("name", ""),
            answers.get("preferred_name", ""),
            answers.get("town", ""),
            answers.get("work", ""),
            answers.get("feelings", ""),
            answers.get("direction", ""),
            answers.get("cv", ""),
            answers.get("interests", ""),
            answers.get("what_helps", ""),
            answers.get("comms_style", ""),
            date_str,
        )

        if files_content:
            # Parse and write SOUL.md and USER.md
            soul_match = re.search(r'=== SOUL\.md ===\n(.*?)(?==== USER\.md ===|\Z)', files_content, re.DOTALL)
            user_match = re.search(r'=== USER\.md ===\n(.*?)(?=\Z)', files_content, re.DOTALL)

            if soul_match:
                with open(f"{WORKSPACE}/SOUL.md", "w") as f:
                    f.write(soul_match.group(1).strip())
                print("[files] SOUL.md written")
            if user_match:
                with open(f"{WORKSPACE}/USER.md", "w") as f:
                    f.write(user_match.group(1).strip())
                print("[files] USER.md written")

        # Archive BOOTSTRAP.md
        archive_dir = f"{WORKSPACE}/.archive"
        os.makedirs(archive_dir, exist_ok=True)
        bootstrap_path = f"{WORKSPACE}/BOOTSTRAP.md"
        if os.path.exists(bootstrap_path):
            os.rename(bootstrap_path, f"{archive_dir}/BOOTSTRAP.md.done")
            print("[files] BOOTSTRAP.md archived")

        time.sleep(2)
        closing = (
            f"Right — I'm Clive, and I'm genuinely here for you whenever you need me. "
            f"I've got a really good picture of you now {preferred}, and I'm looking forward "
            f"to being useful to you. What would you like to start with?"
        )
        send(closing)

        state["step"] = "done"
        answers["completed_at"] = datetime.now(timezone.utc).isoformat()
        return state

    return state

# ─── MAIN LOOP ────────────────────────────────────────────────────────────────

def main():
    if not BOT_TOKEN:
        print("ERROR: CLIVE_BOT_TOKEN not set")
        sys.exit(1)
    if not OPENROUTER_KEY:
        print("ERROR: CLIVE_OPENROUTER_KEY not set")
        sys.exit(1)

    print(f"[onboard] Starting Clive onboarding handler")

    # Take exclusive control of Telegram — remove from OpenClaw config
    openclaw_remove_telegram()
    print("[onboard] OpenClaw Telegram disabled — we have the floor")

    state = load_state()
    offset = state.get("offset", 0)

    print(f"[onboard] Resuming at step: {state['step']}")

    while state["step"] != "done":
        updates = tg_get_updates(offset if offset > 0 else None)

        for update in updates:
            offset = update["update_id"] + 1
            state["offset"] = offset

            msg = update.get("message", {})
            chat_id = msg.get("chat", {}).get("id")
            text = msg.get("text", "").strip()

            if not chat_id or not text:
                continue

            print(f"[onboard] [{state['step']}] user: {text[:60]}")
            state = handle_message(chat_id, text, state)
            save_state(state)

            if state["step"] == "done":
                break

        save_state(state)

        if state["step"] == "done":
            break

    print("[onboard] Onboarding complete!")
    print("[onboard] Restoring OpenClaw Telegram...")
    openclaw_restore_telegram(BOT_TOKEN)

    # Clean up state file
    if os.path.exists(STATE_FILE):
        os.remove(STATE_FILE)

    print("[onboard] Done — OpenClaw has Telegram back. Exiting.")

if __name__ == "__main__":
    main()
