#!/usr/bin/env python3
"""
Generate a stylized player avatar using Gemini Image API (gemini-2.0-flash).

Usage:
  python scripts/generate_avatar.py <photo_path_or_url> <output_path>

Environment:
  GOOGLE_API_KEY — required, loaded from ~/.openclaw/.env if present.

Examples:
  python scripts/generate_avatar.py photos/mbappe.jpg avatars/mbappe_avatar.png
  python scripts/generate_avatar.py https://example.com/player.jpg out.png
"""

import io
import os
import sys
import urllib.request
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

AVATAR_PROMPT = """\
Generate a stylized illustrated avatar of this person for a sports \
merchandise platform called EmotivX.

Style requirements:
- Cartoon/illustrated style, NOT photorealistic
- Clean lines, vibrant colours
- Player should be wearing a red football kit
- White/transparent background
- Chest-up portrait, slight 3/4 angle
- Friendly expression, looking at camera
- Consistent with a premium sports brand aesthetic
- Similar to FIFA/EA Sports stylized player cards

Keep the person's facial features recognizable but in illustrated style."""


def _fetch_image_bytes(source: str) -> bytes:
    """Return raw bytes from a local path or URL."""
    if source.startswith(("http://", "https://")):
        req = urllib.request.Request(source, headers={"User-Agent": "EmotivX-Avatar/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Photo not found: {source}")
    return path.read_bytes()


def generate_avatar(photo_source: str, output_path: str, prompt: str | None = None) -> Path:
    """Generate a single avatar and save it to *output_path*.

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

    # Load photo
    photo_bytes = _fetch_image_bytes(photo_source)
    image_part = types.Part.from_bytes(data=photo_bytes, mime_type="image/jpeg")

    prompt_text = prompt or AVATAR_PROMPT

    print(f"  Sending to Gemini ({len(photo_bytes):,} bytes)...")
    response = client.models.generate_content(
        model="gemini-2.0-flash-preview-image-generation",
        contents=[image_part, prompt_text],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    # Extract generated image from response
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)

    saved = False
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            out.write_bytes(part.inline_data.data)
            saved = True
            print(f"  Saved avatar -> {out}")
            break
        if part.text:
            print(f"  Model note: {part.text[:200]}")

    if not saved:
        raise RuntimeError("Gemini returned no image data. Check the prompt or photo.")

    return out


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__.strip())
        sys.exit(1)

    photo_source = sys.argv[1]
    output_path = sys.argv[2]

    print(f"Generating avatar for: {photo_source}")
    generate_avatar(photo_source, output_path)
    print("Done.")


if __name__ == "__main__":
    main()
