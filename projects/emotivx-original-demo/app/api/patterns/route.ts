import { NextResponse } from "next/server";
import { getPatterns } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const patterns = await getPatterns();
    return NextResponse.json({ ok: true, patterns });
  } catch (err: any) {
    console.error("Patterns fetch error:", err);
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 },
    );
  }
}
