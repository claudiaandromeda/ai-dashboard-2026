import { getClubs } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const clubs = await getClubs();
    return Response.json(clubs);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return Response.json(
      { error: "Failed to load clubs" },
      { status: 500 }
    );
  }
}
