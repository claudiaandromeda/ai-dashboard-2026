import os
import json
import tempfile
import urllib.request
from typing import Optional, Tuple

import cv2
import numpy as np
from dotenv import load_dotenv
from supabase import create_client

from art_engine.pixel_precision_mapper import PixelPrecisionMapper
from art_engine.segment_stylizer import SegmentConfig, SegmentStylizer
from art_engine.svg_compositor import build_svg, render_svg_to_png



def load_frame_and_event(supabase, event_uuid: str):
    frame = (
        supabase.table("statsbomb_360_frames")
        .select("*")
        .eq("event_uuid", event_uuid)
        .single()
        .execute()
        .data
    )
    return frame


def load_calibration(supabase, event_uuid: str, calibration_id: str):
    if calibration_id:
        response = (
            supabase.table("pitch_calibrations")
            .select("*")
            .eq("id", calibration_id)
            .single()
            .execute()
        )
        return response.data
    if not event_uuid:
        return None
    response = (
        supabase.table("pitch_calibrations")
        .select("*")
        .eq("event_uuid", event_uuid)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = response.data or []
    return rows[0] if rows else None


def fetch_calibration_image(supabase, calibration: dict) -> Optional[str]:
    bucket = calibration.get("bucket")
    path = calibration.get("image_path")
    if not bucket or not path:
        return None
    signed = supabase.storage.from_(bucket).create_signed_url(path, 60 * 60)
    url = signed.get("signedURL") if isinstance(signed, dict) else None
    if not url:
        url = signed.get("signedUrl") if isinstance(signed, dict) else None
    if not url:
        return None
    temp_dir = tempfile.mkdtemp(prefix="emotivx_calibration_")
    local_path = os.path.join(temp_dir, os.path.basename(path))
    urllib.request.urlretrieve(url, local_path)
    return local_path


def main():
    load_dotenv()
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    supabase = create_client(supabase_url, supabase_key)

    # Example inputs (replace with your image and event uuid).
    event_uuid = os.getenv("EVENT_UUID", "")
    image_path = os.getenv("FRAME_IMAGE", "")
    calibration_id = os.getenv("CALIBRATION_ID", "")
    if not event_uuid:
        raise SystemExit("Set EVENT_UUID env var.")

    frame = load_frame_and_event(supabase, event_uuid)
    image = cv2.imread(image_path) if image_path else None
    if image is None:
        calibration = load_calibration(supabase, event_uuid, calibration_id)
        if calibration:
            fetched_path = fetch_calibration_image(supabase, calibration)
            if fetched_path:
                image = cv2.imread(fetched_path)
                image_path = fetched_path
    if image is None:
        raise SystemExit("Failed to load frame image.")

    mapper = PixelPrecisionMapper()
    field_points = mapper.pitch.default_keypoints()
    calibration_path = os.getenv("CALIBRATION_JSON", "")
    calibration = None
    if calibration_path and os.path.exists(calibration_path):
        with open(calibration_path, "r", encoding="utf-8") as handle:
            payload = json.load(handle)
        image_points = payload.get("image_points", [])
        field_points = payload.get("field_points", field_points)
    else:
        calibration = load_calibration(supabase, event_uuid, calibration_id)
        if calibration:
            image_points = calibration.get("image_points", [])
            field_points = calibration.get("field_points", field_points)
        else:
            image_points = [(0, 0), (1920, 0), (1920, 1080), (0, 1080)]
    H = mapper.estimate_homography(field_points, image_points).H

    # Actor location from freeze_frame (placeholder: pick first player).
    freeze = frame.get("freeze_frame_data") or []
    if not freeze:
        raise SystemExit("No freeze_frame_data on this frame.")
    actor = freeze[0]
    x, y = actor.get("location", [None, None])[:2]
    pixel = mapper.map_actor(H, (x, y))

    segmenter = SegmentStylizer(SegmentConfig(model_path=None))
    # This will raise until SAM2 is configured.
    # mask = segmenter.segment_actor(image, pixel)

    # Compose SVG background (simple positions).
    positions = []
    for item in freeze:
        loc = item.get("location")
        if loc and len(loc) >= 2:
            positions.append(mapper.map_actor(H, (loc[0], loc[1])))
    output_path = os.getenv("OUTPUT_IMAGE", "output_art.png")
    svg = build_svg(4000, 4000, [(p.u, p.v) for p in positions], [])
    render_svg_to_png(svg, output_path)



if __name__ == "__main__":
    main()
