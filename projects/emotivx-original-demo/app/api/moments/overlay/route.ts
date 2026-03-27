import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/moments/overlay
 *
 * Generates a transparent PNG overlay containing ONLY logo + badge
 * (no art background). This is composited on top of the tiling art
 * texture in the 3D viewer as a non-tiling layer.
 */
export async function POST(req: NextRequest) {
  const artEngineUrl = process.env.ART_ENGINE_URL;
  if (!artEngineUrl) {
    return NextResponse.json({ error: "ART_ENGINE_URL not configured" }, { status: 503 });
  }

  try {
    const body = await req.json();

    const res = await fetch(`${artEngineUrl}/generate-overlay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: "Overlay generation failed", detail: err }, { status: res.status });
    }

    const { imageData } = await res.json();
    if (!imageData) {
      return NextResponse.json({ error: "No overlay returned from art engine" }, { status: 500 });
    }

    // Upload to Supabase under overlays/ subfolder
    const buffer = Buffer.from(imageData, "base64");
    const view = body.view ?? "front";
    const filename = `overlays/${view}-${Date.now()}.png`;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: uploadError } = await supabase.storage
      .from("generated-art")
      .upload(filename, buffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[Supabase overlay upload]", uploadError);
      return NextResponse.json({
        overlayUrl: `data:image/png;base64,${imageData}`,
      });
    }

    const { data: { publicUrl } } = supabase.storage
      .from("generated-art")
      .getPublicUrl(filename);

    return NextResponse.json({ overlayUrl: publicUrl });

  } catch (error) {
    console.error("[Overlay] Request failed:", error);
    return NextResponse.json(
      { error: "Overlay generation failed", detail: String(error) },
      { status: 503 }
    );
  }
}
