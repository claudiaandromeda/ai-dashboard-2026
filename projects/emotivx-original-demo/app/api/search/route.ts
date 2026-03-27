import { supabase } from "@/lib/supabase/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ clubs: [], players: [], competitions: [] });
  }

  const pattern = `%${q}%`;

  try {
    const [clubsRes, playersRes, competitionsRes] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, name, short_name, primary_color")
        .ilike("name", pattern)
        .limit(5),
      supabase
        .from("players")
        .select("id, name, position, club_id, clubs(name)")
        .ilike("name", pattern)
        .eq("active", true)
        .limit(5),
      supabase
        .from("competitions")
        .select("id, name, short_name, country, season")
        .ilike("name", pattern)
        .eq("active", true)
        .limit(5),
    ]);

    if (clubsRes.error) throw clubsRes.error;
    if (playersRes.error) throw playersRes.error;
    if (competitionsRes.error) throw competitionsRes.error;

    return Response.json({
      clubs: clubsRes.data,
      players: playersRes.data,
      competitions: competitionsRes.data,
    });
  } catch (error) {
    console.error("Search error:", error);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
