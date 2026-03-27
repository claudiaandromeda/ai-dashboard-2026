import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

const toCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  const limit = Math.min(
    5000,
    Math.max(1, Number(url.searchParams.get("limit") ?? "5000"))
  );

  const { data } = await adminSupabase
    .from("ingest_errors")
    .select("id, event_id, error_type, message, created_at")
    .eq("ingest_run_id", runId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (format === "json") {
    return NextResponse.json(data ?? []);
  }

  const headers = ["id", "event_id", "error_type", "message", "created_at"];
  const rows = (data ?? []).map((error) =>
    headers.map((key) => toCsvValue((error as Record<string, unknown>)[key]))
  );

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ingest-errors-${runId}-${timestamp}.csv"`,
    },
  });
}
