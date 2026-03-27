"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload,
  Pencil,
  Eye,
  Star,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Package,
  BarChart3,
  Save,
} from "lucide-react";
import { TEAM_REGISTRY, type TeamConfig } from "@/lib/teams";

/* ─── Constants ────────────────────────────────────────────────────── */

const ACCENT = "#DA291C";
const TEAM_KEY = "Wrexham";
const WREXHAM_MATCHES = [1376994, 1377235, 1377475];

/* ─── Types ────────────────────────────────────────────────────────── */

interface GoalMeta {
  matchId: number;
  goalIndex: number;
  scorerName: string | null;
  scorerNumber: number | null;
  homeTeam: string;
  awayTeam: string;
  scoringTeam: string;
  minute: number;
  matchDate: string | null;
}

interface MatchMoments {
  matchId: number;
  matchName: string;
  matchDate: string;
  goals: GoalMeta[];
}

/* ─── Toggle Component ─────────────────────────────────────────────── */

function Toggle({
  checked,
  onChange,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? "w-8" : "w-10";
  const h = size === "sm" ? "h-4" : "h-5";
  const dot = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const translate = checked
    ? size === "sm"
      ? "translate-x-4"
      : "translate-x-5"
    : "translate-x-0.5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`${w} ${h} relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200`}
      style={{ backgroundColor: checked ? ACCENT : "#333333" }}
    >
      <span
        className={`${dot} ${translate} inline-block transform rounded-full bg-white transition-transform duration-200`}
        style={{ marginTop: size === "sm" ? 2 : 2 }}
      />
    </button>
  );
}

/* ─── Section Header ───────────────────────────────────────────────── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
      {children}
    </h2>
  );
}

/* ─── Card Wrapper ─────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-white/5 bg-[#111111] p-5 ${className}`}>
      {children}
    </div>
  );
}

/* ─── Colour Swatch ────────────────────────────────────────────────── */

function ColourSwatch({ label, hex }: { label: string; hex: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-10 w-10 rounded-lg border border-white/10"
        style={{ backgroundColor: hex }}
      />
      <div>
        <p className="text-xs text-[#888888]">{label}</p>
        <p className="font-mono text-sm text-white">{hex}</p>
      </div>
    </div>
  );
}

/* ─── Revenue Stat Card ────────────────────────────────────────────── */

function RevenueStat({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: typeof ShoppingBag;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#888888]">{label}</p>
          <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${ACCENT}15` }}
        >
          <Icon className="h-4 w-4" style={{ color: ACCENT }} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <TrendingUp className="h-3 w-3" style={{ color: ACCENT }} />
        <span className="text-xs font-medium" style={{ color: ACCENT }}>
          {change}
        </span>
        <span className="text-[10px] text-[#555555]">Last 30 days</span>
      </div>
    </Card>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */

export default function TeamAdminPage() {
  const team: TeamConfig = TEAM_REGISTRY[TEAM_KEY];

  // Moments state
  const [matches, setMatches] = useState<MatchMoments[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});
  const [featuredToggles, setFeaturedToggles] = useState<Record<string, boolean>>({});

  // Settings state
  const [storeName, setStoreName] = useState("Wrexham AFC Official Store");
  const [maxEdition, setMaxEdition] = useState("200");
  const [autoApprove, setAutoApprove] = useState(false);

  // Fetch goal data for all matches
  useEffect(() => {
    async function fetchAllMoments() {
      setLoading(true);
      const allMatches: MatchMoments[] = [];

      for (const matchId of WREXHAM_MATCHES) {
        // Fetch goals incrementally until we get a 404
        const goals: GoalMeta[] = [];
        let goalIndex = 0;
        let hasMore = true;

        while (hasMore) {
          try {
            const res = await fetch(
              `/api/moments/meta?matchId=${matchId}&goalIndex=${goalIndex}`
            );
            if (!res.ok) {
              hasMore = false;
              break;
            }
            const data: GoalMeta = await res.json();
            goals.push(data);

            // Init toggles — active on by default for first 3 goals per match
            const key = `${matchId}-${goalIndex}`;
            setActiveToggles((prev) => ({
              ...prev,
              [key]: prev[key] ?? goalIndex < 3,
            }));
            setFeaturedToggles((prev) => ({
              ...prev,
              [key]: prev[key] ?? false,
            }));

            goalIndex++;
          } catch {
            hasMore = false;
          }
        }

        if (goals.length > 0) {
          // Derive match name from first goal's home/away
          const first = goals[0];
          const matchName = `${first.homeTeam} vs. ${first.awayTeam}`;
          const matchDate = first.matchDate ?? "Unknown";
          allMatches.push({ matchId, matchName, matchDate, goals });
        }
      }

      setMatches(allMatches);
      setLoading(false);
    }

    fetchAllMoments();
  }, []);

  const toggleActive = (key: string) =>
    setActiveToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleFeatured = (key: string) =>
    setFeaturedToggles((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ── 1. HEADER ──────────────────────────────────────────────── */}
      <div className="mb-10 flex items-center gap-4">
        <Image
          src={team.logoUrl}
          alt={team.name}
          width={48}
          height={48}
          className="rounded-lg"
        />
        <div>
          <h1 className="text-2xl font-bold text-white">Team Admin</h1>
          <p className="text-sm text-[#888888]">{team.name}</p>
        </div>
      </div>

      <div className="space-y-10">
        {/* ── 2. BRAND ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader>Brand</SectionHeader>
          <Card className="mt-3">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Logo */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-white/10 bg-[#0A0A0A]">
                  <Image
                    src={team.logoUrl}
                    alt={`${team.name} logo`}
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#888888] transition hover:border-white/20 hover:text-white"
                >
                  <Upload className="h-3 w-3" />
                  Upload Logo
                </button>
              </div>

              {/* Colours */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap gap-6">
                  <ColourSwatch label="Primary" hex={team.primaryColour} />
                  <ColourSwatch label="Secondary" hex={team.secondaryColour} />
                </div>
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#888888] transition hover:border-white/20 hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                  Edit Colours
                </button>
              </div>
            </div>
          </Card>
        </section>

        {/* ── 3. MOMENTS ───────────────────────────────────────────── */}
        <section>
          <SectionHeader>Moments</SectionHeader>

          {loading ? (
            <Card className="mt-3">
              <div className="flex items-center justify-center py-12">
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: `${ACCENT} transparent ${ACCENT} ${ACCENT}` }}
                />
                <span className="ml-3 text-sm text-[#888888]">Loading moments…</span>
              </div>
            </Card>
          ) : (
            <div className="mt-3 space-y-4">
              {matches.map((match) => (
                <Card key={match.matchId}>
                  {/* Match header */}
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {match.matchName}
                      </p>
                      <p className="text-xs text-[#555555]">
                        {new Date(match.matchDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}{" "}
                        · Match #{match.matchId}
                      </p>
                    </div>
                    <span
                      className="mt-1 inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:mt-0"
                      style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}
                    >
                      {match.goals.length} goal{match.goals.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Goals grid */}
                  <div className="space-y-2">
                    {match.goals.map((goal) => {
                      const key = `${match.matchId}-${goal.goalIndex}`;
                      const isActive = activeToggles[key] ?? false;
                      const isFeatured = featuredToggles[key] ?? false;

                      return (
                        <div
                          key={key}
                          className="flex flex-col gap-3 rounded-lg border border-white/5 bg-[#0A0A0A] p-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          {/* Goal info */}
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold"
                              style={{
                                backgroundColor: `${ACCENT}15`,
                                color: ACCENT,
                              }}
                            >
                              {goal.minute}&apos;
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {goal.scorerName ?? "Unknown"}
                                {goal.scorerNumber != null && (
                                  <span className="ml-1.5 text-xs text-[#555555]">
                                    #{goal.scorerNumber}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-[#555555]">
                                {goal.scoringTeam} · Goal {goal.goalIndex + 1}
                              </p>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-4">
                            {/* Active toggle */}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-[#555555]">Active</span>
                              <Toggle
                                checked={isActive}
                                onChange={() => toggleActive(key)}
                                size="sm"
                              />
                            </div>

                            {/* Featured badge */}
                            <button
                              onClick={() => toggleFeatured(key)}
                              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                                isFeatured
                                  ? "text-white"
                                  : "border border-white/10 text-[#555555] hover:text-white"
                              }`}
                              style={
                                isFeatured
                                  ? { backgroundColor: ACCENT }
                                  : undefined
                              }
                            >
                              <Star
                                className="h-2.5 w-2.5"
                                fill={isFeatured ? "white" : "none"}
                              />
                              Feature
                            </button>

                            {/* Preview link */}
                            <Link
                              href={`/merch-preview?matchId=${match.matchId}&goalIndex=${goal.goalIndex}&style=geometric`}
                              className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] text-[#888888] transition hover:border-white/20 hover:text-white"
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── 4. REVENUE ───────────────────────────────────────────── */}
        <section>
          <SectionHeader>Revenue</SectionHeader>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <RevenueStat
              label="Total Orders"
              value="247"
              change="+12%"
              icon={ShoppingBag}
            />
            <RevenueStat
              label="Revenue"
              value="£14,830"
              change="+18%"
              icon={DollarSign}
            />
            <RevenueStat
              label="Avg Order Value"
              value="£60.04"
              change="+4%"
              icon={BarChart3}
            />
            <RevenueStat
              label="Units Shipped"
              value="312"
              change="+9%"
              icon={Package}
            />
          </div>
        </section>

        {/* ── 5. SETTINGS ──────────────────────────────────────────── */}
        <section>
          <SectionHeader>Settings</SectionHeader>
          <Card className="mt-3">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Store name */}
              <div>
                <label className="mb-1.5 block text-xs text-[#888888]">
                  Store Name
                </label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                />
              </div>

              {/* Max edition */}
              <div>
                <label className="mb-1.5 block text-xs text-[#888888]">
                  Max Edition Size
                </label>
                <input
                  type="number"
                  value={maxEdition}
                  onChange={(e) => setMaxEdition(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
                />
              </div>

              {/* Auto-approve */}
              <div className="flex items-center justify-between sm:col-span-2">
                <div>
                  <p className="text-sm text-white">Auto-approve moments</p>
                  <p className="text-[10px] text-[#555555]">
                    Automatically approve new moments for the store
                  </p>
                </div>
                <Toggle checked={autoApprove} onChange={setAutoApprove} />
              </div>
            </div>

            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <button
                className="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ACCENT }}
              >
                <Save className="h-4 w-4" />
                Save Settings
              </button>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
