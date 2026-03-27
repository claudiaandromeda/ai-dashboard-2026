import { notFound } from "next/navigation";
import { getClubById, getPlayers } from "@/lib/supabase/queries";
import { getTeamData } from "@/lib/teams-data";
import TeamPageClient from "./TeamPageClient";

interface Props {
  params: Promise<{ teamId: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { teamId } = await params;

  /* ── Try Supabase first (UUID club id) ── */
  const club = await getClubById(teamId).catch(() => null);

  if (club) {
    const players = await getPlayers(club.id).catch(() => []);

    return (
      <TeamPageClient
        team={{
          id: club.id,
          name: club.name,
          code: club.short_name ?? club.name.slice(0, 3).toUpperCase(),
          primaryColor: club.primary_color ?? "#888888",
          secondaryColor: club.secondary_color ?? "#FFFFFF",
          players: players.map((p) => ({
            id: p.id,
            name: p.name,
            number: p.jersey_number ?? 0,
            position: p.position ?? "—",
          })),
          legends: [],
          matches: [],
        }}
      />
    );
  }

  /* ── Fallback: hardcoded slug lookup (legacy routes) ── */
  const legacy = getTeamData(teamId);
  if (!legacy) notFound();

  return <TeamPageClient team={legacy} />;
}
