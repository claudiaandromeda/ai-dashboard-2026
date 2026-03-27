"""
EmotivX Art Generation Server
Runs on Claudia (Mac mini), exposed via Cloudflare Tunnel.
Vercel calls this instead of spawning Python directly.
"""

import sys
import os
import uuid
import json as json_mod
import math
import tempfile
import traceback
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client

# Add art_engine to path
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

app = FastAPI(title="EmotivX Art Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://emotivx-app-1.vercel.app", "http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Load env
from dotenv import load_dotenv
load_dotenv(ROOT.parent.parent / ".openclaw" / ".env")
load_dotenv(ROOT / ".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")


class KitPalette(BaseModel):
    primary:    str = "#DA291C"
    secondary:  str = "#FFFFFF"
    accent:     str = "#C9A84C"   # antique gold
    background: str = "#0A0A0A"

class GenerateRequest(BaseModel):
    matchId: int
    goalIndex: int = 0
    style: str = "classic-home"
    bgDetail: float = 50
    dataDetail: float = 50
    bloom: float = 50
    intensity: float = 50
    dataScale: float = 50
    edgeVisibility: float = 50
    width: int = 1024
    # Kit palette — pass full palette or fall back to teamColour
    kitPalette: Optional[KitPalette] = None
    # Background pattern colours (ordered; index 0 = first bg accent after primary)
    extraColours: Optional[list[str]] = None
    # Data line colours — independent of background; auto-computed if absent
    dataPrimary:   Optional[str] = None   # main data line hue; defaults to luminance-opposite
    dataSecondary: Optional[str] = None   # secondary data hue
    dataAccent:    Optional[str] = None   # accent data hue
    # Logo + player branding (baked into texture)
    logoUrl: Optional[str] = None
    teamColour: str = "#DA291C"   # legacy fallback; prefer kitPalette.primary
    playerName: Optional[str] = None
    playerNumber: Optional[int] = None
    includeBadge: bool = False
    badgeData: Optional[dict] = None  # {scorerName, minute, homeTeam, awayTeam, matchDate}
    lineEffect: str = "default"  # default|laser|flame|lightning|ink|spray
    auraColour: Optional[str] = None  # separate glow/aura colour hex
    universalIntensity: float = 50  # universal intensity for all effects
    brightness: float = 50  # overall brightness of data line rendering
    linkTransforms: bool = True  # link background + data transforms
    view: str = "front"  # "front" or "back"


class OverlayRequest(BaseModel):
    logoUrl: Optional[str] = None
    teamColour: str = "#DA291C"
    kitPalette: Optional[KitPalette] = None
    playerName: Optional[str] = None
    playerNumber: Optional[int] = None
    includeBadge: bool = False
    badgeData: Optional[dict] = None
    view: str = "front"
    width: int = 2048


class GenerateResponse(BaseModel):
    imageData: str  # base64 PNG — Vercel uploads to Supabase
    style: str


def _hex_to_rgb(hex_colour: str) -> tuple:
    """Convert '#RRGGBB' to (R, G, B)."""
    h = hex_colour.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def _composite_logo(image: "Image", logo_url: str, team_colour: str) -> "Image":
    """Download team logo and composite it onto the image at left-chest position."""
    from PIL import Image as PILImage, ImageFilter
    import urllib.request
    import io

    try:
        with urllib.request.urlopen(logo_url, timeout=10) as resp:
            logo_data = resp.read()
        logo = PILImage.open(io.BytesIO(logo_data)).convert("RGBA")
    except Exception as e:
        print(f"[Logo] Failed to download logo: {e}")
        return image

    w, h = image.size
    target_size = int(w * 0.13)  # Smaller — was 20%, now 13%

    # Resize logo maintaining aspect ratio
    logo_w, logo_h = logo.size
    scale = target_size / max(logo_w, logo_h)
    new_w = int(logo_w * scale)
    new_h = int(logo_h * scale)
    logo = logo.resize((new_w, new_h), PILImage.LANCZOS)
    # Flip vertically — UV V-axis is inverted at the chest position on this model
    logo = logo.transpose(PILImage.FLIP_TOP_BOTTOM)

    # Position: left chest — UV maps to ~48% from left, 76% from top on this hoodie model
    # Smaller (14% not 20%) and shifted down/left per feedback
    pos_x = int(w * 0.48) - new_w // 2
    pos_y = int(h * 0.76) - new_h // 2

    # Drop shadow: create dark copy from alpha channel, blur, then composite
    # Split into channels, build shadow from alpha
    r_ch, g_ch, b_ch, a_ch = logo.split()
    shadow_alpha = a_ch.point(lambda p: min(p, 120))
    shadow = PILImage.merge("RGBA", (
        a_ch.point(lambda _: 0),
        a_ch.point(lambda _: 0),
        a_ch.point(lambda _: 0),
        shadow_alpha,
    ))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=4))
    image.paste(shadow, (pos_x + 4, pos_y + 4), shadow)

    # Paste the logo itself
    image.paste(logo, (pos_x, pos_y), logo)

    return image


def _render_player_back(image: "Image", player_name: str, player_number: int, team_colour: str) -> "Image":
    """Render player name and number onto the back of the garment texture."""
    from PIL import Image as PILImage, ImageDraw, ImageFont, ImageFilter

    w, h = image.size
    overlay = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    rgb = _hex_to_rgb(team_colour)

    # Try to find a bold/impact font
    number_size = int(w * 0.28)
    name_size = int(w * 0.055)
    font_number = None
    font_name = None
    for font_path in [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            font_number = ImageFont.truetype(font_path, number_size)
            font_name = ImageFont.truetype(font_path, name_size)
            break
        except Exception:
            continue
    if font_number is None:
        font_number = ImageFont.load_default()
        font_name = ImageFont.load_default()

    # Number: centred, upper third
    num_text = str(player_number)
    num_bbox = draw.textbbox((0, 0), num_text, font=font_number)
    num_w = num_bbox[2] - num_bbox[0]
    num_h = num_bbox[3] - num_bbox[1]
    num_x = (w - num_w) // 2
    num_y = int(h * 0.22)

    # Glow effect: draw in team colour, blur, then overlay
    glow_layer = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.text((num_x, num_y), num_text, fill=(*rgb, 180), font=font_number)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=int(w * 0.015)))
    overlay = PILImage.alpha_composite(overlay, glow_layer)

    # Draw number in white
    draw = ImageDraw.Draw(overlay)
    # Dark outline for readability
    for dx in (-3, 0, 3):
        for dy in (-3, 0, 3):
            if dx or dy:
                draw.text((num_x + dx, num_y + dy), num_text, fill=(0, 0, 0, 200), font=font_number)
    draw.text((num_x, num_y), num_text, fill=(255, 255, 255, 255), font=font_number)

    # Name: centred, above the number
    name_text = player_name.upper()
    name_bbox = draw.textbbox((0, 0), name_text, font=font_name)
    name_w = name_bbox[2] - name_bbox[0]
    name_x = (w - name_w) // 2
    name_y = num_y - int(name_size * 1.4)

    # Name glow
    name_glow = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    ng_draw = ImageDraw.Draw(name_glow)
    ng_draw.text((name_x, name_y), name_text, fill=(*rgb, 140), font=font_name)
    name_glow = name_glow.filter(ImageFilter.GaussianBlur(radius=int(w * 0.008)))
    overlay = PILImage.alpha_composite(overlay, name_glow)

    draw = ImageDraw.Draw(overlay)
    for dx in (-2, 0, 2):
        for dy in (-2, 0, 2):
            if dx or dy:
                draw.text((name_x + dx, name_y + dy), name_text, fill=(0, 0, 0, 200), font=font_name)
    draw.text((name_x, name_y), name_text, fill=(255, 255, 255, 255), font=font_name)

    image = PILImage.alpha_composite(image.convert("RGBA"), overlay)
    return image


def _render_moment_badge(image: "Image", badge_data: dict, team_colour: str,
                         accent_colour: str = "#C9A84C") -> "Image":
    """
    Moment badge — mirrors the UI EditionCard design, print-ready.

    Layout:
    ┌──[●]──────────────────────────────[51']─┐
    │  J        J. WINDASS                GOAL │
    │WREXHAM    #10                            │
    │           WREXHAM 3 – 2 SHEFFIELD UTD    │
    │           51TH MINUTE                    │
    │                  "Officially certified"  │
    └─────────────────────────────────────────┘
    Corner rivets, dark panel, metallic border, gold accents.
    ~38% canvas width. All sizes scale for 6000px print output.
    """
    import math
    from PIL import Image as PILImage, ImageDraw, ImageFont, ImageFilter

    w, h    = image.size
    acc_rgb = _hex_to_rgb(accent_colour)
    rgb     = _hex_to_rgb(team_colour)

    # ── Dimensions ───────────────────────────────────────────────────
    badge_w  = int(w * 0.40)          # 40% canvas width
    pad_x    = int(badge_w * 0.055)
    pad_y    = int(badge_w * 0.058)

    # Left column (minute + GOAL pill) — narrow so right col has full room
    left_col_w = int(badge_w * 0.18)
    col_gap    = int(badge_w * 0.030)
    # Right column — remaining space
    right_col_x = pad_x + left_col_w + col_gap
    right_col_w = badge_w - right_col_x - pad_x

    # Font sizes — right col sized to right_col_w
    sz_name    = max(36,  int(right_col_w * 0.20))   # J. WINDASS
    sz_sub     = max(18,  int(right_col_w * 0.115))  # #10
    sz_match   = max(13,  int(right_col_w * 0.060))  # matchup — compact to fit full names
    sz_minute_label = max(12, int(right_col_w * 0.055))  # 80TH MINUTE
    sz_number  = max(52,  int(left_col_w  * 0.68))   # big "80'" — larger
    sz_goal    = max(14,  int(left_col_w  * 0.22))   # "GOAL" pill text — larger
    sz_tiny    = max(12,  int(badge_w     * 0.028))  # tagline

    font_name = font_sub = font_match = font_min_lbl = font_number = font_goal = font_tiny = None
    for fp in [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]:
        try:
            font_name    = ImageFont.truetype(fp, sz_name)
            font_sub     = ImageFont.truetype(fp, sz_sub)
            font_match   = ImageFont.truetype(fp, sz_match)
            font_min_lbl = ImageFont.truetype(fp, sz_minute_label)
            font_number  = ImageFont.truetype(fp, sz_number)
            font_goal    = ImageFont.truetype(fp, sz_goal)
            font_tiny    = ImageFont.truetype(fp, sz_tiny)
            break
        except Exception:
            continue
    if font_name is None:
        font_name = font_sub = font_match = font_min_lbl = font_number = font_goal = font_tiny = ImageFont.load_default()

    # ── Data ─────────────────────────────────────────────────────────
    raw_name    = badge_data.get("scorerName", "Unknown")
    minute      = str(badge_data.get("minute", ""))
    home_team   = badge_data.get("homeTeam", "")
    away_team   = badge_data.get("awayTeam", "")
    match_date  = str(badge_data.get("matchDate", ""))
    jersey      = str(badge_data.get("scorerNumber", ""))
    home_score  = badge_data.get("homeScore", "")
    away_score  = badge_data.get("awayScore", "")

    # Format name: "R. Longman" → "R. LONGMAN"  /  "Josh Windass" → "J. WINDASS"
    parts = raw_name.strip().split()
    if len(parts) >= 2:
        initial   = parts[0][0].upper() + "."
        surname   = " ".join(parts[1:]).upper()
        disp_name = f"{initial} {surname}"
    else:
        disp_name = raw_name.upper()

    # Smart abbreviation — preserves distinguishing info (SHEFFIELD UTD vs WED)
    def _abbrev(name: str) -> str:
        n = name.strip().upper()
        n = n.replace("UNITED", "UTD").replace("WEDNESDAY", "WED").replace("ATHLETIC", "ATH").replace("WANDERERS", "WAN")
        return n

    ht = _abbrev(home_team)
    at = _abbrev(away_team)
    if home_score != "" and away_score != "":
        matchup = f"{ht}  {home_score} – {away_score}  {at}"
    else:
        matchup = f"{ht}  vs  {at}"

    # "51TH MINUTE"  (handle 11th/12th/13th)
    try:
        mn = int(minute)
        sfx = {1:"ST",2:"ND",3:"RD"}.get(mn % 10 if mn % 100 not in (11,12,13) else 0, "TH")
        minute_label = f"{mn}{sfx} MINUTE"
    except Exception:
        minute_label = f"{minute} MINUTE" if minute else ""

    # ── Badge height — calculated from content ────────────────────────
    # Badge height: enough for right-col text stack + tagline
    content_h = (sz_name + int(sz_sub * 0.30) + sz_sub +
                 int(sz_sub * 0.40) + sz_match +
                 int(sz_sub * 0.30) + sz_minute_label +
                 int(sz_sub * 0.50) + sz_tiny)
    badge_h = content_h + pad_y * 2
    # Also tall enough for left col: big number + pill
    min_left_h = sz_number + int(sz_goal * 0.40) + sz_goal + pad_y * 2
    badge_h = max(badge_h, min_left_h)

    # ── Position: lower-right pocket area ────────────────────────────
    badge_x = int(w * 0.58)
    badge_y = int(h * 0.64)
    if badge_x + badge_w > w - int(w * 0.015):
        badge_x = w - badge_w - int(w * 0.015)
    if badge_y + badge_h > h - int(h * 0.015):
        badge_y = h - badge_h - int(h * 0.015)

    # ── Draw panel ───────────────────────────────────────────────────
    overlay = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    bg      = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    bd      = ImageDraw.Draw(bg)
    corner_r = int(badge_w * 0.04)
    bw = max(3, int(w * 0.0025))

    # Outer glow
    for i in range(4, 0, -1):
        bd.rounded_rectangle(
            [badge_x-i, badge_y-i, badge_x+badge_w+i, badge_y+badge_h+i],
            radius=corner_r+i, fill=(*acc_rgb, 18))

    # Panel body — dark charcoal
    bd.rounded_rectangle(
        [badge_x, badge_y, badge_x+badge_w, badge_y+badge_h],
        radius=corner_r, fill=(18, 18, 20, 235))

    # Outer metallic border (accent gold)
    bd.rounded_rectangle(
        [badge_x, badge_y, badge_x+badge_w, badge_y+badge_h],
        radius=corner_r, outline=(*acc_rgb, 180), width=bw)

    # Inner inset border (subtle)
    bd.rounded_rectangle(
        [badge_x+bw*2, badge_y+bw*2, badge_x+badge_w-bw*2, badge_y+badge_h-bw*2],
        radius=max(2, corner_r-bw*2), outline=(80, 75, 55, 100), width=max(1, bw//2))

    # Corner rivets — 4 circles
    rivet_r = max(4, int(w * 0.004))
    rivet_off = int(badge_w * 0.035)
    for rx, ry in [
        (badge_x + rivet_off, badge_y + rivet_off),
        (badge_x + badge_w - rivet_off, badge_y + rivet_off),
        (badge_x + rivet_off, badge_y + badge_h - rivet_off),
        (badge_x + badge_w - rivet_off, badge_y + badge_h - rivet_off),
    ]:
        bd.ellipse([rx-rivet_r, ry-rivet_r, rx+rivet_r, ry+rivet_r],
                   fill=(40, 38, 30, 255), outline=(*acc_rgb, 140), width=max(1, bw//2))

    overlay = PILImage.alpha_composite(overlay, bg)
    draw    = ImageDraw.Draw(overlay)

    # ── Left column: big minute number + GOAL pill (vertically centred) ─
    left_cx = badge_x + pad_x + left_col_w // 2

    min_str = f"{minute}'" if minute else ""
    if min_str:
        mb  = draw.textbbox((0, 0), min_str, font=font_number)
        mw  = mb[2] - mb[0]
        mh  = mb[3] - mb[1]
    else:
        mw = mh = 0

    # Measure GOAL text with bearing offsets — essential for true centering
    gb       = draw.textbbox((0, 0), "GOAL", font=font_goal)
    g_left, g_top, g_right, g_bot = gb
    gw = g_right - g_left   # visual width
    gh = g_bot   - g_top    # visual height

    pill_pad_x = max(10, int(sz_goal * 0.70))
    pill_pad_y = max(8,  int(sz_goal * 0.55))
    pill_w   = gw + pill_pad_x * 2
    pill_h   = gh + pill_pad_y * 2
    gap_num_pill = int(sz_goal * 0.9)

    block_h  = mh + gap_num_pill + pill_h
    block_y  = badge_y + (badge_h - block_h) // 2

    if min_str:
        # Centre the 80' number in left col accounting for its bearing too
        nb = draw.textbbox((0, 0), min_str, font=font_number)
        draw.text((left_cx - (nb[2]-nb[0])//2 - nb[0],
                   block_y - nb[1]),
                  min_str, fill=(*acc_rgb, 245), font=font_number)

    pill_x = left_cx - pill_w // 2
    pill_y = block_y + mh + gap_num_pill
    draw.rounded_rectangle(
        [pill_x, pill_y, pill_x + pill_w, pill_y + pill_h],
        radius=max(4, int(pill_h * 0.28)),
        fill=(30, 28, 18, 240), outline=(*acc_rgb, 210), width=max(2, bw))
    # Draw text: offset by bearing so it's visually centred in the box
    draw.text((pill_x + pill_pad_x - g_left,
               pill_y + pill_pad_y - g_top),
              "GOAL", fill=(*acc_rgb, 245), font=font_goal)

    # ── Vertical divider between columns ─────────────────────────────
    div_x = badge_x + pad_x + left_col_w + col_gap // 2
    draw.rectangle(
        [div_x, badge_y + pad_y, div_x + max(1, bw//2), badge_y + badge_h - pad_y],
        fill=(*acc_rgb, 60))

    # ── Right column: name, number, matchup, minute label ────────────
    cx = badge_x + right_col_x
    cy = badge_y + pad_y

    # Player name
    draw.text((cx, cy), disp_name, fill=(235, 232, 220, 255), font=font_name)
    cy += sz_name + int(sz_sub * 0.30)

    # Jersey number
    if jersey:
        draw.text((cx, cy), f"#{jersey}", fill=(*acc_rgb, 210), font=font_sub)
        cy += sz_sub + int(sz_sub * 0.40)

    # Matchup
    draw.text((cx, cy), matchup, fill=(190, 185, 155, 220), font=font_match)
    cy += sz_match + int(sz_sub * 0.30)

    # Minute label
    if minute_label:
        draw.text((cx, cy), minute_label, fill=(150, 145, 110, 210), font=font_min_lbl)

    # ── Tagline — centred, hugging the very bottom edge ──────────────
    tagline = "Officially certified moment  ·  emotivx.com"
    tb    = draw.textbbox((0, 0), tagline, font=font_tiny)
    tag_w = tb[2] - tb[0]
    tag_y = badge_y + badge_h - int(pad_y * 0.55) - sz_tiny
    draw.text((badge_x + (badge_w - tag_w) // 2, tag_y),
              tagline, fill=(90, 85, 60, 155), font=font_tiny)

    image = PILImage.alpha_composite(image.convert("RGBA"), overlay)
    return image


@app.get("/health")
def health():
    return {"status": "ok", "service": "EmotivX Art Engine"}

@app.get("/styles")
def list_styles():
    """Return all available art styles with display names."""
    return {
        "styles": [
            {"id": "geometric",   "label": "Geometric",    "description": "Bold shapes, hard edges, Bauhaus energy"},
            {"id": "camo",        "label": "Camo",         "description": "Military pattern remixed in team colours"},
            {"id": "futuristic",  "label": "Futuristic",   "description": "Neon data lines, sci-fi aesthetic"},
            {"id": "street",      "label": "Street",       "description": "Graffiti-inspired, raw urban texture"},
            {"id": "classic",     "label": "Classic",      "description": "Clean, timeless — suits any kit"},
            {"id": "jackson",     "label": "Jackson",      "description": "Action painting — chaotic, expressive"},
            {"id": "marble",      "label": "Marble",       "description": "Luxury marble with team colour veining"},
            {"id": "smoky",       "label": "Smoky",        "description": "Atmospheric haze, moody and dark"},
            {"id": "dali",        "label": "Surreal",      "description": "Dreamlike distortion of the match data"},
        ]
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest):
    try:
        import json as json_mod
        import importlib.util, sys as _sys

        # Create temp output path first
        tmp_file = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp_file.name
        tmp_file.close()

        # Resolve palette — kitPalette takes priority over legacy teamColour
        palette = req.kitPalette or KitPalette(primary=req.teamColour)

        # Build the param dict the art engine expects
        params = {
            "matchId": req.matchId,
            "momentIndex": req.goalIndex,
            "style": req.style,
            "bgDetail": req.bgDetail,
            "dataDetail": req.dataDetail,
            "bloom": req.bloom,
            "intensity": req.intensity,
            "dataScale": req.dataScale,
            "edgeVisibility": req.edgeVisibility,
            "width": req.width,
            "height": req.width,
            "outputPath": tmp_path,
            # Background palette
            "primary":    palette.primary,
            "secondary":  (req.extraColours[0] if req.extraColours else None) or palette.secondary,
            "accent":     (req.extraColours[1] if req.extraColours and len(req.extraColours) > 1 else None) or palette.accent,
            "background": palette.background,
            "extraColours": req.extraColours or [],
            # Data line palette — api_generate computes luminance-opposite default if absent
            "dataPrimary":   req.dataPrimary,
            "dataSecondary": req.dataSecondary,
            "dataAccent":    req.dataAccent,
            "lineEffect":    req.lineEffect,
            "auraColour":    req.auraColour,
            "universalIntensity": req.universalIntensity,
            "brightness":    req.brightness,
            "linkTransforms": req.linkTransforms,
        }

        import logging; logging.warning(f"[GENERATE] primary={palette.primary} dataPrimary={req.dataPrimary} dataSecondary={req.dataSecondary}")
        # Inject as sys.argv so main() parses it
        _sys.argv = ["api_generate.py", json_mod.dumps(params)]

        # Import and run
        import art_engine.api_generate as _ag
        importlib.reload(_ag)  # fresh run each time
        _ag.main()

        # tmp_path already set above — art engine wrote directly to it

        # Read generated image — logo/badge are now in a separate overlay texture,
        # so the art texture stays clean (no baked-in overlays that tile).
        import base64
        from PIL import Image as PILImage

        image = PILImage.open(tmp_path).convert("RGBA")

        # Save as base64
        image.save(tmp_path, "PNG")
        with open(tmp_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        os.unlink(tmp_path)

        return GenerateResponse(imageData=img_b64, style=req.style)

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Overlay-only endpoint — transparent PNG with logo + badge (no art background)
# ---------------------------------------------------------------------------

def _composite_logo_overlay(image: "Image", logo_url: str, team_colour: str) -> "Image":
    """Download team logo and composite onto transparent overlay — NO vertical flip."""
    from PIL import Image as PILImage, ImageFilter
    import urllib.request
    import io

    try:
        with urllib.request.urlopen(logo_url, timeout=10) as resp:
            logo_data = resp.read()
        logo = PILImage.open(io.BytesIO(logo_data)).convert("RGBA")
    except Exception as e:
        print(f"[Overlay-Logo] Failed to download logo: {e}")
        return image

    w, h = image.size
    target_size = int(w * 0.13)

    logo_w, logo_h = logo.size
    scale = target_size / max(logo_w, logo_h)
    new_w = int(logo_w * scale)
    new_h = int(logo_h * scale)
    logo = logo.resize((new_w, new_h), PILImage.LANCZOS)
    # No flip — the overlay shader reads UVs directly, no inversion

    pos_x = int(w * 0.48) - new_w // 2
    pos_y = int(h * 0.76) - new_h // 2

    # Drop shadow
    r_ch, g_ch, b_ch, a_ch = logo.split()
    shadow_alpha = a_ch.point(lambda p: min(p, 120))
    shadow = PILImage.merge("RGBA", (
        a_ch.point(lambda _: 0),
        a_ch.point(lambda _: 0),
        a_ch.point(lambda _: 0),
        shadow_alpha,
    ))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=4))
    image.paste(shadow, (pos_x + 4, pos_y + 4), shadow)

    image.paste(logo, (pos_x, pos_y), logo)
    return image


def _render_player_back_overlay(image: "Image", player_name: str, player_number: int, team_colour: str) -> "Image":
    """Render player name + number on a transparent overlay for the back view."""
    from PIL import Image as PILImage, ImageDraw, ImageFont, ImageFilter

    w, h = image.size
    overlay = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    rgb = _hex_to_rgb(team_colour)

    number_size = int(w * 0.28)
    name_size = int(w * 0.055)
    font_number = None
    font_name = None
    for font_path in [
        "/System/Library/Fonts/Supplemental/Impact.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]:
        try:
            font_number = ImageFont.truetype(font_path, number_size)
            font_name = ImageFont.truetype(font_path, name_size)
            break
        except Exception:
            continue
    if font_number is None:
        font_number = ImageFont.load_default()
        font_name = ImageFont.load_default()

    num_text = str(player_number)
    num_bbox = draw.textbbox((0, 0), num_text, font=font_number)
    num_w = num_bbox[2] - num_bbox[0]
    num_x = (w - num_w) // 2
    num_y = int(h * 0.22)

    # Glow
    glow_layer = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    glow_draw.text((num_x, num_y), num_text, fill=(*rgb, 180), font=font_number)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=int(w * 0.015)))
    overlay = PILImage.alpha_composite(overlay, glow_layer)

    draw = ImageDraw.Draw(overlay)
    for dx in (-3, 0, 3):
        for dy in (-3, 0, 3):
            if dx or dy:
                draw.text((num_x + dx, num_y + dy), num_text, fill=(0, 0, 0, 200), font=font_number)
    draw.text((num_x, num_y), num_text, fill=(255, 255, 255, 255), font=font_number)

    name_text = player_name.upper()
    name_bbox = draw.textbbox((0, 0), name_text, font=font_name)
    name_w = name_bbox[2] - name_bbox[0]
    name_x = (w - name_w) // 2
    name_y = num_y - int(name_size * 1.4)

    name_glow = PILImage.new("RGBA", (w, h), (0, 0, 0, 0))
    ng_draw = ImageDraw.Draw(name_glow)
    ng_draw.text((name_x, name_y), name_text, fill=(*rgb, 140), font=font_name)
    name_glow = name_glow.filter(ImageFilter.GaussianBlur(radius=int(w * 0.008)))
    overlay = PILImage.alpha_composite(overlay, name_glow)

    draw = ImageDraw.Draw(overlay)
    for dx in (-2, 0, 2):
        for dy in (-2, 0, 2):
            if dx or dy:
                draw.text((name_x + dx, name_y + dy), name_text, fill=(0, 0, 0, 200), font=font_name)
    draw.text((name_x, name_y), name_text, fill=(255, 255, 255, 255), font=font_name)

    image = PILImage.alpha_composite(image, overlay)
    return image


@app.post("/generate-overlay")
async def generate_overlay(req: OverlayRequest):
    """Return a 2048x2048 transparent PNG with ONLY logo + badge (no art background)."""
    try:
        import base64
        from PIL import Image as PILImage

        w = req.width
        image = PILImage.new("RGBA", (w, w), (0, 0, 0, 0))

        if req.view == "front":
            if req.logoUrl:
                image = _composite_logo_overlay(image, req.logoUrl, req.teamColour)
            if req.includeBadge and req.badgeData:
                accent = req.kitPalette.accent if req.kitPalette else "#C9A84C"
                image = _render_moment_badge(image, req.badgeData, req.teamColour, accent)

        if req.view == "back" and (req.playerName or req.playerNumber is not None):
            image = _render_player_back_overlay(
                image,
                req.playerName or "",
                req.playerNumber if req.playerNumber is not None else 0,
                req.teamColour,
            )

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp.name
        tmp.close()
        image.save(tmp_path, "PNG")

        with open(tmp_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        os.unlink(tmp_path)

        return {"imageData": img_b64}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Player Shot Map endpoint
# ---------------------------------------------------------------------------

DATA_DIR = ROOT / "data" / "statsbomb" / "events"
WREXHAM_TEAM_ID = 1557
WREXHAM_RED = (218, 41, 28)  # #DA291C
GOAL_MOUTH_Y_MIN = 36.0  # StatsBomb goal mouth Y range (approx 36-44)
GOAL_MOUTH_Y_MAX = 44.0


class PlayerMapRequest(BaseModel):
    playerName: str
    matchIds: List[int]
    style: str = "classic-home"
    width: int = 2048


class PlayerMapResponse(BaseModel):
    imageData: str
    style: str
    playerName: str
    goals: int
    shots: int


def _load_match(match_id: int) -> dict:
    """Load a StatsBomb 360 match file."""
    path = DATA_DIR / f"{match_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Match {match_id} not found")
    with open(path) as f:
        return json_mod.load(f)


def _find_player(lineups: list, name_query: str) -> Optional[dict]:
    """Case-insensitive partial match on player_name across lineups."""
    q = name_query.lower()
    for p in lineups:
        if q in p.get("player_name", "").lower():
            return p
    return None


def _collect_player_shots(match_data: dict, player_id: int) -> list:
    """Collect all shot events for a player_id."""
    shots = []
    for ev in match_data.get("events", []):
        if ev.get("name") == "shot" and ev.get("player_id") == player_id:
            shots.append({
                "start_x": ev["start_x"],
                "start_y": ev["start_y"],
                "end_x": ev.get("end_x", 120.0),
                "end_y": ev.get("end_y", 40.0),
                "outcome": ev.get("outcome", ""),
                "is_goal": ev.get("outcome") == "goal" or bool(ev.get("goal_for")),
                "xg": ev.get("xg", 0),
            })
    return shots


def _render_player_map(
    player_name: str,
    jersey_number: int,
    shots: list,
    style_name: str,
    width: int,
) -> "Image":
    """Render composite shot map with styled background."""
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    from art_engine.styles import get_style
    from art_engine.styles.base import Palette, DataLine

    height = width
    # Wrexham palette
    palette = Palette(
        primary="#DA291C",
        secondary="#FFFFFF",
        accent="#DA291C",
        background="#0A0A0A",
    )

    # --- Layer 1: Styled background ---
    style = get_style(style_name)
    style.WIDTH = width
    style.HEIGHT = height

    # Build synthetic data_lines from shots for the style background
    data_lines = []
    for i, s in enumerate(shots):
        data_lines.append(DataLine(
            sequence=i,
            label="goal" if s["is_goal"] else "shot",
            actor=player_name,
            team="Wrexham",
            x=s["start_x"] / 120.0,
            y=s["start_y"] / 80.0,
            timestamp="",
            context={},
        ))
    # Add goal mouth point to connect the lines
    if data_lines:
        data_lines.append(DataLine(
            sequence=len(data_lines),
            label="goal",
            actor=player_name,
            team="Wrexham",
            x=1.0,
            y=0.5,
            timestamp="",
            context={},
        ))

    image = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(image, "RGBA")

    style.render_background(draw, image, palette)
    if data_lines:
        style.render_data_lines(draw, image, data_lines, palette)
    image = style.post_process(image, palette)

    # --- Layer 2: Abstract pitch outline ---
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    margin = 0.08
    px_l = int(margin * width)
    px_r = int((1 - margin) * width)
    px_t = int(margin * height)
    px_b = int((1 - margin) * height)
    pitch_line = (255, 255, 255, 30)

    # Pitch outline
    odraw.rectangle([px_l, px_t, px_r, px_b], outline=pitch_line, width=2)
    # Halfway line
    mid_x = (px_l + px_r) // 2
    odraw.line([(mid_x, px_t), (mid_x, px_b)], fill=pitch_line, width=1)
    # Centre circle
    circle_r = int(0.075 * width)
    odraw.ellipse(
        [mid_x - circle_r, (px_t + px_b) // 2 - circle_r,
         mid_x + circle_r, (px_t + px_b) // 2 + circle_r],
        outline=pitch_line, width=1,
    )
    # Penalty area (right side - attacking)
    pen_x = px_r - int(0.15 * (px_r - px_l))
    pen_t = (px_t + px_b) // 2 - int(0.22 * (px_b - px_t))
    pen_b = (px_t + px_b) // 2 + int(0.22 * (px_b - px_t))
    odraw.rectangle([pen_x, pen_t, px_r, pen_b], outline=pitch_line, width=1)
    # Goal line markers
    goal_t = (px_t + px_b) // 2 - int(0.05 * (px_b - px_t))
    goal_b = (px_t + px_b) // 2 + int(0.05 * (px_b - px_t))
    odraw.rectangle([px_r, goal_t, px_r + 6, goal_b], fill=(255, 255, 255, 50))

    image = Image.alpha_composite(image, overlay)

    # --- Helper: pitch coords to pixel ---
    def to_px(sx: float, sy: float) -> tuple:
        nx = sx / 120.0
        ny = sy / 80.0
        px_x = int(margin * width + nx * (1 - 2 * margin) * width)
        px_y = int(margin * height + ny * (1 - 2 * margin) * height)
        return (px_x, px_y)

    # --- Layer 3: Shot lines (from position to goal mouth) ---
    line_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(line_layer)

    for s in shots:
        start = to_px(s["start_x"], s["start_y"])
        end = to_px(s["end_x"], s["end_y"])

        if s["is_goal"]:
            # Bright red line for goals
            for w, a in [(8, 20), (4, 50), (2, 120)]:
                ldraw.line([start, end], fill=(*WREXHAM_RED, a), width=w)
            ldraw.line([start, end], fill=(255, 255, 255, 80), width=1)
        else:
            # Dim white line for non-goal shots
            for w, a in [(4, 10), (2, 25)]:
                ldraw.line([start, end], fill=(255, 255, 255, a), width=w)

    image = Image.alpha_composite(image, line_layer)

    # --- Layer 4: Shot dots ---
    dot_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ddraw = ImageDraw.Draw(dot_layer)

    for s in shots:
        pos = to_px(s["start_x"], s["start_y"])

        if s["is_goal"]:
            # Bright glowing red dot for goals
            for r, a in [(22, 15), (16, 30), (10, 60), (6, 140)]:
                ddraw.ellipse(
                    [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
                    fill=(*WREXHAM_RED, a),
                )
            # White hot centre
            ddraw.ellipse(
                [pos[0] - 3, pos[1] - 3, pos[0] + 3, pos[1] + 3],
                fill=(255, 255, 255, 220),
            )
        else:
            # Dimmer white dot for non-goal shots
            for r, a in [(10, 15), (6, 40), (3, 100)]:
                ddraw.ellipse(
                    [pos[0] - r, pos[1] - r, pos[0] + r, pos[1] + r],
                    fill=(255, 255, 255, a),
                )

    image = Image.alpha_composite(image, dot_layer)

    # --- Layer 5: Text overlay ---
    text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    tdraw = ImageDraw.Draw(text_layer)

    goal_count = sum(1 for s in shots if s["is_goal"])
    shot_count = len(shots)

    # Try to use a decent font, fall back to default
    font_large = None
    font_small = None
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(width * 0.04))
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", int(width * 0.022))
    except Exception:
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(width * 0.04))
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", int(width * 0.022))
        except Exception:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()

    # Player name (top left)
    name_text = player_name.upper()
    text_x = int(margin * width + 20)
    text_y = int(margin * height + 20)

    # Text shadow
    tdraw.text((text_x + 2, text_y + 2), name_text, fill=(0, 0, 0, 180), font=font_large)
    tdraw.text((text_x, text_y), name_text, fill=(255, 255, 255, 240), font=font_large)

    # Jersey number
    if jersey_number:
        num_text = f"#{jersey_number}"
        num_y = text_y + int(width * 0.05)
        tdraw.text((text_x + 2, num_y + 2), num_text, fill=(0, 0, 0, 180), font=font_small)
        tdraw.text((text_x, num_y), num_text, fill=(*WREXHAM_RED, 220), font=font_small)

    # Stats (bottom left)
    stats_y = int((1 - margin) * height - int(width * 0.08))
    stats_text = f"{goal_count} GOALS  /  {shot_count} SHOTS"
    tdraw.text((text_x + 2, stats_y + 2), stats_text, fill=(0, 0, 0, 180), font=font_small)
    tdraw.text((text_x, stats_y), stats_text, fill=(255, 255, 255, 200), font=font_small)

    # "3 MATCHES" subtitle
    sub_y = stats_y + int(width * 0.03)
    match_text = "WREXHAM AFC  ·  PREMIER LEAGUE 2025-26"
    tdraw.text((text_x + 2, sub_y + 2), match_text, fill=(0, 0, 0, 150), font=font_small)
    tdraw.text((text_x, sub_y), match_text, fill=(255, 255, 255, 120), font=font_small)

    image = Image.alpha_composite(image, text_layer)

    return image


@app.post("/generate-player-map", response_model=PlayerMapResponse)
async def generate_player_map(req: PlayerMapRequest):
    try:
        import base64

        # Collect lineups and shots across all matches
        all_lineups = []
        all_shots = []
        player_info = None

        for mid in req.matchIds:
            match_data = _load_match(mid)
            wrexham_lineups = [
                p for p in match_data.get("lineups", [])
                if p.get("team_id") == WREXHAM_TEAM_ID
            ]
            all_lineups.extend(wrexham_lineups)

            # Find player on first match that has them
            if player_info is None:
                player_info = _find_player(wrexham_lineups, req.playerName)

        if player_info is None:
            raise HTTPException(
                status_code=404,
                detail=f"Player '{req.playerName}' not found in Wrexham lineups",
            )

        player_id = player_info["player_id"]
        player_name = player_info["player_name"]
        jersey = player_info.get("lineup_jersey", 0)

        # Collect shots across all matches
        for mid in req.matchIds:
            match_data = _load_match(mid)
            all_shots.extend(_collect_player_shots(match_data, player_id))

        # Render the composite image
        image = _render_player_map(
            player_name=player_name,
            jersey_number=jersey,
            shots=all_shots,
            style_name=req.style,
            width=req.width,
        )

        # Save to temp file and encode
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        tmp_path = tmp.name
        tmp.close()
        image.save(tmp_path, "PNG")

        with open(tmp_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()
        os.unlink(tmp_path)

        goal_count = sum(1 for s in all_shots if s["is_goal"])

        return PlayerMapResponse(
            imageData=img_b64,
            style=req.style,
            playerName=player_name,
            goals=goal_count,
            shots=len(all_shots),
        )

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Player listing endpoint (for the UI dropdown)
# ---------------------------------------------------------------------------

@app.get("/wrexham-players")
async def wrexham_players():
    """Return all Wrexham players across available matches, with shot counts."""
    match_files = sorted(DATA_DIR.glob("*.json"))
    players = {}  # player_id -> {name, jersey, shots, goals}

    for mf in match_files:
        try:
            with open(mf) as f:
                data = json_mod.load(f)
        except Exception:
            continue

        for p in data.get("lineups", []):
            if p.get("team_id") != WREXHAM_TEAM_ID:
                continue
            pid = p["player_id"]
            if pid not in players:
                players[pid] = {
                    "player_id": pid,
                    "player_name": p["player_name"],
                    "jersey": p.get("lineup_jersey", 0),
                    "shots": 0,
                    "goals": 0,
                }

        for ev in data.get("events", []):
            if ev.get("name") != "shot":
                continue
            pid = ev.get("player_id")
            if pid in players:
                players[pid]["shots"] += 1
                if ev.get("outcome") == "goal" or ev.get("goal_for"):
                    players[pid]["goals"] += 1

    # Sort by goals desc, then shots desc
    result = sorted(players.values(), key=lambda p: (-p["goals"], -p["shots"]))
    match_ids = [int(mf.stem) for mf in match_files]
    return {"players": result, "matchIds": match_ids}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8765, reload=True)
