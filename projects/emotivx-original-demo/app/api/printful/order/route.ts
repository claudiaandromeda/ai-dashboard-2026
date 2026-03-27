/**
 * POST /api/printful/order
 *
 * Creates a DRAFT Printful order for an AOP hoodie (product 388).
 * Does NOT confirm — draft is reviewed in the Printful dashboard before charging.
 *
 * Body:
 *   artworkUrl  string  — Public URL to the 2048px (or 6000px for production) art PNG
 *   variantId   number  — Printful variant ID (size/colour); defaults to 10869 (S / All-over)
 *   recipient   OrderRecipient — shipping address
 *   confirm?    boolean — pass true to auto-confirm (charge card); default false (draft)
 *
 * AOP Hoodie (product 388) variant IDs:
 *   S=10869  M=10870  L=10871  XL=10872  2XL=10873  3XL=10874  4XL=10875
 */

import { NextRequest, NextResponse } from "next/server";
import { createOrder, confirmOrder, type OrderRecipient } from "@/lib/printful";

// Printful product 388 = AOP Unisex Hoodie
const PRODUCT_ID = 388;

// Placement: "front" covers the full front panel (6000×6000 @ 150dpi for production)
const PLACEMENT = "front";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      artworkUrl,
      variantId = 10871,   // default: L
      recipient,
      confirm = false,
    }: {
      artworkUrl: string;
      variantId?: number;
      recipient: OrderRecipient;
      confirm?: boolean;
    } = body;

    if (!artworkUrl) {
      return NextResponse.json({ error: "artworkUrl is required" }, { status: 400 });
    }
    if (!recipient?.name || !recipient?.address1 || !recipient?.city || !recipient?.country_code) {
      return NextResponse.json(
        { error: "recipient must include name, address1, city, country_code" },
        { status: 400 }
      );
    }

    // Build order item — AOP hoodie uses "default" file type for all-over placement
    const items = [
      {
        catalog_variant_id: variantId,
        quantity: 1,
        files: [
          {
            type: "default",  // AOP hoodie: single "default" file covers all panels
            url: artworkUrl,
          },
        ],
        name: "EmotivX Moment Hoodie",
      },
    ];

    // Create draft order (confirm=false = no charge, sits in Printful dashboard)
    const order = await createOrder(recipient, items, false);

    let finalOrder = order;

    // Auto-confirm if explicitly requested
    if (confirm && order.id) {
      finalOrder = await confirmOrder(order.id);
    }

    return NextResponse.json({
      success: true,
      orderId: finalOrder.id,
      status: finalOrder.status,
      total: finalOrder.retail_costs?.total,
      currency: finalOrder.retail_costs?.currency,
      dashboardUrl: `https://www.printful.com/dashboard/orders/${finalOrder.id}`,
      order: finalOrder,
    });
  } catch (err: unknown) {
    console.error("[Printful order]", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
