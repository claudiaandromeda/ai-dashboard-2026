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

  const { searchParams } = new URL(request.url);
  const eventUuid = searchParams.get("event_uuid");
  if (!eventUuid) {
    return NextResponse.json({ error: "Missing event_uuid." }, { status: 400 });
  }

  const { data: anchor, error: anchorError } = await adminSupabase
    .from("statsbomb_events")
    .select("match_id, minute, second, period")
    .eq("event_id", eventUuid)
    .single();

  if (anchorError || !anchor) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const minMinute = Math.max(0, (anchor.minute ?? 0) - 2);
  const maxMinute = (anchor.minute ?? 0) + 1;

  const { data: events, error } = await adminSupabase
    .from("statsbomb_events")
    .select(
      "event_id, minute, second, period, team_name, player_name, event_type",
    )
    .eq("match_id", anchor.match_id)
    .gte("minute", minMinute)
    .lte("minute", maxMinute)
    .order("minute", { ascending: false })
    .order("second", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { anchor, data: events ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
