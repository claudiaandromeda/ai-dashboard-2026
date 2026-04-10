"""
Goal path extractor for StatsBomb 360 premium format.
Extracts buildup paths with 3D ball height data.

360 format: flat fields (start_x/y/z, end_x/y/z), goal_for flag,
event types as strings, player IDs need lineup lookup.
"""

import json
import sys
from pathlib import Path


def load_360_match(match_id: int):
    """Load a 360 format match bundle."""
    events_dir = Path(__file__).parent.parent / "data" / "statsbomb" / "events"
    path = events_dir / f"{match_id}.json"
    if not path.exists():
        return None
    with open(path) as f:
        data = json.load(f)
    # Detect format: 360 has top-level 'events' key as dict with match/lineups/events
    if isinstance(data, dict) and "events" in data and "lineups" in data:
        return data
    return None


def get_360_goal_paths(match_id: int, goal_index: int = 0):
    """
    Extract the buildup path for a specific goal in 360 format.
    Returns path events with x, y, z (height), event type, and player.
    """
    data = load_360_match(match_id)
    if not data:
        return None

    events = data["events"]
    lineups = {l["player_id"]: l for l in data["lineups"]}

    # Find all goals — shot events only (excludes own-goal-for entries which shift indices).
    # goal_for contains the benefiting team ID; outcome=="goal" confirms it's a shot goal.
    goals = sorted(
        [e for e in events
         if e.get("goal_for") is not None
         and e.get("goal_for") != 0
         and e.get("name") == "shot"
         and e.get("outcome") == "goal"],
        key=lambda e: (e["minute"], e.get("second", 0))
    )

    if not goals or goal_index >= len(goals):
        return None

    goal = goals[goal_index]
    goal_minute = goal["minute"]
    goal_second = goal.get("second", 0)
    scoring_team_id = goal["team_id"]

    # Collect buildup: events from scoring team in the 2-minute window before the goal.
    # NOTE: The event file is NOT sorted by time — events from different minutes
    # appear interleaved. Walk backwards by TIME WINDOW, not by array position.
    goal_time_s = goal_minute * 60 + goal.get("second", 0)
    window_start_s = goal_time_s - 120  # 2 minutes of buildup

    buildup = []
    for e in events:
        e_time_s = e.get("minute", 0) * 60 + e.get("second", 0)
        # Only this team's events in the time window
        if e.get("team_id") != scoring_team_id:
            continue
        if e_time_s < window_start_s or e_time_s > goal_time_s:
            continue
        if e.get("start_x") is None or e.get("start_y") is None:
            continue
        player = lineups.get(e.get("player_id"), {})
        buildup.append({
            "x": e["start_x"],
            "y": e["start_y"],
            "z": e.get("start_z", 0) or 0,
            "end_x": e.get("end_x"),
            "end_y": e.get("end_y"),
            "end_z": e.get("end_z", 0) or 0,
            "type": e.get("name") or e.get("type") or "event",
            "player": player.get("player_name", "Unknown"),
            "team": player.get("team_name", "Unknown"),
            "minute": e.get("minute", 0),
            "second": e.get("second", 0),
            "xg": e.get("xg"),
            "freeze_frame": e.get("freeze_frame"),
        })

    # Sort chronologically (ascending — earliest event first, goal last)
    buildup.sort(key=lambda e: (e["minute"], e["second"]))

    # The final event in the buildup IS the goal — label it as such
    # so scale_path can anchor it at the focal point and the sunburst renders there.
    if buildup:
        buildup[-1]["type"] = "goal"

    goal_player = lineups.get(goal.get("player_id"), {})

    return {
        "match_id": match_id,
        "goal_index": goal_index,
        "scorer": goal_player.get("player_name", "Unknown"),
        "team": goal_player.get("team_name", "Unknown"),
        "team_id": scoring_team_id,
        "minute": goal_minute,
        "second": goal_second,
        "xg": goal.get("xg", 0),
        "path": buildup,
        "has_3d": any(e["z"] > 0 or e["end_z"] > 0 for e in buildup),
        "format": "360",
    }


def path_to_legacy_format(path_events):
    """
    Convert 360 path to the legacy format expected by the art engine.
    Returns list of (norm_x, norm_y, event_type) tuples.
    Pitch is 120x80 in StatsBomb coords.
    """
    result = []
    for e in path_events:
        nx = e["x"] / 120.0
        ny = e["y"] / 80.0
        # Map event types to legacy names
        etype = e.get("type", "event")
        if "shot" in str(etype).lower():
            etype = "shot"
        elif "goal" in str(etype).lower():
            etype = "goal"
        else:
            etype = "pass"
        result.append((nx, ny, etype))

        # Also add end position if it exists (creates the arc)
        if e.get("end_x") is not None and e.get("end_y") is not None:
            enx = e["end_x"] / 120.0
            eny = e["end_y"] / 80.0
            result.append((enx, eny, etype))

    return result


def path_to_3d_format(path_events):
    """
    Convert 360 path to 3D format with height data.
    Returns list of (norm_x, norm_y, norm_z, event_type) tuples.
    Z is normalised: 0 = ground, 1 = ~3m (crossbar height).
    """
    CROSSBAR_HEIGHT = 2.44  # metres
    result = []
    for e in path_events:
        nx = e["x"] / 120.0
        ny = e["y"] / 80.0
        nz = min(1.0, (e.get("z", 0) or 0) / CROSSBAR_HEIGHT)
        etype = e.get("type", "event")
        if "shot" in str(etype).lower():
            etype = "shot"
        elif "goal" in str(etype).lower():
            etype = "goal"
        else:
            etype = "pass"
        result.append((nx, ny, nz, etype))

        if e.get("end_x") is not None and e.get("end_y") is not None:
            enx = e["end_x"] / 120.0
            eny = e["end_y"] / 80.0
            enz = min(1.0, (e.get("end_z", 0) or 0) / CROSSBAR_HEIGHT)
            result.append((enx, eny, enz, etype))

    return result


if __name__ == "__main__":
    # Quick test
    match_id = int(sys.argv[1]) if len(sys.argv) > 1 else 1377475
    goal_idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    result = get_360_goal_paths(match_id, goal_idx)
    if result:
        print(f"Goal {goal_idx}: {result['scorer']} ({result['team']}) {result['minute']}'")
        print(f"  xG: {result['xg']:.2f}")
        print(f"  Buildup: {len(result['path'])} events")
        print(f"  Has 3D: {result['has_3d']}")

        path_3d = path_to_3d_format(result["path"])
        heights = [p[2] for p in path_3d if p[2] > 0]
        if heights:
            print(f"  Height range: {min(heights):.2f} - {max(heights):.2f} (normalised)")
        print(f"  Path points: {len(path_3d)}")
    else:
        print(f"No goal found at index {goal_idx}")
