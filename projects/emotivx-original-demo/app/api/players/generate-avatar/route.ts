import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // avatar gen can take 10-15s

const GEMINI_MODEL = "models/gemini-3.1-flash-image-preview";

function getGoogleApiKey(): string | null {
  // Check env first, then fall back to reading .env file at build/runtime
  return process.env.GOOGLE_API_KEY ?? null;
}

function getSupabase() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function buildPrompt(
  playerName: string,
  teamName: string,
  primaryColor: string,
  jerseyNumber: string,
  position: string,
): string {
  return `Generate a premium collectible player card image for a sports platform called EmotivX.

Player: ${playerName}
Team: ${teamName}
Jersey Number: ${jerseyNumber}
Position: ${position}
Team Primary Colour: ${primaryColor}

Style requirements:
- Dark background with subtle gradients inspired by the team colour (${primaryColor})
- Dramatic studio lighting, semi-realistic digital painting style
- Player wearing team kit in the team colours with jersey number ${jerseyNumber} visible
- Name "${playerName}" on the back of the jersey or visible on the card
- Premium collectible card feel, similar to FIFA Ultimate Team or Topps cards
- Chest-up portrait, slight 3/4 angle, powerful confident pose
- Cinematic lighting with rim light and colour accent matching ${primaryColor}
- Square format 512x512 pixels
- No text overlays, no borders, no card frames — just the player portrait on the styled background
- High detail on face and kit, painterly brush strokes on background`;
}

export async function POST(request: Request) {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY not configured" },
      { status: 500 },
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured (missing URL or service role key)" },
      { status: 500 },
    );
  }

  let body: {
    playerName: string;
    teamName: string;
    primaryColor: string;
    jerseyNumber: string;
    position: string;
    playerId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { playerName, teamName, primaryColor, jerseyNumber, position, playerId } = body;

  if (!playerName || !teamName || !primaryColor || !jerseyNumber || !position) {
    return NextResponse.json(
      { error: "Missing required fields: playerName, teamName, primaryColor, jerseyNumber, position" },
      { status: 400 },
    );
  }

  // --- Call Gemini 3.1 Flash Image API ---
  const prompt = buildPrompt(playerName, teamName, primaryColor, jerseyNumber, position);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      }),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to reach Gemini API", details: String(err) },
      { status: 502 },
    );
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    return NextResponse.json(
      { error: "Gemini API error", status: geminiRes.status, details: errText },
      { status: 502 },
    );
  }

  const geminiData = await geminiRes.json();

  // Extract image data from response
  const parts = geminiData?.candidates?.[0]?.content?.parts;
  if (!parts) {
    return NextResponse.json(
      { error: "Gemini returned no content", raw: geminiData },
      { status: 502 },
    );
  }

  let imageBase64: string | null = null;
  let mimeType = "image/png";

  for (const part of parts) {
    if (part.inlineData) {
      imageBase64 = part.inlineData.data;
      mimeType = part.inlineData.mimeType || "image/png";
      break;
    }
  }

  if (!imageBase64) {
    return NextResponse.json(
      { error: "Gemini returned no image data", parts },
      { status: 502 },
    );
  }

  // --- Upload to Supabase Storage ---
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const safeName = playerName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const fileName = `avatars/${safeName}_${jerseyNumber}_${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    // If bucket doesn't exist, try to create it then retry
    if (uploadError.message?.includes("not found") || uploadError.message?.includes("Bucket")) {
      await supabase.storage.createBucket("avatars", { public: true });
      const { error: retryError } = await supabase.storage
        .from("avatars")
        .upload(fileName, imageBuffer, {
          contentType: mimeType,
          upsert: true,
        });
      if (retryError) {
        return NextResponse.json(
          { error: "Storage upload failed after bucket creation", details: retryError.message },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Storage upload failed", details: uploadError.message },
        { status: 500 },
      );
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName);

  const avatarUrl = urlData.publicUrl;

  // --- Update player record if playerId provided ---
  if (playerId) {
    const { error: updateError } = await supabase
      .from("players")
      .update({ avatar_url: avatarUrl })
      .eq("id", playerId);

    if (updateError) {
      // Still return success with URL — avatar was generated and uploaded
      return NextResponse.json({
        ok: true,
        avatarUrl,
        warning: `Avatar saved but player update failed: ${updateError.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, avatarUrl });
}
