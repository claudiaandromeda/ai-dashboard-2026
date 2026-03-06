#!/usr/bin/env python3
"""
YouTube Transcript Pipeline — local processing, no API limits
Fetches transcripts via yt-dlp (auto-captions), summarises via local Ollama model
"""

import subprocess
import sys
import os
import json
import re
from pathlib import Path
from datetime import datetime

# Config
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "deepseek-r1:32b")
OUTPUT_DIR = Path("research/summaries")
TEMP_DIR = Path("/tmp/yt-transcripts")

SUMMARY_PROMPT = """You are extracting actionable intelligence from a YouTube video transcript about AI agents, OpenClaw, or related tools.

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

def get_transcript_yt_dlp(url: str, video_id: str) -> str:
    """Fetch auto-generated captions via yt-dlp"""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    out_path = TEMP_DIR / video_id
    
    try:
        # Try to get auto-generated English captions
        result = subprocess.run([
            "yt-dlp",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--sub-format", "vtt",
            "--skip-download",
            "--output", str(out_path),
            url
        ], capture_output=True, text=True, timeout=60)
        
        # Find the .vtt file
        vtt_files = list(TEMP_DIR.glob(f"{video_id}*.vtt"))
        if not vtt_files:
            return None
        
        # Parse VTT to plain text
        with open(vtt_files[0], "r") as f:
            content = f.read()
        
        # Strip VTT formatting
        lines = content.split("\n")
        text_lines = []
        for line in lines:
            line = line.strip()
            if not line or line.startswith("WEBVTT") or line.startswith("NOTE") or "-->" in line or re.match(r"^\d+$", line):
                continue
            # Strip HTML tags
            line = re.sub(r"<[^>]+>", "", line)
            if line:
                text_lines.append(line)
        
        # Deduplicate consecutive identical lines (VTT often repeats)
        deduped = []
        prev = None
        for line in text_lines:
            if line != prev:
                deduped.append(line)
                prev = line
        
        # Clean up temp files
        for f in vtt_files:
            f.unlink()
        
        return " ".join(deduped)
    
    except Exception as e:
        print(f"  ⚠️  yt-dlp error: {e}")
        return None


def summarise_with_ollama(transcript: str, model: str) -> str:
    """Send transcript to local Ollama for summarisation"""
    prompt = SUMMARY_PROMPT.format(transcript=transcript[:15000])  # cap at ~15k chars
    
    try:
        result = subprocess.run([
            "ollama", "run", model,
            prompt
        ], capture_output=True, text=True, timeout=300)
        
        output = result.stdout.strip()
        # Strip DeepSeek R1 thinking tags if present
        output = re.sub(r"<think>.*?</think>", "", output, flags=re.DOTALL).strip()
        return output
    
    except subprocess.TimeoutExpired:
        return "ERROR: Ollama timed out (5min limit)"
    except Exception as e:
        return f"ERROR: {e}"


def extract_video_id(url: str) -> str:
    """Extract YouTube video ID from URL"""
    patterns = [
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"v=([a-zA-Z0-9_-]{11})",
        r"embed/([a-zA-Z0-9_-]{11})"
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return url.split("/")[-1][:11]


def process_url(url: str, model: str, output_dir: Path) -> dict:
    """Process a single YouTube URL"""
    url = url.strip()
    if not url or url.startswith("#"):
        return None
    
    video_id = extract_video_id(url)
    out_file = output_dir / f"{video_id}.md"
    
    if out_file.exists():
        print(f"  ✅ Already processed: {video_id}")
        return {"status": "skipped", "id": video_id}
    
    print(f"\n📹 Processing: {url}")
    print(f"   Video ID: {video_id}")
    
    # Get transcript
    print(f"   Fetching transcript...")
    transcript = get_transcript_yt_dlp(url, video_id)
    
    if not transcript:
        print(f"   ❌ No transcript available")
        return {"status": "failed", "id": video_id, "reason": "no transcript"}
    
    print(f"   ✅ Transcript: {len(transcript)} chars")
    print(f"   🤖 Summarising with {model}...")
    
    summary = summarise_with_ollama(transcript, model)
    
    # Write output
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        f.write(f"# YouTube Summary: {video_id}\n\n")
        f.write(f"**URL:** {url}\n")
        f.write(f"**Processed:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"**Model:** {model}\n\n")
        f.write("---\n\n")
        f.write(summary)
        f.write("\n")
    
    print(f"   ✅ Saved to {out_file}")
    return {"status": "done", "id": video_id, "file": str(out_file)}


def main():
    import argparse
    parser = argparse.ArgumentParser(description="YouTube Local Pipeline")
    parser.add_argument("--urls", help="File with one URL per line")
    parser.add_argument("--url", help="Single URL to process")
    parser.add_argument("--model", default=OLLAMA_MODEL, help="Ollama model to use")
    parser.add_argument("--output", default=str(OUTPUT_DIR), help="Output directory")
    args = parser.parse_args()
    
    output_dir = Path(args.output)
    model = args.model
    
    urls = []
    if args.url:
        urls = [args.url]
    elif args.urls:
        with open(args.urls) as f:
            urls = [u.strip() for u in f if u.strip() and not u.startswith("#")]
    else:
        print("Usage: youtube-pipeline.py --url <url> OR --urls <file>")
        sys.exit(1)
    
    print(f"🚀 YouTube Local Pipeline")
    print(f"   Model: {model}")
    print(f"   URLs: {len(urls)}")
    print(f"   Output: {output_dir}")
    
    results = {"done": 0, "skipped": 0, "failed": 0}
    
    for url in urls:
        result = process_url(url, model, output_dir)
        if result:
            results[result["status"]] = results.get(result["status"], 0) + 1
    
    print(f"\n✅ Done — {results['done']} processed, {results['skipped']} skipped, {results['failed']} failed")


if __name__ == "__main__":
    main()
