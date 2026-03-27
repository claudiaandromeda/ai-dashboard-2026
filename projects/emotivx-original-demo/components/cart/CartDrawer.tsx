"use client";

import { useEffect } from "react";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartProvider";

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity, updateSize, cartTotal, itemCount, clearCart } =
    useCart();

  /* Lock body scroll when open */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#111111] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">🛒</span>
            <h2 className="text-sm font-bold text-white">Your Cart</h2>
            {itemCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DA291C] px-1.5 text-[10px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
            <ShoppingBag className="h-12 w-12 text-[#888888]" />
            <p className="text-sm text-[#888888]">Your cart is empty</p>
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#DA291C] transition hover:text-[#DA291C]/80"
            >
              Browse Moments <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <>
            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {items.map((item) => {
                  const key = `${item.momentId}::${item.productType}::${item.size}`;
                  return (
                    <div
                      key={key}
                      className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3"
                    >
                      {/* Thumbnail placeholder */}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-[#1F1F1F] text-[10px] text-[#888888]">
                        IMG
                      </div>

                      {/* Details */}
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="truncate text-xs font-bold text-white">
                            {item.momentName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-[#888888]">
                            <span>{item.productType}</span>
                            <span>·</span>
                            <select
                              value={item.size}
                              onChange={(e) =>
                                updateSize(item.momentId, item.productType, item.size, e.target.value)
                              }
                              className="rounded border border-white/10 bg-[#1F1F1F] px-1 py-0.5 text-[10px] text-white outline-none focus:border-[#DA291C]/40"
                            >
                              {SIZES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Qty controls */}
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                item.quantity <= 1
                                  ? removeItem(item.momentId, item.productType, item.size)
                                  : updateQuantity(
                                      item.momentId,
                                      item.productType,
                                      item.size,
                                      item.quantity - 1,
                                    )
                              }
                              className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#888888] transition hover:bg-white/5 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center text-xs text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.momentId,
                                  item.productType,
                                  item.size,
                                  item.quantity + 1,
                                )
                              }
                              className="flex h-6 w-6 items-center justify-center rounded border border-white/10 text-[#888888] transition hover:bg-white/5 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          {/* Price */}
                          <p className="text-xs font-bold text-white">
                            £{(item.unitPrice * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() =>
                          removeItem(item.momentId, item.productType, item.size)
                        }
                        className="mt-0.5 h-5 w-5 shrink-0 text-[#888888] transition hover:text-[#DA291C]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-[#888888]">
                  Subtotal
                </span>
                <span className="text-sm font-bold text-white">
                  £{cartTotal.toFixed(2)}
                </span>
              </div>
              <Link
                href="/checkout"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#DA291C] py-3 text-sm font-semibold text-white transition hover:bg-[#DA291C]/90"
              >
                Proceed to Checkout
              </Link>
              <button
                onClick={clearCart}
                className="w-full text-center text-[10px] text-[#888888] transition hover:text-white"
              >
                Clear Cart
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
