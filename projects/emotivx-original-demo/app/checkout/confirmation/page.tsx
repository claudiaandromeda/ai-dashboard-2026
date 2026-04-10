"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Package, Truck } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderItem {
  momentId: string;
  momentName: string;
  patternName: string;
  productType: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

interface OrderSummary {
  items: OrderItem[];
  cartTotal: number;
  shipping: number;
  total: number;
  orderRef: string;
}

/* ------------------------------------------------------------------ */
/*  Checkmark Animation                                                */
/* ------------------------------------------------------------------ */

function AnimatedCheck() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10 transition-all duration-700 ${
        show ? "scale-100 opacity-100" : "scale-50 opacity-0"
      }`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 transition-all delay-200 duration-500 ${
          show ? "scale-100" : "scale-75"
        }`}
      >
        <Check
          className={`h-8 w-8 text-green-500 transition-all delay-500 duration-500 ${
            show ? "scale-100 opacity-100" : "scale-0 opacity-0"
          }`}
          strokeWidth={3}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ConfirmationPage() {
  const [order, setOrder] = useState<OrderSummary | null>(null);

  /* Fallback order number if no session data */
  const fallbackRef = useMemo(
    () => `EMX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    [],
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("emotivx_last_order");
      if (raw) {
        setOrder(JSON.parse(raw));
        sessionStorage.removeItem("emotivx_last_order");
      }
    } catch {
      /* ignore parse errors */
    }
  }, []);

  const orderRef = order?.orderRef ?? fallbackRef;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      {/* ---- Animated checkmark ---- */}
      <AnimatedCheck />

      {/* ---- Heading ---- */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          ORDER CONFIRMED
        </h1>
        <p className="text-sm text-[#888]">
          Your moment merch is being created
        </p>
      </div>

      {/* ---- Order number ---- */}
      <div className="rounded-xl border border-white/5 bg-[#111] px-8 py-5">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#555]">
          Order Number
        </p>
        <p className="mt-1.5 font-mono text-lg font-bold text-white">
          #{orderRef}
        </p>
      </div>

      {/* ---- Delivery estimate ---- */}
      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#111] px-6 py-4">
        <Truck className="h-5 w-5 text-[#8AE234]" />
        <div className="text-left">
          <p className="text-xs font-semibold text-white">
            Estimated Delivery
          </p>
          <p className="text-[11px] text-[#888]">5-7 business days</p>
        </div>
      </div>

      {/* ---- Order summary recap ---- */}
      {order && order.items.length > 0 && (
        <div className="w-full max-w-md rounded-xl border border-white/5 bg-[#111] p-5 text-left">
          <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#888]">
            Order Summary
          </h3>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={`${item.momentId}::${item.productType}::${item.size}`}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1A1A1A]">
                    <Package className="h-4 w-4 text-[#555]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      {item.productType === "tshirt" ? "T-Shirt" : "Hoodie"} —{" "}
                      {item.patternName || "Classic"} Style
                    </p>
                    <p className="text-[10px] text-[#888]">
                      Size: {item.size} · Qty: {item.quantity}
                    </p>
                    <p className="text-[10px] text-[#8AE234]">
                      {item.momentName}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-xs font-bold text-white">
                  £{(item.unitPrice * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-1.5 border-t border-white/5 pt-4 text-xs">
            <div className="flex justify-between text-[#888]">
              <span>Subtotal</span>
              <span className="text-white">
                £{order.cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[#888]">
              <span>Shipping</span>
              <span className="text-white">
                {order.shipping === 0 ? (
                  <span className="font-semibold text-green-500">FREE</span>
                ) : (
                  `£${order.shipping.toFixed(2)}`
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold text-white">
              <span>Total</span>
              <span>£{order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/moments/gallery"
          className="flex items-center justify-center gap-2 rounded-full bg-[#8AE234] px-7 py-3.5 text-sm font-semibold text-[#080810] transition hover:bg-[#8AE234]/90"
        >
          Continue Shopping <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/account/orders"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          View Order <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
