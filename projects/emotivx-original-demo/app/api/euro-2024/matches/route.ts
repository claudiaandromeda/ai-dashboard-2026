import { NextRequest } from "next/server";
import { loadMatches, loadGoals } from "@/lib/euro2024";

export async function GET(request: NextRequest) {
  try {
    const matches = loadMatches();
    const goals = loadGoals();
    const params = request.nextUrl.searchParams;

    let filtered = matches;

    // Filter by stage slug: ?stage=group_a, ?stage=quarter_finals
    const stage = params.get("stage");
    if (stage) {
      filtered = filtered.filter((m) => m.stage_slug === stage);
    }

    // Filter by team name (partial match): ?team=Germany
    const team = params.get("team");
    if (team) {
      const q = team.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.home_team.toLowerCase().includes(q) ||
          m.away_team.toLowerCase().includes(q)
      );
    }

    // Nest goals into each match
    const goalsByMatch = new Map<number, typeof goals>();
    for (const g of goals) {
      const arr = goalsByMatch.get(g.match_id) || [];
      arr.push(g);
      goalsByMatch.set(g.match_id, arr);
    }

    const result = filtered.map((m) => ({
      ...m,
      goals: goalsByMatch.get(m.id) || [],
    }));

    return Response.json(result);
  } catch (error) {
    console.error("Error loading Euro 2024 matches:", error);
    return Response.json(
      { error: "Failed to load match data" },
      { status: 500 }
    );
  }
}
