import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

type Filters = {
  league?: string;
  team?: string;
  match?: string;
  type?: string;
  player?: string;
};

const PAGE_SIZE_MAX = 2000;

const normalize = (value?: string) => (value ?? "").trim();

const uniqueSorted = (values: Array<string | null>) =>
  Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );

const parseTitleParts = (title: string | null, momentType?: string) => {
  if (!title) return { player: null };
  if (momentType && title.includes(` ${momentType} vs `)) {
    const player = title.split(` ${momentType} vs `)[0]?.trim();
    return { player: player || null };
  }
  return { player: null };
};

const toCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const fetchMomentIdsFromMoments = async (
  filters: Filters,
  baseIds?: string[] | null
) => {
  if (baseIds && baseIds.length === 0) return [];
  let idsQuery = adminSupabase!.from("moments").select("moment_id").limit(5000);
  if (filters.league) idsQuery = idsQuery.eq("league", filters.league);
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
  if (filters.league) optionQuery = optionQuery.eq("league", filters.league);
  if (filters.match) optionQuery = optionQuery.eq("match_id", filters.match);
  if (filters.type) optionQuery = optionQuery.eq("moment_type", filters.type);
  if (baseIds) optionQuery = optionQuery.in("moment_id", baseIds);
  const { data } = await optionQuery;
  return data ?? [];
};

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const filters: Filters = {
    league: normalize(url.searchParams.get("league") ?? undefined) || undefined,
    team: normalize(url.searchParams.get("team") ?? undefined) || undefined,
    match: normalize(url.searchParams.get("match") ?? undefined) || undefined,
    type: normalize(url.searchParams.get("type") ?? undefined) || undefined,
    player: normalize(url.searchParams.get("player") ?? undefined) || undefined,
  };

  const scope = normalize(url.searchParams.get("scope") ?? undefined) || "page";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? "25"))
  );

  const momentFilterActive = filters.league || filters.match || filters.type;
  const lineFilterActive = filters.team || filters.player;

  const idsFromMoments = momentFilterActive
    ? await fetchMomentIdsFromMoments(filters)
    : null;
  const idsFromLines = lineFilterActive
    ? await fetchMomentIdsFromLines(filters)
    : null;
  let listIds = intersectIds(idsFromMoments, idsFromLines);

  if (filters.type && filters.player) {
    const scopedTitles = await fetchMomentTitleOptions(filters, listIds);
    const filteredIds = scopedTitles
      .filter((row) => {
        const parsed = parseTitleParts(row.title, row.moment_type).player;
        return parsed === filters.player;
      })
      .map((row) => row.moment_id);
    listIds = filteredIds;
  }

  let query = adminSupabase!
    .from("moments")
    .select(
      "moment_id, match_id, moment_type, timestamp, league, title, is_live, is_hidden, approved_at"
    )
    .order("timestamp", { ascending: false })
    .limit(5000);

  if (filters.league) query = query.eq("league", filters.league);
  if (filters.match) query = query.eq("match_id", filters.match);
  if (filters.type) query = query.eq("moment_type", filters.type);
  if (listIds) {
    if (listIds.length === 0) {
      query = query.eq("moment_id", "__none__");
    } else {
      query = query.in("moment_id", listIds);
    }
  }

  if (scope === "page") {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data } = await query;

  const headers = [
    "moment_id",
    "match_id",
    "moment_type",
    "timestamp",
    "league",
    "title",
    "is_live",
    "is_hidden",
    "approved_at",
  ];

  const rows = (data ?? []).map((moment) =>
    headers.map((key) => toCsvValue((moment as Record<string, unknown>)[key]))
  );

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="moments-${timestamp}.csv"`,
    },
  });
}
