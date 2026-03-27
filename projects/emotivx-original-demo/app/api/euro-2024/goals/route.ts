import { NextRequest } from "next/server";
import { loadGoals } from "@/lib/euro2024";

export async function GET(request: NextRequest) {
  try {
    const goals = loadGoals();
    const params = request.nextUrl.searchParams;

    let filtered = goals;

    // Filter by match: ?matchId=3930158
    const matchId = params.get("matchId");
    if (matchId) {
      const id = Number(matchId);
      filtered = filtered.filter((g) => g.match_id === id);
    }

    // Filter by player (partial): ?player=Musiala
    const player = params.get("player");
    if (player) {
      const q = player.toLowerCase();
      filtered = filtered.filter((g) =>
        g.player.toLowerCase().includes(q)
      );
    }

    // Filter by team (partial): ?team=Germany
    const team = params.get("team");
    if (team) {
      const q = team.toLowerCase();
      filtered = filtered.filter((g) =>
        g.team.toLowerCase().includes(q)
      );
    }

    return Response.json(filtered);
  } catch (error) {
    console.error("Error loading Euro 2024 goals:", error);
    return Response.json(
      { error: "Failed to load goals data" },
      { status: 500 }
    );
  }
}
