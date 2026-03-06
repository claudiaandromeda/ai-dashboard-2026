#!/usr/bin/env python3
"""
Process OpenClaw .jsonl session transcripts into readable markdown.

Usage:
    python3 process-transcripts.py [--all] [--since YYYY-MM-DD] [--session UUID] [--force]

Outputs to: workspace/transcripts/YYYY-MM-DD/session-UUID-short.md

Design principles:
- Keep ALL conversation content (user + assistant text)
- Keep tool calls as brief annotations (what tool, not the full JSON)
- Keep tool results that contain meaningful content (documents, analysis, search results)
- Filter out: empty results, JSON metadata, terminal escape codes, error boilerplate,
  directory listings, file operation confirmations, lock files
"""

import json
import os
import re
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path

SESSIONS_DIR = Path.home() / ".openclaw/agents/main/sessions"
OUTPUT_DIR = Path.home() / ".openclaw/workspace/transcripts"

# Tool results matching these patterns are noise — skip entirely
NOISE_PATTERNS = [
    r'^\s*\{[^}]*"status":\s*"error"',           # Error JSON
    r'^\s*\{[^}]*"citations":\s*"auto"',          # Empty search results
    r'^\s*\{[^}]*"requester":\s*"main"',          # Agent metadata
    r'^\s*\{[^}]*"status":\s*"forbidden"',        # Permission errors
    r'^hint:\s',                                    # Git hints
    r'^\[[\?\d]',                                   # Terminal escape sequences
    r'^Command still running',                      # Process management noise
    r'^No active session found',                    # Process management noise
    r'^Successfully (replaced|wrote|created)',      # File operation confirmations
    r'^error:\s*unknown option',                    # CLI errors
    r'^\s*total \d+\s*$',                          # ls output headers
    r'^drwx',                                       # Directory listing lines
    r'^-rw-',                                       # File listing lines
]
NOISE_RE = [re.compile(p, re.MULTILINE) for p in NOISE_PATTERNS]

# Terminal escape sequence stripper
ANSI_RE = re.compile(r'\x1b\[[0-9;]*[a-zA-Z]|\[[\?\d]+[a-zA-Z]')


def is_noise(text):
    """Check if a tool result is noise that should be skipped."""
    stripped = text.strip()
    if not stripped:
        return True
    if len(stripped) < 5:
        return True
    for pat in NOISE_RE:
        if pat.search(stripped[:200]):
            return True
    # Pure JSON metadata (short, starts with {, contains only technical fields)
    if stripped.startswith('{') and len(stripped) < 300:
        try:
            obj = json.loads(stripped)
            # If it's just status/metadata with no real content, skip
            keys = set(obj.keys())
            metadata_keys = {'status', 'error', 'tool', 'provider', 'model',
                           'citations', 'results', 'requester', 'allowAny',
                           'agents', 'count', 'sessions'}
            if keys.issubset(metadata_keys):
                # But keep if 'results' has actual content
                if 'results' in obj and obj['results']:
                    return False
                return True
        except (json.JSONDecodeError, TypeError):
            pass
    return False


def is_directory_listing(text):
    """Check if text is primarily a directory/file listing."""
    lines = text.strip().split('\n')
    if len(lines) < 2:
        return False
    listing_lines = sum(1 for l in lines if re.match(r'^[d-]r[w-][x-]', l.strip()) or
                       re.match(r'^total \d+', l.strip()))
    return listing_lines > len(lines) * 0.5


def clean_ansi(text):
    """Remove terminal escape sequences."""
    return ANSI_RE.sub('', text)


def format_tool_result(text, max_lines=50):
    """Format a tool result for readability, truncating if very long."""
    text = clean_ansi(text).strip()

    if is_noise(text):
        return None

    if is_directory_listing(text):
        return None

    lines = text.split('\n')
    if len(lines) > max_lines:
        kept = '\n'.join(lines[:max_lines])
        return f"{kept}\n\n*[...truncated, {len(lines) - max_lines} more lines]*"

    return text


def extract_conversation(content, role):
    """Extract conversation-worthy content from a message's content blocks.

    Returns (text_parts, tool_names) tuple.
    text_parts: list of readable text strings
    tool_names: list of tool names used (for annotation)
    """
    text_parts = []
    tool_names = []

    if isinstance(content, str):
        if content.strip():
            text_parts.append(content.strip())
        return text_parts, tool_names

    if not isinstance(content, list):
        return text_parts, tool_names

    for block in content:
        btype = block.get("type", "")

        if btype == "text":
            text = block.get("text", "").strip()
            if text:
                text_parts.append(text)

        elif btype == "toolCall":
            name = block.get("name", "unknown")
            tool_names.append(name)

        elif btype == "tool_use":
            name = block.get("name", "unknown")
            tool_names.append(name)

        elif btype == "thinking":
            # Include thinking content — it shows reasoning
            text = block.get("text", "").strip()
            if text and len(text) > 50:  # Skip trivial thinking
                # Truncate very long thinking blocks
                if len(text) > 500:
                    text = text[:500] + "..."
                text_parts.append(f"*[thinking: {text}]*")

        elif btype == "image":
            text_parts.append("*[image]*")

    return text_parts, tool_names


def process_session(jsonl_path):
    """Process a single .jsonl file into markdown."""
    session_id = jsonl_path.stem
    if ".deleted." in jsonl_path.name:
        return None

    entries = []  # (timestamp, formatted_line)
    model = "unknown"
    start_time = None
    end_time = None
    pending_tools = []  # Track tool calls for grouping

    with open(jsonl_path, "r") as f:
        for raw_line in f:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            try:
                obj = json.loads(raw_line)
            except json.JSONDecodeError:
                continue

            obj_type = obj.get("type")
            timestamp = obj.get("timestamp", "")

            if obj_type == "session":
                start_time = timestamp

            elif obj_type == "model_change":
                model = obj.get("modelId", model)

            elif obj_type == "message":
                end_time = timestamp
                msg = obj.get("message", {})
                role = msg.get("role", "unknown")
                content = msg.get("content", "")

                ts_short = ""
                if timestamp:
                    try:
                        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                        ts_short = dt.strftime("%H:%M")
                    except Exception:
                        pass

                if role == "user":
                    text_parts, tools = extract_conversation(content, role)
                    if not text_parts:
                        continue

                    text = "\n".join(text_parts)
                    # Strip message_id lines
                    text = re.sub(r'\n?\[message_id: [^\]]+\]', '', text).strip()

                    if not text:
                        continue

                    # Detect system prompts
                    if text.startswith("A new session was started via /new"):
                        entries.append((ts_short, "**🧑 David** ({ts}): *[new session started]*"))
                        continue
                    if "Read HEARTBEAT.md if it exists" in text:
                        entries.append((ts_short, "**⏰ Heartbeat** ({ts}): *[heartbeat check]*"))
                        continue
                    # Detect cron triggers
                    if text.startswith("[cron:"):
                        # Keep the cron message but clean it up
                        entries.append((ts_short, f"**⏰ Cron** ({{ts}}):\n{text}"))
                        continue

                    entries.append((ts_short, f"**🧑 David** ({{ts}}):\n{text}"))

                elif role == "assistant":
                    text_parts, tools = extract_conversation(content, role)

                    # Add tool annotation if tools were used
                    if tools and not text_parts:
                        # Tool-only message — brief annotation
                        tool_list = ", ".join(tools[:5])
                        if len(tools) > 5:
                            tool_list += f" +{len(tools)-5} more"
                        entries.append((ts_short, f"**🤖 Claudia** ({{ts}}): *[used: {tool_list}]*"))
                        continue

                    if not text_parts:
                        continue

                    text = "\n".join(text_parts)
                    if tools:
                        tool_list = ", ".join(set(tools))
                        text = f"*[used: {tool_list}]*\n\n{text}"

                    entries.append((ts_short, f"**🤖 Claudia** ({{ts}}):\n{text}"))

                elif role == "toolResult":
                    # Process tool results — keep meaningful ones, skip noise
                    if isinstance(content, list):
                        for c in content:
                            if c.get("type") == "text":
                                formatted = format_tool_result(c.get("text", ""))
                                if formatted:
                                    entries.append((ts_short, f"> **Tool output:**\n> {formatted.replace(chr(10), chr(10) + '> ')}"))
                            elif c.get("type") == "image":
                                entries.append((ts_short, "> **Tool output:** *[image]*"))
                    elif isinstance(content, str):
                        formatted = format_tool_result(content)
                        if formatted:
                            entries.append((ts_short, f"> **Tool output:**\n> {formatted.replace(chr(10), chr(10) + '> ')}"))

    if not entries:
        return None

    # Build the markdown
    date_str = "unknown"
    if start_time:
        try:
            dt = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            date_str = dt.strftime("%Y-%m-%d")
        except Exception:
            pass

    header = f"# Session Transcript: {session_id[:8]}\n\n"
    header += f"- **Date:** {date_str}\n"
    header += f"- **Model:** {model}\n"
    header += f"- **Messages:** {len(entries)}\n"
    if start_time:
        header += f"- **Started:** {start_time}\n"
    if end_time:
        header += f"- **Ended:** {end_time}\n"
    header += f"\n---\n\n"

    body_lines = []
    for ts, line in entries:
        body_lines.append(line.replace("{ts}", ts))
        body_lines.append("")

    return date_str, session_id, header + "\n".join(body_lines)


def main():
    parser = argparse.ArgumentParser(description="Process OpenClaw session transcripts")
    parser.add_argument("--all", action="store_true", help="Process all sessions")
    parser.add_argument("--since", type=str, help="Process sessions since YYYY-MM-DD")
    parser.add_argument("--session", type=str, help="Process a specific session UUID")
    parser.add_argument("--force", action="store_true", help="Overwrite existing transcripts")
    args = parser.parse_args()

    if not SESSIONS_DIR.exists():
        print(f"Sessions directory not found: {SESSIONS_DIR}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    jsonl_files = sorted(SESSIONS_DIR.glob("*.jsonl"))
    jsonl_files = [f for f in jsonl_files if not f.name.endswith(".lock") and ".deleted." not in f.name]

    if args.session:
        jsonl_files = [f for f in jsonl_files if args.session in f.stem]

    processed = 0
    skipped = 0

    for jsonl_path in jsonl_files:
        if args.since:
            mtime = datetime.fromtimestamp(jsonl_path.stat().st_mtime, tz=timezone.utc)
            since_dt = datetime.strptime(args.since, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            if mtime < since_dt:
                continue

        result = process_session(jsonl_path)
        if result is None:
            continue

        date_str, session_id, content = result
        out_dir = OUTPUT_DIR / date_str
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / f"{session_id[:8]}.md"

        if out_file.exists() and not args.force:
            skipped += 1
            continue

        with open(out_file, "w") as f:
            f.write(content)
        processed += 1
        size_kb = os.path.getsize(jsonl_path) // 1024
        out_kb = os.path.getsize(out_file) // 1024
        print(f"  ✅ {date_str}/{session_id[:8]}.md ({size_kb}KB → {out_kb}KB)")

    print(f"\nDone: {processed} processed, {skipped} skipped (already exist)")
    print(f"Output: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
