#!/usr/bin/env python3
"""
update_discord_context.py

Reads recent session transcripts (Discord + WebUI) and writes a rolling
summary to memory/SHARED_CONTEXT.md for use on session startup across
all surfaces (Discord, WebUI, Telegram).

Covers the last 24 hours by default.
Run every 30 minutes via cron.
"""

import json
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

WORKSPACE = Path(os.path.expanduser("~/.openclaw/workspace"))
SESSIONS_DIR = Path(os.path.expanduser("~/.openclaw/agents/main/sessions"))
OUTPUT_FILE = WORKSPACE / "memory" / "SHARED_CONTEXT.md"
HOURS_BACK = 24
MAX_MESSAGES = 80   # max messages to include (most recent wins)
MAX_MSG_LEN = 350   # max chars per message

DISCORD_SIGNALS = ["family-matters", "andromedaadmin", "1473054526276763872", "discord"]
WEBUI_SIGNALS   = ["openclaw-control-ui", "webui", "control-ui"]
BOT_NAME        = "Claudia"  # override in Elliot's copy


def detect_surface(text_sample: str) -> str:
    if any(s in text_sample for s in DISCORD_SIGNALS):
        return "discord"
    if any(s in text_sample for s in WEBUI_SIGNALS):
        return "webui"
    return "unknown"


def clean_text(text: str) -> str:
    """Strip metadata noise from a message."""
    text = re.sub(r"Conversation info \(untrusted metadata\):.*?```\s*", "", text, flags=re.DOTALL)
    text = re.sub(r"Sender \(untrusted metadata\):.*?```\s*", "", text, flags=re.DOTALL)
    text = re.sub(r"```\s*json\s*\{.*?\}\s*```", "", text, flags=re.DOTALL)
    text = re.sub(r"```\s*json\s*```", "", text, flags=re.DOTALL)
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    # Also strip bare JSON objects (without backtick wrappers)
    text = re.sub(r'json\s*\{\s*"message_id".*?\}', "", text, flags=re.DOTALL)
    text = re.sub(r'\{\s*"message_id".*?\}', "", text, flags=re.DOTALL)
    text = re.sub(r'\{\s*"label":\s*"[^"]*".*?\}', "", text, flags=re.DOTALL)
    # Strip stray backtick artifacts
    text = re.sub(r"```\s*", "", text)
    text = re.sub(r"<relevant-memories>.*?</relevant-memories>", "", text, flags=re.DOTALL)
    text = re.sub(r"<summary>.*?</summary>", "", text, flags=re.DOTALL)
    text = re.sub(r"\[cron:.*?\]", "", text)
    text = re.sub(r"\s{3,}", " ", text).strip()
    return text


def extract_speaker_name(raw_text: str, role: str) -> str:
    """Try to extract the human sender's name from Discord metadata."""
    m = re.search(r'"sender":\s*"([^"]+)"', raw_text[:600])
    if m:
        name = m.group(1)
        if name not in ("1467143156976980090", "1473063581645017260"):
            return name
    # Fall back to sender_id → name mapping
    if "1467143156976980090" in raw_text[:600]:
        return "Tess"
    if "1473063581645017260" in raw_text[:600]:
        return "Elliot"
    return "David" if role == "user" else BOT_NAME


def messages_from_jsonl(path: Path, surface: str) -> list[dict]:
    """Extract clean messages from a JSONL session file."""
    messages = []
    try:
        lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        for line in lines:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except Exception:
                continue
            if entry.get("type") != "message":
                continue
            msg = entry.get("message", {})
            role = msg.get("role")
            if role not in ("user", "assistant"):
                continue

            content = msg.get("content", "")
            if isinstance(content, list):
                raw = " ".join(
                    c.get("text", "") for c in content
                    if isinstance(c, dict) and c.get("type") == "text"
                )
            else:
                raw = str(content)

            name = extract_speaker_name(raw, role) if role == "user" else BOT_NAME
            text = clean_text(raw)

            # Skip noise
            if len(text) < 10:
                continue
            if text in ("NO_REPLY", "HEARTBEAT_OK"):
                continue
            if text.startswith("[cron:") or text.startswith("Run:"):
                continue

            messages.append({
                "role": role,
                "name": name,
                "surface": surface,
                "text": text[:MAX_MSG_LEN],
            })
    except Exception:
        pass
    return messages


def get_recent_sessions() -> list[tuple[datetime, str, Path]]:
    """Return (mtime, surface, path) for sessions modified in last HOURS_BACK hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOURS_BACK)
    results = []
    if not SESSIONS_DIR.exists():
        return results

    for f in SESSIONS_DIR.iterdir():
        if f.suffix != ".jsonl":
            continue
        mtime = datetime.fromtimestamp(f.stat().st_mtime, tz=timezone.utc)
        if mtime < cutoff:
            continue
        try:
            # Read more of the file to detect surface
            sample = f.read_text(encoding="utf-8", errors="replace")[:30000]
            surface = detect_surface(sample)
            if surface != "unknown":
                results.append((mtime, surface, f))
        except Exception:
            continue
    return sorted(results, key=lambda x: x[0])


def build_output(sessions: list[tuple[datetime, str, Path]]) -> str:
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M GMT")
    lines = [
        "# Shared Context",
        f"_Auto-generated {now_str} · covers last {HOURS_BACK}h · all surfaces_",
        "_Load this at session start to pick up where we left off._",
        "",
        "---",
        "",
    ]

    all_msgs: list[dict] = []
    surface_counts: dict[str, int] = {}

    for mtime, surface, path in sessions:
        msgs = messages_from_jsonl(path, surface)
        all_msgs.extend(msgs)
        surface_counts[surface] = surface_counts.get(surface, 0) + len(msgs)

    if not all_msgs:
        lines.append("_No activity in the last 24 hours._")
        lines.append(f"\n_Updated: {now_str}_")
        return "\n".join(lines)

    # Deduplicate by first 80 chars
    seen: set[str] = set()
    unique: list[dict] = []
    for m in all_msgs:
        key = m["text"][:80]
        if key not in seen:
            seen.add(key)
            unique.append(m)

    # Keep only the most recent MAX_MESSAGES
    if len(unique) > MAX_MESSAGES:
        unique = unique[-MAX_MESSAGES:]

    # Surface summary header
    parts = [f"{s}: {c} msgs" for s, c in surface_counts.items()]
    lines.append(f"## Recent Activity ({len(unique)} messages — {', '.join(parts)})")
    lines.append("")

    current_surface = None
    for msg in unique:
        if msg["surface"] != current_surface:
            current_surface = msg["surface"]
            label = "💬 Discord" if current_surface == "discord" else "🖥️ Web UI"
            lines.append(f"### {label}")
            lines.append("")

        prefix = f"**{msg['name']}:** " if msg["role"] == "user" else f"**{BOT_NAME}:** "
        text = msg["text"].replace("\n", " ").strip()
        lines.append(f"{prefix}{text}")
        lines.append("")

    lines.append("---")
    lines.append(f"_Updated: {now_str}_")
    return "\n".join(lines)


def main():
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    sessions = get_recent_sessions()

    if not sessions:
        summary = (
            f"# Shared Context\n\n"
            f"_No recent sessions found (checked last {HOURS_BACK}h)._\n"
            f"_Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M GMT')}_\n"
        )
    else:
        summary = build_output(sessions)

    OUTPUT_FILE.write_text(summary, encoding="utf-8")
    print(f"✅ Written to {OUTPUT_FILE} ({len(summary)} chars, {len(sessions)} session files)")


if __name__ == "__main__":
    main()
