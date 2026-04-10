"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, Shield, Zap, BarChart3, Palette, Calendar,
  Cpu, Play, Eye, ChevronRight, Crown, Flame, Star,
  Package, TrendingUp, DollarSign, Settings, Lock,
  Monitor, Activity, CheckCircle, AlertCircle, Users
} from "lucide-react";

const WREXHAM_RED = "#BA0C2F";
const WREXHAM_GOLD = "#C9A84C";

/* ─── Rarity tiers (shared) ─── */
const RARITY_TIERS = [
  { id: "common", label: "Common", icon: Package, color: "#9CA3AF", mult: 1 },
  { id: "uncommon", label: "Uncommon", icon: Star, color: "#10B981", mult: 1.5 },
  { id: "rare", label: "Rare", icon: Zap, color: "#3B82F6", mult: 2.5 },
  { id: "epic", label: "Epic", icon: Flame, color: "#8B5CF6", mult: 5 },
  { id: "legendary", label: "Legendary", icon: Crown, color: "#F59E0B", mult: 20 },
];

/* ─── Published moments ─── */
const MOMENTS = [
  { id: "m1", player: "Paul Mullin", minute: 11, match: "vs Shrewsbury", xg: 0.88, sales: { common: 498, uncommon: 198, rare: 73, epic: 24, legendary: 5 }, max: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 }, status: "live" },
  { id: "m2", player: "Sam Dalby", minute: 18, match: "vs Birmingham", xg: 0.74, sales: { common: 423, uncommon: 176, rare: 61, epic: 22, legendary: 5 }, max: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 }, status: "live" },
  { id: "m3", player: "Elliot Lee", minute: 55, match: "vs Rotherham", xg: 0.33, sales: { common: 312, uncommon: 134, rare: 48, epic: 18, legendary: 4 }, max: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 }, status: "live" },
];

const BASE_PRICE = 79;

function calcRev(sales: Record<string, number>) {
  return RARITY_TIERS.reduce((t, tier) => t + (sales[tier.id] || 0) * BASE_PRICE * tier.mult, 0);
}

type Tab = "overview" | "pipeline" | "moments" | "branding" | "revenue" | "admin-tools";

export default function WrexhamAdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const totalRev = MOMENTS.reduce((t, m) => t + calcRev(m.sales), 0);
  const totalUnits = MOMENTS.reduce((t, m) => t + Object.values(m.sales).reduce((a, b) => a + b, 0), 0);

  const TABS: { id: Tab; label: string; icon: typeof Shield; adminOnly?: boolean }[] = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "pipeline", label: "Data Pipeline", icon: Monitor },
    { id: "moments", label: "Moments", icon: Zap },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "revenue", label: "Revenue", icon: BarChart3 },
    { id: "admin-tools", label: "Admin Tools", icon: Shield, adminOnly: true },
  ];

  return (
    <div className="space-y-6">

      {/* Back */}
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition">
        <ArrowLeft className="h-3 w-3" /> Back to All Clubs
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-[#BA0C2F]/20 bg-[#BA0C2F]/5 p-6">
        <div className="flex items-center gap-5">
          <div className="relative h-16 w-16 shrink-0">
            <Image src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png" alt="Wrexham" fill className="object-contain" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">Wrexham AFC</h1>
              <span className="flex items-center gap-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 px-3 py-1 text-xs font-bold text-[#10B981]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                LIVE
              </span>
              <span className="rounded-full bg-[#8AE234]/10 border border-[#8AE234]/20 px-3 py-1 text-xs font-bold text-[#8AE234]">
                EmotivX Admin View
              </span>
            </div>
            <p className="text-sm text-[#888888]">League One · 2024/25 · Onboarded Feb 2025</p>
          </div>
          <div className="hidden lg:flex gap-3">
            <Link href="/staff/dashboard" className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-[#888888] hover:text-white transition">
              <Eye className="h-3.5 w-3.5" /> View as Staff
            </Link>
            <Link href="/merch-preview?team=wrexham" className="flex items-center gap-2 rounded-lg border border-[#BA0C2F]/30 px-3 py-2 text-xs text-[#BA0C2F] hover:bg-[#BA0C2F]/10 transition">
              <Eye className="h-3.5 w-3.5" /> View as Fan
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Revenue", value: `£${(totalRev / 1000).toFixed(0)}k`, color: WREXHAM_GOLD },
            { label: "Units Sold", value: totalUnits.toLocaleString(), color: "#10B981" },
            { label: "Moments Live", value: MOMENTS.length, color: WREXHAM_RED },
            { label: "Sell-through", value: "94%", color: "#8B5CF6" },
          ].map(s => (
            <div key={s.label} className="rounded-xl bg-black/20 px-4 py-3">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-[#555555] uppercase tracking-wider mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition whitespace-nowrap shrink-0 ${active ? "text-white" : "text-[#888888] hover:text-white/70"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {t.adminOnly && (
                <span className="rounded bg-[#8AE234]/20 px-1 py-0.5 text-[9px] font-bold text-[#8AE234]">ADMIN</span>
              )}
              {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#BA0C2F]" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "overview" && <OverviewTab />}
      {tab === "pipeline" && <PipelineTab />}
      {tab === "moments" && <MomentsTab />}
      {tab === "branding" && <BrandingTab />}
      {tab === "revenue" && <RevenueTab totalRev={totalRev} totalUnits={totalUnits} />}
      {tab === "admin-tools" && <AdminToolsTab />}
    </div>
  );
}

/* ══ OVERVIEW ══ */
function OverviewTab() {
  return (
    <div className="grid lg:grid-cols-2 gap-4">

      {/* Health checks */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#10B981]" /> Account Health
        </h3>
        {[
          { label: "Data pipeline", status: "ok", note: "StatsBomb feed active" },
          { label: "Merch integration", status: "ok", note: "Printful connected" },
          { label: "IP assets uploaded", status: "ok", note: "Badge, kit colours, 4 sponsors" },
          { label: "CV system", status: "warn", note: "Beta — not yet live for club" },
          { label: "Digital twins (Phygital)", status: "soon", note: "In development" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
              {item.status === "ok" && <CheckCircle className="h-3.5 w-3.5 text-[#10B981]" />}
              {item.status === "warn" && <AlertCircle className="h-3.5 w-3.5 text-[#F59E0B]" />}
              {item.status === "soon" && <AlertCircle className="h-3.5 w-3.5 text-[#555555]" />}
              <span className="text-xs text-white">{item.label}</span>
            </div>
            <span className="text-[10px] text-[#555555]">{item.note}</span>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#BA0C2F]" /> Recent Activity
        </h3>
        {[
          { time: "2 hrs ago", event: "Legendary edition sold — Mullin 11'", color: "#F59E0B" },
          { time: "5 hrs ago", event: "Epic edition sold — Dalby 18'", color: "#8B5CF6" },
          { time: "Yesterday", event: "New moment published — Lee 55' vs Rotherham", color: "#BA0C2F" },
          { time: "2 days ago", event: "Club updated brand colours", color: "#888888" },
          { time: "3 days ago", event: "Sponsor logo uploaded — Slot 1", color: "#888888" },
        ].map((a, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="h-2 w-2 rounded-full mt-1.5 shrink-0" style={{ background: a.color }} />
            <div className="flex-1">
              <p className="text-xs text-white">{a.event}</p>
              <p className="text-[10px] text-[#555555]">{a.time}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="lg:col-span-2 grid sm:grid-cols-4 gap-3">
        {[
          { label: "360° Stadium Demo", icon: Monitor, href: "/wrexham/360-viewer", color: "#BA0C2F", desc: "Raw data → Data Line → Replay" },
          { label: "CV System", icon: Cpu, href: "/admin/cv", color: "#10B981", desc: "Elliot's tracking — admin only" },
          { label: "Merch Preview", icon: Eye, href: "/merch-preview?team=wrexham", color: "#8B5CF6", desc: "Fan-facing shop" },
          { label: "Staff View", icon: Users, href: "/staff/dashboard", color: "#F59E0B", desc: "What the club sees" },
        ].map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.label} href={l.href} className="group rounded-xl border border-white/5 bg-[#111111] p-4 hover:border-white/10 transition">
              <Icon className="h-5 w-5 mb-2" style={{ color: l.color }} />
              <p className="text-xs font-bold text-white">{l.label}</p>
              <p className="text-[10px] text-[#555555] mt-0.5">{l.desc}</p>
              <ChevronRight className="h-3.5 w-3.5 text-[#333] group-hover:text-[#888] mt-2 transition" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ══ DATA PIPELINE ══ */
function PipelineTab() {
  return (
    <div className="space-y-4">

      {/* 360 viewer feature */}
      <div className="rounded-xl border border-[#BA0C2F]/20 bg-[#BA0C2F]/5 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-bold text-[#BA0C2F] uppercase tracking-wider mb-1">Live Demo</p>
            <h3 className="text-lg font-bold text-white">360° Stadium Data Pipeline</h3>
            <p className="text-sm text-[#888888] mt-1">
              Watch raw StatsBomb data transform — from event stream to Data Line to full player replay.
              This is the core pipeline that powers every EmotivX moment.
            </p>
          </div>
          <Link
            href="/wrexham/360-viewer"
            className="shrink-0 flex items-center gap-2 rounded-xl bg-[#BA0C2F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition"
          >
            <Play className="h-3.5 w-3.5" /> Launch Demo
          </Link>
        </div>

        {/* Three modes */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            {
              label: "🔴 Raw Data",
              desc: "Animated data points appearing over time — every event from the StatsBomb feed",
              href: "/wrexham/360-viewer?mode=raw",
            },
            {
              label: "⚡ Data Line",
              desc: "Smooth CatmullRom spline — the raw data becomes the signature Data Line™",
              href: "/wrexham/360-viewer?mode=ballpath",
            },
            {
              label: "🎬 Player Replay",
              desc: "Full player movement animation — the complete story of the goal moment",
              href: "/wrexham/360-viewer?mode=replay",
            },
          ].map(m => (
            <Link key={m.label} href={m.href} className="rounded-lg border border-white/10 bg-[#080810] p-4 hover:border-[#BA0C2F]/30 transition">
              <p className="text-sm font-bold text-white mb-1">{m.label}</p>
              <p className="text-[11px] text-[#555555] leading-relaxed">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Pipeline flow */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
        <h3 className="text-sm font-bold text-white mb-4">Data Flow — Wrexham AFC</h3>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          {[
            { label: "StatsBomb Feed", status: "live", detail: "Events ingested in real-time", color: "#10B981" },
            { label: "Event Parser", status: "live", detail: "Goals extracted, xG calculated", color: "#10B981" },
            { label: "Data Line Gen", status: "live", detail: "CatmullRom spline rendered", color: "#10B981" },
            { label: "Art Engine", status: "live", detail: "Team-coloured artwork created", color: "#10B981" },
            { label: "Merch Platform", status: "live", detail: "Printful integration active", color: "#10B981" },
          ].map((step, i) => (
            <div key={i} className="flex sm:flex-col items-center gap-2 flex-1">
              <div className="rounded-lg border border-white/5 bg-[#080810] p-3 flex-1 w-full">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: step.color }} />
                  <p className="text-[10px] font-bold text-white">{step.label}</p>
                </div>
                <p className="text-[9px] text-[#555555]">{step.detail}</p>
              </div>
              {i < 4 && <ChevronRight className="h-3 w-3 text-[#333] shrink-0 rotate-90 sm:rotate-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* CV system teaser */}
      <div className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-5 flex items-center gap-4">
        <Cpu className="h-8 w-8 text-[#10B981] shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-bold text-white">Next: Replace StatsBomb with Elliot's CV System</p>
            <span className="rounded bg-[#8AE234]/20 px-2 py-0.5 text-[10px] font-bold text-[#8AE234]">ADMIN ONLY</span>
          </div>
          <p className="text-xs text-[#888888]">
            Our own CV tracking eliminates third-party data costs entirely.
            Possession-aware, frame-accurate, no licensing fees.
          </p>
        </div>
        <Link href="/admin/cv" className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#10B981] px-3 py-2 text-xs font-bold text-white hover:bg-[#10B981]/90 transition">
          Open CV <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

/* ══ MOMENTS ══ */
function MomentsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{MOMENTS.length} moments published</p>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#BA0C2F] px-3 py-2 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition">
          <Zap className="h-3.5 w-3.5" /> Generate New Moment
        </button>
      </div>

      {MOMENTS.map(m => {
        const rev = calcRev(m.sales);
        const sold = Object.values(m.sales).reduce((a, b) => a + b, 0);
        const max = Object.values(m.max).reduce((a, b) => a + b, 0);
        const pct = Math.round((sold / max) * 100);

        return (
          <div key={m.id} className="rounded-xl border border-white/5 bg-[#111111] p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-white">{m.player} · {m.minute}'</p>
                <p className="text-xs text-[#555555]">{m.match} · xG {m.xg}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: WREXHAM_GOLD }}>£{(rev / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-[#555555]">{pct}% sold</p>
              </div>
            </div>

            <div className="h-1.5 rounded-full bg-white/5 mb-3">
              <div className="h-full rounded-full bg-[#BA0C2F] transition-all" style={{ width: `${pct}%` }} />
            </div>

            <div className="flex gap-2 flex-wrap">
              {RARITY_TIERS.map(tier => {
                const Icon = tier.icon;
                const s = m.sales[tier.id as keyof typeof m.sales];
                const mx = m.max[tier.id as keyof typeof m.max];
                return (
                  <div key={tier.id} className="rounded-lg border border-white/5 bg-[#080810] px-2.5 py-1.5 flex items-center gap-1.5">
                    <Icon className="h-3 w-3" style={{ color: tier.color }} />
                    <span className="text-xs font-bold text-white">{s}/{mx}</span>
                  </div>
                );
              })}
            </div>

            {/* Admin controls not available to staff */}
            <div className="mt-3 flex gap-2">
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-[#888888] hover:text-white transition">
                <Settings className="h-3 w-3" /> Edit Editions
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] text-[#888888] hover:text-white transition">
                <Eye className="h-3 w-3" /> Preview
              </button>
              <button className="flex items-center gap-1.5 rounded-lg border border-[#EF4444]/20 px-3 py-1.5 text-[10px] text-[#EF4444] hover:bg-[#EF4444]/10 transition ml-auto">
                Unpublish
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══ BRANDING ══ */
function BrandingTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Palette className="h-4 w-4 text-[#BA0C2F]" /> Current Brand Config
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            {[
              { label: "Primary", value: "#BA0C2F", preview: "#BA0C2F" },
              { label: "Secondary", value: "#FFFFFF", preview: "#FFFFFF" },
              { label: "Accent", value: "#C9A84C", preview: "#C9A84C" },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="h-8 w-8 rounded border border-white/10 shrink-0" style={{ background: c.preview }} />
                <div>
                  <p className="text-xs text-[#888888]">{c.label}</p>
                  <p className="text-xs font-mono text-white">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-white/5 bg-[#080810] p-4 flex items-center justify-center">
            <div className="relative h-20 w-20">
              <Image src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png" alt="Wrexham" fill className="object-contain" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-[#BA0C2F] px-4 py-2 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition">Override Brand</button>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-xs text-[#888888] hover:text-white transition">Reset to Club Default</button>
        </div>
      </div>

      <div className="rounded-xl border border-[#8AE234]/20 bg-[#8AE234]/5 p-4 flex items-center gap-3">
        <Lock className="h-4 w-4 text-[#8AE234] shrink-0" />
        <p className="text-xs text-[#888888]">
          <span className="text-white font-semibold">Admin override active.</span> You can modify brand settings on behalf of the club.
          Changes will be reflected immediately in the fan-facing merch preview.
        </p>
      </div>
    </div>
  );
}

/* ══ REVENUE ══ */
function RevenueTab({ totalRev, totalUnits }: { totalRev: number; totalUnits: number }) {
  const emotivxCut = totalRev * 0.15;
  const clubCut = totalRev * 0.75;
  const playerCut = totalRev * 0.10;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Gross Revenue", value: `£${(totalRev / 1000).toFixed(1)}k`, color: WREXHAM_GOLD },
          { label: "EmotivX (15%)", value: `£${(emotivxCut / 1000).toFixed(1)}k`, color: "#8AE234" },
          { label: "Club (75%)", value: `£${(clubCut / 1000).toFixed(1)}k`, color: "#10B981" },
          { label: "Players (10%)", value: `£${(playerCut / 1000).toFixed(1)}k`, color: "#8B5CF6" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-[#111111] p-4">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-[#555555] uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
        <h3 className="text-sm font-bold text-white mb-4">Revenue Split</h3>
        <div className="space-y-3">
          {[
            { label: "Club (Wrexham AFC)", pct: 75, color: "#10B981", value: clubCut },
            { label: "EmotivX Platform", pct: 15, color: "#8AE234", value: emotivxCut },
            { label: "Players (NIL Rights)", pct: 10, color: "#8B5CF6", value: playerCut },
          ].map(r => (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#888888]">{r.label}</span>
                <span className="text-xs font-bold text-white">£{(r.value / 1000).toFixed(1)}k ({r.pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5">
        <h3 className="text-sm font-bold text-[#C9A84C] mb-3">Season Projection</h3>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          {[
            { label: "Goals this season", value: "~115" },
            { label: "Gross (70% sell-through)", value: "£7.7M" },
            { label: "EmotivX take (15%)", value: "£1.2M" },
          ].map(s => (
            <div key={s.label} className="rounded-lg bg-black/20 p-3">
              <p className="text-[10px] text-[#888888] mb-1">{s.label}</p>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ ADMIN TOOLS ══ */
function AdminToolsTab() {
  return (
    <div className="space-y-4">

      {/* Admin-only banner */}
      <div className="rounded-xl border border-[#8AE234]/30 bg-[#8AE234]/10 p-4 flex items-center gap-3">
        <Shield className="h-5 w-5 text-[#8AE234] shrink-0" />
        <p className="text-sm text-white">
          These tools are <strong>EmotivX admin only</strong> — not visible to club staff or fans.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">

        {/* CV System */}
        <Link href="/admin/cv" className="group rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-5 hover:border-[#10B981]/40 transition">
          <div className="flex items-center gap-3 mb-3">
            <Cpu className="h-6 w-6 text-[#10B981]" />
            <div>
              <p className="text-sm font-bold text-white">Elliot's CV System</p>
              <span className="text-[10px] text-[#F59E0B]">Beta — nearly working</span>
            </div>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            Real-time computer vision tracking. Ball position, possession state, homography mapping from broadcast feed.
            Will replace StatsBomb entirely.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#10B981]">
            Open CV System <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        {/* 360 Demo */}
        <Link href="/wrexham/360-viewer" className="group rounded-xl border border-[#BA0C2F]/20 bg-[#BA0C2F]/5 p-5 hover:border-[#BA0C2F]/40 transition">
          <div className="flex items-center gap-3 mb-3">
            <Monitor className="h-6 w-6 text-[#BA0C2F]" />
            <div>
              <p className="text-sm font-bold text-white">360° Stadium Demo</p>
              <span className="text-[10px] text-[#10B981]">Live</span>
            </div>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            Full data pipeline visualisation — Raw data → Data Line → Player Replay.
            8 viewer modes including THE REALITY and THE HOLLYWOOD.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#BA0C2F]">
            Launch Demo <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>

        {/* Moment approval override */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle className="h-6 w-6 text-[#F59E0B]" />
            <p className="text-sm font-bold text-white">Moment Override</p>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed mb-3">
            Approve, reject, or force-publish any moment for this club regardless of their staff settings.
          </p>
          <button className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#888888] hover:text-white transition">
            Manage Approvals
          </button>
        </div>

        {/* Onboarding */}
        <Link href="/admin/onboarding" className="group rounded-xl border border-white/5 bg-[#111111] p-5 hover:border-white/10 transition">
          <div className="flex items-center gap-3 mb-3">
            <Users className="h-6 w-6 text-[#8B5CF6]" />
            <p className="text-sm font-bold text-white">Club Onboarding</p>
          </div>
          <p className="text-xs text-[#888888] leading-relaxed">
            View and manage the onboarding pipeline for new clubs joining the platform.
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-[#8B5CF6]">
            View Pipeline <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </Link>
      </div>
    </div>
  );
}
