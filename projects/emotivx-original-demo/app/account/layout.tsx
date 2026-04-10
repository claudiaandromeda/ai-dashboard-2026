"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { User, Package, Heart, Bell, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/account/profile", label: "Profile", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/favourites", label: "Favourites", icon: Heart },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="text-sm text-[#888]">Loading...</div>
      </div>
    );
  }

  const initial = profile?.display_name
    ? profile.display_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "JD";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl">
      {/* Sidebar */}
      <aside className="w-[200px] shrink-0 border-r border-[rgba(138,226,52,0.15)] bg-[#111]">
        {/* User badge */}
        <div className="border-b border-[rgba(138,226,52,0.15)] p-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#8AE234] text-lg font-bold uppercase text-white">
            {initial}
          </div>
          <p className="mt-2 truncate text-center text-sm text-white">
            {profile?.display_name ?? "Jamie Davies"}
          </p>
          <p className="truncate text-center text-xs text-[#888]">
            {profile?.email}
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[rgba(138,226,52,0.08)] text-white"
                    : "text-[#888] hover:bg-[#1a1a1a] hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute left-0 h-5 w-[3px] rounded-r bg-[#8AE234]" />
                )}
                <Icon size={16} className={active ? "text-[#8AE234]" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
