import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * GET /api/moments/goals?matchId=3942819
 * Returns list of goals in a match with player, minute, team info
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return Response.json({ error: "Missing matchId" }, { status: 400 });
  }

  try {
    const eventsPath = join(
      process.cwd(),
      "data",
      "statsbomb",
      "events",
      `${matchId}.json`
    );

    if (!existsSync(eventsPath)) {
      return Response.json({ error: "Match events not found" }, { status: 404 });
    }

    const events = JSON.parse(readFileSync(eventsPath, "utf-8"));

    // Find all goals — shots + own goals
    const shotGoals = events
      .filter(
        (e: any) =>
          e.type?.name === "Shot" && e.shot?.outcome?.name === "Goal"
      )
      .map((e: any) => ({
        player: e.player?.name || "Unknown",
        team: e.team?.name || "Unknown",
        minute: e.minute || 0,
        second: e.second || 0,
        location: e.location || [],
        possession: e.possession || 0,
        isOwnGoal: false,
      }));

    // Own goals — pair "Own Goal For" (benefiting team) with "Own Goal Against" (the player who scored it)
    const ownGoalForEvents = events.filter((e: any) => e.type?.name === "Own Goal For");
    const ownGoalAgainstEvents = events.filter((e: any) => e.type?.name === "Own Goal Against");

    const ownGoals = ownGoalForEvents.map((e: any) => {
      // Find the matching "Own Goal Against" event (same minute)
      const against = ownGoalAgainstEvents.find(
        (a: any) => a.minute === e.minute && Math.abs((a.second || 0) - (e.second || 0)) < 5
      );
      return {
        player: "Own Goal",
        team: e.team?.name || "Unknown",  // team that benefited
        minute: e.minute || 0,
        second: e.second || 0,
        location: e.location || [],
        possession: e.possession || 0,
        isOwnGoal: true,
        ownGoalPlayer: against?.player?.name || "Unknown",  // who actually scored it
        ownGoalTeam: against?.team?.name || "Unknown",       // their team
      };
    });

    // Merge and sort by minute
    const allGoals = [...shotGoals, ...ownGoals]
      .sort((a, b) => a.minute - b.minute || a.second - b.second)
      .map((g, index) => ({ ...g, index }));

    return Response.json({
      matchId: Number(matchId),
      goals: allGoals,
      totalGoals: allGoals.length,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load goals" },
      { status: 500 }
    );
  }
}
