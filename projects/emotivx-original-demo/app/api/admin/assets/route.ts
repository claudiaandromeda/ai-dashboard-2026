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
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

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
  const { name, club_id, type, url: assetUrl, mime_type } = body;

  if (!name?.trim() || !assetUrl?.trim()) {
    return NextResponse.json(
      { error: "Name and URL are required." },
      { status: 400 },
    );
  }

  const validTypes = ["logo", "crest", "sponsor", "kit", "other"];
  if (type && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  const { data, error } = await adminSupabase
    .from("assets")
    .insert({
      name: name.trim(),
      club_id: club_id || null,
      type: type || "other",
      url: assetUrl.trim(),
      mime_type: mime_type || null,
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
