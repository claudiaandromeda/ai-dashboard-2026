#!/usr/bin/env python3
"""
Batch-generate Euro 2024 player avatars via Nano Banana 2.

Generates stylised fictional player illustrations (not real likenesses)
and saves them to public/avatars/.
"""

import sys
import time
from pathlib import Path

# Allow importing sibling module
sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_avatar_nb2 import generate_avatar_nb2

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AVATARS_DIR = PROJECT_ROOT / "public" / "avatars"

PLAYERS = [
    ("Florian Wirtz",       "Germany",      "#000000", "17", "Midfielder"),
    ("Jamal Musiala",       "Germany",      "#000000", "10", "Midfielder"),
    ("Lamine Yamal",        "Spain",        "#AA151B", "19", "Winger"),
    ("Nico Williams",       "Spain",        "#AA151B", "11", "Winger"),
    ("Harry Kane",          "England",      "#FFFFFF", "9",  "Forward"),
    ("Jude Bellingham",     "England",      "#FFFFFF", "10", "Midfielder"),
    ("Kylian Mbappé",       "France",       "#002654", "10", "Forward"),
    ("Cristiano Ronaldo",   "Portugal",     "#006600", "7",  "Forward"),
    ("Cody Gakpo",          "Netherlands",  "#FF6600", "11", "Forward"),
    ("Georges Mikautadze",  "Georgia",      "#FF0000", "22", "Forward"),
]


def slugify(name: str) -> str:
    return name.lower().replace(" ", "_").replace("é", "e")


def main() -> None:
    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    total = len(PLAYERS)
    succeeded = 0
    failed = []

    print(f"=== Batch Avatar Generation — {total} Euro 2024 players ===\n")

    for i, (name, team, color, number, position) in enumerate(PLAYERS, 1):
        slug = slugify(name)
        out_path = AVATARS_DIR / f"{slug}.png"
        print(f"[{i}/{total}] {name} ({team} #{number})")

        try:
            generate_avatar_nb2(name, team, color, number, position, str(out_path))
            succeeded += 1
            print(f"  -> OK\n")
        except Exception as e:
            print(f"  -> FAILED: {e}\n")
            failed.append(name)

        # Small delay between API calls to be polite
        if i < total:
            time.sleep(2)

    print(f"=== Done: {succeeded}/{total} avatars generated ===")
    if failed:
        print(f"Failed: {', '.join(failed)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
