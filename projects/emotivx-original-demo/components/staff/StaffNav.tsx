"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CheckCircle, Star, Settings, ChevronDown, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const navItems = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/staff/featured", label: "Featured", icon: Star },
  { href: "/staff/ip-manager", label: "IP Manager", icon: Settings },
];

export default function StaffNav() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  return (
    <nav className="w-full border-b border-white/5 bg-[#0A0A0A]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold tracking-[0.2em] text-white transition hover:opacity-80"
        >
          EMOTIV<span className="text-[#DA291C]">X</span>
        </Link>

        {/* Centre nav items */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition ${
                  active
                    ? "text-white"
                    : "text-[#888888] hover:text-white/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {active && (
                  <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#DA291C]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* User dropdown */}
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-white/10 bg-[#1F1F1F] px-3 py-1.5 flex items-center gap-2">
            <User className="h-4 w-4 text-[#888888]" />
            <span className="max-w-[120px] truncate text-xs text-white">
              {profile?.display_name || user?.email || "Staff"}
            </span>
            <span className="rounded-sm bg-[#DA291C] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Staff
            </span>
            <ChevronDown className="h-3 w-3 text-[#888888]" />
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto px-6 pb-3 md:hidden">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                active
                  ? "bg-white/5 text-white"
                  : "text-[#888888] hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {active && (
                <span className="absolute bottom-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#DA291C]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
