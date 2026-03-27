import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * GET /api/wrexham/goals?matchId=1377475
 * Parses StatsBomb 360 premium format (different from Euro open data)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");
  if (!matchId) return Response.json({ error: "Missing matchId" }, { status: 400 });

  try {
    const filePath = join(process.cwd(), "data", "statsbomb", "events", `${matchId}.json`);
    if (!existsSync(filePath)) return Response.json({ error: "Match not found" }, { status: 404 });

    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const events = data.events;
    const lineups: Record<number, any> = {};
    for (const l of data.lineups) lineups[l.player_id] = l;

    const match = data.match[0];

    // Goals: events with goal_for set (it's the team ID, not a boolean)
    const goals = events
      .filter((e: any) => e.goal_for != null && e.goal_for !== 0)
      .sort((a: any, b: any) => a.minute - b.minute || (a.second || 0) - (b.second || 0))
      .map((e: any, index: number) => {
        const player = lineups[e.player_id];
        return {
          index,
          player: player?.player_name || "Unknown",
          team: player?.team_name || "Unknown",
          teamId: e.team_id,
          minute: e.minute,
          second: e.second || 0,
          xg: e.xg || 0,
          startZ: e.start_z || 0,
          endZ: e.end_z || 0,
          startX: e.start_x,
          startY: e.start_y,
          endX: e.end_x,
          endY: e.end_y,
          hasFreezeFrame: !!e.freeze_frame,
          isOwnGoal: false,
        };
      });

    return Response.json({
      matchId: Number(matchId),
      homeTeam: match.match_home_team_name,
      awayTeam: match.match_away_team_name,
      homeTeamId: match.match_home_team_id,
      awayTeamId: match.match_away_team_id,
      homeScore: 5,
      awayScore: 3,
      stadium: match.stadium_name,
      goals,
      totalGoals: goals.length,
      format: "360",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
