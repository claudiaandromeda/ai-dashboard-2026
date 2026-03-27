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

  const { count, error: countError } = await adminSupabase
    .from("matches")
    .select("match_id", { count: "exact", head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const { data: latest, error: latestError } = await adminSupabase
    .from("matches")
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);

  if (latestError) {
    return NextResponse.json({ error: latestError.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      count: count ?? 0,
      last_updated_at: latest?.[0]?.updated_at ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
