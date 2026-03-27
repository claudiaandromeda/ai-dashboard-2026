import { NextRequest } from "next/server";
import { loadMatches, loadGoals } from "@/lib/euro2024";

/**
 * GET /api/euro-2024/goals/[goalId]
 *
 * goalId format: "{match_id}-{minute}-{second}"
 * e.g. "3930158-9-55" → Florian Wirtz, 9'55"
 *
 * Returns the goal + its match context.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ goalId: string }> },
) {
  try {
    const { goalId } = await params;
    const parts = goalId.split("-");
    if (parts.length < 3) {
      return Response.json(
        { error: "Invalid goalId format. Expected: matchId-minute-second" },
        { status: 400 },
      );
    }

    const matchId = Number(parts[0]);
    const minute = Number(parts[1]);
    const second = Number(parts[2]);

    const goals = loadGoals();
    const goal = goals.find(
      (g) =>
        g.match_id === matchId &&
        g.minute === minute &&
        g.second === second,
    );

    if (!goal) {
      return Response.json({ error: "Goal not found" }, { status: 404 });
    }

    const matches = loadMatches();
    const match = matches.find((m) => m.id === matchId);

    // Generate synthetic trajectory points for the goal
    // Since we don't have StatsBomb event-level coordinates in the public data,
    // we generate a plausible trajectory based on goal metadata
    const trajectory = generateGoalTrajectory(goal, match);

    return Response.json({
      goal,
      match: match ?? null,
      goalId,
      trajectory,
    });
  } catch (error) {
    console.error("Error loading goal:", error);
    return Response.json(
      { error: "Failed to load goal data" },
      { status: 500 },
    );
  }
}

/**
 * Generate a plausible ball trajectory for a goal based on play pattern.
 * Returns normalised 0-1 coordinates (pitch space).
 *
 * Pitch: x=0 is own goal line, x=1 is opposition goal, y=0..1 is width.
 */
function generateGoalTrajectory(
  goal: { play_pattern: string; body_part: string; minute: number; second: number; technique: string },
  _match: any,
): [number, number][] {
  // Use a deterministic seed from minute + second
  const seed = goal.minute * 60 + goal.second;
  const rng = seededRandom(seed);

  const pattern = goal.play_pattern;
  const isHeader = goal.body_part === "Head";

  // All trajectories end near the opposition goal (x ≈ 0.95, y ≈ 0.4-0.6)
  const goalX = 0.95;
  const goalY = 0.4 + rng() * 0.2;

  switch (pattern) {
    case "From Corner":
      return cornerTrajectory(goalX, goalY, rng, isHeader);
    case "From Free Kick":
      return freeKickTrajectory(goalX, goalY, rng, isHeader);
    case "From Counter":
      return counterTrajectory(goalX, goalY, rng);
    case "From Throw In":
      return throwInTrajectory(goalX, goalY, rng);
    case "From Goal Kick":
      return goalKickTrajectory(goalX, goalY, rng);
    case "From Keeper":
      return keeperTrajectory(goalX, goalY, rng);
    case "Regular Play":
    default:
      return regularPlayTrajectory(goalX, goalY, rng);
  }
}

function cornerTrajectory(gx: number, gy: number, rng: () => number, isHeader: boolean): [number, number][] {
  const side = rng() > 0.5 ? 0.05 : 0.95; // near/far post corner
  return [
    [0.95, side],                           // corner spot
    [0.85, 0.3 + rng() * 0.4],             // ball flight into box
    [0.88, 0.35 + rng() * 0.3],            // headed/volleyed
    [gx, gy],                               // goal
  ];
}

function freeKickTrajectory(gx: number, gy: number, rng: () => number, isHeader: boolean): [number, number][] {
  const dist = 0.65 + rng() * 0.15; // free kick distance from goal
  if (isHeader) {
    return [
      [dist, 0.2 + rng() * 0.6],           // free kick spot
      [0.88, 0.35 + rng() * 0.3],          // cross delivery
      [0.9, 0.4 + rng() * 0.2],            // header contact
      [gx, gy],
    ];
  }
  return [
    [dist, 0.35 + rng() * 0.3],            // free kick spot
    [0.82, 0.38 + rng() * 0.24],           // curve
    [gx, gy],
  ];
}

function counterTrajectory(gx: number, gy: number, rng: () => number): [number, number][] {
  return [
    [0.3, 0.3 + rng() * 0.4],              // start in own half
    [0.5, 0.2 + rng() * 0.6],              // midfield carry
    [0.65, 0.25 + rng() * 0.5],            // through ball
    [0.8, 0.3 + rng() * 0.4],              // into box
    [gx, gy],
  ];
}

function throwInTrajectory(gx: number, gy: number, rng: () => number): [number, number][] {
  const side = rng() > 0.5 ? 0.05 : 0.95;
  return [
    [0.75 + rng() * 0.1, side],            // throw in position
    [0.8, 0.3 + rng() * 0.4],              // receive
    [0.85, 0.35 + rng() * 0.3],            // pass/cross
    [gx, gy],
  ];
}

function goalKickTrajectory(gx: number, gy: number, rng: () => number): [number, number][] {
  return [
    [0.05, 0.4 + rng() * 0.2],             // goal kick
    [0.35, 0.3 + rng() * 0.4],             // long ball
    [0.6, 0.25 + rng() * 0.5],             // second ball
    [0.8, 0.3 + rng() * 0.4],              // shot position
    [gx, gy],
  ];
}

function keeperTrajectory(gx: number, gy: number, rng: () => number): [number, number][] {
  return [
    [0.05, 0.45 + rng() * 0.1],            // keeper distribution
    [0.4, 0.3 + rng() * 0.4],              // midfield
    [0.65, 0.25 + rng() * 0.5],            // final third
    [0.82, 0.35 + rng() * 0.3],            // shot
    [gx, gy],
  ];
}

function regularPlayTrajectory(gx: number, gy: number, rng: () => number): [number, number][] {
  return [
    [0.55, 0.2 + rng() * 0.6],             // build-up
    [0.65, 0.25 + rng() * 0.5],            // progression
    [0.78, 0.3 + rng() * 0.4],             // final pass
    [0.85, 0.35 + rng() * 0.3],            // shot
    [gx, gy],
  ];
}

/** Simple seeded PRNG (mulberry32). */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
