import { NextRequest, NextResponse } from "next/server";
import { generateMockups } from "@/lib/printful";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/printful/mockup
 *
 * Generates Printful product mockups from an artwork URL.
 * Downloads the mockup images and stores them in Supabase (Printful URLs expire in 24h).
 *
 * Body:
 * {
 *   artworkUrl: string,        — the generated artwork (Supabase URL)
 *   productId: number,         — Printful catalog product ID
 *   variantIds: number[],      — which variants to render (size/colour)
 *   placement?: string,        — "default" | "front" | "back"
 *   matchId?: string,          — for naming/tracking
 * }
 */

// Printful product IDs for our AOP range (update these once we confirm exact products)
export const PRINTFUL_PRODUCTS = {
  hoodie:     380,  // AOP hoodie — confirm exact ID from catalogue
  tshirt:     382,  // AOP t-shirt
  longsleeve: 383,  // AOP long sleeve
} as const;

export async function POST(req: NextRequest) {
  try {
    const { artworkUrl, productId, variantIds, placement = "default", matchId } =
      await req.json();

    if (!artworkUrl || !productId || !variantIds?.length) {
      return NextResponse.json(
        { error: "artworkUrl, productId, and variantIds are required" },
        { status: 400 }
      );
    }

    // Generate mockups via Printful (waits for completion, up to 30s)
    const mockups = await generateMockups(productId, variantIds, artworkUrl, placement);

    if (!mockups.length) {
      return NextResponse.json({ error: "No mockups returned" }, { status: 500 });
    }

    // Download mockup images and store in Supabase (Printful URLs expire in 24h)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const storedMockups = await Promise.all(
      mockups.map(async (mockup, i) => {
        try {
          // Fetch the mockup image from Printful
          const imgRes = await fetch(mockup.mockup_url);
          if (!imgRes.ok) return { ...mockup, stored_url: mockup.mockup_url };

          const blob = await imgRes.blob();
          const filename = `mockups/${matchId ?? "unknown"}/${productId}-${mockup.placement}-${i}.jpg`;

          const { error } = await supabase.storage
            .from("generated-art")
            .upload(filename, blob, {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (error) return { ...mockup, stored_url: mockup.mockup_url };

          const { data: { publicUrl } } = supabase.storage
            .from("generated-art")
            .getPublicUrl(filename);

          return { ...mockup, stored_url: publicUrl };
        } catch {
          return { ...mockup, stored_url: mockup.mockup_url };
        }
      })
    );

    return NextResponse.json({ mockups: storedMockups });
  } catch (error) {
    console.error("[Printful mockup]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mockup generation failed" },
      { status: 500 }
    );
  }
}
