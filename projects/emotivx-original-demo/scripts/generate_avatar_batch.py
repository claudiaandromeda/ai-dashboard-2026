#!/usr/bin/env python3
"""
Batch-generate stylized player avatars via Gemini Image API.

Usage:
  python scripts/generate_avatar_batch.py <players.json> [output_dir]

Input JSON format (array of objects):
  [
    {
      "name": "Jude Bellingham",
      "photo_url": "https://...",
      "team": "England",
      "jersey_number": 10
    },
    ...
  ]

Output files are saved as: {output_dir}/{team}_{jersey}_{name}.png

Features:
  - Rate limiting (1 request per 2 seconds)
  - Resume: skips players whose output file already exists
  - Progress bar via tqdm if installed, else plain print

Environment:
  GOOGLE_API_KEY — required, loaded from ~/.openclaw/.env if present.
"""

import json
import os
import re
import sys
import time
from pathlib import Path

# Reuse the single-avatar generator
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_avatar import generate_avatar, _load_env

_load_env()

RATE_LIMIT_SECONDS = 2.0


def _slugify(text: str) -> str:
    """Convert a string to a safe filename component."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")


def _make_filename(player: dict) -> str:
    team = _slugify(player.get("team", "unknown"))
    jersey = str(player.get("jersey_number", "00"))
    name = _slugify(player["name"])
    return f"{team}_{jersey}_{name}.png"


def batch_generate(players_json: str, output_dir: str) -> None:
    players_path = Path(players_json)
    if not players_path.exists():
        sys.exit(f"Players file not found: {players_json}")

    players = json.loads(players_path.read_text())
    if not isinstance(players, list):
        sys.exit("Expected a JSON array of player objects.")

    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    total = len(players)
    print(f"Batch: {total} players -> {out}/\n")

    # Try tqdm for a nice progress bar
    try:
        from tqdm import tqdm
        iterator = tqdm(enumerate(players), total=total, desc="Avatars")
    except ImportError:
        iterator = enumerate(players)

    succeeded = 0
    skipped = 0
    failed = 0

    for i, player in iterator:
        name = player.get("name", f"player_{i}")
        filename = _make_filename(player)
        dest = out / filename

        # Resume: skip existing
        if dest.exists():
            skipped += 1
            print(f"  [{i+1}/{total}] SKIP (exists): {filename}")
            continue

        photo = player.get("photo_url") or player.get("photo_path")
        if not photo:
            failed += 1
            print(f"  [{i+1}/{total}] SKIP (no photo): {name}")
            continue

        print(f"  [{i+1}/{total}] Generating: {name}")
        try:
            generate_avatar(photo, str(dest))
            succeeded += 1
        except Exception as exc:
            failed += 1
            print(f"  [{i+1}/{total}] FAILED: {name} — {exc}")

        # Rate limit — wait before next request
        if i < total - 1:
            time.sleep(RATE_LIMIT_SECONDS)

    print(f"\nDone: {succeeded} generated, {skipped} skipped, {failed} failed")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__.strip())
        sys.exit(1)

    players_json = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data/avatar-test/output"

    batch_generate(players_json, output_dir)


if __name__ == "__main__":
    main()
