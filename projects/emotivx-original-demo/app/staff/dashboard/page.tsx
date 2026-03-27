"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar, Trophy, TrendingUp, Package, Palette, Zap, Eye,
  ChevronRight, BarChart3, ShoppingBag, Settings, Star, Cpu,
  RefreshCw, Play, Plus, Sliders, DollarSign, Users, Crown,
  Flame, Sparkles, Target, CheckCircle, Clock, Lock
} from "lucide-react";

/* ─── Wrexham 2024/25 League One Season ─── */

const WREXHAM_RED = "#BA0C2F";
const WREXHAM_GOLD = "#C9A84C";

type GameResult = "W" | "D" | "L" | "upcoming";

interface Game {
  id: string;
  date: string;
  opponent: string;
  venue: "H" | "A";
  result?: GameResult;
  score?: string;
  goals?: { player: string; minute: number; xg: number }[];
  competition: string;
  matchId?: string;
}

const SEASON_GAMES: Game[] = [
  { id: "g1", date: "2024-08-10", opponent: "Stockport County", venue: "H", result: "W", score: "2-1", competition: "League One", matchId: "wx001", goals: [{ player: "Mullin", minute: 23, xg: 0.82 }, { player: "Dalby", minute: 67, xg: 0.61 }] },
  { id: "g2", date: "2024-08-17", opponent: "Barnsley", venue: "A", result: "D", score: "1-1", competition: "League One", matchId: "wx002", goals: [{ player: "Palmer", minute: 44, xg: 0.45 }] },
  { id: "g3", date: "2024-08-20", opponent: "Rotherham United", venue: "H", result: "W", score: "3-0", competition: "League One", matchId: "wx003", goals: [{ player: "Mullin", minute: 12, xg: 0.78 }, { player: "Lee", minute: 55, xg: 0.33 }, { player: "Dalby", minute: 88, xg: 0.91 }] },
  { id: "g4", date: "2024-08-24", opponent: "Wigan Athletic", venue: "A", result: "L", score: "0-2", competition: "League One", matchId: "wx004", goals: [] },
  { id: "g5", date: "2024-08-31", opponent: "Bolton Wanderers", venue: "H", result: "W", score: "1-0", competition: "League One", matchId: "wx005", goals: [{ player: "Mullin", minute: 78, xg: 0.55 }] },
  { id: "g6", date: "2024-09-07", opponent: "Peterborough United", venue: "A", result: "D", score: "2-2", competition: "League One", matchId: "wx006", goals: [{ player: "Palmer", minute: 31, xg: 0.62 }, { player: "Forde", minute: 89, xg: 0.41 }] },
  { id: "g7", date: "2024-09-14", opponent: "Birmingham City", venue: "H", result: "W", score: "2-0", competition: "League One", matchId: "wx007", goals: [{ player: "Dalby", minute: 18, xg: 0.74 }, { player: "Mullin", minute: 72, xg: 0.68 }] },
  { id: "g8", date: "2024-09-21", opponent: "Reading", venue: "A", result: "W", score: "1-0", competition: "League One", matchId: "wx008", goals: [{ player: "Lee", minute: 63, xg: 0.38 }] },
  { id: "g9", date: "2024-09-28", opponent: "Huddersfield Town", venue: "H", result: "L", score: "1-2", competition: "League One", matchId: "wx009", goals: [{ player: "Palmer", minute: 54, xg: 0.49 }] },
  { id: "g10", date: "2024-10-05", opponent: "Charlton Athletic", venue: "A", result: "W", score: "2-1", competition: "League One", matchId: "wx010", goals: [{ player: "Mullin", minute: 34, xg: 0.71 }, { player: "Barnett", minute: 81, xg: 0.29 }] },
  { id: "g11", date: "2024-10-19", opponent: "Bristol Rovers", venue: "H", result: "W", score: "3-1", competition: "League One", matchId: "wx011", goals: [{ player: "Dalby", minute: 7, xg: 0.83 }, { player: "Mullin", minute: 42, xg: 0.66 }, { player: "Lee", minute: 77, xg: 0.44 }] },
  { id: "g12", date: "2024-10-26", opponent: "Blackpool", venue: "A", result: "D", score: "0-0", competition: "League One", matchId: "wx012", goals: [] },
  { id: "g13", date: "2024-11-02", opponent: "Shrewsbury Town", venue: "H", result: "W", score: "4-0", competition: "League One", matchId: "wx013", goals: [{ player: "Mullin", minute: 11, xg: 0.88 }, { player: "Palmer", minute: 29, xg: 0.72 }, { player: "Dalby", minute: 58, xg: 0.61 }, { player: "Forde", minute: 85, xg: 0.35 }] },
  { id: "g14", date: "2024-11-09", opponent: "Lincoln City", venue: "A", result: "L", score: "0-1", competition: "League One", matchId: "wx014", goals: [] },
  { id: "g15", date: "2024-11-16", opponent: "Stevenage", venue: "H", result: "W", score: "2-1", competition: "League One", matchId: "wx015", goals: [{ player: "Mullin", minute: 38, xg: 0.59 }, { player: "Lee", minute: 74, xg: 0.41 }] },
  { id: "g16", date: "2024-11-23", opponent: "Exeter City", venue: "A", result: "W", score: "1-0", competition: "League One", matchId: "wx016", goals: [{ player: "Dalby", minute: 56, xg: 0.53 }] },
  { id: "g17", date: "2024-11-30", opponent: "Burton Albion", venue: "H", result: "D", score: "1-1", competition: "League One", matchId: "wx017", goals: [{ player: "Palmer", minute: 67, xg: 0.47 }] },
  { id: "g18", date: "2024-12-07", opponent: "Cambridge United", venue: "A", result: "W", score: "2-0", competition: "League One", matchId: "wx018", goals: [{ player: "Mullin", minute: 22, xg: 0.77 }, { player: "Davies", minute: 88, xg: 0.31 }] },
  { id: "g19", date: "2024-12-14", opponent: "Northampton Town", venue: "H", result: "W", score: "3-2", competition: "League One", matchId: "wx019", goals: [{ player: "Mullin", minute: 9, xg: 0.81 }, { player: "Dalby", minute: 45, xg: 0.64 }, { player: "Lee", minute: 83, xg: 0.38 }] },
  { id: "g20", date: "2024-12-21", opponent: "Stockport County", venue: "A", result: "D", score: "1-1", competition: "League One", matchId: "wx020", goals: [{ player: "Palmer", minute: 70, xg: 0.43 }] },
  { id: "g21", date: "2024-12-26", opponent: "Barnsley", venue: "H", result: "W", score: "2-0", competition: "League One", matchId: "wx021", goals: [{ player: "Mullin", minute: 33, xg: 0.69 }, { player: "Forde", minute: 76, xg: 0.36 }] },
  { id: "g22", date: "2025-01-01", opponent: "Wigan Athletic", venue: "H", result: "W", score: "1-0", competition: "League One", matchId: "wx022", goals: [{ player: "Dalby", minute: 51, xg: 0.58 }] },
  { id: "g23", date: "2025-01-11", opponent: "Bolton Wanderers", venue: "A", result: "L", score: "1-3", competition: "League One", matchId: "wx023", goals: [{ player: "Mullin", minute: 14, xg: 0.73 }] },
  { id: "g24", date: "2025-01-18", opponent: "Peterborough United", venue: "H", result: "W", score: "2-1", competition: "League One", matchId: "wx024", goals: [{ player: "Palmer", minute: 27, xg: 0.66 }, { player: "Lee", minute: 82, xg: 0.44 }] },
  { id: "g25", date: "2025-01-25", opponent: "Rotherham United", venue: "A", result: "D", score: "2-2", competition: "League One", matchId: "wx025", goals: [{ player: "Mullin", minute: 41, xg: 0.55 }, { player: "Dalby", minute: 79, xg: 0.62 }] },
  { id: "g26", date: "2025-02-01", opponent: "Reading", venue: "H", result: "W", score: "3-0", competition: "League One", matchId: "wx026", goals: [{ player: "Mullin", minute: 16, xg: 0.85 }, { player: "Forde", minute: 54, xg: 0.39 }, { player: "Davies", minute: 88, xg: 0.28 }] },
  { id: "g27", date: "2025-02-08", opponent: "Birmingham City", venue: "A", result: "W", score: "1-0", competition: "League One", matchId: "wx027", goals: [{ player: "Dalby", minute: 63, xg: 0.52 }] },
  { id: "g28", date: "2025-02-15", opponent: "Charlton Athletic", venue: "H", result: "W", score: "2-1", competition: "League One", matchId: "wx028", goals: [{ player: "Mullin", minute: 30, xg: 0.71 }, { player: "Lee", minute: 75, xg: 0.46 }] },
  { id: "g29", date: "2025-02-22", opponent: "Huddersfield Town", venue: "A", result: "D", score: "1-1", competition: "League One", matchId: "wx029", goals: [{ player: "Palmer", minute: 87, xg: 0.39 }] },
  // Upcoming
  { id: "g30", date: "2025-03-15", opponent: "Bristol Rovers", venue: "A", result: "upcoming", competition: "League One" },
  { id: "g31", date: "2025-03-22", opponent: "Blackpool", venue: "H", result: "upcoming", competition: "League One" },
  { id: "g32", date: "2025-03-29", opponent: "Shrewsbury Town", venue: "A", result: "upcoming", competition: "League One" },
  { id: "g33", date: "2025-04-05", opponent: "Lincoln City", venue: "H", result: "upcoming", competition: "League One" },
  { id: "g34", date: "2025-04-12", opponent: "Stevenage", venue: "A", result: "upcoming", competition: "League One" },
  { id: "g35", date: "2025-04-19", opponent: "Exeter City", venue: "H", result: "upcoming", competition: "League One" },
  { id: "g36", date: "2025-04-26", opponent: "Cambridge United", venue: "H", result: "upcoming", competition: "League One" },
  { id: "g37", date: "2025-05-03", opponent: "Burton Albion", venue: "A", result: "upcoming", competition: "League One" },
];

/* ─── Rarity tiers ─── */

interface RarityTier {
  id: string;
  label: string;
  icon: typeof Crown;
  color: string;
  bgColor: string;
  defaultCount: number;
  priceMultiplier: number;
  description: string;
}

const RARITY_TIERS: RarityTier[] = [
  { id: "common", label: "Common", icon: Package, color: "#9CA3AF", bgColor: "#374151", defaultCount: 500, priceMultiplier: 1, description: "Mass edition — every fan can own one" },
  { id: "uncommon", label: "Uncommon", icon: Star, color: "#10B981", bgColor: "#064E3B", defaultCount: 200, priceMultiplier: 1.5, description: "Limited run — popular but not scarce" },
  { id: "rare", label: "Rare", icon: Zap, color: "#3B82F6", bgColor: "#1E3A5F", defaultCount: 75, priceMultiplier: 2.5, description: "Collector's tier — meaningful scarcity" },
  { id: "epic", label: "Epic", icon: Flame, color: "#8B5CF6", bgColor: "#2E1065", defaultCount: 25, priceMultiplier: 5, description: "Prestige — for the true fans" },
  { id: "legendary", label: "Legendary", icon: Crown, color: "#F59E0B", bgColor: "#451A03", defaultCount: 5, priceMultiplier: 20, description: "Ultra-rare — nearly one of a kind" },
];

/* ─── Mock sales data ─── */

const PUBLISHED_MOMENTS = [
  {
    id: "m1",
    player: "Mullin",
    opponent: "Shrewsbury Town",
    minute: 11,
    date: "Nov 2",
    sales: { common: 312, uncommon: 134, rare: 48, epic: 18, legendary: 4 },
    maxEditions: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 },
  },
  {
    id: "m2",
    player: "Dalby",
    opponent: "Birmingham City",
    minute: 18,
    date: "Sep 14",
    sales: { common: 423, uncommon: 176, rare: 61, epic: 22, legendary: 5 },
    maxEditions: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 },
  },
  {
    id: "m3",
    player: "Mullin",
    opponent: "Rotherham Utd",
    minute: 12,
    date: "Aug 20",
    sales: { common: 498, uncommon: 198, rare: 73, epic: 24, legendary: 5 },
    maxEditions: { common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5 },
  },
];

const BASE_HOODIE_PRICE = 79;

function calcRevenue(sales: Record<string, number>) {
  return RARITY_TIERS.reduce((total, tier) => {
    return total + (sales[tier.id] || 0) * BASE_HOODIE_PRICE * tier.priceMultiplier;
  }, 0);
}

/* ─── Colour palette ─── */

const PALETTE_PRESETS = [
  { name: "Home Kit", primary: "#BA0C2F", secondary: "#FFFFFF", accent: "#C9A84C" },
  { name: "Away Kit", primary: "#FFD100", secondary: "#1A5C2A", accent: "#BA0C2F" },
  { name: "Dark Mode", primary: "#0A0A0A", secondary: "#BA0C2F", accent: "#FFFFFF" },
  { name: "Gold Special", primary: "#C9A84C", secondary: "#1A1A1A", accent: "#BA0C2F" },
];

/* ─── Sponsor logos ─── */

const SPONSOR_SLOTS = [
  { id: "s1", label: "Main Shirt Sponsor", active: false, placeholder: "Upload sponsor logo" },
  { id: "s2", label: "Sleeve Sponsor", active: false, placeholder: "Upload sleeve logo" },
  { id: "s3", label: "Back of Shirt", active: false, placeholder: "Upload back sponsor" },
  { id: "s4", label: "Training Kit", active: false, placeholder: "Upload training partner" },
];

type Tab = "schedule" | "moment-generator" | "ip-manager" | "sales";

export default function StaffDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("schedule");

  // Season stats
  const played = SEASON_GAMES.filter(g => g.result !== "upcoming");
  const wins = played.filter(g => g.result === "W").length;
  const draws = played.filter(g => g.result === "D").length;
  const losses = played.filter(g => g.result === "L").length;
  const totalGoals = played.reduce((sum, g) => sum + (g.goals?.length || 0), 0);

  const totalRevenue = PUBLISHED_MOMENTS.reduce((sum, m) => sum + calcRevenue(m.sales), 0);

  const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
    { id: "schedule", label: "Season Schedule", icon: Calendar },
    { id: "moment-generator", label: "Moment Generator", icon: Zap },
    { id: "ip-manager", label: "IP & Branding", icon: Palette },
    { id: "sales", label: "Sales & Revenue", icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0">
          <Image
            src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
            alt="Wrexham AFC"
            fill
            className="object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Wrexham AFC — Staff Portal</h1>
          <p className="text-sm text-[#888888]">2024/25 League One Season · Full IP Control</p>
        </div>
        <div className="ml-auto hidden sm:flex gap-3">
          <Link
            href="/merch-preview?team=wrexham"
            className="flex items-center gap-2 rounded-lg border border-[#BA0C2F]/40 px-3 py-2 text-xs font-semibold text-[#BA0C2F] hover:bg-[#BA0C2F]/10 transition"
          >
            <Eye className="h-3.5 w-3.5" />
            View Merch Preview
          </Link>
        </div>
      </div>

      {/* Season summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "Played", value: played.length, color: "#888888" },
          { label: "Won", value: wins, color: "#10B981" },
          { label: "Drawn", value: draws, color: "#F59E0B" },
          { label: "Lost", value: losses, color: "#EF4444" },
          { label: "Goals", value: totalGoals, color: "#BA0C2F" },
          { label: "Revenue", value: `£${(totalRevenue / 1000).toFixed(0)}k`, color: WREXHAM_GOLD },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-white/5 bg-[#111111] p-4">
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#555555] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition whitespace-nowrap shrink-0 ${active ? "text-white" : "text-[#888888] hover:text-white/70"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {active && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#BA0C2F]" />}
            </button>
          );
        })}
      </div>

      {activeTab === "schedule" && <ScheduleTab games={SEASON_GAMES} />}
      {activeTab === "moment-generator" && <MomentGeneratorTab />}
      {activeTab === "ip-manager" && <IPManagerTab />}
      {activeTab === "sales" && <SalesTab moments={PUBLISHED_MOMENTS} totalRevenue={totalRevenue} />}
    </div>
  );
}

/* ══ SCHEDULE TAB ══ */

function ScheduleTab({ games }: { games: Game[] }) {
  const [selected, setSelected] = useState<Game | null>(null);
  const [filter, setFilter] = useState<"all" | "played" | "upcoming">("all");

  const filtered = games.filter(g => {
    if (filter === "played") return g.result !== "upcoming";
    if (filter === "upcoming") return g.result === "upcoming";
    return true;
  });

  const resultColor = (r?: GameResult) => {
    if (r === "W") return "#10B981";
    if (r === "D") return "#F59E0B";
    if (r === "L") return "#EF4444";
    return "#555555";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "played", "upcoming"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize transition ${filter === f ? "bg-[#BA0C2F] text-white" : "border border-white/10 text-[#888888] hover:text-white"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#555555]">{filtered.length} matches</p>
      </div>

      <div className="grid gap-2">
        {filtered.map(game => (
          <div
            key={game.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${
              selected?.id === game.id
                ? "border-[#BA0C2F]/50 bg-[#BA0C2F]/5"
                : "border-white/5 bg-[#111111] hover:border-white/10"
            }`}
            onClick={() => setSelected(selected?.id === game.id ? null : game)}
          >
            {/* Date */}
            <div className="w-20 shrink-0">
              <p className="text-[10px] text-[#555555]">
                {new Date(game.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            {/* H/A badge */}
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${game.venue === "H" ? "bg-[#BA0C2F]/20 text-[#BA0C2F]" : "bg-white/5 text-[#888888]"}`}>
              {game.venue}
            </span>
            {/* Opponent */}
            <p className="flex-1 text-sm font-medium text-white">{game.opponent}</p>
            {/* Result */}
            {game.result !== "upcoming" ? (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold text-white">{game.score}</span>
                <span className="h-5 w-5 flex items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: resultColor(game.result) + "30", color: resultColor(game.result) }}>
                  {game.result}
                </span>
              </div>
            ) : (
              <span className="text-xs text-[#555555] shrink-0">Upcoming</span>
            )}
            {/* Goals badge */}
            {game.goals && game.goals.length > 0 && (
              <span className="shrink-0 rounded-full bg-[#BA0C2F]/20 px-2 py-0.5 text-[10px] text-[#BA0C2F] font-medium">
                {game.goals.length}⚽
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Goal selector panel */}
      {selected && selected.goals && selected.goals.length > 0 && (
        <div className="rounded-xl border border-[#BA0C2F]/30 bg-[#BA0C2F]/5 p-4">
          <p className="text-xs font-bold text-[#BA0C2F] uppercase tracking-wider mb-3">
            Goals vs {selected.opponent} — Select to create merch
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {selected.goals.map((goal, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-[#111111] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{goal.player}</span>
                  <span className="text-xs text-[#888888]">{goal.minute}'</span>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-[#555555] mb-1">
                    <span>xG</span>
                    <span className="text-white">{goal.xg.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-[#BA0C2F]" style={{ width: `${goal.xg * 100}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => {}}
                  className="w-full rounded-lg bg-[#BA0C2F] py-1.5 text-[10px] font-bold text-white hover:bg-[#BA0C2F]/90 transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3 w-3" />
                  Create Merch Set
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ MOMENT GENERATOR TAB ══ */

function MomentGeneratorTab() {
  const [mode, setMode] = useState<"auto" | "manual" | "footage">("auto");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(0);
  const [rarityControls, setRarityControls] = useState<Record<string, number>>({
    common: 500, uncommon: 200, rare: 75, epic: 25, legendary: 5
  });

  const DEMO_GOALS = [
    { player: "Paul Mullin", opponent: "Shrewsbury Town", minute: 11, xg: 0.88, match: "Wrexham 4-0 Shrewsbury" },
    { player: "Sam Dalby", opponent: "Birmingham City", minute: 18, xg: 0.74, match: "Wrexham 2-0 Birmingham" },
    { player: "Elliot Lee", opponent: "Rotherham United", minute: 55, xg: 0.33, match: "Wrexham 3-0 Rotherham" },
  ];

  const goal = DEMO_GOALS[selectedGoal];
  const basePrice = BASE_HOODIE_PRICE;

  const potentialRevenue = RARITY_TIERS.reduce((sum, tier) => {
    return sum + (rarityControls[tier.id] || 0) * basePrice * tier.priceMultiplier;
  }, 0);

  function handleAutoGenerate() {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2200);
  }

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex gap-2">
        {[
          { id: "auto", label: "Auto Generate", icon: Zap, desc: "Pull from StatsBomb data" },
          { id: "manual", label: "Manual Create", icon: Plus, desc: "Define moment manually" },
          { id: "footage", label: "Upload Footage", icon: Play, desc: "Calibrate from video" },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as typeof mode)}
            className={`flex-1 rounded-xl border p-3 text-left transition ${mode === m.id ? "border-[#BA0C2F]/50 bg-[#BA0C2F]/5" : "border-white/5 bg-[#111111] hover:border-white/10"}`}
          >
            <m.icon className={`h-4 w-4 mb-1.5 ${mode === m.id ? "text-[#BA0C2F]" : "text-[#555555]"}`} />
            <p className="text-xs font-semibold text-white">{m.label}</p>
            <p className="text-[10px] text-[#555555]">{m.desc}</p>
          </button>
        ))}
      </div>

      {mode === "auto" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left — Goal selector + controls */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-2 block">Select Goal</label>
              <div className="space-y-2">
                {DEMO_GOALS.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => { setSelectedGoal(i); setGenerated(false); }}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${selectedGoal === i ? "border-[#BA0C2F]/50 bg-[#BA0C2F]/5" : "border-white/5 bg-[#111111]"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white">{g.player}</p>
                        <p className="text-[10px] text-[#555555]">{g.match} · {g.minute}'</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#888888]">xG</p>
                        <p className="text-sm font-bold" style={{ color: g.xg > 0.7 ? "#10B981" : g.xg > 0.4 ? "#F59E0B" : "#EF4444" }}>{g.xg.toFixed(2)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rarity edition controls */}
            <div>
              <label className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-3 block">Edition Sizes</label>
              <div className="space-y-3">
                {RARITY_TIERS.map(tier => {
                  const Icon = tier.icon;
                  return (
                    <div key={tier.id} className="rounded-lg border border-white/5 bg-[#111111] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5" style={{ color: tier.color }} />
                          <span className="text-xs font-semibold text-white">{tier.label}</span>
                          <span className="text-[10px] text-[#555555]">× {tier.priceMultiplier}x price</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white w-12 text-right">
                            {rarityControls[tier.id]}
                          </span>
                          <span className="text-[10px] text-[#555555]">
                            = £{(rarityControls[tier.id] * basePrice * tier.priceMultiplier / 1000).toFixed(1)}k
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={tier.id === "legendary" ? 1 : 0}
                        max={tier.id === "common" ? 2000 : tier.id === "uncommon" ? 500 : tier.id === "rare" ? 200 : tier.id === "epic" ? 50 : 10}
                        value={rarityControls[tier.id]}
                        onChange={e => setRarityControls(prev => ({ ...prev, [tier.id]: parseInt(e.target.value) }))}
                        className="w-full accent-[#BA0C2F]"
                      />
                      <p className="text-[10px] text-[#444444] mt-1">{tier.description}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-3 flex items-center justify-between">
                <span className="text-xs text-[#888888]">Potential revenue (if sold out)</span>
                <span className="text-lg font-bold" style={{ color: WREXHAM_GOLD }}>£{(potentialRevenue / 1000).toFixed(1)}k</span>
              </div>
            </div>

            <button
              onClick={handleAutoGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-[#BA0C2F] py-3 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Generating Data Line...</>
              ) : (
                <><Zap className="h-4 w-4" /> Auto-Generate Data Line</>
              )}
            </button>
          </div>

          {/* Right — Preview */}
          <div className="rounded-xl border border-white/5 bg-[#111111] p-4 flex flex-col">
            <p className="text-xs font-semibold text-[#888888] uppercase tracking-wider mb-4">Data Line Preview</p>
            {generated ? (
              <div className="flex-1 flex flex-col gap-4">
                {/* SVG data line preview */}
                <div className="rounded-lg bg-[#0A0A0A] border border-white/5 p-4 flex-1 flex items-center justify-center">
                  <svg viewBox="0 0 300 180" className="w-full max-h-48" fill="none">
                    <rect width="300" height="180" fill="#0A0A0A" />
                    {/* Pitch outline */}
                    <rect x="20" y="20" width="260" height="140" rx="2" stroke="#222" strokeWidth="1" />
                    <line x1="150" y1="20" x2="150" y2="160" stroke="#222" strokeWidth="0.5" />
                    <circle cx="150" cy="90" r="25" stroke="#222" strokeWidth="0.5" fill="none" />
                    {/* Goal path - animated-style */}
                    <path
                      d="M45 130 C70 120, 90 80, 120 95 S160 55, 185 70 S230 40, 265 55"
                      stroke={WREXHAM_RED}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    {/* Waypoints */}
                    {[{ x: 45, y: 130 }, { x: 120, y: 95 }, { x: 185, y: 70 }, { x: 265, y: 55 }].map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r={i === 3 ? 5 : 3} fill={i === 3 ? "#fff" : WREXHAM_RED} />
                    ))}
                    {/* Goal marker */}
                    <circle cx={265} cy={55} r={8} stroke={WREXHAM_RED} strokeWidth="1.5" fill="none" opacity="0.5" />
                    {/* Player label */}
                    <text x="42" y="148" fill="#888" fontSize="8" fontFamily="monospace">{goal.player.split(" ")[1].toUpperCase()}</text>
                    <text x="245" y="45" fill={WREXHAM_RED} fontSize="9" fontFamily="monospace" fontWeight="bold">GOAL</text>
                    <text x="245" y="57" fill="#888" fontSize="7" fontFamily="monospace">{goal.minute}'</text>
                    {/* xG */}
                    <text x="20" y="175" fill="#444" fontSize="7" fontFamily="monospace">xG {goal.xg.toFixed(2)}</text>
                    <text x="200" y="175" fill="#444" fontSize="7" fontFamily="monospace">WREXHAM AFC · 2024/25</text>
                  </svg>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-[#0A0A0A] p-3">
                    <p className="text-[#555555]">Player</p>
                    <p className="text-white font-bold">{goal.player}</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] p-3">
                    <p className="text-[#555555]">Minute</p>
                    <p className="text-white font-bold">{goal.minute}'</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] p-3">
                    <p className="text-[#555555]">xG</p>
                    <p className="font-bold" style={{ color: "#10B981" }}>{goal.xg.toFixed(2)}</p>
                  </div>
                  <div className="rounded-lg bg-[#0A0A0A] p-3">
                    <p className="text-[#555555]">Total editions</p>
                    <p className="text-white font-bold">{Object.values(rarityControls).reduce((a, b) => a + b, 0)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 rounded-lg border border-white/10 py-2 text-xs font-semibold text-white hover:bg-white/5 transition">
                    Edit Data Line
                  </button>
                  <Link
                    href="/merch-preview?team=wrexham"
                    className="flex-1 rounded-lg bg-[#BA0C2F] py-2 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition text-center"
                  >
                    Preview on Merch →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="h-16 w-16 rounded-full border border-dashed border-white/10 flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-[#333]" />
                </div>
                <p className="text-sm text-[#555555]">Select a goal and click Auto-Generate</p>
                <p className="text-[10px] text-[#333] mt-1">Data line will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 space-y-4">
          <p className="text-sm font-semibold text-white">Manual Moment Creation</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Player Name", placeholder: "e.g. Paul Mullin" },
              { label: "Minute", placeholder: "e.g. 78" },
              { label: "Match", placeholder: "e.g. Wrexham vs Stockport" },
              { label: "xG Value", placeholder: "e.g. 0.74" },
            ].map(field => (
              <div key={field.label}>
                <label className="text-xs text-[#888888] mb-1 block">{field.label}</label>
                <input
                  type="text"
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#BA0C2F]/50 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-[#888888] mb-2 block">Draw Data Line Points</label>
            <div className="rounded-lg border border-dashed border-white/10 bg-[#0A0A0A] h-40 flex items-center justify-center">
              <p className="text-xs text-[#333]">Click to place waypoints on pitch</p>
            </div>
          </div>
          <button className="rounded-lg bg-[#BA0C2F] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition">
            Create Moment
          </button>
        </div>
      )}

      {mode === "footage" && (
        <div className="rounded-xl border border-white/5 bg-[#111111] p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-semibold text-white">Upload Footage & Calibrate</p>
            <span className="rounded bg-[#BA0C2F]/20 px-2 py-0.5 text-[10px] font-bold text-[#BA0C2F]">ORIGINAL FEATURE</span>
          </div>
          <p className="text-xs text-[#888888]">
            This is the original EmotivX moment creation system — upload broadcast footage, calibrate the pitch,
            and extract the exact ball trajectory from video frames.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { step: "1", label: "Upload Footage", desc: "Drop MP4 or provide stream URL", icon: Play },
              { step: "2", label: "Calibrate Pitch", desc: "Mark 4 corners to set homography", icon: Target },
              { step: "3", label: "Extract Moment", desc: "Select frame range, auto-track ball", icon: Zap },
            ].map(s => (
              <div key={s.step} className="rounded-lg border border-white/5 bg-[#0A0A0A] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl font-bold text-[#BA0C2F]/30 font-display">{s.step}</span>
                  <s.icon className="h-4 w-4 text-[#555555]" />
                </div>
                <p className="text-xs font-semibold text-white mb-1">{s.label}</p>
                <p className="text-[10px] text-[#555555]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border-2 border-dashed border-white/10 p-8 text-center">
            <Play className="h-8 w-8 text-[#333] mx-auto mb-2" />
            <p className="text-sm text-[#555555]">Drop video file here or</p>
            <button className="mt-2 rounded-lg bg-white/5 px-4 py-2 text-xs text-white hover:bg-white/10 transition">
              Browse Files
            </button>
          </div>
          <Link
            href="/admin/calibration"
            className="flex items-center justify-between rounded-lg border border-[#10B981]/20 bg-[#10B981]/5 p-3 hover:border-[#10B981]/40 transition"
          >
            <div>
              <p className="text-sm font-semibold text-[#10B981]">Full Calibration Platform →</p>
              <p className="text-xs text-[#888888]">Open the homography / pitch calibration tool</p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#10B981]" />
          </Link>
        </div>
      )}
    </div>
  );
}

/* ══ IP MANAGER TAB ══ */

function IPManagerTab() {
  const [primaryColor, setPrimaryColor] = useState("#BA0C2F");
  const [secondaryColor, setSecondaryColor] = useState("#FFFFFF");
  const [accentColor, setAccentColor] = useState("#C9A84C");
  const [activePreset, setActivePreset] = useState(0);

  function applyPreset(preset: typeof PALETTE_PRESETS[number], i: number) {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setAccentColor(preset.accent);
    setActivePreset(i);
  }

  return (
    <div className="space-y-6">
      {/* Colour palette */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-[#BA0C2F]" />
          <h3 className="text-sm font-bold text-white">Colour Palette Control</h3>
          <span className="text-[10px] text-[#555555] ml-auto">Applied to all merch & data line art</span>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {PALETTE_PRESETS.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(preset, i)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${activePreset === i ? "border-[#BA0C2F]/50 text-white" : "border-white/5 text-[#888888] hover:text-white"}`}
            >
              <span className="flex gap-1">
                <span className="h-3 w-3 rounded-full" style={{ background: preset.primary }} />
                <span className="h-3 w-3 rounded-full" style={{ background: preset.secondary }} />
                <span className="h-3 w-3 rounded-full" style={{ background: preset.accent }} />
              </span>
              {preset.name}
            </button>
          ))}
        </div>

        {/* Custom pickers */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Primary", value: primaryColor, set: setPrimaryColor },
            { label: "Secondary", value: secondaryColor, set: setSecondaryColor },
            { label: "Accent / Edition", value: accentColor, set: setAccentColor },
          ].map(c => (
            <div key={c.label}>
              <label className="text-xs text-[#888888] mb-2 block">{c.label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={c.value} onChange={e => c.set(e.target.value)} className="h-9 w-9 rounded cursor-pointer border-0 bg-transparent" />
                <input type="text" value={c.value} onChange={e => c.set(e.target.value)} className="flex-1 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-white font-mono focus:border-[#BA0C2F]/50 focus:outline-none" />
              </div>
            </div>
          ))}
        </div>

        {/* Preview swatch */}
        <div className="rounded-lg overflow-hidden h-16 flex">
          <div className="flex-1" style={{ background: primaryColor }} />
          <div className="flex-1" style={{ background: secondaryColor }} />
          <div className="flex-[0.5]" style={{ background: accentColor }} />
        </div>

        <button className="rounded-lg bg-[#BA0C2F] px-4 py-2 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition">
          Save & Apply to Merch Preview
        </button>
      </div>

      {/* Club logo */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#BA0C2F]" />
          <h3 className="text-sm font-bold text-white">Club Logo Management</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 relative shrink-0 rounded-xl border border-white/5 bg-[#0A0A0A] flex items-center justify-center p-2">
            <Image
              src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
              alt="Wrexham AFC"
              fill
              className="object-contain p-2"
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">Wrexham AFC Badge</p>
            <p className="text-xs text-[#555555]">Currently using: TheSportsDB CDN</p>
            <div className="flex gap-2">
              <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/5 transition">Upload Custom Logo</button>
              <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#888888] hover:text-white transition">Reset to Default</button>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsor / brand logos */}
      <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-[#C9A84C]" />
          <h3 className="text-sm font-bold text-white">Sponsor & Brand Logos</h3>
          <span className="text-[10px] text-[#555555] ml-2">Added logos become purchasable options on the merch page</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {SPONSOR_SLOTS.map(slot => (
            <div key={slot.id} className="rounded-lg border border-dashed border-white/10 bg-[#0A0A0A] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded border border-white/5 bg-[#111111] flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4 text-[#333]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{slot.label}</p>
                <p className="text-[10px] text-[#444]">{slot.placeholder}</p>
              </div>
              <button className="ml-auto rounded border border-white/10 px-2 py-1 text-[10px] text-[#888888] hover:text-white transition">Upload</button>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#444]">
          Once uploaded, these logos appear as optional add-ons in the consumer merch preview. Revenue split is configurable per brand deal.
        </p>
      </div>
    </div>
  );
}

/* ══ SALES TAB ══ */

function SalesTab({ moments, totalRevenue }: { moments: typeof PUBLISHED_MOMENTS; totalRevenue: number }) {
  const totalUnits = moments.reduce((sum, m) => sum + Object.values(m.sales).reduce((a, b) => a + b, 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Revenue", value: `£${(totalRevenue / 1000).toFixed(1)}k`, icon: DollarSign, color: WREXHAM_GOLD },
          { label: "Units Sold", value: totalUnits.toLocaleString(), icon: Package, color: "#10B981" },
          { label: "Active Moments", value: moments.length, icon: Zap, color: "#BA0C2F" },
          { label: "Avg per Moment", value: `£${(totalRevenue / moments.length / 1000).toFixed(1)}k`, icon: TrendingUp, color: "#8B5CF6" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-xl border border-white/5 bg-[#111111] p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-4 w-4 text-[#444]" />
              </div>
              <p className="text-xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-[#555555] mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Per-moment breakdown */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-[#888888] uppercase tracking-wider">Moments Breakdown</h3>
        {moments.map(m => {
          const rev = calcRevenue(m.sales);
          const totalSold = Object.values(m.sales).reduce((a, b) => a + b, 0);
          const totalMax = Object.values(m.maxEditions).reduce((a, b) => a + b, 0);
          const pct = Math.round((totalSold / totalMax) * 100);

          return (
            <div key={m.id} className="rounded-xl border border-white/5 bg-[#111111] p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-white">{m.player} · {m.minute}'</p>
                  <p className="text-xs text-[#555555]">vs {m.opponent} · {m.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold" style={{ color: WREXHAM_GOLD }}>£{(rev / 1000).toFixed(1)}k</p>
                  <p className="text-[10px] text-[#555555]">{pct}% sold out</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/5 mb-3">
                <div className="h-full rounded-full bg-[#BA0C2F]" style={{ width: `${pct}%` }} />
              </div>

              {/* Rarity breakdown */}
              <div className="flex gap-2 flex-wrap">
                {RARITY_TIERS.map(tier => {
                  const sold = m.sales[tier.id as keyof typeof m.sales] || 0;
                  const max = m.maxEditions[tier.id as keyof typeof m.maxEditions] || 0;
                  const Icon = tier.icon;
                  return (
                    <div key={tier.id} className="rounded-lg border border-white/5 bg-[#0A0A0A] px-3 py-2 flex items-center gap-1.5">
                      <Icon className="h-3 w-3" style={{ color: tier.color }} />
                      <span className="text-xs font-bold text-white">{sold}</span>
                      <span className="text-[10px] text-[#555555]">/ {max}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue calculator */}
      <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5">
        <h3 className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-4">Revenue Calculator</h3>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-[#888888]">Common (×1 base)</span><span className="text-white">500 × £79 = £39,500</span></div>
            <div className="flex justify-between"><span className="text-[#888888]">Uncommon (×1.5)</span><span className="text-white">200 × £119 = £23,700</span></div>
            <div className="flex justify-between"><span className="text-[#888888]">Rare (×2.5)</span><span className="text-white">75 × £198 = £14,850</span></div>
            <div className="flex justify-between"><span className="text-[#888888]">Epic (×5)</span><span className="text-white">25 × £395 = £9,875</span></div>
            <div className="flex justify-between"><span className="text-[#888888]">Legendary (×20)</span><span className="text-white">5 × £1,580 = £7,900</span></div>
            <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
              <span className="font-bold text-white">Per Moment (sold out)</span>
              <span className="font-bold" style={{ color: WREXHAM_GOLD }}>£95,825</span>
            </div>
          </div>
          <div className="rounded-lg bg-[#0A0A0A] border border-white/5 p-4">
            <p className="text-xs text-[#555555] mb-3">Season projection (46 games, avg 2.5 goals each)</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-[#888888]">Total goal moments</span><span className="text-white">115</span></div>
              <div className="flex justify-between"><span className="text-[#888888]">At 40% sell-through</span><span className="text-white">£4.4M</span></div>
              <div className="flex justify-between"><span className="text-[#888888]">At 70% sell-through</span><span className="text-white">£7.7M</span></div>
              <div className="flex justify-between border-t border-white/10 pt-1.5 mt-1.5">
                <span className="font-bold text-[#C9A84C]">Full sell-through</span>
                <span className="font-bold text-[#C9A84C]">£11M</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
