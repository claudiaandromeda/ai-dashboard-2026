import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type IngestRequest = {
  source: string;
  sport?: string;
  xml: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

async function sha256(payload: string) {
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response("Missing Supabase credentials", { status: 500 });
  }

  let payload: IngestRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!payload?.source || !payload?.xml) {
    return new Response("Missing source or xml", { status: 400 });
  }

  const checksum = await sha256(payload.xml);

  const { data: ingestRun, error: ingestError } = await supabase
    .from("ingest_runs")
    .insert({
      source: payload.source,
      status: "received",
    })
    .select("id")
    .single();

  if (ingestError || !ingestRun) {
    return new Response("Failed to create ingest run", { status: 500 });
  }

  const { data: rawFeed, error: rawError } = await supabase
    .from("raw_feeds")
    .insert({
      ingest_run_id: ingestRun.id,
      source: payload.source,
      sport: payload.sport ?? null,
      payload_xml: payload.xml,
      checksum,
    })
    .select("id")
    .single();

  if (rawError || !rawFeed) {
    return new Response("Failed to store raw feed", { status: 500 });
  }

  return Response.json({
    ingest_run_id: ingestRun.id,
    raw_feed_id: rawFeed.id,
    checksum,
  });
});
