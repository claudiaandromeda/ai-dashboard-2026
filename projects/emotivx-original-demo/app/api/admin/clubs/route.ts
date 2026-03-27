import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const [clubsRes, playersRes] = await Promise.all([
    adminSupabase.from("clubs").select("*").order("name"),
    adminSupabase
      .from("players")
      .select("club_id")
      .eq("active", true),
  ]);

  if (clubsRes.error) {
    return NextResponse.json(
      { error: clubsRes.error.message },
      { status: 500 },
    );
  }

  // Build player count map
  const countMap: Record<string, number> = {};
  for (const p of playersRes.data ?? []) {
    if (p.club_id) {
      countMap[p.club_id] = (countMap[p.club_id] ?? 0) + 1;
    }
  }

  const clubs = (clubsRes.data ?? []).map((c) => ({
    ...c,
    player_count: countMap[c.id] ?? 0,
  }));

  return NextResponse.json({ data: clubs });
}

export async function PATCH(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { id, primary_color, secondary_color, accent_color } = body;

  if (!id) {
    return NextResponse.json(
      { error: "Club id is required." },
      { status: 400 },
    );
  }

  const updates: Record<string, string | null> = {};
  if (primary_color !== undefined) updates.primary_color = primary_color;
  if (secondary_color !== undefined) updates.secondary_color = secondary_color;
  if (accent_color !== undefined) updates.accent_color = accent_color;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  const { data, error } = await adminSupabase
    .from("clubs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 500 },
    );
  }

  return NextResponse.json({ data });
}
