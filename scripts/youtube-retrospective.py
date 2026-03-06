#!/usr/bin/env python3
"""
YouTube Retrospective Scraper
- Fetches up to N videos per channel (default 30)
- Filters by date (max 2 weeks old by default)
- Keyword-filters titles/descriptions BEFORE fetching transcripts
- Only transcribes + summarises relevant videos
- Appends results to existing summaries dir (skips already processed)
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

WORKSPACE = Path(__file__).parent.parent
CHANNELS_FILE = WORKSPACE / "research" / "youtube-channels.json"
SUMMARIES_DIR = WORKSPACE / "research" / "summaries"
TEMP_DIR = Path("/tmp/yt-transcripts")

OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b")
MAX_VIDEOS = int(os.environ.get("MAX_VIDEOS", "30"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "14"))
REQUEST_DELAY = float(os.environ.get("REQUEST_DELAY", "3.0"))

# Keywords that make a video relevant — if ANY appear in title or description, process it
KEYWORDS = [
    "openclaw", "moltbot", "clawdbot",
    "claude", "anthropic", "gemini", "gpt", "llm", "ai agent",
    "automation", "autonomous", "workflow", "n8n",
    "money", "income", "revenue", "profit", "passive",
    "trading", "crypto", "invest",
    "make money", "earn", "side hustle", "business",
    "self-hosted", "vps", "local ai",
    "skill", "tool", "pipeline", "agent"
]

SUMMARY_PROMPT = """You are extracting actionable intelligence from a YouTube video transcript about AI agents, OpenClaw, automation, or making money with AI.

Extract and structure the following:
1. **Key Actionable Items** — specific things we can implement (numbered list)
2. **Tools/Commands Mentioned** — any CLI commands, tools, APIs, models
3. **Money-Making Ideas** — any specific ways to earn money mentioned
4. **Cost Tips** — any advice on reducing costs
5. **Security/Safety Notes** — any hardening or risk advice
6. **Novel Ideas** — anything surprising or not widely known

Be concise. Skip filler. Focus on what's useful to implement or act on.

TRANSCRIPT:
{transcript}
"""


def is_relevant(title: str, description: str = "") -> bool:
    text = (title + " " + description).lower()
    return any(kw in text for kw in KEYWORDS)


def parse_date(date_str: str) -> datetime | None:
    if not date_str or len(date_str) != 8:
        return None
    try:
        return datetime.strptime(date_str, "%Y%m%d").replace(tzinfo=timezone.utc)
    except:
        return None


def get_channel_videos(channel_url: str, max_videos: int, max_age_days: int) -> list[dict]:
    """Fetch video metadata (title, date, desc) without downloading transcripts"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    
    try:
        result = subprocess.run([
            "yt-dlp",
            "--flat-playlist",
            "--playlist-end", str(max_videos),
            "--print", "%(id)s\t%(title)s\t%(upload_date)s\t%(description)s",
            channel_url + "/videos"
        ], capture_output=True, text=True, timeout=90)
        
        videos = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t", 3)
            if len(parts) < 1:
                continue
            vid_id = parts[0].strip()
            title = parts[1].strip() if len(parts) > 1 else ""
            date_str = parts[2].strip() if len(parts) > 2 else ""
            desc = parts[3].strip() if len(parts) > 3 else ""
            
            if not vid_id or len(vid_id) != 11:
                continue
            
            # Date filter
            upload_date = parse_date(date_str)
            if upload_date and upload_date < cutoff:
                continue  # Too old
            
            videos.append({
                "id": vid_id,
                "title": title,
                "date": date_str,
                "description": desc[:500],
                "relevant": is_relevant(title, desc)
            })
        
        return videos
    except Exception as e:
        print(f"   ❌ Failed to fetch channel videos: {e}")
        return []


def get_transcript(video_id: str, url: str) -> str | None:
    # Try transcript API first
    try:
        venv_site = list((WORKSPACE / ".venv" / "lib").glob("python*/site-packages"))
        if venv_site:
            sys.path.insert(0, str(venv_site[0]))
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt = YouTubeTranscriptApi()
        transcript_list = ytt.fetch(video_id, languages=["en", "en-US", "en-GB"])
        text = " ".join(chunk.get("text", "") for chunk in transcript_list)
        if text.strip():
            return text
    except Exception:
        pass
    
    # Fallback: yt-dlp
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    out_path = TEMP_DIR / video_id
    try:
        subprocess.run([
            "yt-dlp", "--write-auto-sub", "--sub-lang", "en", "--sub-format", "vtt",
            "--skip-download", "--output", str(out_path), url
        ], capture_output=True, text=True, timeout=60)
        
        import re
        vtt_files = list(TEMP_DIR.glob(f"{video_id}*.vtt"))
        if not vtt_files:
            return None
        with open(vtt_files[0]) as f:
            content = f.read()
        lines = content.split("\n")
        text_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("WEBVTT") or "-->" in line or re.match(r"^\d+$", line):
                continue
            line = re.sub(r"<[^>]+>", "", line)
            if line:
                text_lines.append(line)
        deduped = []
        prev = None
        for line in text_lines:
            if line != prev:
                deduped.append(line)
                prev = line
        for f in vtt_files:
            f.unlink(missing_ok=True)
        return " ".join(deduped) if deduped else None
    except Exception:
        return None


def summarise(transcript: str, model: str) -> str:
    prompt = SUMMARY_PROMPT.format(transcript=transcript[:12000])
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt, capture_output=True, text=True, timeout=180
        )
        return result.stdout.strip() or "[Empty output]"
    except Exception as e:
        return f"[Failed: {e}]"


def main():
    import argparse
    parser = argparse.ArgumentParser(description="YouTube Retrospective Scraper")
    parser.add_argument("--model", default=OLLAMA_MODEL)
    parser.add_argument("--max-videos", type=int, default=MAX_VIDEOS)
    parser.add_argument("--max-age-days", type=int, default=MAX_AGE_DAYS)
    parser.add_argument("--tiers", default="tier1,tier2,tier3")
    parser.add_argument("--all-videos", action="store_true", help="Skip keyword filter, process all")
    args = parser.parse_args()

    with open(CHANNELS_FILE) as f:
        data = json.load(f)

    tiers = [t.strip() for t in args.tiers.split(",")]
    channels = [c for c in data["channels"] if c.get("priority", "tier3") in tiers]

    print(f"🔍 YouTube Retrospective Scraper")
    print(f"   Channels: {len(channels)} | Max videos: {args.max_videos} | Max age: {args.max_age_days} days")
    print(f"   Keyword filter: {'OFF' if args.all_videos else 'ON'}")
    print(f"   Model: {args.model}")

    total_found = total_relevant = total_processed = total_skipped = total_failed = 0

    for channel in channels:
        print(f"\n📺 {channel['name']}")
        videos = get_channel_videos(channel["url"], args.max_videos, args.max_age_days)
        total_found += len(videos)

        relevant = [v for v in videos if args.all_videos or v["relevant"]]
        skipped_keyword = len(videos) - len(relevant)
        total_relevant += len(relevant)

        print(f"   Found: {len(videos)} videos | Relevant: {len(relevant)} | Filtered out: {skipped_keyword}")

        for video in relevant:
            out_file = SUMMARIES_DIR / f"{video['id']}.md"
            if out_file.exists():
                total_skipped += 1
                continue

            url = f"https://www.youtube.com/watch?v={video['id']}"
            print(f"\n  📹 {video['title'][:60]}")

            transcript = get_transcript(video["id"], url)
            if not transcript:
                print(f"     ❌ No transcript")
                total_failed += 1
                continue

            summary = summarise(transcript, args.model)
            SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
            with open(out_file, "w") as f:
                f.write(f"# {video['title']}\n\n")
                f.write(f"**Channel:** {channel['name']}\n")
                f.write(f"**URL:** {url}\n")
                f.write(f"**Upload Date:** {video['date']}\n")
                f.write(f"**Processed:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
                f.write(f"**Model:** {args.model}\n\n---\n\n")
                f.write(summary + "\n")

            print(f"     ✅ Saved")
            total_processed += 1
            time.sleep(REQUEST_DELAY)

    print(f"\n✅ Done — {total_found} found, {total_relevant} relevant, {total_processed} processed, {total_skipped} skipped, {total_failed} failed")


if __name__ == "__main__":
    main()
