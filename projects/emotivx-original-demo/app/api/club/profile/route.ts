import { createServerClient } from "@/lib/supabase/auth-server";
import { supabase } from "@/lib/supabase/client";

const WREXHAM_DEMO_NAME = "Wrexham AFC";

export async function GET() {
  try {
    const serverClient = await createServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    let teamName: string | null = null;

    if (user) {
      // Look up admin_users row for this user
      const { data: adminRow } = await serverClient
        .from("admin_users")
        .select("role, team_name")
        .eq("user_id", user.id)
        .in("role", ["team_admin", "platform_admin"])
        .maybeSingle();

      if (adminRow?.team_name) {
        teamName = adminRow.team_name;
      }
    }

    // Demo fallback: default to Wrexham AFC
    if (!teamName) teamName = WREXHAM_DEMO_NAME;

    // Fetch club by name (public read — anon client is fine)
    const { data: club, error: clubErr } = await supabase
      .from("clubs")
      .select("*")
      .eq("name", teamName)
      .maybeSingle();

    if (clubErr) throw clubErr;
    if (!club) {
      return Response.json({ error: "Club not found" }, { status: 404 });
    }

    // Fetch counts in parallel
    const [playerRes, momentRes] = await Promise.all([
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("club_id", club.id)
        .eq("active", true),
      supabase
        .from("moments")
        .select("moment_id", { count: "exact", head: true })
        .eq("team_name", teamName),
    ]);

    const playerCount = playerRes.count ?? 0;
    const momentCount = momentRes.count ?? 0;

    return Response.json({
      club,
      stats: {
        playerCount,
        momentCount,
      },
      teamName,
      isDemo: teamName === WREXHAM_DEMO_NAME && !user,
    });
  } catch (err) {
    console.error("Club profile error:", err);
    return Response.json(
      { error: "Failed to load club profile" },
      { status: 500 },
    );
  }
}
