"use client";

import Link from "next/link";
import {
  Sparkles,
  Star,
  Users,
  ShoppingBag,
  ArrowRight,
  Palette,
  Clock,
} from "lucide-react";

/* ─── Demo: Wrexham AFC ─── */
const CLUB = { name: "Wrexham AFC", accent: "#E4002B" };

const stats = [
  { label: "Active Moments", value: 24, icon: Sparkles },
  { label: "Featured Moments", value: 6, icon: Star },
  { label: "Total Players", value: 28, icon: Users },
  { label: "Recent Orders", value: 142, icon: ShoppingBag },
];

const recentActivity = [
  {
    text: "Paul Mullin goal vs. Notts County published",
    time: "2 hours ago",
  },
  {
    text: "New player photo uploaded for Sam Dalby",
    time: "5 hours ago",
  },
  {
    text: "Branding assets updated — away kit sponsor",
    time: "1 day ago",
  },
  {
    text: "Elliot Lee moment featured on marketplace",
    time: "2 days ago",
  },
  {
    text: "3 new orders for Ollie Palmer moments",
    time: "3 days ago",
  },
];

const quickActions = [
  {
    href: "/club/moments",
    icon: Sparkles,
    title: "Manage Moments",
    description: "Publish, feature, or hide moments",
  },
  {
    href: "/club/players",
    icon: Users,
    title: "Edit Players",
    description: "Update roster and player photos",
  },
  {
    href: "/club/branding",
    icon: Palette,
    title: "Update Branding",
    description: "Logos, colours, and sponsor assets",
  },
];

export default function ClubDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Club Dashboard</h1>
        <p className="mt-1 text-sm text-[#888888]">{CLUB.name}</p>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border bg-[#111111] p-5"
              style={{
                borderColor: `${CLUB.accent}26`,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-white">
                  {stat.value}
                </span>
                <Icon className="h-5 w-5" style={{ color: CLUB.accent }} />
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-[#888888]">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div
          className="rounded-xl border bg-[#111111] p-6"
          style={{ borderColor: `${CLUB.accent}26` }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="h-4 w-4" style={{ color: CLUB.accent }} />
              Recent Activity
            </h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-[#080810] p-3"
              >
                <p className="text-xs text-white/80">{item.text}</p>
                <span className="shrink-0 text-[10px] text-[#555555]">
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div
          className="rounded-xl border bg-[#111111] p-6"
          style={{ borderColor: `${CLUB.accent}26` }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
            <span style={{ color: CLUB.accent }}>⚡</span>
            Quick Actions
          </h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex items-center gap-4 rounded-lg border border-white/5 bg-[#080810] p-4 transition hover:border-white/10"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${CLUB.accent}15` }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: CLUB.accent }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-white">
                      {action.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#555555]">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[#555555] transition group-hover:text-white" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
