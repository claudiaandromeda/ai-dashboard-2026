"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield, ChevronRight, Search, Users, Zap, BarChart3,
  Cpu, TrendingUp, CheckCircle, Clock, AlertCircle, Trophy
} from "lucide-react";

/* ─── EFL League One 2024/25 Teams ─── */

interface EFLTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  primary: string;
  secondary: string;
  position: number;
  points: number;
  played: number;
  gd: number;
  status: "onboarded" | "invited" | "prospect";
  moments: number;
  revenue: string;
}

const EFL_TEAMS: EFLTeam[] = [
  { id: "wrexham", name: "Wrexham AFC", shortName: "WRE", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png", primary: "#BA0C2F", secondary: "#FFFFFF", position: 1, points: 78, played: 38, gd: 32, status: "onboarded", moments: 3, revenue: "£312k" },
  { id: "birmingham", name: "Birmingham City", shortName: "BIR", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/wufs551672950865.png", primary: "#0000FF", secondary: "#FFFFFF", position: 2, points: 76, played: 38, gd: 30, status: "prospect", moments: 0, revenue: "—" },
  { id: "huddersfield", name: "Huddersfield Town", shortName: "HUD", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/y11fin1677527513.png", primary: "#0E63AD", secondary: "#FFFFFF", position: 3, points: 72, played: 38, gd: 24, status: "prospect", moments: 0, revenue: "—" },
  { id: "wigan", name: "Wigan Athletic", shortName: "WIG", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/wtxwyw1448759640.png", primary: "#1D3C7A", secondary: "#FFFFFF", position: 4, points: 68, played: 38, gd: 18, status: "prospect", moments: 0, revenue: "—" },
  { id: "barnsley", name: "Barnsley", shortName: "BAR", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/xvxsuv1447437855.png", primary: "#E30613", secondary: "#FFFFFF", position: 5, points: 65, played: 38, gd: 14, status: "prospect", moments: 0, revenue: "—" },
  { id: "stockport", name: "Stockport County", shortName: "STO", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/jcsz9k1594450753.png", primary: "#004B87", secondary: "#FFFFFF", position: 6, points: 63, played: 38, gd: 12, status: "prospect", moments: 0, revenue: "—" },
  { id: "bolton", name: "Bolton Wanderers", shortName: "BOL", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/yvxxrv1448808301.png", primary: "#263B6E", secondary: "#FFFFFF", position: 7, points: 60, played: 38, gd: 10, status: "prospect", moments: 0, revenue: "—" },
  { id: "peterborough", name: "Peterborough United", shortName: "PET", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/63gt4u1761710001.png", primary: "#003DA5", secondary: "#FFFFFF", position: 8, points: 58, played: 38, gd: 8, status: "prospect", moments: 0, revenue: "—" },
  { id: "charlton", name: "Charlton Athletic", shortName: "CHA", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/o08wvi1635872307.png", primary: "#D4021D", secondary: "#FFFFFF", position: 9, points: 56, played: 38, gd: 6, status: "prospect", moments: 0, revenue: "—" },
  { id: "mansfield", name: "Mansfield Town", shortName: "MAN", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/c1fpes1761709071.png", primary: "#F0AB00", secondary: "#003DA5", position: 10, points: 54, played: 38, gd: 4, status: "prospect", moments: 0, revenue: "—" },
  { id: "reading", name: "Reading", shortName: "REA", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/tprvtu1448811527.png", primary: "#004494", secondary: "#FFFFFF", position: 11, points: 52, played: 38, gd: 3, status: "prospect", moments: 0, revenue: "—" },
  { id: "exeter", name: "Exeter City", shortName: "EXE", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/98wt4h1521144923.png", primary: "#E30613", secondary: "#000000", position: 12, points: 50, played: 38, gd: 1, status: "prospect", moments: 0, revenue: "—" },
  { id: "blackpool", name: "Blackpool", shortName: "BLK", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/utywru1448754934.png", primary: "#F68B1F", secondary: "#FFFFFF", position: 13, points: 48, played: 38, gd: 0, status: "prospect", moments: 0, revenue: "—" },
  { id: "wycombe", name: "Wycombe Wanderers", shortName: "WYC", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/avi3bu1688678934.png", primary: "#004B87", secondary: "#FFFFFF", position: 14, points: 47, played: 38, gd: -2, status: "prospect", moments: 0, revenue: "—" },
  { id: "lincoln", name: "Lincoln City", shortName: "LIN", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/x46tji1719860130.png", primary: "#E30613", secondary: "#FFFFFF", position: 15, points: 45, played: 38, gd: -4, status: "prospect", moments: 0, revenue: "—" },
  { id: "rotherham", name: "Rotherham United", shortName: "ROT", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/sewy0z1752149213.png", primary: "#E30613", secondary: "#F0AB00", position: 16, points: 44, played: 38, gd: -5, status: "prospect", moments: 0, revenue: "—" },
  { id: "leyton-orient", name: "Leyton Orient", shortName: "LEY", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/g4d9bi1688678797.png", primary: "#E30613", secondary: "#000000", position: 17, points: 42, played: 38, gd: -7, status: "prospect", moments: 0, revenue: "—" },
  { id: "northampton", name: "Northampton Town", shortName: "NOR", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/aa42641684131255.png", primary: "#6C1D45", secondary: "#FFFFFF", position: 18, points: 40, played: 38, gd: -9, status: "prospect", moments: 0, revenue: "—" },
  { id: "bristol-rovers", name: "Bristol Rovers", shortName: "BRI", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/kkmj4o1689317429.png", primary: "#0057A0", secondary: "#FFFFFF", position: 19, points: 38, played: 38, gd: -11, status: "prospect", moments: 0, revenue: "—" },
  { id: "cambridge", name: "Cambridge United", shortName: "CAM", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/ggihm61750279411.png", primary: "#F0AB00", secondary: "#000000", position: 20, points: 36, played: 38, gd: -14, status: "prospect", moments: 0, revenue: "—" },
  { id: "crawley", name: "Crawley Town", shortName: "CRA", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/a9hv3n1689632800.png", primary: "#E30613", secondary: "#FFFFFF", position: 21, points: 34, played: 38, gd: -16, status: "prospect", moments: 0, revenue: "—" },
  { id: "burton", name: "Burton Albion", shortName: "BUR", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/uvpqpw1423804499.png", primary: "#FFD700", secondary: "#000000", position: 22, points: 32, played: 38, gd: -19, status: "prospect", moments: 0, revenue: "—" },
  { id: "shrewsbury", name: "Shrewsbury Town", shortName: "SHR", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/9zqhpw1546434997.png", primary: "#0057A0", secondary: "#F0AB00", position: 23, points: 30, played: 38, gd: -22, status: "prospect", moments: 0, revenue: "—" },
  { id: "stevenage", name: "Stevenage", shortName: "STE", logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/o4m2ci1596480474.png", primary: "#E30613", secondary: "#FFFFFF", position: 24, points: 28, played: 38, gd: -25, status: "prospect", moments: 0, revenue: "—" },
];

const STATUS_CONFIG = {
  onboarded: { label: "Live", color: "#10B981", bg: "#064E3B", icon: CheckCircle },
  invited: { label: "Invited", color: "#F59E0B", bg: "#451A03", icon: Clock },
  prospect: { label: "Prospect", color: "#555555", bg: "#1A1A1A", icon: AlertCircle },
};

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "onboarded" | "invited" | "prospect">("all");

  const filtered = EFL_TEAMS.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onboarded = EFL_TEAMS.filter(t => t.status === "onboarded").length;
  const invited = EFL_TEAMS.filter(t => t.status === "invited").length;
  const prospects = EFL_TEAMS.filter(t => t.status === "prospect").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#DA291C] shrink-0">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">EmotivX Admin</h1>
          <p className="text-sm text-[#888888]">EFL League One — Platform Control Centre</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Link
            href="/admin/cv"
            className="flex items-center gap-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-xs font-semibold text-[#10B981] hover:bg-[#10B981]/20 transition"
          >
            <Cpu className="h-3.5 w-3.5" />
            EmotivX Tracking System
          </Link>
          <Link
            href="/wrexham/360-viewer"
            className="flex items-center gap-2 rounded-lg border border-[#BA0C2F]/30 bg-[#BA0C2F]/10 px-3 py-2 text-xs font-semibold text-[#BA0C2F] hover:bg-[#BA0C2F]/20 transition"
          >
            <Zap className="h-3.5 w-3.5" />
            360° Stadium Demo
          </Link>
        </div>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Teams", value: EFL_TEAMS.length, color: "#FFFFFF", sub: "EFL League One" },
          { label: "Live", value: onboarded, color: "#10B981", sub: "Earning revenue" },
          { label: "Invited", value: invited, color: "#F59E0B", sub: "Awaiting sign-up" },
          { label: "Prospects", value: prospects, color: "#555555", sub: "Not yet contacted" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-[#111111] p-4">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-semibold text-white mt-1">{s.label}</p>
            <p className="text-[10px] text-[#555555]">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#555555]" />
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#111111] pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#444] focus:border-[#DA291C]/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "onboarded", "invited", "prospect"] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${statusFilter === f ? "bg-[#DA291C] text-white" : "border border-white/10 text-[#888888] hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Teams grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(team => {
          const cfg = STATUS_CONFIG[team.status];
          const Icon = cfg.icon;
          const isWrexham = team.id === "wrexham";

          return (
            <Link
              key={team.id}
              href={`/admin/teams/${team.id}`}
              className={`group relative rounded-xl border p-4 transition flex flex-col gap-3 ${
                isWrexham
                  ? "border-[#BA0C2F]/40 bg-[#BA0C2F]/5 hover:border-[#BA0C2F]/60"
                  : "border-white/5 bg-[#111111] hover:border-white/10"
              }`}
            >
              {/* Live indicator stripe */}
              {isWrexham && (
                <div className="absolute top-0 left-0 h-0.5 w-full rounded-t-xl bg-[#BA0C2F]" />
              )}

              <div className="flex items-center gap-3">
                {/* Position */}
                <span className="text-lg font-bold text-[#333] w-6 shrink-0 text-center">{team.position}</span>

                {/* Logo */}
                <div className="relative h-10 w-10 shrink-0">
                  <Image
                    src={team.logoUrl}
                    alt={team.name}
                    fill
                    className="object-contain"
                    onError={() => {}}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{team.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className="h-3 w-3" style={{ color: cfg.color }} />
                    <span className="text-[10px]" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-[#333] group-hover:text-[#888] transition" />
              </div>

              {/* Stats row */}
              <div className="flex gap-2 text-[10px]">
                <span className="rounded px-2 py-1 bg-white/5 text-[#888888]">P{team.played}</span>
                <span className="rounded px-2 py-1 bg-white/5 text-white font-bold">{team.points}pts</span>
                <span className={`rounded px-2 py-1 bg-white/5 ${team.gd >= 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                  {team.gd >= 0 ? "+" : ""}{team.gd} GD
                </span>
                {team.moments > 0 && (
                  <span className="rounded px-2 py-1 bg-[#BA0C2F]/20 text-[#BA0C2F]">{team.moments} moments</span>
                )}
                {team.revenue !== "—" && (
                  <span className="rounded px-2 py-1 bg-[#C9A84C]/10 text-[#C9A84C] font-bold">{team.revenue}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
