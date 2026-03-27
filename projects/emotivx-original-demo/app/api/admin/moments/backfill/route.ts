import { NextResponse } from "next/server";
import { spawn } from "child_process";
import { adminSupabase } from "@/lib/supabase/adminClient";

type Payload = {
  matchId?: string;
  competitionId?: string;
  seasonId?: string;
};

const normalize = (value?: string) => (value ?? "").trim();

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as Payload;
  const matchId = normalize(body.matchId);
  const competitionId = normalize(body.competitionId);
  const seasonId = normalize(body.seasonId);

  if (!matchId || !competitionId || !seasonId) {
    return NextResponse.json(
      { error: "matchId, competitionId, and seasonId are required." },
      { status: 400 }
    );
  }

  const allow = process.env.ALLOW_ADMIN_COMMANDS === "true";
  const { data: requestRow } = await adminSupabase
    .from("ingest_requests")
    .insert({
      match_id: matchId,
      competition_id: competitionId,
      season_id: seasonId,
      status: allow ? "running" : "queued",
    })
    .select("id")
    .single();

  if (!allow) {
    return NextResponse.json({
      started: false,
      queued: true,
      requestId: requestRow?.id ?? null,
      message: "Request queued. A platform admin will process it.",
    });
  }

  const nodePath = process.execPath;
  const args = [
    "scripts/detect-moments.js",
    matchId,
    competitionId,
    seasonId,
    "--push",
  ];

  const child = spawn(nodePath, args, {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  return NextResponse.json({
    started: true,
    requestId: requestRow?.id ?? null,
  });
}
