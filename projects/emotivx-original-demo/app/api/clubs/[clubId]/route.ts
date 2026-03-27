import { getClubById, getPlayers } from "@/lib/supabase/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const club = await getClubById(clubId);

    if (!club) {
      return Response.json({ error: "Club not found" }, { status: 404 });
    }

    const players = await getPlayers(clubId);

    return Response.json({ ...club, players });
  } catch (error) {
    console.error("Error fetching club:", error);
    return Response.json(
      { error: "Failed to load club" },
      { status: 500 }
    );
  }
}
