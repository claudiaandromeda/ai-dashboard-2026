import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * GET /api/moments/meta?matchId=1377235&goalIndex=0
 *
 * Returns scorer name, jersey number, home/away team names for a given goal.
 * Supports both the custom Wrexham 360 format (team_id/player_id/lineups)
 * and standard StatsBomb open data format (team.name/player.name).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  const goalIndex = parseInt(searchParams.get("goalIndex") ?? "0", 10);

  if (!matchId) {
    return Response.json({ error: "Missing matchId" }, { status: 400 });
  }

  const eventsPath = join(process.cwd(), "data", "statsbomb", "events", `${matchId}.json`);
  if (!existsSync(eventsPath)) {
    return Response.json({ error: "Match not found" }, { status: 404 });
  }

  const raw = JSON.parse(readFileSync(eventsPath, "utf-8"));

  /* ── Custom Wrexham 360 format ────────────────────────────────────── */
  if (raw.match && raw.lineups && raw.events) {
    const matchInfo = raw.match[0];
    const events: any[] = raw.events;
    const lineups: any[] = raw.lineups;

    // Find goals (name=shot, outcome=goal or own-goal logic)
    const goals = events.filter(
      (e) => e.name === "shot" && e.outcome === "goal"
    );

    const goal = goals[goalIndex] ?? goals[0];
    if (!goal) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    // Look up scorer in lineups
    const scorer = lineups.find((p) => p.player_id === goal.player_id);
    const scorerName = scorer
      ? (scorer.player_nickname || scorer.player_name || null)
      : null;
    const scorerNumber = scorer?.lineup_jersey ?? null;

    // Determine which team scored to pick the right team name for branding
    const scoringTeamId = goal.team_id;
    const homeTeamId = matchInfo.match_home_team_id;
    const scoringTeamName = scoringTeamId === homeTeamId
      ? matchInfo.match_home_team_name
      : matchInfo.match_away_team_name;

    return Response.json({
      matchId: Number(matchId),
      goalIndex,
      scorerName,
      scorerNumber,
      homeTeam: matchInfo.match_home_team_name,
      awayTeam: matchInfo.match_away_team_name,
      homeScore: matchInfo.match_home_score ?? null,
      awayScore: matchInfo.match_away_score ?? null,
      scoringTeam: scoringTeamName,
      minute: goal.minute,
      stadium: matchInfo.stadium_name,
      matchDate: matchInfo.match_date,
    });
  }

  /* ── Standard StatsBomb open data format ─────────────────────────── */
  const events: any[] = Array.isArray(raw) ? raw : [];
  const goals = events.filter(
    (e) =>
      (e.type?.name === "Shot" && e.shot?.outcome?.name === "Goal") ||
      e.type?.name === "Own Goal For"
  );

  const goal = goals[goalIndex] ?? goals[0];
  if (!goal) {
    return Response.json({ error: "Goal not found" }, { status: 404 });
  }

  return Response.json({
    matchId: Number(matchId),
    goalIndex,
    scorerName: goal.player?.name ?? null,
    scorerNumber: null, // not in standard StatsBomb format
    homeTeam: null,
    awayTeam: null,
    scoringTeam: goal.team?.name ?? null,
    minute: goal.minute,
    matchDate: null,
  });
}
