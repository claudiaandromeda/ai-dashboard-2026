#!/usr/bin/env python3
"""
YouTube Nightly Pipeline
- Reads channels from research/youtube-channels.json
- Fetches latest videos per channel (max 14 days old, global cap of 30)
- Filters by keyword relevance before processing (saves time/cost)
- Transcripts via youtube-transcript-api (primary) or yt-dlp (fallback)
- Summarises via local Ollama
- Detects and reports spam-posting channels
- Generates daily digest
"""

import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

# --- Config ---
WORKSPACE = Path(__file__).parent.parent
CHANNELS_FILE = WORKSPACE / "research" / "youtube-channels.json"
SUMMARIES_DIR = WORKSPACE / "research" / "summaries"
DIGEST_DIR = WORKSPACE / "research" / "digests"
SPAM_LOG = WORKSPACE / "research" / "channel-spam-log.json"
TEMP_DIR = Path("/tmp/yt-transcripts")

OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "mistral:7b")
VIDEOS_PER_CHANNEL = int(os.environ.get("VIDEOS_PER_CHANNEL", "5"))
MAX_TOTAL_VIDEOS = int(os.environ.get("MAX_TOTAL_VIDEOS", "30"))
MAX_AGE_DAYS = int(os.environ.get("MAX_AGE_DAYS", "14"))
REQUEST_DELAY = float(os.environ.get("REQUEST_DELAY", "3.0"))
TIER_FILTER = os.environ.get("TIER_FILTER", "tier1,tier2")
SPAM_THRESHOLD = int(os.environ.get("SPAM_THRESHOLD", "10"))  # videos in 24h = spam

# Keywords that indicate relevant content worth processing
RELEVANT_KEYWORDS = [
    "agent", "agentic", "automation", "workflow", "mcp", "openai", "anthropic",
    "claude", "gemini", "gpt", "llm", "ai tool", "ai coding", "local ai", "ollama",
    "langchain", "langgraph", "n8n", "make.com", "zapier", "api", "prompt",
    "rag", "vector", "embedding", "fine-tun", "model", "inference", "cost",
    "openclaw", "autonomous", "multi-agent", "copilot", "cursor", "codex",
    "business", "startup", "saas", "revenue", "monetize", "productize",
]

# Titles that are almost always low-value (spam/clickbait patterns)
NOISE_PATTERNS = [
    r"\bmake \$\d+",
    r"\bhow i made \$",
    r"\bpassive income\b",
    r"\bwatch this before",
    r"\byou won't believe",
    r"\bsecret method\b",
    r"\bday \d+ of\b",  # daily vlogs
]

SUMMARY_PROMPT = """You are extracting actionable intelligence from a YouTube video transcript about AI agents, automation, or AI tools.

Extract and structure the following:
1. **Key Actionable Items** — specific things we can implement (numbered list)
2. **Tools/Commands Mentioned** — any CLI commands, tools, APIs, models
3. **Cost Saving Tips** — any advice on reducing AI API costs
4. **Security Recommendations** — any hardening or best practice advice
5. **Interesting Ideas** — anything worth exploring further

Be concise. Skip filler and repetition. Focus on what's useful to implement.

TRANSCRIPT:
{transcript}
"""


# --- Relevance filtering ---

def is_relevant(title: str) -> bool:
    """Return True if title looks worth processing"""
    title_lower = title.lower()
    
    # Check noise patterns first
    for pattern in NOISE_PATTERNS:
        if re.search(pattern, title_lower):
            return False
    
    # Must match at least one relevant keyword
    for kw in RELEVANT_KEYWORDS:
        if kw in title_lower:
            return True
    
    return False


def parse_date(date_str: str) -> datetime | None:
    """Parse yt-dlp upload_date (YYYYMMDD) to datetime"""
    try:
        if date_str and len(date_str) == 8:
            return datetime.strptime(date_str, "%Y%m%d").replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return None


# --- Transcript fetching ---

def get_transcript_api(video_id: str) -> str | None:
    """Primary: youtube-transcript-api Python library"""
    try:
        venv_site = list((WORKSPACE / ".venv" / "lib").glob("python*/site-packages"))
        if venv_site:
            sys.path.insert(0, str(venv_site[0]))
        
        from youtube_transcript_api import YouTubeTranscriptApi
        ytt = YouTubeTranscriptApi()
        transcript_list = ytt.fetch(video_id, languages=["en", "en-US", "en-GB"])
        text = " ".join(chunk["text"] for chunk in transcript_list)
        return text if text.strip() else None
    except Exception as e:
        print(f"   [transcript-api] Failed: {e}")
        return None


def get_transcript_ytdlp(url: str, video_id: str) -> str | None:
    """Fallback: yt-dlp caption extraction"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    out_path = TEMP_DIR / video_id
    
    try:
        subprocess.run([
            "yt-dlp",
            "--write-auto-sub", "--sub-lang", "en", "--sub-format", "vtt",
            "--skip-download", "--output", str(out_path), url
        ], capture_output=True, text=True, timeout=60)
        
        vtt_files = list(TEMP_DIR.glob(f"{video_id}*.vtt"))
        if not vtt_files:
            return None
        
        with open(vtt_files[0]) as f:
            content = f.read()
        
        lines = content.split("\n")
        text_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("WEBVTT") or line.startswith("NOTE") or "-->" in line or re.match(r"^\d+$", line):
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
    except Exception as e:
        print(f"   [yt-dlp] Failed: {e}")
        return None


def get_transcript(video_id: str, url: str) -> str | None:
    transcript = get_transcript_api(video_id)
    if transcript:
        print(f"   ✅ Transcript via transcript-api ({len(transcript)} chars)")
        return transcript
    
    print(f"   ⚠️  transcript-api failed, trying yt-dlp...")
    transcript = get_transcript_ytdlp(url, video_id)
    if transcript:
        print(f"   ✅ Transcript via yt-dlp ({len(transcript)} chars)")
        return transcript
    
    return None


# --- Ollama summarisation ---

def summarise(transcript: str, model: str) -> str:
    # No character cap — YouTubers often save key insights for the final minute
    # mistral:7b context window handles full transcripts fine
    prompt = SUMMARY_PROMPT.format(transcript=transcript)
    try:
        result = subprocess.run(
            ["ollama", "run", model],
            input=prompt, capture_output=True, text=True, timeout=180
        )
        return result.stdout.strip() if result.stdout.strip() else f"[Model returned empty]\n\nStdErr: {result.stderr[:500]}"
    except subprocess.TimeoutExpired:
        return "[Summarisation timed out after 3 minutes]"
    except Exception as e:
        return f"[Summarisation failed: {e}]"


# --- Channel video fetching ---

def get_latest_videos(channel_url: str, n: int) -> list[dict]:
    """Get latest N video metadata from a channel"""
    try:
        result = subprocess.run([
            "yt-dlp",
            "--flat-playlist",
            "--playlist-end", str(n),
            "--print", "%(id)s\t%(title)s\t%(upload_date)s",
            channel_url + "/videos"
        ], capture_output=True, text=True, timeout=60)
        
        videos = []
        for line in result.stdout.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t")
            if len(parts) >= 1:
                vid_id = parts[0].strip()
                title = parts[1].strip() if len(parts) > 1 else "Unknown"
                date = parts[2].strip() if len(parts) > 2 else ""
                if vid_id and len(vid_id) == 11:
                    videos.append({"id": vid_id, "title": title, "date": date})
        
        return videos
    except Exception as e:
        print(f"   ❌ Failed to fetch channel videos: {e}")
        return []


# --- Spam detection ---

def check_spam(channel_name: str, videos: list[dict]) -> dict | None:
    """Return spam report if channel is posting excessively"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = []
    for v in videos:
        dt = parse_date(v.get("date", ""))
        if dt and dt >= cutoff:
            recent.append(v)
    
    if len(recent) >= SPAM_THRESHOLD:
        return {
            "channel": channel_name,
            "videos_in_24h": len(recent),
            "threshold": SPAM_THRESHOLD,
            "flagged_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "sample_titles": [v["title"] for v in recent[:3]],
        }
    return None


def load_spam_log() -> dict:
    if SPAM_LOG.exists():
        try:
            return json.loads(SPAM_LOG.read_text())
        except Exception:
            pass
    return {"flagged": []}


def save_spam_log(log: dict):
    SPAM_LOG.parent.mkdir(parents=True, exist_ok=True)
    SPAM_LOG.write_text(json.dumps(log, indent=2))


# --- Main pipeline ---

def process_video(video_id: str, title: str, channel_name: str, model: str) -> dict:
    url = f"https://www.youtube.com/watch?v={video_id}"
    out_file = SUMMARIES_DIR / f"{video_id}.md"
    
    if out_file.exists():
        return {"status": "skipped", "id": video_id, "title": title}
    
    print(f"\n  📹 {title[:70]}")
    print(f"     ID: {video_id}")
    
    transcript = get_transcript(video_id, url)
    if not transcript:
        print(f"     ❌ No transcript available")
        return {"status": "failed", "id": video_id, "title": title, "reason": "no transcript"}
    
    print(f"     🤖 Summarising with {model}...")
    summary = summarise(transcript, model)
    
    SUMMARIES_DIR.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        f.write(f"# {title}\n\n")
        f.write(f"**Channel:** {channel_name}\n")
        f.write(f"**URL:** {url}\n")
        f.write(f"**Processed:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"**Model:** {model}\n\n")
        f.write("---\n\n")
        f.write(summary)
        f.write("\n")
    
    print(f"     ✅ Saved")
    return {"status": "done", "id": video_id, "title": title}


def generate_digest(processed_today: list[dict], spam_reports: list[dict], channel_stats: list[dict] = None) -> Path | None:
    done = [r for r in processed_today if r.get("status") == "done"]
    filtered = [r for r in processed_today if r.get("status") == "filtered"]
    skipped = [r for r in processed_today if r.get("status") == "skipped"]
    failed = [r for r in processed_today if r.get("status") == "failed"]

    date_str = datetime.now().strftime("%Y-%m-%d")
    DIGEST_DIR.mkdir(parents=True, exist_ok=True)
    digest_file = DIGEST_DIR / f"{date_str}-digest.md"
    
    with open(digest_file, "w") as f:
        f.write(f"# YouTube Intelligence Digest — {date_str}\n\n")
        f.write(f"**Processed:** {len(done)} | **Filtered out:** {len(filtered)} | **Skipped (seen):** {len(skipped)} | **Failed:** {len(failed)}\n\n")
        
        if spam_reports:
            f.write("## ⚠️ High-Volume Channel Alerts\n\n")
            for s in spam_reports:
                f.write(f"- **{s['channel']}** — {s['videos_in_24h']} videos in 24h\n")
                for t in s.get("sample_titles", []):
                    f.write(f"  - _{t}_\n")
            f.write("\n_FYI only — no throttling applied. Review if signal quality looks low._\n\n")
        
        # Channel efficiency table
        if channel_stats:
            ranked = sorted(channel_stats, key=lambda x: x.get("efficiency_pct", 100))
            f.write("## 📊 Channel Efficiency (least → most useful)\n\n")
            for cs in ranked:
                bar = "🟥" if cs["efficiency_pct"] < 40 else ("🟨" if cs["efficiency_pct"] < 70 else "🟩")
                f.write(f"- {bar} **{cs['name']}** — {cs['done']}/{cs['attempted']} useful ({cs['efficiency_pct']}%) | {cs['filtered']} filtered before processing\n")
            f.write("\n_Channels at the top are costing the most effort for the least return._\n\n")
        
        f.write("---\n\n")
        
        for item in done:
            vid_file = SUMMARIES_DIR / f"{item['id']}.md"
            if vid_file.exists():
                f.write(f"## {item.get('title', item['id'])}\n\n")
                content = vid_file.read_text()
                parts = content.split("---\n\n", 1)
                if len(parts) > 1:
                    f.write(parts[1])
                f.write("\n---\n\n")
    
    return digest_file


def main():
    import argparse
    parser = argparse.ArgumentParser(description="YouTube Nightly Pipeline")
    parser.add_argument("--model", default=OLLAMA_MODEL)
    parser.add_argument("--videos-per-channel", type=int, default=VIDEOS_PER_CHANNEL)
    parser.add_argument("--max-total", type=int, default=MAX_TOTAL_VIDEOS)
    parser.add_argument("--max-age-days", type=int, default=MAX_AGE_DAYS)
    parser.add_argument("--tiers", default=TIER_FILTER)
    parser.add_argument("--channel", help="Process a single channel URL")
    parser.add_argument("--no-filter", action="store_true", help="Skip keyword relevance filter")
    parser.add_argument("--digest-only", action="store_true")
    args = parser.parse_args()
    
    if args.digest_only:
        today = datetime.now().strftime("%Y-%m-%d")
        today_items = []
        for f in SUMMARIES_DIR.glob("*.md"):
            content = f.read_text()
            if today in content:
                title_line = content.split("\n")[0].replace("# ", "")
                today_items.append({"status": "done", "id": f.stem, "title": title_line})
        digest = generate_digest(today_items, [])
        print(f"Digest: {digest}")
        return
    
    if not CHANNELS_FILE.exists():
        print(f"❌ Channels file not found: {CHANNELS_FILE}")
        sys.exit(1)
    
    with open(CHANNELS_FILE) as f:
        data = json.load(f)
    
    tiers = [t.strip() for t in args.tiers.split(",")]
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.max_age_days)
    
    if args.channel:
        channels = [{"name": "Custom", "url": args.channel, "priority": "tier1"}]
    else:
        channels = [c for c in data["channels"] if c.get("priority", "tier3") in tiers]
    
    print(f"🚀 YouTube Nightly Pipeline")
    print(f"   Model: {args.model}")
    print(f"   Channels: {len(channels)} ({', '.join(tiers)})")
    print(f"   Videos per channel: {args.videos_per_channel} | Global cap: {args.max_total} | Max age: {args.max_age_days} days")
    print(f"   Keyword filter: {'OFF' if args.no_filter else 'ON'}")
    
    all_processed = []
    spam_reports = []
    all_channel_stats = []
    spam_log = load_spam_log()
    total_processed = 0
    
    for channel in channels:
        if total_processed >= args.max_total:
            print(f"\n⏹  Global cap of {args.max_total} videos reached — stopping")
            break
        
        print(f"\n📺 {channel['name']} ({channel['url']})")
        
        # Fetch more than needed so we can filter by date + relevance
        fetch_n = max(args.videos_per_channel * 3, 20)
        videos = get_latest_videos(channel["url"], fetch_n)
        if not videos:
            print(f"   ⚠️  No videos found")
            continue
        
        print(f"   Fetched {len(videos)} videos for filtering")
        
        # Spam check (flag only — no throttling)
        spam = check_spam(channel["name"], videos)
        if spam:
            print(f"   ⚠️  SPAM ALERT: {spam['videos_in_24h']} videos in 24h (flagged, not throttled)")
            spam_reports.append(spam)
        channel_cap = args.videos_per_channel
        
        # Filter: age
        fresh = []
        for v in videos:
            dt = parse_date(v.get("date", ""))
            if dt is None or dt >= cutoff:
                fresh.append(v)
        
        print(f"   After age filter ({args.max_age_days}d): {len(fresh)} videos")
        
        # Filter: relevance
        if not args.no_filter:
            relevant = [v for v in fresh if is_relevant(v["title"])]
            filtered_count = len(fresh) - len(relevant)
            print(f"   After keyword filter: {len(relevant)} relevant, {filtered_count} skipped")
            for v in fresh:
                if not is_relevant(v["title"]):
                    all_processed.append({"status": "filtered", "id": v["id"], "title": v["title"]})
        else:
            relevant = fresh
        
        # Process up to channel_cap, respecting global cap
        to_process = relevant[:channel_cap]
        remaining_global = args.max_total - total_processed
        to_process = to_process[:remaining_global]
        
        channel_stats = {"attempted": 0, "done": 0, "failed": 0, "filtered": len(fresh) - len(relevant) if not args.no_filter else 0}
        for video in to_process:
            result = process_video(video["id"], video["title"], channel["name"], args.model)
            result["channel"] = channel["name"]
            all_processed.append(result)
            channel_stats["attempted"] += 1
            if result["status"] == "done":
                channel_stats["done"] += 1
                total_processed += 1
                time.sleep(REQUEST_DELAY)
            elif result["status"] == "failed":
                channel_stats["failed"] += 1
                time.sleep(REQUEST_DELAY)
        
        # Efficiency score: useful summaries / total work done (transcripts attempted)
        attempted = channel_stats["attempted"]
        if attempted > 0:
            efficiency = round(channel_stats["done"] / attempted * 100)
            all_channel_stats.append({"name": channel["name"], **channel_stats, "efficiency_pct": efficiency})
            print(f"   📊 Efficiency: {channel_stats['done']}/{attempted} useful ({efficiency}%)")
    
    done = sum(1 for r in all_processed if r["status"] == "done")
    skipped = sum(1 for r in all_processed if r["status"] == "skipped")
    filtered = sum(1 for r in all_processed if r["status"] == "filtered")
    failed = sum(1 for r in all_processed if r["status"] == "failed")
    
    print(f"\n✅ Done — {done} processed, {skipped} already seen, {filtered} filtered out, {failed} failed")
    
    if spam_reports:
        # Update spam log
        existing_names = {s["channel"] for s in spam_log["flagged"]}
        for s in spam_reports:
            if s["channel"] not in existing_names:
                spam_log["flagged"].append(s)
        save_spam_log(spam_log)
        print(f"⚠️  Spam alerts: {len(spam_reports)} channels flagged (see research/channel-spam-log.json)")
    
    digest = generate_digest(all_processed, spam_reports, all_channel_stats)
    if digest:
        print(f"📋 Digest: {digest}")
    
    # Return digest path for cron reporting
    if digest:
        print(f"DIGEST_PATH={digest}")


if __name__ == "__main__":
    main()
