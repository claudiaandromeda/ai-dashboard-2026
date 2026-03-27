import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/wrexham/generate
 * Generates artwork from 360 premium data — with 3D height
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const matchId = body.matchId || 1377475;

    // Get scoring team colours from Supabase
    const { data: match } = await supabase
      .from("matches")
      .select("home_team_id, away_team_id")
      .eq("id", matchId)
      .single();

    // Figure out which team scored this goal
    let scoringTeamId: number | null = null;
    try {
      const filePath = join(process.cwd(), "data", "statsbomb", "events", `${matchId}.json`);
      const data = JSON.parse(readFileSync(filePath, "utf-8"));
      const goals = data.events
        .filter((e: any) => e.goal_for != null && e.goal_for !== 0)
        .sort((a: any, b: any) => a.minute - b.minute || (a.second || 0) - (b.second || 0));
      const goal = goals[body.goalIndex || 0];
      if (goal) scoringTeamId = goal.team_id;
    } catch {}

    if (!scoringTeamId && match) scoringTeamId = match.home_team_id;

    const isHomeTeam = match ? scoringTeamId === match.home_team_id : true;
    const kitType = body.invertColors
      ? (isHomeTeam ? "away" : "home")
      : (isHomeTeam ? "home" : "away");

    const { data: kit } = await supabase
      .from("team_kits")
      .select("primary_color, secondary_color, accent_color, background_color")
      .eq("team_id", scoringTeamId)
      .eq("kit_type", kitType)
      .eq("season_id", 317)  // Championship 2025/26
      .single();

    const pythonScript = join(process.cwd(), "art_engine", "api_generate.py");

    const styleMap: Record<string, string> = {
      pebbles: "pebbles",
      broken_glass: "broken_glass",
      spider_web: "spider_web",
      honeycomb: "honeycomb",
      street: "honeycomb",
      geometric: "pebbles",
      futuristic: "spider_web",
    };

    const pythonArgs = JSON.stringify({
      primary: kit?.primary_color || "#E4002B",
      secondary: kit?.secondary_color || "#FFFFFF",
      accent: kit?.accent_color || "#000000",
      background: kit?.background_color || "#1A0A0A",
      style: styleMap[body.style] || "pebbles",
      bgDetail: body.bgDetail || 50,
      dataDetail: body.dataDetail || 50,
      bloom: body.bloom || 50,
      intensity: body.intensity || 50,
      dataScale: body.dataScale || 50,
      motifScale: body.motifScale || 50,
      repeatSize: body.repeatSize || 0,
      repeatMode: body.repeatMode || "tiled",
      randomRotate: body.randomRotate || false,
      rotation: body.rotation || 0,
      invertColors: false,
      showMarkers: body.showMarkers !== false,
      markerSize: body.markerSize || 50,
      seed: body.seed || 42,
      edgeVisibility: body.edgeVisibility || 30,
      gradient: body.gradient || "none",
      secondaryAccent: body.secondaryAccent || 0,
      matchId: matchId,
      momentIndex: body.goalIndex || 0,
      buildupDepth: body.buildupDepth || 100,
      format360: true,  // Tell Python to use 360 extractor
      width: body.width || 1024,
      height: body.width || 1024,
      outputPath: "/tmp/emotivx_wrexham.png",
    });

    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
      const proc = spawn("python3", [pythonScript, pythonArgs], {
        cwd: process.cwd(),
        env: { ...process.env, PYTHONPATH: process.cwd() },
      });
      const chunks: Buffer[] = [];
      let stderr = "";
      proc.stdout.on("data", (d: Buffer) => chunks.push(d));
      proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });
      proc.on("close", (code: number) => {
        if (code !== 0) return reject(new Error(`Python failed (${code}): ${stderr}`));
        const output = Buffer.concat(chunks).toString("utf-8").trim();
        if (output === "OK") {
          try {
            resolve(readFileSync("/tmp/emotivx_wrexham.png"));
          } catch { reject(new Error("Output file not found")); }
        } else { reject(new Error(`Unexpected output: ${output.slice(0, 200)}`)); }
      });
    });

    const base64 = imageBuffer.toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;

    // Get match display info
    const matchInfo = match
      ? await supabase.from("matches").select("home_score, away_score").eq("id", matchId).single()
      : null;

    return Response.json({
      imageUrl,
      match: `Wrexham ${matchInfo?.data?.home_score ?? 5} - ${matchInfo?.data?.away_score ?? 3} Ipswich Town`,
      format: "360",
      stats: {
        home_passes: 0,
        away_passes: 0,
        home_shots: 0,
        away_shots: 0,
        home_possession: 50,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Wrexham generate error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
