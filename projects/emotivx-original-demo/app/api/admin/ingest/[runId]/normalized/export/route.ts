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
    Math.max(1, Number(url.searchParams.get("limit") ?? "2000"))
  );

  const { data } = await adminSupabase
    .from("normalized_events")
    .select("id, event_id, match_id, timestamp, sport, league, payload_json")
    .eq("ingest_run_id", runId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (format === "json") {
    return NextResponse.json(data ?? []);
  }

  const headers = [
    "id",
    "event_id",
    "match_id",
    "timestamp",
    "sport",
    "league",
    "payload_json",
  ];
  const rows = (data ?? []).map((row) =>
    headers.map((key) => toCsvValue((row as Record<string, unknown>)[key]))
  );

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ingest-normalized-${runId}-${timestamp}.csv"`,
    },
  });
}
