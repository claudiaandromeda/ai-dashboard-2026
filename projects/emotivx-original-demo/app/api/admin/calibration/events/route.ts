import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const competition = searchParams.get("competition") || "";
  const team = searchParams.get("team") || "";
  const player = searchParams.get("player") || "";
  const eventType = searchParams.get("event_type") || "";
  const matchId = searchParams.get("match_id") || "";
  const limit = Number(searchParams.get("limit") || "200");
  const normalizedEventType = eventType.toLowerCase();
  const isDerivedEventType =
    normalizedEventType === "goal" || normalizedEventType === "own goal";

  const parseCompetitionFilter = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.*)\s(20\d{2})$/);
    if (!match) return { name: trimmed, season: null };
    return { name: match[1].trim(), season: match[2].trim() };
  };

  let matchesQuery = adminSupabase
    .from("matches")
    .select("match_id, home_team_name, away_team_name, season_name")
    .limit(2000);

  if (competition) {
    const parsed = parseCompetitionFilter(competition);
    if (parsed?.name) {
      matchesQuery = matchesQuery.ilike("competition_name", parsed.name);
    }
    if (parsed?.season) {
      matchesQuery = matchesQuery.ilike("season_name", parsed.season);
    }
  }
  if (team) {
    matchesQuery = matchesQuery.or(
      `home_team_name.ilike.${team},away_team_name.ilike.${team}`,
    );
  }
  if (matchId) matchesQuery = matchesQuery.eq("match_id", matchId);

  const { data: matchRows } = await matchesQuery;
  const matchIds = Array.from(
    new Set((matchRows ?? []).map((row) => row.match_id).filter(Boolean)),
  );
  if ((competition || team || matchId) && matchIds.length === 0) {
    return NextResponse.json(
      { data: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let query = adminSupabase
    .from("statsbomb_events")
    .select(
      "event_id, match_id, competition_name, team_name, player_name, event_type, minute, second, raw_json",
    )
    .order("match_id", { ascending: true })
    .order("minute", { ascending: false })
    .order("second", { ascending: false })
    .limit(Number.isNaN(limit) ? 50 : limit);

  if (matchIds.length > 0) query = query.in("match_id", matchIds);
  if (team) query = query.ilike("team_name", team);
  if (player) query = query.ilike("player_name", player);
  if (eventType && !isDerivedEventType) query = query.ilike("event_type", eventType);
  if (isDerivedEventType) {
    const outcome = normalizedEventType === "own goal" ? "Own Goal" : "Goal";
    query = query.or(`raw_json->>shot_outcome.eq.${outcome}`);
  }
  if (matchId) query = query.eq("match_id", matchId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ids = (data ?? []).map((row) => row.event_id).filter(Boolean);
  let frameSet = new Set<string>();
  if (ids.length > 0) {
    const { data: frames } = await adminSupabase
      .from("statsbomb_360_frames")
      .select("event_uuid")
      .in("event_uuid", ids);
    frameSet = new Set((frames ?? []).map((row) => row.event_uuid));
  }

  const matchMap = new Map<string, { home?: string; away?: string }>();
  (matchRows ?? []).forEach((row) => {
    matchMap.set(row.match_id, {
      home: row.home_team_name ?? undefined,
      away: row.away_team_name ?? undefined,
    });
  });

  const deriveEventType = (row) => {
    const base = row.event_type ?? "";
    if (String(base).toLowerCase() === "shot") {
      const outcome =
        row.raw_json?.shot?.outcome?.name ||
        row.raw_json?.shot?.outcome ||
        row.raw_json?.shot_outcome_name ||
        row.raw_json?.shot_outcome ||
        "";
      const normalized = String(outcome).toLowerCase();
      if (normalized === "goal") return "Goal";
      if (normalized === "own goal") return "Own Goal";
    }
    return base || null;
  };

  const filtered = isDerivedEventType
    ? (data ?? []).filter((row) => {
        const derived = deriveEventType(row);
        return derived?.toLowerCase() === eventType.toLowerCase();
      })
    : data ?? [];

  const enriched = filtered.map((row) => {
    const meta = matchMap.get(row.match_id);
    let opponent: string | null = null;
    if (meta?.home && meta?.away && row.team_name) {
      opponent =
        meta.home.toLowerCase() === row.team_name.toLowerCase()
          ? meta.away
          : meta.home;
    }
    return {
      ...row,
      has_frame: frameSet.has(row.event_id),
      event_type: deriveEventType(row),
      opponent_name: opponent ?? null,
      match_label:
        meta?.home && meta?.away ? `${meta.home} vs ${meta.away}` : row.match_id,
    };
  });

  return NextResponse.json(
    { data: enriched },
    { headers: { "Cache-Control": "no-store" } },
  );
}
