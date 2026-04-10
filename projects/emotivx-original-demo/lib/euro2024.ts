import { readFileSync } from "fs";
import { join } from "path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Euro2024Match {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  date: string;
  kick_off: string;
  stage: string;
  stage_slug: string;
  stadium: string;
  goal_count: number;
}

export interface Euro2024Goal {
  match_id: number;
  player: string;
  team: string;
  minute: number;
  second: number;
  description: string;
  body_part: string;
  technique: string;
  play_pattern: string;
}

/* ------------------------------------------------------------------ */
/*  Loaders (server-side only — uses fs)                               */
/* ------------------------------------------------------------------ */

let _matchesCache: Euro2024Match[] | null = null;
let _goalsCache: Euro2024Goal[] | null = null;

export function loadMatches(): Euro2024Match[] {
  if (_matchesCache) return _matchesCache;
  const raw = readFileSync(
    join(process.cwd(), "data", "euro2024", "matches.json"),
    "utf-8"
  );
  _matchesCache = JSON.parse(raw) as Euro2024Match[];
  return _matchesCache;
}

export function loadGoals(): Euro2024Goal[] {
  if (_goalsCache) return _goalsCache;
  const raw = readFileSync(
    join(process.cwd(), "data", "euro2024", "goals.json"),
    "utf-8"
  );
  _goalsCache = JSON.parse(raw) as Euro2024Goal[];
  return _goalsCache;
}
