import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

type Filters = {
  league?: string;
  team?: string;
  match?: string;
  type?: string;
  player?: string;
};

const PAGE_SIZE_MAX = 100;

const normalize = (value?: string) => (value ?? "").trim();

const uniqueSorted = (values: Array<string | null>) =>
  Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );

const moveUnknownToEnd = (values: string[]) => {
  const unknownLabels = ["unknown player", "unknown"];
  const [unknown, known] = values.reduce<[string[], string[]]>(
    (acc, value) => {
      if (unknownLabels.includes(value.toLowerCase())) {
        acc[0].push(value);
      } else {
        acc[1].push(value);
      }
      return acc;
    },
    [[], []]
  );
  return [...known, ...unknown];
};

const formatLeagueLabel = (value: string | null) => {
  if (!value) return null;
  if (value === "UEFA Euro") return "UEFA Euro 2024";
  return value;
};

const normalizeLeagueFilter = (value?: string) => {
  if (!value) return value;
  if (value === "UEFA Euro 2024") return "UEFA Euro";
  return value;
};

const parseTitleParts = (title: string | null, momentType?: string) => {
  if (!title) return { player: null, opponent: null };
  if (momentType && title.includes(` ${momentType} vs `)) {
    const player = title.split(` ${momentType} vs `)[0]?.trim();
    return { player: player || null };
  }
  return { player: null };
};

const fetchMomentIdsFromMoments = async (
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let idsQuery = adminSupabase!.from("moments").select("moment_id").limit(5000);
  const leagueFilter = normalizeLeagueFilter(filters.league);
  if (leagueFilter) idsQuery = idsQuery.eq("league", leagueFilter);
  if (filters.match) idsQuery = idsQuery.eq("match_id", filters.match);
  if (filters.type) idsQuery = idsQuery.eq("moment_type", filters.type);
  if (baseIds) idsQuery = idsQuery.in("moment_id", baseIds);
  const { data } = await idsQuery;
  return (data ?? []).map((row) => row.moment_id);
};

const fetchMomentIdsFromLines = async (
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let idsQuery = adminSupabase!.from("data_lines").select("moment_id").limit(10000);
  if (filters.team) idsQuery = idsQuery.eq("team", filters.team);
  if (filters.player) idsQuery = idsQuery.eq("actor", filters.player);
  if (baseIds) idsQuery = idsQuery.in("moment_id", baseIds);
  const { data } = await idsQuery;
  return uniqueSorted((data ?? []).map((row) => row.moment_id));
};

const intersectIds = (a: string[] | null, b: string[] | null) => {
  if (!a && !b) return null;
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  const setB = new Set(b);
  return a.filter((id) => setB.has(id));
};

const fetchMomentFieldOptions = async (
  field: "league" | "match_id" | "moment_type",
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let optionQuery = adminSupabase!
    .from("moments")
    .select(field)
    .order(field, { ascending: true })
    .limit(5000);
  const leagueFilter = normalizeLeagueFilter(filters.league);
  if (leagueFilter) optionQuery = optionQuery.eq("league", leagueFilter);
  if (filters.match) optionQuery = optionQuery.eq("match_id", filters.match);
  if (filters.type) optionQuery = optionQuery.eq("moment_type", filters.type);
  if (baseIds) optionQuery = optionQuery.in("moment_id", baseIds);
  const { data } = await optionQuery;
  return uniqueSorted(
    (data ?? []).map((row) => row[field] as string | null)
  );
};

const fetchLineFieldOptions = async (
  field: "team" | "actor",
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let optionQuery = adminSupabase!
    .from("data_lines")
    .select(field)
    .order(field, { ascending: true })
    .limit(5000);
  if (filters.team) optionQuery = optionQuery.eq("team", filters.team);
  if (filters.player) optionQuery = optionQuery.eq("actor", filters.player);
  if (baseIds) optionQuery = optionQuery.in("moment_id", baseIds);
  const { data } = await optionQuery;
  return uniqueSorted(
    (data ?? []).map((row) => row[field] as string | null)
  );
};

const fetchMomentTitleOptions = async (
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let optionQuery = adminSupabase!
    .from("moments")
    .select("moment_id, title, moment_type")
    .order("timestamp", { ascending: false })
    .limit(5000);
  const leagueFilter = normalizeLeagueFilter(filters.league);
  if (leagueFilter) optionQuery = optionQuery.eq("league", leagueFilter);
  if (filters.match) optionQuery = optionQuery.eq("match_id", filters.match);
  if (filters.type) optionQuery = optionQuery.eq("moment_type", filters.type);
  if (baseIds) optionQuery = optionQuery.in("moment_id", baseIds);
  const { data } = await optionQuery;
  return data ?? [];
};

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    filters?: Filters;
    page?: number;
    pageSize?: number;
  };

  const filters: Filters = {
    league: normalizeLeagueFilter(normalize(body.filters?.league)) || undefined,
    team: normalize(body.filters?.team) || undefined,
    match: normalize(body.filters?.match) || undefined,
    type: normalize(body.filters?.type) || undefined,
    player: normalize(body.filters?.player) || undefined,
  };

  const page = Math.max(1, Number(body.page ?? 1));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(body.pageSize ?? 25))
  );

  const baseIdsForOptions = async (exclude: keyof Filters | null) => {
    const momentFilters: Filters = {
      league: exclude === "league" ? undefined : filters.league,
      match: exclude === "match" ? undefined : filters.match,
      type: exclude === "type" ? undefined : filters.type,
    };
    const lineFilters: Filters = {
      team: exclude === "team" ? undefined : filters.team,
      player: exclude === "player" ? undefined : filters.player,
    };

    const momentFilterActive =
      momentFilters.league || momentFilters.match || momentFilters.type;
    const lineFilterActive = lineFilters.team || lineFilters.player;

    const idsFromMoments = momentFilterActive
      ? await fetchMomentIdsFromMoments(momentFilters)
      : null;
    const idsFromLines = lineFilterActive
      ? await fetchMomentIdsFromLines(lineFilters)
      : null;
    return intersectIds(idsFromMoments, idsFromLines);
  };

  const [leagueBase, teamBase, matchBase, typeBase, playerBase, listBase] =
    await Promise.all([
      baseIdsForOptions("league"),
      baseIdsForOptions("team"),
      baseIdsForOptions("match"),
      baseIdsForOptions("type"),
      baseIdsForOptions("player"),
      baseIdsForOptions(null),
    ]);

  const [leagues, teams, matches, types] = await Promise.all([
    fetchMomentFieldOptions("league", { ...filters, league: undefined }, leagueBase),
    fetchLineFieldOptions("team", { ...filters, team: undefined }, teamBase),
    fetchMomentFieldOptions("match_id", { ...filters, match: undefined }, matchBase),
    fetchMomentFieldOptions("moment_type", { ...filters, type: undefined }, typeBase),
  ]);

  let players: string[] = [];
  if (filters.type) {
    const scopedTitles = await fetchMomentTitleOptions(
      { ...filters, player: undefined },
      playerBase
    );
    players = uniqueSorted(
      scopedTitles
        .map((row) => parseTitleParts(row.title, row.moment_type).player ?? null)
        .filter(Boolean) as string[]
    );
  } else {
    players = await fetchLineFieldOptions(
      "actor",
      { ...filters, player: undefined },
      playerBase
    );
  }
  players = moveUnknownToEnd(players);

  let listIds = listBase;
  if (filters.type && filters.player) {
    const scopedTitles = await fetchMomentTitleOptions(filters, listBase);
    const filteredIds = scopedTitles
      .filter((row) => {
        const parsed = parseTitleParts(row.title, row.moment_type).player;
        return parsed === filters.player;
      })
      .map((row) => row.moment_id);
    listIds = filteredIds;
  }

  let listQuery = adminSupabase!
    .from("moments")
    .select(
      "moment_id, match_id, moment_type, timestamp, league, title, is_live, is_hidden, approved_at",
      {
        count: "exact",
      }
    )
    .order("timestamp", { ascending: false });
  if (filters.league) listQuery = listQuery.eq("league", filters.league);
  if (filters.match) listQuery = listQuery.eq("match_id", filters.match);
  if (filters.type) listQuery = listQuery.eq("moment_type", filters.type);
  if (listIds) {
    if (listIds.length === 0) {
      listQuery = listQuery.eq("moment_id", "__none__");
    } else {
      listQuery = listQuery.in("moment_id", listIds);
    }
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data: moments, count } = await listQuery.range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return NextResponse.json(
    {
      options: {
        leagues: leagues.map((value) => formatLeagueLabel(value) ?? value),
        teams,
        matches,
        types,
        players,
      },
      moments: moments ?? [],
      total,
      page,
      totalPages,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
