"use client";

import { useState } from "react";
import { Package, ChevronDown, ChevronUp } from "lucide-react";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  date: string;
  status: "Pending" | "Shipped" | "Delivered";
  items: OrderItem[];
  total: number;
};

const PLACEHOLDER_ORDERS: Order[] = [
  {
    id: "EMX-2026-0042",
    date: "2026-02-28",
    status: "Delivered",
    items: [
      { name: "Rooney Bicycle Kick — Hoodie (XL)", quantity: 1, price: 89.99 },
      { name: "Rooney Bicycle Kick — Digital Moment", quantity: 1, price: 24.99 },
    ],
    total: 114.98,
  },
  {
    id: "EMX-2026-0039",
    date: "2026-02-15",
    status: "Shipped",
    items: [
      { name: "Olmo vs France — Signed Card", quantity: 1, price: 49.99 },
    ],
    total: 49.99,
  },
  {
    id: "EMX-2026-0035",
    date: "2026-02-01",
    status: "Pending",
    items: [
      { name: "Musiala vs Scotland — T-Shirt (M)", quantity: 2, price: 39.99 },
      { name: "Musiala vs Scotland — Phone Case", quantity: 1, price: 19.99 },
    ],
    total: 99.97,
  },
];

const STATUS_STYLES: Record<Order["status"], string> = {
  Pending: "bg-yellow-900/40 text-yellow-400 border-yellow-700/50",
  Shipped: "bg-blue-900/40 text-blue-400 border-blue-700/50",
  Delivered: "bg-green-900/40 text-green-400 border-green-700/50",
};

export default function OrdersPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const orders = PLACEHOLDER_ORDERS;

  function toggle(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Package size={48} className="mb-4 text-[#333]" />
        <p className="text-[#888]">
          No orders yet — explore moments to get started!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Orders</h1>

      <div className="space-y-3">
        {orders.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <div
              key={order.id}
              className="rounded-lg border border-[rgba(220,38,38,0.15)] bg-[#111]"
            >
              {/* Order header row */}
              <button
                onClick={() => toggle(order.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">
                      {order.id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#888]">
                    {new Date(order.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="text-sm font-bold text-white">
                  £{order.total.toFixed(2)}
                </span>
                {expanded ? (
                  <ChevronUp size={16} className="text-[#888]" />
                ) : (
                  <ChevronDown size={16} className="text-[#888]" />
                )}
              </button>

              {/* Expanded items */}
              {expanded && (
                <div className="border-t border-[rgba(220,38,38,0.1)] px-5 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-[#888]">
                        <th className="pb-2">Item</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr
                          key={i}
                          className="border-t border-[rgba(220,38,38,0.07)]"
                        >
                          <td className="py-2 text-white">{item.name}</td>
                          <td className="py-2 text-center text-[#888]">
                            {item.quantity}
                          </td>
                          <td className="py-2 text-right text-white">
                            £{item.price.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
