import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

type IngestRunsPageProps = {
  searchParams?: Promise<{
    status?: string;
    source?: string;
    scope?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 25;

const statusStyles: Record<string, string> = {
  success: "text-emerald-300",
  completed: "text-emerald-300",
  failed: "text-rose-300",
  error: "text-rose-300",
  running: "text-amber-200",
  pending: "text-amber-200",
};

export default async function IngestRunsPage({
  searchParams: searchParamsPromise,
}: IngestRunsPageProps) {
  const searchParams = await searchParamsPromise;
  if (!adminSupabase) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-amber-300">Ingest Runs</h1>
          <p className="text-white/70">
            Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load data.
          </p>
        </header>
      </section>
    );
  }

  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const statusFilter = (searchParams?.status ?? "").trim();
  const sourceFilter = (searchParams?.source ?? "").trim();
  const scopeFilter = (searchParams?.scope ?? "page").trim();

  const uniqueSorted = (values: Array<string | null>) =>
    Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b)
    );

  const { data: statusRows } = await adminSupabase
    .from("ingest_runs")
    .select("status")
    .order("status", { ascending: true })
    .limit(500);
  const { data: sourceRows } = await adminSupabase
    .from("ingest_runs")
    .select("source")
    .order("source", { ascending: true })
    .limit(500);

  const statusOptions = uniqueSorted((statusRows ?? []).map((row) => row.status));
  const sourceOptions = uniqueSorted((sourceRows ?? []).map((row) => row.source));

  let query = adminSupabase
    .from("ingest_runs")
    .select(
      "id, source, status, records_ingested, records_failed, started_at, finished_at",
      { count: "exact" }
    )
    .order("started_at", { ascending: false });

  if (statusFilter) query = query.eq("status", statusFilter);
  if (sourceFilter) query = query.ilike("source", `%${sourceFilter}%`);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: ingestRuns, count } = await query.range(from, to);
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ingestedTotal = (ingestRuns ?? []).reduce(
    (sum, run) => sum + (run.records_ingested ?? 0),
    0
  );
  const failedTotal = (ingestRuns ?? []).reduce(
    (sum, run) => sum + (run.records_failed ?? 0),
    0
  );

  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (sourceFilter) params.set("source", sourceFilter);
    params.set("page", String(nextPage));
    return `/admin/ingest?${params.toString()}`;
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-amber-300">Ingest Runs</h1>
        <p className="text-white/70">
          Operational view of incoming XML feeds and ingestion performance.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Total Runs</div>
          <div className="text-2xl text-white">{total}</div>
          <div className="text-xs text-white/40">Filtered view</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Records Ingested</div>
          <div className="text-2xl text-emerald-300">{ingestedTotal}</div>
          <div className="text-xs text-white/40">Current page</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Records Failed</div>
          <div className="text-2xl text-rose-300">{failedTotal}</div>
          <div className="text-xs text-white/40">Current page</div>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-4">
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={sourceFilter}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Source</option>
          {sourceOptions.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
        <select
          name="scope"
          defaultValue={scopeFilter}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="page">Export: current page</option>
          <option value="all">Export: all rows</option>
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-lg border border-amber-400/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-400/10"
          >
            Apply Filters
          </button>
          <Link
            href="/admin/ingest"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Clear
          </Link>
          <Link
            href={`/api/admin/ingest/export?${new URLSearchParams({
              ...(statusFilter ? { status: statusFilter } : {}),
              ...(sourceFilter ? { source: sourceFilter } : {}),
              ...(scopeFilter ? { scope: scopeFilter } : {}),
              page: String(page),
              pageSize: String(PAGE_SIZE),
            }).toString()}`}
            className="rounded-lg border border-cyan-400/40 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-400/10"
          >
            Export CSV
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Run ID</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ingested</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Started</th>
              <th className="px-4 py-3">Finished</th>
            </tr>
          </thead>
          <tbody>
            {(ingestRuns ?? []).map((run) => (
              <tr key={run.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">
                  <Link
                    href={`/admin/ingest/${run.id}`}
                    className="text-cyan-300 hover:text-cyan-200"
                  >
                    {run.id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-white/70">{run.source}</td>
                <td
                  className={`px-4 py-3 ${
                    statusStyles[run.status] ?? "text-white/70"
                  }`}
                >
                  {run.status}
                </td>
                <td className="px-4 py-3 text-white">
                  {run.records_ingested}
                </td>
                <td className="px-4 py-3 text-rose-300">
                  {run.records_failed}
                </td>
                <td className="px-4 py-3 text-white/60">{run.started_at}</td>
                <td className="px-4 py-3 text-white/60">{run.finished_at}</td>
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
          {page > 1 && (
            <Link
              href={buildPageHref(page - 1)}
              className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5"
            >
              Prev
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildPageHref(page + 1)}
              className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5"
            >
              Next
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
