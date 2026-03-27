import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const clubId = url.searchParams.get("club_id")?.trim();

  let query = adminSupabase
    .from("players")
    .select("*")
    .eq("active", true)
    .order("jersey_number");

  if (clubId) {
    query = query.eq("club_id", clubId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { name, club_id, position, jersey_number } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Player name is required." },
      { status: 400 },
    );
  }

  const { data, error } = await adminSupabase
    .from("players")
    .insert({
      name: name.trim(),
      club_id: club_id || null,
      position: position || null,
      jersey_number: jersey_number ?? null,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 500 },
    );
  }

  return NextResponse.json({ data }, { status: 201 });
}
