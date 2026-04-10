"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const VIEWS = {
  fan: { label: "FAN VIEW", icon: "\ud83d\udc64", path: "/" },
  club_admin: { label: "CLUB VIEW", icon: "\ud83c\udfdf\ufe0f", path: "/club/dashboard" },
  platform_admin: { label: "ADMIN VIEW", icon: "\u26a1", path: "/staff/dashboard" },
} as const;

function detectCurrentView(pathname: string): keyof typeof VIEWS {
  if (pathname.startsWith("/staff")) return "platform_admin";
  if (pathname.startsWith("/club")) return "club_admin";
  return "fan";
}

export default function RoleSwitcher() {
  const { role } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Only visible for platform_admin
  if (role !== "platform_admin") return null;

  const current = detectCurrentView(pathname);
  const view = VIEWS[current];

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50">
      {/* Dropdown */}
      {open && (
        <div className="mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] shadow-2xl">
          {(Object.entries(VIEWS) as [keyof typeof VIEWS, (typeof VIEWS)[keyof typeof VIEWS]][]).map(
            ([key, v]) => (
              <Link
                key={key}
                href={v.path}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/5 ${
                  key === current
                    ? "bg-[#8AE234]/10 text-[#8AE234]"
                    : "text-white/70"
                }`}
              >
                <span className="text-base">{v.icon}</span>
                <span className="font-semibold tracking-wide">{v.label}</span>
              </Link>
            )
          )}
        </div>
      )}

      {/* Pill button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1A] px-4 py-2.5 text-sm font-semibold tracking-wide text-white shadow-lg transition-all hover:border-[#8AE234]/40 hover:bg-[#1A1A1A]/90"
      >
        <span className="text-base">{view.icon}</span>
        <span>{view.label}</span>
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>
    </div>
  );
}
