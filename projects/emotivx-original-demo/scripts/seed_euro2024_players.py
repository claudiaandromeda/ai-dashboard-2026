#!/usr/bin/env python3
"""
Seed Euro 2024 players from StatsBomb open data into Supabase.

Reads local event files from data/statsbomb/events/ for each match in
data/euro2024/matches.json, extracts unique players (from Starting XI
lineups and Substitution replacements), matches team names to clubs in
Supabase, and inserts players via the REST API.

Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATCHES_PATH = ROOT / "data" / "euro2024" / "matches.json"
EVENTS_DIR = ROOT / "data" / "statsbomb" / "events"
ENV_PATH = ROOT / ".env.local"


def load_env():
    """Load key=value pairs from .env.local into os.environ."""
    if not ENV_PATH.exists():
        sys.exit(f"ERROR: {ENV_PATH} not found")
    with open(ENV_PATH) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip())


def supabase_request(method: str, path: str, body=None):
    """Make an authenticated request to the Supabase REST API."""
    url = f"{os.environ['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/{path}"
    headers = {
        "apikey": os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        "Authorization": f"Bearer {os.environ['SUPABASE_SERVICE_ROLE_KEY']}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"  HTTP {e.code}: {error_body}", file=sys.stderr)
        raise


def fetch_clubs() -> dict[str, dict]:
    """Fetch all clubs from Supabase, keyed by name."""
    rows = supabase_request("GET", "clubs?select=id,name,statsbomb_team_id")
    return {row["name"]: row for row in rows}


def fetch_existing_players() -> set[int]:
    """Fetch all existing statsbomb_player_ids to skip duplicates."""
    rows = supabase_request("GET", "players?select=statsbomb_player_id&statsbomb_player_id=not.is.null")
    return {row["statsbomb_player_id"] for row in rows}


def extract_players_from_match(match_id: int) -> list[dict]:
    """Extract all players from a match's event file."""
    events_path = EVENTS_DIR / f"{match_id}.json"
    if not events_path.exists():
        print(f"  WARNING: No events for match {match_id}")
        return []

    with open(events_path) as f:
        events = json.load(f)

    players = {}  # statsbomb_player_id -> player dict

    for ev in events:
        ev_type = ev.get("type", {}).get("name")
        team_name = ev.get("team", {}).get("name", "")
        team_id = ev.get("team", {}).get("id")

        # Starting XI — richest source: has position and jersey number
        if ev_type == "Starting XI":
            for entry in ev.get("tactics", {}).get("lineup", []):
                pid = entry["player"]["id"]
                if pid not in players:
                    players[pid] = {
                        "statsbomb_player_id": pid,
                        "name": entry["player"]["name"],
                        "team_name": team_name,
                        "statsbomb_team_id": team_id,
                        "position": entry.get("position", {}).get("name"),
                        "jersey_number": entry.get("jersey_number"),
                    }

        # Substitution — the replacement player enters the pitch
        elif ev_type == "Substitution":
            # Player being subbed off (already in lineup normally)
            pid = ev.get("player", {}).get("id")
            if pid and pid not in players:
                players[pid] = {
                    "statsbomb_player_id": pid,
                    "name": ev["player"]["name"],
                    "team_name": team_name,
                    "statsbomb_team_id": team_id,
                    "position": ev.get("position", {}).get("name"),
                    "jersey_number": None,
                }
            # Replacement player coming on
            repl = ev.get("substitution", {}).get("replacement", {})
            rpid = repl.get("id")
            if rpid and rpid not in players:
                players[rpid] = {
                    "statsbomb_player_id": rpid,
                    "name": repl["name"],
                    "team_name": team_name,
                    "statsbomb_team_id": team_id,
                    "position": None,  # no position in replacement data
                    "jersey_number": None,
                }

    return list(players.values())


def ensure_clubs(players: list[dict], existing_clubs: dict[str, dict]) -> dict[str, dict]:
    """Create any missing clubs in Supabase and return updated club map."""
    teams = {}
    for p in players:
        tn = p["team_name"]
        if tn not in teams:
            teams[tn] = p["statsbomb_team_id"]

    created = 0
    for team_name, sb_team_id in teams.items():
        if team_name in existing_clubs:
            continue
        print(f"  Creating club: {team_name} (statsbomb_team_id={sb_team_id})")
        rows = supabase_request("POST", "clubs", {
            "name": team_name,
            "statsbomb_team_id": sb_team_id,
        })
        existing_clubs[team_name] = rows[0]
        created += 1

    if created:
        print(f"  Created {created} new clubs")
    return existing_clubs


def main():
    load_env()

    # Load matches
    with open(MATCHES_PATH) as f:
        matches = json.load(f)
    print(f"Loaded {len(matches)} Euro 2024 matches")

    # Extract all unique players across all matches
    all_players: dict[int, dict] = {}  # statsbomb_player_id -> player
    for match in matches:
        match_players = extract_players_from_match(match["id"])
        for p in match_players:
            pid = p["statsbomb_player_id"]
            if pid not in all_players:
                all_players[pid] = p
            else:
                # Fill in any missing fields from later matches
                existing = all_players[pid]
                if not existing.get("position") and p.get("position"):
                    existing["position"] = p["position"]
                if not existing.get("jersey_number") and p.get("jersey_number"):
                    existing["jersey_number"] = p["jersey_number"]

    print(f"Extracted {len(all_players)} unique players from event files")

    # Count by team
    team_counts: dict[str, int] = {}
    for p in all_players.values():
        team_counts[p["team_name"]] = team_counts.get(p["team_name"], 0) + 1
    for team, count in sorted(team_counts.items()):
        print(f"  {team}: {count} players")

    # Fetch existing clubs and players from Supabase
    print("\nFetching existing data from Supabase...")
    clubs = fetch_clubs()
    print(f"  Found {len(clubs)} existing clubs")
    existing_ids = fetch_existing_players()
    print(f"  Found {len(existing_ids)} existing players")

    # Ensure all teams exist as clubs
    clubs = ensure_clubs(list(all_players.values()), clubs)

    # Build insert batch, skipping duplicates
    to_insert = []
    skipped = 0
    for p in all_players.values():
        if p["statsbomb_player_id"] in existing_ids:
            skipped += 1
            continue
        club = clubs.get(p["team_name"])
        to_insert.append({
            "name": p["name"],
            "statsbomb_player_id": p["statsbomb_player_id"],
            "club_id": club["id"] if club else None,
            "position": p.get("position"),
            "jersey_number": p.get("jersey_number"),
        })

    if skipped:
        print(f"\nSkipping {skipped} players already in database")

    if not to_insert:
        print("\nNo new players to insert.")
        return

    # Insert in batches of 50
    BATCH_SIZE = 50
    inserted = 0
    for i in range(0, len(to_insert), BATCH_SIZE):
        batch = to_insert[i : i + BATCH_SIZE]
        supabase_request("POST", "players", batch)
        inserted += len(batch)
        print(f"  Inserted {inserted}/{len(to_insert)} players...")

    print(f"\n{'=' * 50}")
    print(f"SUMMARY: {inserted} players inserted for {len(team_counts)} teams")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
