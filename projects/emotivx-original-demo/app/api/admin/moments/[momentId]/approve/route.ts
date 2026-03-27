import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ momentId: string }> }
) {
  const { momentId: rawMomentId } = await params;
  const momentId = rawMomentId.trim();

  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }
  const { data, error } = await adminSupabase
    .from("moments")
    .update({
      is_live: true,
      is_hidden: false,
      approved_at: new Date().toISOString(),
    })
    .eq("moment_id", momentId)
    .select("moment_id, is_live, is_hidden, approved_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 }
    );
  }
  if (!data) {
    const { data: exists } = await adminSupabase
      .from("moments")
      .select("moment_id")
      .eq("moment_id", momentId)
      .maybeSingle();
    if (exists) {
      return NextResponse.json(
        {
          error:
            "Moment exists but update was blocked. Check RLS/policies or admin role setup.",
          code: "UPDATE_BLOCKED",
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Moment not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, data });
}
