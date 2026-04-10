"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Trophy, Settings } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/teams", label: "Teams", icon: Users },
  { href: "/admin/cv", label: "CV Tracking", icon: Trophy },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="w-full border-b border-white/5 bg-[#080810]/60 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-6 py-2">
        <span className="mr-3 text-[10px] font-bold uppercase tracking-widest text-[#555555]">
          Admin Portal
        </span>
        <span className="mr-3 text-[#333]">|</span>
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active ? "text-white" : "text-[#888888] hover:text-white/70"
              }`}
            >
              <Icon className="h-3 w-3" />
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#8AE234]" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
