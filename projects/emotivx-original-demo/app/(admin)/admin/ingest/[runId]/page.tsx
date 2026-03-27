import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";

type IngestRunDetailPageProps = {
  params: Promise<{ runId: string }>;
  searchParams?: Promise<{
    limit?: string;
  }>;
};

export default async function IngestRunDetailPage({
  params,
  searchParams,
}: IngestRunDetailPageProps) {
  const { runId } = await params;
  const resolvedSearchParams = await searchParams;

  if (!adminSupabase) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-amber-300">Ingest Run</h1>
          <p className="text-white/70">
            Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load data.
          </p>
        </header>
      </section>
    );
  }

  const { data: run } = await adminSupabase
    .from("ingest_runs")
    .select(
      "id, source, status, records_ingested, records_failed, started_at, finished_at, notes"
    )
    .eq("id", runId)
    .maybeSingle();

  const [
    { count: rawCount },
    { count: normalizedCount },
    { count: errorCount },
  ] = await Promise.all([
    adminSupabase
      .from("raw_feeds")
      .select("id", { count: "exact", head: true })
      .eq("ingest_run_id", runId),
    adminSupabase
      .from("normalized_events")
      .select("id", { count: "exact", head: true })
      .eq("ingest_run_id", runId),
    adminSupabase
      .from("ingest_errors")
      .select("id", { count: "exact", head: true })
      .eq("ingest_run_id", runId),
  ]);

  const previewLimit = Math.min(
    200,
    Math.max(5, Number(resolvedSearchParams?.limit ?? "10"))
  );

  const { data: recentErrors } = await adminSupabase
    .from("ingest_errors")
    .select("id, event_id, error_type, message, created_at")
    .eq("ingest_run_id", runId)
    .order("created_at", { ascending: false })
    .limit(previewLimit);

  const { data: rawPreview } = await adminSupabase
    .from("raw_feeds")
    .select("id, source, checksum, received_at")
    .eq("ingest_run_id", runId)
    .order("received_at", { ascending: false })
    .limit(previewLimit);

  const { data: normalizedPreview } = await adminSupabase
    .from("normalized_events")
    .select("id, event_id, match_id, timestamp, league")
    .eq("ingest_run_id", runId)
    .order("timestamp", { ascending: false })
    .limit(previewLimit);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/ingest"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Back to Ingest Runs
        </Link>
        <h1 className="text-2xl font-semibold text-amber-300">Ingest Run</h1>
        <p className="text-white/70">{run?.source}</p>
      </header>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
        <div className="space-y-1 text-sm text-white/70">
          <div>Run ID: {run?.id}</div>
          <div>Status: {run?.status}</div>
          <div>Started: {run?.started_at}</div>
          <div>Finished: {run?.finished_at}</div>
        </div>
        <div className="space-y-1 text-sm text-white/70">
          <div>Records Ingested: {run?.records_ingested}</div>
          <div>Records Failed: {run?.records_failed}</div>
          <div>Raw Feeds: {rawCount ?? 0}</div>
          <div>Normalized Events: {normalizedCount ?? 0}</div>
        </div>
      </div>

      {run?.notes && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          {run.notes}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between text-sm text-white/70">
          <div>
            Errors: <span className="text-rose-300">{errorCount ?? 0}</span>
          </div>
          <Link
            href={`/api/admin/ingest/${runId}/errors/export?limit=${previewLimit}`}
            className="inline-flex items-center rounded-lg border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
          >
            Export Errors CSV
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
        <span>Preview rows:</span>
        {["10", "25", "50", "100"].map((value) => (
          <Link
            key={value}
            href={`/admin/ingest/${runId}?limit=${value}`}
            className={`rounded-full border px-3 py-1 ${
              String(previewLimit) === value
                ? "border-cyan-400/60 text-cyan-200"
                : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            {value}
          </Link>
        ))}
        <span className="ml-auto text-white/40">
          Affecting previews + export limits
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <span>Raw Feeds Export</span>
            <div className="flex gap-2">
              <Link
                href={`/api/admin/ingest/${runId}/raw/export?limit=${previewLimit}`}
                className="inline-flex items-center rounded-lg border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
              >
                CSV
              </Link>
              <Link
                href={`/api/admin/ingest/${runId}/raw/export?format=json&limit=${previewLimit}`}
                className="inline-flex items-center rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
              >
                JSON
              </Link>
            </div>
          </div>
          <div className="text-xs text-white/40">Rows: {rawCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          <div className="flex items-center justify-between">
            <span>Normalized Events Export</span>
            <div className="flex gap-2">
              <Link
                href={`/api/admin/ingest/${runId}/normalized/export?limit=${previewLimit}`}
                className="inline-flex items-center rounded-lg border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
              >
                CSV
              </Link>
              <Link
                href={`/api/admin/ingest/${runId}/normalized/export?format=json&limit=${previewLimit}`}
                className="inline-flex items-center rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
              >
                JSON
              </Link>
            </div>
          </div>
          <div className="text-xs text-white/40">
            Rows: {normalizedCount ?? 0}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="bg-white/5 px-4 py-2 text-xs text-white/60">
            Raw Feeds Preview
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Checksum</th>
                <th className="px-3 py-2">Received</th>
              </tr>
            </thead>
            <tbody>
              {(rawPreview ?? []).map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{row.id}</td>
                  <td className="px-3 py-2 text-white/70">{row.source}</td>
                  <td className="px-3 py-2 text-white/70">{row.checksum}</td>
                  <td className="px-3 py-2 text-white/60">
                    {row.received_at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="bg-white/5 px-4 py-2 text-xs text-white/60">
            Normalized Events Preview
          </div>
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/60">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">League</th>
                <th className="px-3 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {(normalizedPreview ?? []).map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-white">{row.id}</td>
                  <td className="px-3 py-2 text-white/70">{row.event_id}</td>
                  <td className="px-3 py-2 text-white/70">{row.match_id}</td>
                  <td className="px-3 py-2 text-white/70">{row.league}</td>
                  <td className="px-3 py-2 text-white/60">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Error ID</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Message</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {(recentErrors ?? []).map((error) => (
              <tr key={error.id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{error.id}</td>
                <td className="px-4 py-3 text-white/70">{error.event_id}</td>
                <td className="px-4 py-3 text-rose-300">{error.error_type}</td>
                <td className="px-4 py-3 text-white/70">{error.message}</td>
                <td className="px-4 py-3 text-white/60">{error.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
