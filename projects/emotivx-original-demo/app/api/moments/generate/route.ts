import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/moments/generate
 *
 * 1. Forwards request to Claudia art engine (ART_ENGINE_URL)
 * 2. Receives base64 PNG back
 * 3. Uploads to Supabase generated-art bucket
 * 4. Returns permanent public URL
 */
export async function POST(req: NextRequest) {
  const artEngineUrl = process.env.ART_ENGINE_URL;
  if (!artEngineUrl) {
    return NextResponse.json({ error: "ART_ENGINE_URL not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();

    // Call art engine
    const res = await fetch(`${artEngineUrl}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Art generation failed", detail: err }, { status: res.status });
    }

    const { imageData, style } = await res.json();
    if (!imageData) {
      return NextResponse.json({ error: "No image returned from art engine" }, { status: 500 });
    }

    // Convert base64 to buffer and upload to Supabase
    const buffer = Buffer.from(imageData, "base64");
    const view = body.view ?? "front";
    const filename = `${body.matchId}/${body.goalIndex ?? 0}/${style}-${view}-${Date.now()}.png`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await supabase.storage
      .from("generated-art")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[Supabase upload]", uploadError);
      // Return base64 data URL as fallback
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${imageData}`,
        style,
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-art")
      .getPublicUrl(filename);

    return NextResponse.json({ imageUrl: publicUrl, style });

  } catch (error) {
    console.error("[Art Engine] Request failed:", error);
    return NextResponse.json(
      { error: "Art engine unreachable", detail: String(error) },
      { status: 503 }
    );
  }
}
