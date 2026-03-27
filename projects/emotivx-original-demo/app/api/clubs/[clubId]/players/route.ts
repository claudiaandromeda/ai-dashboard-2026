import { getPlayers } from "@/lib/supabase/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const players = await getPlayers(clubId);
    return Response.json(players);
  } catch (error) {
    console.error("Error fetching players:", error);
    return Response.json(
      { error: "Failed to load players" },
      { status: 500 }
    );
  }
}
