"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MomentApprovalActions from "@/components/admin/MomentApprovalActions";
import MomentIdCell from "@/components/admin/MomentIdCell";

type Filters = {
  league: string;
  team: string;
  match: string;
  type: string;
  player: string;
};

type MomentRow = {
  moment_id: string;
  match_id: string;
  moment_type: string;
  timestamp: string;
  league: string;
  title: string;
  is_live: boolean;
  is_hidden: boolean;
  approved_at?: string | null;
};

type FiltersResponse = {
  options: {
    leagues: string[];
    teams: string[];
    matches: string[];
    types: string[];
    players: string[];
  };
  moments: MomentRow[];
  total: number;
  page: number;
  totalPages: number;
};

const PAGE_SIZE = 25;

const parseTitleParts = (title: string | null, momentType?: string) => {
  if (!title) return { player: null, opponent: null };
  const vsIndex = title.lastIndexOf(" vs ");
  const opponent = vsIndex >= 0 ? title.slice(vsIndex + 4).trim() : null;
  if (momentType && title.includes(` ${momentType} vs `)) {
    const player = title.split(` ${momentType} vs `)[0]?.trim();
    return { player: player || null, opponent };
  }
  return { player: null, opponent };
};

const defaultFilters: Filters = {
  league: "",
  team: "",
  match: "",
  type: "",
  player: "",
};

const FilterInput = ({
  label,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  name: keyof Filters;
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (name: keyof Filters, value: string) => void;
}) => {
  const listId = `moments-${name}-list`;
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-white/60">{label}</label>
      <input
        list={listId}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={label}
        disabled={disabled}
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
};

export default function MomentsBrowser() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [options, setOptions] = useState<FiltersResponse["options"]>({
    leagues: [],
    teams: [],
    matches: [],
    types: [],
    players: [],
  });
  const [moments, setMoments] = useState<MomentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [exportScope, setExportScope] = useState<"page" | "all">("page");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (nextFilters: Filters, nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/moments/filters", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            filters: nextFilters,
            page: nextPage,
            pageSize: PAGE_SIZE,
          }),
        });
        if (!response.ok) {
          throw new Error("Failed to load admin moments data.");
        }
        const data = (await response.json()) as FiltersResponse;
        setOptions(data.options);
        setMoments(data.moments);
        setPage(data.page);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(filters, page);
  }, [fetchData, filters, page]);

  const hasFilters = useMemo(
    () => Object.values(filters).some((value) => value.trim().length > 0),
    [filters]
  );

  const handleFilterChange = (name: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleClear = () => {
    setFilters(defaultFilters);
    setPage(1);
  };

  const handleApply = (event: React.FormEvent) => {
    event.preventDefault();
    fetchData(filters, 1);
    setPage(1);
  };

  const buildExportHref = () => {
    const params = new URLSearchParams();
    if (filters.league) params.set("league", filters.league);
    if (filters.team) params.set("team", filters.team);
    if (filters.match) params.set("match", filters.match);
    if (filters.type) params.set("type", filters.type);
    if (filters.player) params.set("player", filters.player);
    params.set("scope", exportScope);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return `/api/admin/moments/export?${params.toString()}`;
  };

  const handleStatusUpdate = (momentId: string, updated?: {
    is_live: boolean;
    is_hidden: boolean;
    approved_at?: string | null;
  }) => {
    if (updated) {
      setMoments((prev) =>
        prev.map((moment) =>
          moment.moment_id === momentId
            ? { ...moment, ...updated }
            : moment
        )
      );
      return;
    }
    fetchData(filters, page);
  };

  return (
    <div className="space-y-6">
      <form
        className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-5"
        onSubmit={handleApply}
      >
        <FilterInput
          label="League"
          name="league"
          value={filters.league}
          options={options.leagues}
          onChange={handleFilterChange}
        />
        <FilterInput
          label="Team"
          name="team"
          value={filters.team}
          options={options.teams}
          onChange={handleFilterChange}
          disabled={options.teams.length === 0}
        />
        <FilterInput
          label="Game"
          name="match"
          value={filters.match}
          options={options.matches}
          onChange={handleFilterChange}
          disabled={options.matches.length === 0}
        />
        <FilterInput
          label="Moment type"
          name="type"
          value={filters.type}
          options={options.types}
          onChange={handleFilterChange}
          disabled={options.types.length === 0}
        />
        <FilterInput
          label="Player"
          name="player"
          value={filters.player}
          options={options.players}
          onChange={handleFilterChange}
          disabled={options.players.length === 0}
        />
        <div className="flex flex-wrap gap-2 md:col-span-5">
          <button
            type="submit"
            className="rounded-lg border border-amber-400/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-400/10"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Clear
          </button>
          <select
            value={exportScope}
            onChange={(event) =>
              setExportScope(event.target.value === "all" ? "all" : "page")
            }
            className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="page">Export: current page</option>
            <option value="all">Export: all rows</option>
          </select>
          <Link
            href={buildExportHref()}
            className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
          >
            Export CSV
          </Link>
          <span className="ml-auto text-xs text-white/50">{total} moments</span>
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && moments.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-white/70">
          {hasFilters
            ? "No moments match the current filters. Try clearing one filter."
            : "No moments found yet. Run an ingest to populate the ledger."}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
              <th className="px-4 py-3">Moment ID</th>
              <th className="px-4 py-3">Opponent</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">League</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {moments.map((moment) => (
              <tr key={moment.moment_id} className="border-t border-white/5">
                <td className="px-4 py-3 text-xs text-white/70">
                  <div className="flex flex-col gap-1">
                    <span>{moment.is_live ? "Live" : "Not live"}</span>
                    {moment.is_hidden && (
                      <span className="text-rose-200">Hidden</span>
                    )}
                    {moment.approved_at && (
                      <span className="text-emerald-200">Approved</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <MomentApprovalActions
                    momentId={moment.moment_id}
                    status={{
                      is_live: moment.is_live,
                      is_hidden: moment.is_hidden,
                      approved_at: moment.approved_at,
                    }}
                    onUpdated={(updated) => handleStatusUpdate(moment.moment_id, updated)}
                    compact
                  />
                </td>
                <td className="px-4 py-3">
                  <MomentIdCell value={moment.moment_id} />
                </td>
                <td className="px-4 py-3 text-white/70">
                  {parseTitleParts(moment.title, moment.moment_type).opponent ??
                    "—"}
                </td>
                <td className="px-4 py-3 text-white">{moment.moment_type}</td>
                <td className="px-4 py-3 text-white/70">{moment.league}</td>
                <td className="px-4 py-3 text-white/70">
                  <Link
                    href={`/admin/moments/${moment.moment_id}`}
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    {moment.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/60">{moment.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-white/70">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
