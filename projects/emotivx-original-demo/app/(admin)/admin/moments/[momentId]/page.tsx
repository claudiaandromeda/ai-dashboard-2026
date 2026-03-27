import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import MomentDataLinesPanel from "@/components/admin/MomentDataLinesPanel";
import CopyPayloadButton from "@/components/admin/CopyPayloadButton";
import BackfillDataLinesCard from "@/components/admin/BackfillDataLinesCard";
import MomentApprovalActions from "@/components/admin/MomentApprovalActions";

type MomentDetailPageProps = {
  params: Promise<{ momentId: string }>;
  searchParams?: Promise<{
    limit?: string;
  }>;
};

export default async function MomentDetailPage({
  params,
  searchParams,
}: MomentDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  if (!adminSupabase) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-amber-300">
            Moment Detail
          </h1>
          <p className="text-white/70">
            Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load data.
          </p>
        </header>
      </section>
    );
  }

  const { data: moment } = await adminSupabase
    .from("moments")
    .select(
      "moment_id, match_id, moment_type, timestamp, league, title, description, venue, ruleset_version, is_live, is_hidden, approved_at"
    )
    .eq("moment_id", resolvedParams.momentId)
    .maybeSingle();

  const { data: matchMeta } = moment?.match_id
    ? await adminSupabase
        .from("matches")
        .select(
          "competition_id, season_id, home_team_name, away_team_name, competition_name, season_name"
        )
        .eq("match_id", moment.match_id)
        .maybeSingle()
    : { data: null };

  const previewLimit = Math.min(
    200,
    Math.max(5, Number(resolvedSearchParams?.limit ?? "10"))
  );

  const { count: dataLineCount } = await adminSupabase
    .from("data_lines")
    .select("id", { count: "exact", head: true })
    .eq("moment_id", resolvedParams.momentId);

  const { data: dataLines } = await adminSupabase
    .from("data_lines")
    .select("sequence, label, actor, team, x, y, timestamp, value, context")
    .eq("moment_id", resolvedParams.momentId)
    .order("sequence", { ascending: true })
    .limit(previewLimit);

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/moments"
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Back to Moment Ledger
        </Link>
        <h1 className="text-2xl font-semibold text-amber-300">Moment Detail</h1>
        <p className="text-white/70">{moment?.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {["10", "25", "50", "100"].map((value) => (
            <Link
              key={value}
              href={`/admin/moments/${resolvedParams.momentId}?limit=${value}`}
              className={`rounded-full border px-3 py-1 ${
                String(previewLimit) === value
                  ? "border-cyan-400/60 text-cyan-200"
                  : "border-white/10 text-white/60 hover:bg-white/5"
              }`}
            >
              {value} rows
            </Link>
          ))}
          <span className="text-white/40">Preview + export limit</span>
          <Link
            href={`/api/admin/moments/${resolvedParams.momentId}/export?limit=${previewLimit}`}
            className="inline-flex items-center rounded-lg border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
          >
            CSV
          </Link>
          <Link
            href={`/api/admin/moments/${resolvedParams.momentId}/export?format=json&limit=${previewLimit}`}
            className="inline-flex items-center rounded-lg border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/10"
          >
            JSON
          </Link>
        </div>
      </header>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
        <div className="text-sm text-white/70">
          <div>Moment ID: {moment?.moment_id}</div>
          <div>Match ID: {moment?.match_id}</div>
          <div>League: {moment?.league}</div>
          <div>Type: {moment?.moment_type}</div>
        </div>
        <div className="text-sm text-white/70">
          <div>Timestamp: {moment?.timestamp}</div>
          <div>Venue: {moment?.venue}</div>
          <div>Ruleset: {moment?.ruleset_version}</div>
          <div>Status: {moment?.is_live ? "Live" : "Not live"}</div>
          {moment?.is_hidden && <div className="text-rose-200">Hidden</div>}
          {moment?.approved_at && (
            <div className="text-emerald-200">Approved</div>
          )}
        </div>
      </div>

      {moment && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs text-white/50">Approval Actions</div>
          <div className="mt-2">
            <MomentApprovalActions
              momentId={moment.moment_id}
              status={{
                is_live: moment.is_live,
                is_hidden: moment.is_hidden,
                approved_at: moment.approved_at,
              }}
              onUpdated={() => {
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            />
          </div>
        </div>
      )}

      {dataLineCount === 0 && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          No data lines found for this moment. If this moment was ingested
          before the transactional insert, re-run the moment detection push to
          backfill data lines.
        </div>
      )}

      <BackfillDataLinesCard
        matchId={moment?.match_id ?? ""}
        initialCompetitionId={matchMeta?.competition_id ?? ""}
        initialSeasonId={matchMeta?.season_id ?? ""}
        initialMatchLabel={
          matchMeta
            ? [matchMeta.home_team_name, matchMeta.away_team_name]
                .filter(Boolean)
                .join(" vs ")
            : ""
        }
      />

      <MomentDataLinesPanel dataLines={dataLines ?? []} />

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Seq</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">X</th>
              <th className="px-4 py-3">Y</th>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Payload</th>
            </tr>
          </thead>
          <tbody>
            {(dataLines ?? []).map((line) => (
              <tr key={line.sequence} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{line.sequence}</td>
                <td className="px-4 py-3 text-white/70">{line.label}</td>
                <td className="px-4 py-3 text-white/70">{line.actor}</td>
                <td className="px-4 py-3 text-white/70">{line.team}</td>
                <td className="px-4 py-3 text-white/70">{line.x}</td>
                <td className="px-4 py-3 text-white/70">{line.y}</td>
                <td className="px-4 py-3 text-white/60">{line.timestamp}</td>
                <td className="px-4 py-3 text-white/60">
                  <details className="cursor-pointer">
                    <summary className="text-xs text-cyan-200">
                      View JSON
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/60 p-2 text-xs text-white/70">
                      {JSON.stringify(
                        { value: line.value, context: line.context },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                  <div className="mt-2">
                    <CopyPayloadButton
                      payload={{ value: line.value, context: line.context }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
