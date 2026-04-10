#!/usr/bin/env python3
"""
Nano Banana 2 — Generate premium player card avatars using Gemini 3.1 Flash Image.

Model: models/gemini-3.1-flash-image-preview

Usage:
  python scripts/generate_avatar_nb2.py <player_name> <team_name> <primary_color_hex> <jersey_number> <position> [output_path]

Examples:
  python scripts/generate_avatar_nb2.py "Phil Foden" "England" "#FFFFFF" "47" "Midfielder"
  python scripts/generate_avatar_nb2.py "Paul Mullin" "Wrexham AFC" "#E4002B" "7" "Forward" /tmp/mullin.png

Environment:
  GOOGLE_API_KEY — required, loaded from ~/.openclaw/.env if present.
"""

import os
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# ENV: load key from ~/.openclaw/.env if not already set
# ---------------------------------------------------------------------------
_ENV_FILE = Path.home() / ".openclaw" / ".env"


def _load_env() -> None:
    if os.environ.get("GOOGLE_API_KEY"):
        return
    if _ENV_FILE.exists():
        for line in _ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            val = val.strip().strip("'\"")
            os.environ.setdefault(key.strip(), val)


_load_env()

MODEL = "models/gemini-3.1-flash-image-preview"


def _build_prompt(
    player_name: str,
    team_name: str,
    primary_color: str,
    jersey_number: str,
    position: str,
) -> str:
    return f"""\
Generate a stylised digital illustration of a fictional football player for a premium sports collectible card.

Character brief:
- A fictional {position.lower()} wearing a football kit in {primary_color} as the dominant colour
- Jersey number {jersey_number} visible on the shirt
- The character should look heroic, powerful, and iconic — NOT a real person

Style requirements:
- Dark background ({primary_color} tinted gradient, moody, premium feel)
- Dramatic cinematic lighting with rim light and {primary_color} colour accent
- Semi-realistic digital painting style — like concept art or FIFA card illustration
- Chest-up portrait, slight 3/4 angle, powerful confident pose
- High detail on the kit and lighting, stylised/painterly face (not photorealistic)
- Square format, clean composition
- No text, no borders, no card frames — just the character on the styled background
- Premium collectible feel — this goes on merchandise
"""


def generate_avatar_nb2(
    player_name: str,
    team_name: str,
    primary_color: str,
    jersey_number: str,
    position: str,
    output_path: str | None = None,
) -> Path:
    """Generate a player card avatar and save it as PNG.

    Returns the Path of the saved image.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("Missing dependency: pip install google-genai")

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        sys.exit("GOOGLE_API_KEY not set. Export it or add to ~/.openclaw/.env")

    client = genai.Client(api_key=api_key)

    prompt = _build_prompt(player_name, team_name, primary_color, jersey_number, position)

    # Default output path
    if not output_path:
        safe_name = player_name.lower().replace(" ", "_")
        output_path = f"/tmp/{safe_name}_avatar.png"

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    print(f"  Generating avatar for {player_name} ({team_name} #{jersey_number})...")
    print(f"  Model: {MODEL}")

    response = client.models.generate_content(
        model=MODEL,
        contents=[prompt],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    saved = False
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            out.write_bytes(part.inline_data.data)
            saved = True
            print(f"  Saved avatar -> {out} ({len(part.inline_data.data):,} bytes)")
            break
        if part.text:
            print(f"  Model note: {part.text[:200]}")

    if not saved:
        raise RuntimeError("Gemini returned no image data. Check the prompt or model availability.")

    return out


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) < 6:
        print(__doc__.strip())
        sys.exit(1)

    player_name = sys.argv[1]
    team_name = sys.argv[2]
    primary_color = sys.argv[3]
    jersey_number = sys.argv[4]
    position = sys.argv[5]
    output_path = sys.argv[6] if len(sys.argv) > 6 else None

    print(f"Nano Banana 2 — Avatar Generation")
    print(f"  Player: {player_name}")
    print(f"  Team: {team_name} ({primary_color})")
    print(f"  Jersey: #{jersey_number} | Position: {position}")

    result = generate_avatar_nb2(
        player_name, team_name, primary_color, jersey_number, position, output_path
    )
    print(f"Done. Avatar saved to: {result}")


if __name__ == "__main__":
    main()
