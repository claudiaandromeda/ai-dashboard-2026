import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/moments/player-map
 *
 * 1. Forwards request to Claudia art engine /generate-player-map
 * 2. Receives base64 PNG back
 * 3. Uploads to Supabase generated-art bucket
 * 4. Returns permanent public URL + stats
 */
export async function POST(req: NextRequest) {
  const artEngineUrl = process.env.ART_ENGINE_URL;
  if (!artEngineUrl) {
    return NextResponse.json({ error: "ART_ENGINE_URL not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();

    const res = await fetch(`${artEngineUrl}/generate-player-map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Player map generation failed", detail: err }, { status: res.status });
    }

    const { imageData, style, playerName, goals, shots } = await res.json();
    if (!imageData) {
      return NextResponse.json({ error: "No image returned from art engine" }, { status: 500 });
    }

    // Upload to Supabase
    const buffer = Buffer.from(imageData, "base64");
    const slug = playerName.toLowerCase().replace(/\s+/g, "-");
    const filename = `player-maps/${slug}/${style}-${Date.now()}.png`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await supabase.storage
      .from("generated-art")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[Supabase upload]", uploadError);
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${imageData}`,
        style,
        playerName,
        goals,
        shots,
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-art")
      .getPublicUrl(filename);

    return NextResponse.json({ imageUrl: publicUrl, style, playerName, goals, shots });

  } catch (error) {
    console.error("[Player Map] Request failed:", error);
    return NextResponse.json(
      { error: "Art engine unreachable", detail: String(error) },
      { status: 503 }
    );
  }
}

/**
 * GET /api/moments/player-map
 * Proxies to art engine /wrexham-players for the dropdown list
 */
export async function GET() {
  const artEngineUrl = process.env.ART_ENGINE_URL;
  if (!artEngineUrl) {
    return NextResponse.json({ error: "ART_ENGINE_URL not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(`${artEngineUrl}/wrexham-players`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Failed to fetch players", detail: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Player Map] Players fetch failed:", error);
    return NextResponse.json(
      { error: "Art engine unreachable", detail: String(error) },
      { status: 503 }
    );
  }
}
