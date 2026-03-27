import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/adminClient";

const normalize = (value?: string) => (value ?? "").trim();

const toCsvValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const statusFilter = normalize(url.searchParams.get("status") ?? undefined);
  const sourceFilter = normalize(url.searchParams.get("source") ?? undefined);
  const scope = normalize(url.searchParams.get("scope") ?? undefined) || "page";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(
    5000,
    Math.max(1, Number(url.searchParams.get("pageSize") ?? "25"))
  );

  let query = adminSupabase
    .from("ingest_runs")
    .select(
      "id, source, status, records_ingested, records_failed, started_at, finished_at, notes"
    )
    .order("started_at", { ascending: false })
    .limit(5000);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (sourceFilter) query = query.ilike("source", `%${sourceFilter}%`);

  if (scope === "page") {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  const { data } = await query;

  const headers = [
    "id",
    "source",
    "status",
    "records_ingested",
    "records_failed",
    "started_at",
    "finished_at",
    "notes",
  ];

  const rows = (data ?? []).map((run) =>
    headers.map((key) => toCsvValue((run as Record<string, unknown>)[key]))
  );

  const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
    "\n"
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ingest-runs-${timestamp}.csv"`,
    },
  });
}
