import { NextResponse } from "next/server";

import { adminSupabase } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

function uniqueSorted(values: Array<string | null>) {
  return Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b),
  );
}

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

  const parseCompetitionFilter = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^(.*)\s(20\d{2})$/);
    if (!match) return { name: trimmed, season: null };
    return { name: match[1].trim(), season: match[2].trim() };
  };

  const formatCompetitionLabel = (
    name: string | null,
    season: string | null
  ) => {
    if (!name) return null;
    if (name === "UEFA Euro" && season) return `${name} ${season}`;
    return name;
  };

  let matchesQuery = adminSupabase
    .from("matches")
    .select(
      "match_id, competition_name, season_name, home_team_name, away_team_name"
    )
    .limit(2000);

  const parsedCompetition = competition
    ? parseCompetitionFilter(competition)
    : null;

  if (competition) {
    const parsed = parsedCompetition;
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
  const matchIds = uniqueSorted(matchRows?.map((row) => row.match_id) ?? []);

  const normalizedEventType = eventType.toLowerCase();
  const isDerivedEventType =
    normalizedEventType === "goal" || normalizedEventType === "own goal";

  const buildEventsQuery = ({
    includeEventType = true,
    includePlayer = true,
    limit = 10000,
  }: {
    includeEventType?: boolean;
    includePlayer?: boolean;
    limit?: number;
  }) => {
    let query = adminSupabase
      .from("statsbomb_events")
      .select(
        "player_name, event_type, match_id, raw_json, team_name, competition_name",
      )
      .limit(limit);
    if (matchIds.length > 0) {
      query = query.in("match_id", matchIds);
    } else if (matchId) {
      query = query.eq("match_id", matchId);
    }
    if (team) query = query.ilike("team_name", team);
    if (includePlayer && player) query = query.ilike("player_name", player);
    if (includeEventType && eventType) {
      if (isDerivedEventType) {
        const outcome = normalizedEventType === "own goal" ? "Own Goal" : "Goal";
        query = query.or(`raw_json->>shot_outcome.eq.${outcome}`);
      } else {
        query = query.ilike("event_type", eventType);
      }
    }
    return query;
  };

  const buildEventTypeRowsQuery = (limit = 50000) => {
    let query = adminSupabase
      .from("statsbomb_events")
      .select("event_type, raw_json")
      .limit(limit);
    if (matchIds.length > 0) {
      query = query.in("match_id", matchIds);
    } else if (matchId) {
      query = query.eq("match_id", matchId);
    }
    if (team) query = query.ilike("team_name", team);
    return query;
  };

  const buildShotOutcomeQuery = (outcome: "Goal" | "Own Goal") => {
    let query = adminSupabase
      .from("statsbomb_events")
      .select("event_id")
      .limit(1);
    if (matchIds.length > 0) {
      query = query.in("match_id", matchIds);
    } else if (matchId) {
      query = query.eq("match_id", matchId);
    }
    if (team) query = query.ilike("team_name", team);
    if (player) query = query.ilike("player_name", player);
    query = query.or(`raw_json->>shot_outcome.eq.${outcome}`);
    return query;
  };

  const eventTypeLimit =
    competition && !player && !eventType && !matchId ? 200000 : 50000;

  const [eventsForMatches, eventsForTypes, eventsForPlayers, goalRows, ownGoalRows] =
    await Promise.all([
    buildEventsQuery({ includeEventType: true, includePlayer: true, limit: 10000 }),
      buildEventTypeRowsQuery(eventTypeLimit),
      buildEventsQuery({ includeEventType: true, includePlayer: false, limit: 10000 }),
      buildShotOutcomeQuery("Goal"),
      buildShotOutcomeQuery("Own Goal"),
    ]);

  const eventRows = eventsForMatches.data ?? [];
  const eventTypeRows = eventsForTypes.data ?? [];
  const playerRows = eventsForPlayers.data ?? [];

  const competitions = uniqueSorted(
    competition
      ? [competition]
      : matchRows?.length
        ? matchRows?.map((row) =>
            formatCompetitionLabel(row.competition_name, row.season_name),
          )
        : eventTypeRows.map((row) => (row as any).competition_name) ?? [],
  );
  const teams = uniqueSorted(
    matchRows?.length
      ? matchRows.flatMap((row) => [row.home_team_name, row.away_team_name])
      : eventTypeRows.map((row) => (row as any).team_name) ?? [],
  );
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

  const filteredEvents = isDerivedEventType
    ? (eventRows ?? []).filter((row) => {
        const derived = deriveEventType(row);
        return derived?.toLowerCase() === eventType.toLowerCase();
      })
    : eventRows ?? [];

  const matchIdsFromEvents = uniqueSorted(
    filteredEvents.map((row) => row.match_id) ?? [],
  );

  const players = uniqueSorted(
    (playerRows ?? []).map((row) => row.player_name) ?? [],
  );
  let eventTypes = uniqueSorted(
    (eventTypeRows ?? []).map((row) => deriveEventType(row)) ?? [],
  );
  if (eventTypes.length === 0 && eventRows.length > 0) {
    eventTypes = uniqueSorted(eventRows.map((row) => deriveEventType(row)) ?? []);
  }
  if ((goalRows?.data ?? []).length > 0 && !eventTypes.includes("Goal")) {
    eventTypes.push("Goal");
  }
  if ((ownGoalRows?.data ?? []).length > 0 && !eventTypes.includes("Own Goal")) {
    eventTypes.push("Own Goal");
  }

  const matchMap = new Map(
    (matchRows ?? []).map((row) => [
      row.match_id,
      { home: row.home_team_name, away: row.away_team_name },
    ]),
  );
  const matches = matchIdsFromEvents.map((id) => {
    const meta = matchMap.get(id);
    if (!meta) return { id, label: id };
    if (team && meta.home && meta.away) {
      const opponent =
        meta.home.toLowerCase() === team.toLowerCase() ? meta.away : meta.home;
      return { id, label: `${team} vs ${opponent}` };
    }
    if (meta.home && meta.away) {
      return { id, label: `${meta.home} vs ${meta.away}` };
    }
    return { id, label: id };
  });


  return NextResponse.json(
    {
      competitions,
      teams,
      players,
      event_types: eventTypes,
      matches,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
