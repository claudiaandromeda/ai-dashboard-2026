import os
import math
from typing import Any, Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv
from supabase import create_client, Client
from tqdm import tqdm

try:
    from statsbombpy import sb
except ImportError as exc:
    raise SystemExit(
        "statsbombpy is required. Install with: pip install statsbombpy"
    ) from exc


EURO_TARGETS = [
    {"competition_id": 55, "season_id": 282, "competition_name": "Euro 2024"},
    {"competition_id": 55, "season_id": 43, "competition_name": "Euro 2020"},
]


def chunked(items: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def safe_xy(value: Optional[Any]) -> Tuple[Optional[float], Optional[float]]:
    if value is None:
        return None, None
    if isinstance(value, float):
        if math.isnan(value):
            return None, None
        return None, None
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        return value[0], value[1]
    return None, None


def build_event_row(event: Dict[str, Any], competition: Dict[str, Any]) -> Dict[str, Any]:
    location_x, location_y = safe_xy(event.get("location"))
    pass_end_x, pass_end_y = safe_xy(event.get("pass", {}).get("end_location"))
    carry_end_x, carry_end_y = safe_xy(event.get("carry", {}).get("end_location"))
    shot_end_x, shot_end_y = safe_xy(event.get("shot", {}).get("end_location"))

    event_type = event.get("type")
    event_type_name = (
        event_type.get("name") if isinstance(event_type, dict) else event_type
    )
    team_value = event.get("team")
    team_name = team_value.get("name") if isinstance(team_value, dict) else team_value
    player_value = event.get("player")
    player_name = (
        player_value.get("name") if isinstance(player_value, dict) else player_value
    )
    play_pattern_value = event.get("play_pattern")
    play_pattern_name = (
        play_pattern_value.get("name")
        if isinstance(play_pattern_value, dict)
        else play_pattern_value
    )

    return {
        "event_id": str(event.get("id")),
        "match_id": str(event.get("match_id")),
        "competition_id": str(competition["competition_id"]),
        "season_id": str(competition["season_id"]),
        "competition_name": competition["competition_name"],
        "event_type": event_type_name,
        "team_name": team_name,
        "player_name": player_name,
        "period": event.get("period"),
        "minute": event.get("minute"),
        "second": event.get("second"),
        "possession": event.get("possession"),
        "play_pattern": play_pattern_name,
        "location_x": location_x,
        "location_y": location_y,
        "pass_end_x": pass_end_x,
        "pass_end_y": pass_end_y,
        "carry_end_x": carry_end_x,
        "carry_end_y": carry_end_y,
        "shot_end_x": shot_end_x,
        "shot_end_y": shot_end_y,
        "raw_json": event,
    }


def extract_frame_event_uuid(frame: Dict[str, Any]) -> Optional[str]:
    event_uuid = frame.get("event_uuid") or frame.get("event_id") or frame.get("id")
    if event_uuid is None:
        return None
    return str(event_uuid)


def build_frame_row(
    frame: Dict[str, Any], competition: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    event_uuid = extract_frame_event_uuid(frame)
    if not event_uuid:
        return None
    team_value = frame.get("team")
    team_name = team_value.get("name") if isinstance(team_value, dict) else team_value
    return {
        "event_uuid": event_uuid,
        "match_id": str(frame.get("match_id")),
        "competition_id": str(competition["competition_id"]),
        "season_id": str(competition["season_id"]),
        "competition_name": competition["competition_name"],
        "team_name": team_name,
        "timestamp": frame.get("timestamp"),
        "visible_area": frame.get("visible_area"),
        "freeze_frame_data": frame.get("freeze_frame"),
        "raw_json": frame,
    }


def scrub_value(value: Any) -> Any:
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return value
    if isinstance(value, dict):
        return {k: scrub_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [scrub_value(v) for v in value]
    return value


def scrub_row(row: Dict[str, Any]) -> Dict[str, Any]:
    return {key: scrub_value(value) for key, value in row.items()}


def dedupe_rows(rows: List[Dict[str, Any]], key: str) -> List[Dict[str, Any]]:
    seen = set()
    deduped = []
    for row in rows:
        value = row.get(key)
        if value is None:
            continue
        if value in seen:
            continue
        seen.add(value)
        deduped.append(row)
    return deduped


def upsert_rows(client: Client, table: str, rows: List[Dict[str, Any]], key: str) -> None:
    if not rows:
        return
    rows = dedupe_rows(rows, key)
    for batch in chunked(rows, 500):
        cleaned = [scrub_row(row) for row in batch]
        response = client.table(table).upsert(cleaned, on_conflict=key).execute()
        if response.data is None and response.error:
            raise RuntimeError(response.error.message)


def main() -> None:
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")

    supabase = create_client(supabase_url, supabase_key)

    frames_only = "--frames-only" in os.sys.argv
    events_only = "--events-only" in os.sys.argv
    competition_id = None
    season_id = None
    if "--competition-id" in os.sys.argv:
        idx = os.sys.argv.index("--competition-id") + 1
        if idx < len(os.sys.argv):
            competition_id = os.sys.argv[idx]
    if "--season-id" in os.sys.argv:
        idx = os.sys.argv.index("--season-id") + 1
        if idx < len(os.sys.argv):
            season_id = os.sys.argv[idx]

    targets = EURO_TARGETS
    if competition_id and season_id:
        targets = [
            {
                "competition_id": int(competition_id),
                "season_id": int(season_id),
                "competition_name": f"{competition_id}:{season_id}",
            }
        ]

    for competition in targets:
        try:
            matches_df = sb.matches(
                competition_id=competition["competition_id"],
                season_id=competition["season_id"],
            )
        except Exception as exc:  # network/timeouts
            print(f"Failed to load matches for {competition}: {exc}")
            continue

        matches = matches_df.to_dict(orient="records")
        total_events = 0
        total_frames = 0

        for match in tqdm(
            matches, desc=f"Matches {competition['competition_name']}", unit="match"
        ):
            match_id = match.get("match_id")
            if match_id is None:
                continue
            try:
                events_df = sb.events(match_id=match_id)
                frames_df = sb.frames(match_id=match_id)
            except Exception as exc:
                print(f"Failed to load match {match_id}: {exc}")
                continue

            events = events_df.to_dict(orient="records")
            frames = frames_df.to_dict(orient="records")

            event_rows = [] if frames_only else [
                build_event_row(event, competition) for event in events
            ]
            frame_rows = [] if events_only else [
                build_frame_row(frame, competition) for frame in frames
            ]
            frame_rows = [row for row in frame_rows if row is not None]

            if event_rows:
                upsert_rows(supabase, "statsbomb_events", event_rows, "event_id")
                total_events += len(event_rows)
            if frame_rows:
                upsert_rows(
                    supabase, "statsbomb_360_frames", frame_rows, "event_uuid"
                )
                total_frames += len(frame_rows)
            else:
                if frames and not events_only:
                    print(f"No valid 360 frames for match {match_id} (missing event_uuid).")

        print(
            f"Upserted {total_events} events and {total_frames} frames for {competition['competition_name']}"
        )


if __name__ == "__main__":
    main()
