#!/usr/bin/env python3
"""
Session JSONL → Searchable Markdown Converter

Converts OpenClaw session JSONL files into clean, searchable markdown.
No summarisation, no AI, no lossy compression. Just the raw conversation.

Usage:
    python3 session_to_markdown.py                    # Convert all unprocessed sessions
    python3 session_to_markdown.py <session.jsonl>    # Convert specific file
    python3 session_to_markdown.py --watch             # Watch for new sessions (cron-friendly)
"""

import json
import os
import sys
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional

SESSIONS_DIR = Path(os.path.expanduser("~/.openclaw/agents/main/sessions"))
OUTPUT_DIR = Path(os.path.expanduser("~/.openclaw/workspace/memory/session-transcripts"))
PROCESSED_LOG = OUTPUT_DIR / ".processed"


def load_processed() -> set:
    """Load set of already-processed session file hashes."""
    if PROCESSED_LOG.exists():
        return set(PROCESSED_LOG.read_text().strip().split("\n"))
    return set()


def save_processed(processed: set):
    """Save processed session file hashes."""
    PROCESSED_LOG.parent.mkdir(parents=True, exist_ok=True)
    PROCESSED_LOG.write_text("\n".join(sorted(processed)))


def file_hash(path: Path) -> str:
    """Quick hash: filename + size + mtime."""
    stat = path.stat()
    return f"{path.name}:{stat.st_size}:{int(stat.st_mtime)}"


def parse_timestamp(ts: str) -> str:
    """Convert ISO timestamp to readable format."""
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%H:%M:%S")
    except:
        return ts[:19] if ts else "??:??:??"


def parse_date(ts: str) -> str:
    """Extract date from ISO timestamp."""
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d")
    except:
        return "unknown-date"


def extract_text_content(content) -> tuple:
    """Extract text and thinking from content field. Returns (text, thinking)."""
    if isinstance(content, str):
        return content, ""
    
    text_parts = []
    thinking_parts = []
    tool_calls = []
    
    if isinstance(content, list):
        for item in content:
            if not isinstance(item, dict):
                continue
            item_type = item.get("type", "")
            if item_type == "text":
                text_parts.append(item.get("text", ""))
            elif item_type == "thinking":
                thinking_parts.append(item.get("thinking", ""))
            elif item_type == "toolCall":
                tool_name = item.get("name", item.get("toolName", "?"))
                tool_calls.append(tool_name)
    
    text = "\n".join(text_parts)
    thinking = "\n".join(thinking_parts)
    
    # Add tool call summary if no text but tools were called
    if not text and tool_calls:
        text = f"*[Tool calls: {', '.join(tool_calls)}]*"
    elif tool_calls and text:
        text = f"*[Used: {', '.join(tool_calls)}]*\n\n{text}"
    
    return text, thinking


def convert_session(jsonl_path: Path, output_dir: Path) -> Optional[Path]:
    """Convert a single JSONL session file to markdown."""
    messages = []
    session_info = {}
    first_ts = None
    last_ts = None
    model = "unknown"
    
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except:
                continue
            
            obj_type = obj.get("type", "")
            
            if obj_type == "session":
                session_info = obj
                continue
            
            if obj_type == "model_change":
                model = obj.get("modelId", model)
                continue
            
            if obj_type != "message":
                continue
            
            msg = obj.get("message", {})
            role = msg.get("role", "")
            timestamp = obj.get("timestamp", "")
            
            if not first_ts:
                first_ts = timestamp
            last_ts = timestamp
            
            # Track model changes from assistant messages
            if msg.get("model"):
                model = msg["model"]
            
            if role == "user":
                text, _ = extract_text_content(msg.get("content", ""))
                if text:
                    # Strip system/cron prefixes that aren't real user messages
                    if text.startswith("[cron:") or text.startswith("A new session was started"):
                        messages.append({
                            "role": "system",
                            "time": parse_timestamp(timestamp),
                            "text": text[:500] + ("..." if len(text) > 500 else ""),
                        })
                    else:
                        messages.append({
                            "role": "user",
                            "time": parse_timestamp(timestamp),
                            "text": text,
                        })
            
            elif role == "assistant":
                text, thinking = extract_text_content(msg.get("content", []))
                if text or thinking:
                    entry = {
                        "role": "assistant",
                        "time": parse_timestamp(timestamp),
                        "text": text,
                    }
                    if thinking:
                        # Truncate very long thinking but keep substance
                        if len(thinking) > 2000:
                            entry["thinking"] = thinking[:2000] + "\n\n*[thinking truncated — full version in JSONL]*"
                        else:
                            entry["thinking"] = thinking
                    messages.append(entry)
            
            # Skip toolResult — they're tool output, not conversation
    
    if not messages:
        return None
    
    # Filter out sessions that are just cron/heartbeat (no real user messages)
    real_user_msgs = [m for m in messages if m["role"] == "user"]
    if not real_user_msgs:
        return None
    
    # Build output
    date = parse_date(first_ts) if first_ts else "unknown"
    session_id = jsonl_path.stem.split(".")[0][:8]
    start_time = parse_timestamp(first_ts) if first_ts else "?"
    end_time = parse_timestamp(last_ts) if last_ts else "?"
    
    # Create output directory for the date
    date_dir = output_dir / date
    date_dir.mkdir(parents=True, exist_ok=True)
    
    output_path = date_dir / f"{start_time.replace(':', '')}-{session_id}.md"
    
    lines = []
    lines.append(f"# Session {session_id} — {date} ({start_time}–{end_time} GMT)")
    lines.append(f"")
    lines.append(f"**Model:** {model} | **Messages:** {len(real_user_msgs)} user, {len([m for m in messages if m['role'] == 'assistant'])} assistant")
    lines.append(f"**Source:** `{jsonl_path.name}`")
    lines.append(f"")
    lines.append(f"---")
    lines.append(f"")
    
    for msg in messages:
        time = msg["time"]
        role = msg["role"]
        text = msg["text"]
        
        if role == "user":
            lines.append(f"### 🧑 David [{time}]")
            lines.append(f"")
            lines.append(text)
            lines.append(f"")
        elif role == "assistant":
            if msg.get("thinking"):
                lines.append(f"### 🤖 Assistant [{time}]")
                lines.append(f"")
                lines.append(f"<details><summary>💭 Thinking</summary>")
                lines.append(f"")
                lines.append(msg["thinking"])
                lines.append(f"")
                lines.append(f"</details>")
                lines.append(f"")
                if text:
                    lines.append(text)
                    lines.append(f"")
            elif text:
                lines.append(f"### 🤖 Assistant [{time}]")
                lines.append(f"")
                lines.append(text)
                lines.append(f"")
        elif role == "system":
            lines.append(f"*[{time} SYSTEM: {text[:200]}]*")
            lines.append(f"")
    
    output_path.write_text("\n".join(lines))
    return output_path


def find_session_files() -> list:
    """Find all session JSONL files (active, reset, deleted)."""
    if not SESSIONS_DIR.exists():
        return []
    
    files = []
    for f in SESSIONS_DIR.iterdir():
        name = f.name
        # Match: uuid.jsonl, uuid.jsonl.reset.*, uuid.jsonl.deleted.*
        if ".jsonl" in name and f.is_file() and f.stat().st_size > 1000:
            files.append(f)
    
    return sorted(files, key=lambda f: f.stat().st_mtime)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    if len(sys.argv) > 1 and sys.argv[1] != "--watch":
        # Convert specific file
        path = Path(sys.argv[1])
        if not path.exists():
            print(f"File not found: {path}", file=sys.stderr)
            sys.exit(1)
        result = convert_session(path, OUTPUT_DIR)
        if result:
            print(f"✅ {result}")
        else:
            print(f"⚠️ No conversation content found in {path.name}")
        return
    
    # Convert all unprocessed sessions
    processed = load_processed()
    session_files = find_session_files()
    
    converted = 0
    skipped = 0
    
    for sf in session_files:
        fh = file_hash(sf)
        if fh in processed:
            skipped += 1
            continue
        
        result = convert_session(sf, OUTPUT_DIR)
        if result:
            print(f"✅ {result.name} ({sf.name})")
            converted += 1
        else:
            skipped += 1
        
        processed.add(fh)
    
    save_processed(processed)
    print(f"\nDone: {converted} converted, {skipped} skipped, {len(session_files)} total")


if __name__ == "__main__":
    main()
