#!/usr/bin/env python3
"""
Goal Extractor — Extract real goal buildup paths from StatsBomb event data.

Given a match ID and optionally a goal index, extracts the full pass/carry/shot
chain leading to that goal with real pitch coordinates normalised to [0,1].

StatsBomb pitch coordinates: 120 x 80 yards
Output: list of (x, y, event_type, player_name) normalised to [0,1]
"""

import json
from pathlib import Path
from typing import Optional


EVENTS_DIR = Path(__file__).parent.parent / "data" / "statsbomb" / "events"
MATCHES_DIR = Path(__file__).parent.parent / "data" / "statsbomb" / "matches"

# StatsBomb pitch dimensions
PITCH_LENGTH = 120.0
PITCH_WIDTH = 80.0


def load_match_events(match_id: int) -> list:
    """Load raw StatsBomb events for a match."""
    events_path = EVENTS_DIR / f"{match_id}.json"
    if not events_path.exists():
        return []
    with open(events_path) as f:
        return json.load(f)


def load_match_metadata(match_id: int, competition_id: int = 55, season_id: int = 282) -> Optional[dict]:
    """Load match metadata."""
    matches_path = MATCHES_DIR / str(competition_id) / f"{season_id}.json"
    if not matches_path.exists():
        return None
    with open(matches_path) as f:
        matches = json.load(f)
    return next((m for m in matches if m["match_id"] == match_id), None)


def find_goals(events: list) -> list:
    """
    Find all goals in a match.
    Returns list of dicts with goal info + possession number for buildup extraction.
    """
    goals = []
    for event in events:
        if event.get("type", {}).get("name") != "Shot":
            continue
        if event.get("shot", {}).get("outcome", {}).get("name") != "Goal":
            continue
        
        loc = event.get("location", [0, 0])
        goals.append({
            "player": event.get("player", {}).get("name", "Unknown"),
            "team": event.get("team", {}).get("name", "Unknown"),
            "minute": event.get("minute", 0),
            "second": event.get("second", 0),
            "location": loc,
            "possession": event.get("possession", 0),
            "possession_team": event.get("possession_team", {}).get("name", "Unknown"),
        })
    
    return goals


def extract_buildup(events: list, possession_num: int) -> list:
    """
    Extract the full buildup chain for a possession leading to a goal.
    
    Filters to meaningful play events: Pass, Carry, Shot, Dribble, Ball Receipt.
    Returns list of (norm_x, norm_y, event_type, player_name).
    
    Coordinates normalised to [0,1] from StatsBomb's 120x80 pitch.
    """
    # Get all events in this possession
    chain = [e for e in events if e.get("possession") == possession_num]
    
    path = []
    for event in chain:
        etype = event.get("type", {}).get("name", "")
        player = event.get("player", {}).get("name", "Unknown")
        loc = event.get("location", [])
        
        if not loc or len(loc) < 2:
            continue
        
        # Normalise coordinates to [0,1]
        norm_x = loc[0] / PITCH_LENGTH
        norm_y = loc[1] / PITCH_WIDTH
        
        if etype == "Pass":
            end_loc = event.get("pass", {}).get("end_location", [])
            path.append((norm_x, norm_y, "pass", player))
            if end_loc and len(end_loc) >= 2:
                end_x = end_loc[0] / PITCH_LENGTH
                end_y = end_loc[1] / PITCH_WIDTH
                # Don't add end location as separate point — the next Ball Receipt will cover it
        
        elif etype == "Carry":
            end_loc = event.get("carry", {}).get("end_location", [])
            if end_loc and len(end_loc) >= 2:
                end_x = end_loc[0] / PITCH_LENGTH
                end_y = end_loc[1] / PITCH_WIDTH
                # Only add carry if it covers significant distance
                dist = ((end_x - norm_x) ** 2 + (end_y - norm_y) ** 2) ** 0.5
                if dist > 0.03:  # More than ~3% of pitch
                    path.append((norm_x, norm_y, "carry", player))
                    path.append((end_x, end_y, "carry_end", player))
        
        elif etype == "Shot":
            end_loc = event.get("shot", {}).get("end_location", [])
            outcome = event.get("shot", {}).get("outcome", {}).get("name", "")
            path.append((norm_x, norm_y, "shot", player))
            if outcome == "Goal" and end_loc and len(end_loc) >= 2:
                end_x = min(end_loc[0] / PITCH_LENGTH, 1.0)
                end_y = end_loc[1] / PITCH_WIDTH if len(end_loc) > 1 else 0.5
                path.append((end_x, end_y, "goal", player))
        
        elif etype == "Dribble":
            path.append((norm_x, norm_y, "dribble", player))
    
    return path


def get_goal_path(match_id: int, goal_index: int = 0, competition_id: int = 55, season_id: int = 282) -> dict:
    """
    Main entry point: get the full buildup path for a specific goal in a match.
    
    Returns dict with:
        - goal: goal info (player, minute, team)
        - path: list of (x, y, event_type, player) normalised to [0,1]
        - all_goals: list of all goals in the match (for UI selection)
        - match: match metadata
    """
    events = load_match_events(match_id)
    if not events:
        return {"error": f"No events found for match {match_id}"}
    
    goals = find_goals(events)
    if not goals:
        return {"error": "No goals in this match", "all_goals": [], "path": []}
    
    if goal_index >= len(goals):
        goal_index = 0
    
    selected_goal = goals[goal_index]
    path = extract_buildup(events, selected_goal["possession"])
    
    match = load_match_metadata(match_id, competition_id, season_id)
    
    return {
        "goal": selected_goal,
        "path": path,
        "all_goals": goals,
        "match": match,
        "event_count": len(path),
    }


def path_to_legacy_format(path: list) -> list:
    """
    Convert extracted path to the format expected by api_generate.py:
    list of (x, y, event_type) tuples (without player name).
    """
    return [(x, y, etype) for x, y, etype, _ in path]


if __name__ == "__main__":
    import sys
    
    match_id = int(sys.argv[1]) if len(sys.argv) > 1 else 3942819
    goal_idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    
    result = get_goal_path(match_id, goal_idx)
    
    if "error" in result and not result.get("path"):
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(f"\nMatch: {result['match']['home_team']['home_team_name']} vs {result['match']['away_team']['away_team_name']}")
    print(f"Goals in match: {len(result['all_goals'])}")
    for i, g in enumerate(result['all_goals']):
        marker = " ← selected" if i == goal_idx else ""
        print(f"  [{i}] {g['player']} ({g['minute']}'){marker}")
    
    print(f"\nBuildup path ({result['event_count']} events):")
    for x, y, etype, player in result['path']:
        print(f"  {etype:12s} {player:25s} ({x:.3f}, {y:.3f})")
