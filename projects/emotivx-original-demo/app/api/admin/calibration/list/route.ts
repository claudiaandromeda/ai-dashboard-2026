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

  const { data, error } = await adminSupabase
    .from("pitch_calibrations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hydrated = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await adminSupabase.storage
        .from(row.bucket)
        .createSignedUrl(row.image_path, 60 * 60);
      return { ...row, signed_url: signed?.signedUrl ?? null };
    }),
  );

  return NextResponse.json({ data: hydrated }, { headers: { "Cache-Control": "no-store" } });
}
