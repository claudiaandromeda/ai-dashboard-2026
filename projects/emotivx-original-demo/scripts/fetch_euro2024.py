#!/usr/bin/env python3
"""
Fetch and process Euro 2024 match & goal data from StatsBomb open data.

Reads from:
  data/statsbomb/matches/55/282.json   (all 51 matches)
  data/statsbomb/events/{match_id}.json (play-by-play per match)

Writes:
  data/euro2024/matches.json   — slim match objects with group info
  data/euro2024/goals.json     — every goal in the tournament
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATCHES_PATH = ROOT / "data" / "statsbomb" / "matches" / "55" / "282.json"
EVENTS_DIR = ROOT / "data" / "statsbomb" / "events"
OUT_DIR = ROOT / "data" / "euro2024"

# Euro 2024 group assignments (StatsBomb data has group fields as null)
EURO_2024_GROUPS: dict[str, str] = {
    "Germany": "Group A", "Scotland": "Group A", "Hungary": "Group A", "Switzerland": "Group A",
    "Spain": "Group B", "Croatia": "Group B", "Italy": "Group B", "Albania": "Group B",
    "Slovenia": "Group C", "Denmark": "Group C", "Serbia": "Group C", "England": "Group C",
    "Poland": "Group D", "Netherlands": "Group D", "Austria": "Group D", "France": "Group D",
    "Belgium": "Group E", "Slovakia": "Group E", "Romania": "Group E", "Ukraine": "Group E",
    "Turkey": "Group F", "Georgia": "Group F", "Portugal": "Group F", "Czech Republic": "Group F",
}


def load_matches():
    with open(MATCHES_PATH) as f:
        return json.load(f)


def extract_stage_slug(stage_name: str) -> str:
    """Convert 'Group A' → 'group_a', 'Quarter-finals' → 'quarter_finals', etc."""
    return stage_name.lower().replace(" ", "_").replace("-", "_")


def get_group(home: str, away: str) -> str | None:
    """Look up group from hardcoded Euro 2024 groups."""
    g = EURO_2024_GROUPS.get(home) or EURO_2024_GROUPS.get(away)
    return g


def process_match(raw: dict) -> dict:
    stage_name = raw["competition_stage"]["name"]
    home = raw["home_team"]["home_team_name"]
    away = raw["away_team"]["away_team_name"]

    # For group stage matches, label by group (Group A, Group B, etc.)
    if stage_name == "Group Stage":
        group = get_group(home, away)
        stage_display = group or stage_name
    else:
        stage_display = stage_name

    return {
        "id": raw["match_id"],
        "home_team": raw["home_team"]["home_team_name"],
        "away_team": raw["away_team"]["away_team_name"],
        "home_score": raw["home_score"],
        "away_score": raw["away_score"],
        "date": raw["match_date"],
        "kick_off": raw.get("kick_off", ""),
        "stage": stage_display,
        "stage_slug": extract_stage_slug(stage_display),
        "stadium": raw.get("stadium", {}).get("name", ""),
    }


def extract_goals(match_id: int) -> list[dict]:
    """Extract all goals from a match's event file."""
    events_path = EVENTS_DIR / f"{match_id}.json"
    if not events_path.exists():
        print(f"  ⚠ No events for match {match_id}")
        return []

    with open(events_path) as f:
        events = json.load(f)

    goals = []
    for ev in events:
        if ev.get("type", {}).get("name") != "Shot":
            continue
        shot = ev.get("shot", {})
        if shot.get("outcome", {}).get("name") != "Goal":
            continue

        # Build a short description
        player_name = ev.get("player", {}).get("name", "Unknown")
        body_part = shot.get("body_part", {}).get("name", "")
        technique = shot.get("technique", {}).get("name", "")
        play_pattern = ev.get("play_pattern", {}).get("name", "")

        desc_parts = []
        if technique and technique != "Normal":
            desc_parts.append(technique.lower())
        if body_part:
            desc_parts.append(body_part.lower())
        if play_pattern:
            desc_parts.append(f"from {play_pattern.lower()}")
        description = f"{player_name} — " + ", ".join(desc_parts) if desc_parts else player_name

        goals.append({
            "match_id": match_id,
            "player": player_name,
            "team": ev.get("team", {}).get("name", ""),
            "minute": ev.get("minute", 0),
            "second": ev.get("second", 0),
            "description": description,
            "body_part": body_part,
            "technique": technique,
            "play_pattern": play_pattern,
        })

    return goals


def main():
    raw_matches = load_matches()
    print(f"Loaded {len(raw_matches)} matches from StatsBomb")

    matches = []
    all_goals = []

    for raw in raw_matches:
        match = process_match(raw)
        match_goals = extract_goals(raw["match_id"])
        match["goal_count"] = len(match_goals)
        matches.append(match)
        all_goals.extend(match_goals)
        if match_goals:
            print(f"  {match['home_team']} {match['home_score']}-{match['away_score']} {match['away_team']}: {len(match_goals)} goals")

    # Sort matches by date then kick-off
    matches.sort(key=lambda m: (m["date"], m["kick_off"]))
    # Sort goals by match date then minute
    match_date_map = {m["id"]: m["date"] for m in matches}
    all_goals.sort(key=lambda g: (match_date_map.get(g["match_id"], ""), g["minute"], g["second"]))

    # Write output
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(OUT_DIR / "matches.json", "w") as f:
        json.dump(matches, f, indent=2)
    print(f"\n✅ Wrote {len(matches)} matches → data/euro2024/matches.json")

    with open(OUT_DIR / "goals.json", "w") as f:
        json.dump(all_goals, f, indent=2)
    print(f"✅ Wrote {len(all_goals)} goals → data/euro2024/goals.json")

    # Summary stats
    scorers: dict[str, int] = {}
    for g in all_goals:
        scorers[g["player"]] = scorers.get(g["player"], 0) + 1
    top = sorted(scorers.items(), key=lambda x: -x[1])[:5]
    print(f"\n📊 Top scorers:")
    for name, count in top:
        print(f"   {name}: {count}")


if __name__ == "__main__":
    main()
