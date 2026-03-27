"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CartCustomisation {
  seatNumber?: string;
  message?: string;
  [key: string]: string | undefined;
}

export interface CartItem {
  momentId: string;
  momentName: string;
  patternName: string;
  lineEffect: string;
  customisation: CartCustomisation;
  productType: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (momentId: string, productType: string, size: string) => void;
  updateQuantity: (
    momentId: string,
    productType: string,
    size: string,
    quantity: number,
  ) => void;
  updateSize: (
    momentId: string,
    productType: string,
    oldSize: string,
    newSize: string,
  ) => void;
  clearCart: () => void;
  cartTotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextValue | null>(null);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "emotivx_cart";

function itemKey(i: Pick<CartItem, "momentId" | "productType" | "size">) {
  return `${i.momentId}::${i.productType}::${i.size}`;
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota exceeded — ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate from localStorage once on mount */
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  /* Persist whenever items change (skip first paint) */
  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const key = itemKey(item);
      const idx = prev.findIndex((i) => itemKey(i) === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback(
    (momentId: string, productType: string, size: string) => {
      setItems((prev) =>
        prev.filter((i) => itemKey(i) !== `${momentId}::${productType}::${size}`),
      );
    },
    [],
  );

  const updateQuantity = useCallback(
    (momentId: string, productType: string, size: string, quantity: number) => {
      if (quantity < 1) return;
      setItems((prev) =>
        prev.map((i) =>
          itemKey(i) === `${momentId}::${productType}::${size}`
            ? { ...i, quantity }
            : i,
        ),
      );
    },
    [],
  );

  const updateSize = useCallback(
    (momentId: string, productType: string, oldSize: string, newSize: string) => {
      if (oldSize === newSize) return;
      setItems((prev) => {
        const oldKey = `${momentId}::${productType}::${oldSize}`;
        const newKey = `${momentId}::${productType}::${newSize}`;
        const existingIdx = prev.findIndex((i) => itemKey(i) === newKey);
        const oldIdx = prev.findIndex((i) => itemKey(i) === oldKey);
        if (oldIdx < 0) return prev;
        if (existingIdx >= 0) {
          // merge into existing size entry
          const next = [...prev];
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + prev[oldIdx].quantity,
          };
          next.splice(oldIdx, 1);
          return next;
        }
        const next = [...prev];
        next[oldIdx] = { ...next[oldIdx], size: newSize };
        return next;
      });
    },
    [],
  );

  const clearCart = useCallback(() => setItems([]), []);

  const cartTotal = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0,
  );

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, updateSize, clearCart, cartTotal, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
