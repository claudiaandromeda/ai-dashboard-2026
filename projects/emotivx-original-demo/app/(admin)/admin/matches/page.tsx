import Link from "next/link";
import { adminSupabase } from "@/lib/supabase/adminClient";
import MatchesSyncButton from "@/components/admin/MatchesSyncButton";

type MatchesPageProps = {
  searchParams?: Promise<{
    team?: string;
    competition?: string;
  }>;
};

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  if (!adminSupabase) {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-amber-300">Matches</h1>
          <p className="text-white/70">
            Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to load data.
          </p>
        </header>
      </section>
    );
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const teamFilter = (resolvedParams?.team ?? "").trim();
  const competitionFilter = (resolvedParams?.competition ?? "").trim();

  const uniqueSorted = (values: Array<string | null>) =>
    Array.from(new Set(values.filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b)
    );

  const { data: competitionRows } = await adminSupabase
    .from("matches")
    .select("competition_name")
    .order("competition_name", { ascending: true })
    .limit(500);
  const { data: teamRows } = await adminSupabase
    .from("matches")
    .select("home_team_name, away_team_name")
    .limit(500);

  const competitionOptions = uniqueSorted(
    (competitionRows ?? []).map((row) => row.competition_name)
  );
  const teamOptions = uniqueSorted(
    (teamRows ?? [])
      .flatMap((row) => [row.home_team_name, row.away_team_name])
      .filter(Boolean) as string[]
  );

  let query = adminSupabase
    .from("matches")
    .select(
      "match_id, competition_name, season_name, home_team_name, away_team_name, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200);

  if (competitionFilter)
    query = query.eq("competition_name", competitionFilter);
  if (teamFilter) {
    query = query.or(
      `home_team_name.eq.${teamFilter},away_team_name.eq.${teamFilter}`
    );
  }

  const { data: matches } = await query;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-amber-300">Matches</h1>
        <p className="text-white/70">
          Match metadata stored in Supabase. This is the source for backfill and
          admin tooling.
        </p>
        <MatchesSyncButton />
      </header>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-3">
        <select
          name="competition"
          defaultValue={competitionFilter}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Competition</option>
          {competitionOptions.map((competition) => (
            <option key={competition} value={competition}>
              {competition}
            </option>
          ))}
        </select>
        <select
          name="team"
          defaultValue={teamFilter}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
        >
          <option value="">Team</option>
          {teamOptions.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg border border-amber-400/40 px-4 py-2 text-sm text-amber-200 hover:bg-amber-400/10"
          >
            Apply Filters
          </button>
          <Link
            href="/admin/matches"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/5"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm" suppressHydrationWarning>
          <thead className="bg-white/5 text-white/70">
            <tr>
              <th className="px-4 py-3">Match ID</th>
              <th className="px-4 py-3">Competition</th>
              <th className="px-4 py-3">Season</th>
              <th className="px-4 py-3">Home</th>
              <th className="px-4 py-3">Away</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(matches ?? []).map((match) => (
              <tr key={match.match_id} className="border-t border-white/5">
                <td className="px-4 py-3 text-white">{match.match_id}</td>
                <td className="px-4 py-3 text-white/70">
                  {match.competition_name}
                </td>
                <td className="px-4 py-3 text-white/70">{match.season_name}</td>
                <td className="px-4 py-3 text-white/70">
                  {match.home_team_name}
                </td>
                <td className="px-4 py-3 text-white/70">
                  {match.away_team_name}
                </td>
                <td className="px-4 py-3 text-white/60">{match.updated_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
