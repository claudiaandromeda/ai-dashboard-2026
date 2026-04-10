"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CreditCard,
  Lock,
  Minus,
  Plus,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import GarmentPreview from "@/components/merch/GarmentPreview";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COUNTRIES = [
  "United Kingdom",
  "United States",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Portugal",
  "Netherlands",
  "Ireland",
  "Australia",
];

const STEPS = ["Cart", "Shipping", "Payment", "Confirm"] as const;
type Step = (typeof STEPS)[number];

const STEP_ICONS: Record<Step, typeof ShoppingCart> = {
  Cart: ShoppingCart,
  Shipping: Truck,
  Payment: CreditCard,
  Confirm: ChevronRight,
};

const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 4.99;

/* ------------------------------------------------------------------ */
/*  Shared input class                                                 */
/* ------------------------------------------------------------------ */

const INPUT_CLS =
  "w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3.5 py-3 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#8AE234] focus:ring-1 focus:ring-[#8AE234]/30";

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function ProgressBar({ current }: { current: number }) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        {STEPS.map((label, i) => {
          const Icon = STEP_ICONS[label];
          const isActive = i === current;
          const isDone = i < current;
          return (
            <div key={label} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#8AE234] text-white shadow-[0_0_12px_rgba(138,226,52,0.4)]"
                      : isDone
                        ? "bg-[#8AE234]/20 text-[#8AE234]"
                        : "bg-[#1A1A1A] text-[#555]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider ${
                    isActive
                      ? "text-white"
                      : isDone
                        ? "text-[#8AE234]"
                        : "text-[#555]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="mx-2 h-px flex-1">
                  <div
                    className={`h-full ${
                      i < current ? "bg-[#8AE234]/40" : "bg-white/5"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, cartTotal, clearCart } = useCart();
  const [step, setStep] = useState(0); // 0=Cart, 1=Shipping, 2=Payment
  const [promo, setPromo] = useState("");

  const shipping = cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
  const total = cartTotal + shipping;

  /* Memoised order number for session */
  const orderRef = useMemo(
    () => `EMX-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    [],
  );

  function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    /* Save summary before clearing cart */
    sessionStorage.setItem(
      "emotivx_last_order",
      JSON.stringify({ items, cartTotal, shipping, total, orderRef }),
    );
    clearCart();
    router.push("/checkout/confirmation");
  }

  /* ---- Empty cart ---- */
  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center gap-5 px-6">
        <ShoppingCart className="h-12 w-12 text-[#333]" />
        <p className="text-sm text-[#888]">Your cart is empty.</p>
        <Link
          href="/moments/gallery"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#8AE234] transition hover:text-[#8AE234]/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Browse Moments
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* ============ Progress Bar ============ */}
      <ProgressBar current={step + 1} />

      <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
        {/* ============ LEFT COLUMN — Form Steps ============ */}
        <div>
          {/* ---------- Step 0: Cart Review ---------- */}
          {step === 0 && (
            <section className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                Review Your Cart
              </h2>

              <div className="space-y-3">
                {items.map((item) => {
                  const key = `${item.momentId}::${item.productType}::${item.size}`;
                  return (
                    <div
                      key={key}
                      className="flex gap-4 rounded-xl border border-white/5 bg-[#111] p-4"
                    >
                      {/* Garment thumbnail */}
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#1A1A1A]">
                        <GarmentPreview
                          garmentType={
                            item.productType === "tshirt" ? "tshirt" : "hoodie"
                          }
                          view="front"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="text-sm font-bold text-white">
                            {item.productType === "tshirt"
                              ? "T-Shirt"
                              : "Hoodie"}{" "}
                            — {item.patternName || "Classic"} Style
                          </p>
                          <p className="mt-0.5 text-xs text-[#888]">
                            Size: {item.size} · Colour: Black
                          </p>
                          <p className="mt-0.5 text-xs text-[#8AE234]">
                            {item.momentName}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {/* Quantity controls */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                item.quantity <= 1
                                  ? removeItem(
                                      item.momentId,
                                      item.productType,
                                      item.size,
                                    )
                                  : updateQuantity(
                                      item.momentId,
                                      item.productType,
                                      item.size,
                                      item.quantity - 1,
                                    )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#888] transition hover:bg-white/5 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-sm font-medium text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.momentId,
                                  item.productType,
                                  item.size,
                                  item.quantity + 1,
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 text-[#888] transition hover:bg-white/5 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-white">
                            £{(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(
                            item.momentId,
                            item.productType,
                            item.size,
                          )
                        }
                        className="mt-1 h-5 w-5 shrink-0 text-[#555] transition hover:text-[#8AE234]"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8AE234] py-3.5 text-sm font-semibold text-[#080810] transition hover:bg-[#8AE234]/90"
              >
                Continue to Shipping <ArrowRight className="h-4 w-4" />
              </button>
            </section>
          )}

          {/* ---------- Step 1: Shipping ---------- */}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="text-[#888] transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                  Shipping Details
                </h2>
              </div>

              <div className="space-y-4">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                    Full Name
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className={INPUT_CLS}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    placeholder="john@example.com"
                    className={INPUT_CLS}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                    Address Line 1
                  </span>
                  <input
                    required
                    type="text"
                    placeholder="123 High Street"
                    className={INPUT_CLS}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                    Address Line 2
                  </span>
                  <input
                    type="text"
                    placeholder="Flat 4B (optional)"
                    className={INPUT_CLS}
                  />
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      City
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="London"
                      className={INPUT_CLS}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      County / State
                    </span>
                    <input
                      type="text"
                      placeholder="Greater London"
                      className={INPUT_CLS}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      Postcode
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="SW1A 1AA"
                      className={INPUT_CLS}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      Country
                    </span>
                    <select required defaultValue="" className={INPUT_CLS}>
                      <option value="" disabled>
                        Select country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8AE234] py-3.5 text-sm font-semibold text-[#080810] transition hover:bg-[#8AE234]/90"
              >
                Continue to Payment <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}

          {/* ---------- Step 2: Payment ---------- */}
          {step === 2 && (
            <form onSubmit={handlePlaceOrder} className="space-y-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[#888] transition hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white">
                  Payment
                </h2>
              </div>

              <div className="rounded-xl border border-white/5 bg-[#111] p-6 space-y-5">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                    Card Number
                  </span>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className={INPUT_CLS + " pr-12"}
                    />
                    <CreditCard className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      Expiry
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="MM / YY"
                      maxLength={7}
                      className={INPUT_CLS}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-[#888]">
                      CVC
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="123"
                      maxLength={4}
                      className={INPUT_CLS}
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8AE234] py-4 text-sm font-bold text-[#080810] transition hover:bg-[#8AE234]/90"
              >
                <Lock className="h-4 w-4" /> Pay £{total.toFixed(2)}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#555]">
                <Lock className="h-3 w-3" /> Secured by Stripe
              </p>
            </form>
          )}
        </div>

        {/* ============ RIGHT COLUMN — Order Summary (sticky) ============ */}
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-white/5 bg-[#111] p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">
              Order Summary
            </h3>

            {/* Items list */}
            <div className="space-y-4">
              {items.map((item) => {
                const key = `${item.momentId}::${item.productType}::${item.size}`;
                return (
                  <div key={key} className="flex gap-3">
                    {/* Mini garment preview */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#1A1A1A]">
                      <GarmentPreview
                        garmentType={
                          item.productType === "tshirt" ? "tshirt" : "hoodie"
                        }
                        view="front"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="truncate text-xs font-bold text-white">
                        {item.productType === "tshirt" ? "T-Shirt" : "Hoodie"}{" "}
                        — {item.patternName || "Classic"} Style
                      </p>
                      <p className="text-[10px] text-[#888]">
                        Size: {item.size} · Colour: Black
                      </p>
                      <p className="text-[10px] text-[#8AE234]">
                        {item.momentName}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-[#555]">
                          Qty: {item.quantity}
                        </span>
                        <span className="text-xs font-bold text-white">
                          £{(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Promo code */}
            <div className="flex gap-2">
              <input
                type="text"
                value={promo}
                onChange={(e) => setPromo(e.target.value)}
                placeholder="Promo code"
                className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2.5 text-xs text-white placeholder-[#555] outline-none transition focus:border-[#8AE234] focus:ring-1 focus:ring-[#8AE234]/30"
              />
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/5"
              >
                Apply
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/5" />

            {/* Totals */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#888]">
                <span>Subtotal</span>
                <span className="text-white">£{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#888]">
                <span>Shipping</span>
                <span className="text-white">
                  {shipping === 0 ? (
                    <span className="font-semibold text-green-500">FREE</span>
                  ) : (
                    `£${shipping.toFixed(2)}`
                  )}
                </span>
              </div>
              {cartTotal < FREE_SHIPPING_THRESHOLD && (
                <p className="text-[10px] text-[#555]">
                  Free shipping on orders over £{FREE_SHIPPING_THRESHOLD}
                </p>
              )}
              <div className="border-t border-white/5 pt-2">
                <div className="flex justify-between text-sm font-bold text-white">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
