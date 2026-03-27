"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import PlayerBadge from "@/components/badge/PlayerBadge";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Goal {
  match_id: number;
  player: string;
  team: string;
  minute: number;
  second: number;
  description: string;
  body_part: string;
  technique: string;
  play_pattern: string;
}

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  date: string;
  kick_off: string;
  stage: string;
  stage_slug: string;
  stadium: string;
  goal_count: number;
}

interface GoalData {
  goal: Goal;
  match: Match | null;
  goalId: string;
  trajectory: [number, number][];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const ART_STYLES = [
  { id: "geometric", label: "Geometric" },
  { id: "camo", label: "Camo" },
  { id: "futuristic", label: "Futuristic" },
  { id: "street", label: "Street" },
  { id: "classic", label: "Classic" },
  { id: "honeycomb", label: "Honeycomb" },
  { id: "jackson", label: "Jackson" },
  { id: "marble", label: "Marble" },
  { id: "smoky", label: "Smoky" },
] as const;

const LINE_EFFECTS = [
  { id: "default", label: "Default" },
  { id: "laser", label: "Laser" },
  { id: "flame", label: "Flame" },
  { id: "lightning", label: "Lightning" },
  { id: "ink", label: "Ink" },
  { id: "dotted", label: "Dotted" },
] as const;

/** Fallback team colours when Supabase is unavailable */
const TEAM_COLOURS: Record<string, { primary: string; secondary: string }> = {
  Germany: { primary: "#000000", secondary: "#FFFFFF" },
  Scotland: { primary: "#003078", secondary: "#FFFFFF" },
  Spain: { primary: "#DA291C", secondary: "#F1BF00" },
  France: { primary: "#002395", secondary: "#FFFFFF" },
  England: { primary: "#FFFFFF", secondary: "#002B5C" },
  Italy: { primary: "#0066B2", secondary: "#FFFFFF" },
  Portugal: { primary: "#006847", secondary: "#DA291C" },
  Netherlands: { primary: "#FF6600", secondary: "#FFFFFF" },
  Belgium: { primary: "#DA291C", secondary: "#FDDA24" },
  Croatia: { primary: "#EF3340", secondary: "#FFFFFF" },
  Switzerland: { primary: "#DA291C", secondary: "#FFFFFF" },
  Turkey: { primary: "#DA291C", secondary: "#FFFFFF" },
  Austria: { primary: "#ED2939", secondary: "#FFFFFF" },
  Hungary: { primary: "#477050", secondary: "#CE2939" },
  Romania: { primary: "#002B7F", secondary: "#FCD116" },
  Poland: { primary: "#DC143C", secondary: "#FFFFFF" },
  Denmark: { primary: "#C8102E", secondary: "#FFFFFF" },
  Serbia: { primary: "#C6363C", secondary: "#FFFFFF" },
  Slovakia: { primary: "#0B4EA2", secondary: "#FFFFFF" },
  Slovenia: { primary: "#005DA6", secondary: "#FFFFFF" },
  Albania: { primary: "#E41E20", secondary: "#000000" },
  Georgia: { primary: "#DA291C", secondary: "#FFFFFF" },
  Ukraine: { primary: "#005BBB", secondary: "#FFD500" },
  "Czech Republic": { primary: "#11457E", secondary: "#D7141A" },
};

/** Human-friendly stage names */
function formatStage(stage: string): string {
  if (stage === "Group A") return "Group A";
  if (stage === "Group B") return "Group B";
  if (stage === "Group C") return "Group C";
  if (stage === "Group D") return "Group D";
  if (stage === "Group E") return "Group E";
  if (stage === "Group F") return "Group F";
  return stage;
}

/** Format the match date nicely */
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  SVG Dataline Component                                             */
/* ------------------------------------------------------------------ */

function DatalineCanvas({
  trajectory,
  teamColor,
  className,
}: {
  trajectory: [number, number][];
  teamColor: string;
  className?: string;
}) {
  if (!trajectory || trajectory.length < 2) return null;

  const W = 960;
  const H = 540;
  const PAD = 40;

  // Map normalised 0-1 coordinates to SVG space
  const points = trajectory.map(([x, y]) => ({
    x: PAD + x * (W - PAD * 2),
    y: PAD + y * (H - PAD * 2),
  }));

  // Build smooth cubic bezier path
  const pathData = buildSmoothPath(points);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Dark pitch background with subtle grid */}
        <rect width={W} height={H} fill="#0A0A0A" />

        {/* Pitch grid lines */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line
            key={`v-${i}`}
            x1={PAD + i * ((W - PAD * 2) / 10)}
            y1={PAD}
            x2={PAD + i * ((W - PAD * 2) / 10)}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: 7 }).map((_, i) => (
          <line
            key={`h-${i}`}
            x1={PAD}
            y1={PAD + i * ((H - PAD * 2) / 6)}
            x2={W - PAD}
            y2={PAD + i * ((H - PAD * 2) / 6)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}

        {/* Half-way line */}
        <line
          x1={W / 2}
          y1={PAD}
          x2={W / 2}
          y2={H - PAD}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />

        {/* Goal line */}
        <line
          x1={W - PAD}
          y1={PAD + (H - PAD * 2) * 0.3}
          x2={W - PAD}
          y2={PAD + (H - PAD * 2) * 0.7}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={2}
        />

        {/* Glow filter */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={teamColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={teamColor} stopOpacity={1} />
          </linearGradient>
        </defs>

        {/* Trajectory glow */}
        <path
          d={pathData}
          fill="none"
          stroke={teamColor}
          strokeWidth={4}
          strokeOpacity={0.2}
          filter="url(#glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Trajectory path */}
        <path
          d={pathData}
          fill="none"
          stroke="url(#pathGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-path"
        />

        {/* Trajectory points */}
        {points.map((pt, i) => (
          <g key={i}>
            {/* Outer glow ring */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? 10 : 6}
              fill="none"
              stroke={teamColor}
              strokeWidth={1}
              opacity={0.3}
            />
            {/* Inner dot */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={i === points.length - 1 ? 5 : 3}
              fill={i === points.length - 1 ? teamColor : "#FFFFFF"}
              opacity={i === points.length - 1 ? 1 : 0.7}
            />
          </g>
        ))}

        {/* GOAL label at final point */}
        <text
          x={points[points.length - 1].x}
          y={points[points.length - 1].y - 18}
          textAnchor="middle"
          fill={teamColor}
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
        >
          GOAL
        </text>
      </svg>
    </div>
  );
}

/** Build a smooth SVG path through an array of points using cubic bezier curves. */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`;
  }

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/* ------------------------------------------------------------------ */
/*  Art Result Overlay                                                 */
/* ------------------------------------------------------------------ */

function ArtResult({
  imageData,
  goalId,
  style,
}: {
  imageData: string;
  goalId: string;
  style: string;
}) {
  return (
    <div className="space-y-4">
      <div className="aspect-video overflow-hidden rounded-lg border border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageData}
          alt="Generated goal art"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/merch-preview?goalId=${goalId}&style=${style}`}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#DA291C] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#DA291C]/90"
        >
          <span>🛒</span> Create Merch from This Moment
        </Link>
        <button className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20">
          <span>💾</span> Save to Favourites
        </button>
        <button className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#111111] px-6 py-3.5 text-sm font-bold text-white transition hover:border-white/20">
          <span>📤</span> Share
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Style Swatch — small colour preview per art style                  */
/* ------------------------------------------------------------------ */

function StyleSwatch({
  style,
  primary,
  secondary,
}: {
  style: string;
  primary: string;
  secondary: string;
}) {
  const patterns: Record<string, React.ReactNode> = {
    geometric: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <polygon points="20,2 38,38 2,38" fill={primary} opacity={0.7} />
        <polygon points="20,12 32,34 8,34" fill={secondary} opacity={0.5} />
      </svg>
    ),
    camo: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#1a1a1a" />
        <ellipse cx={10} cy={15} rx={12} ry={8} fill={primary} opacity={0.5} />
        <ellipse cx={30} cy={30} rx={14} ry={7} fill={secondary} opacity={0.4} />
        <ellipse cx={25} cy={10} rx={8} ry={10} fill={primary} opacity={0.3} />
      </svg>
    ),
    futuristic: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#0a0a0a" />
        <line x1={0} y1={20} x2={40} y2={20} stroke={primary} strokeWidth={1} opacity={0.6} />
        <line x1={20} y1={0} x2={20} y2={40} stroke={primary} strokeWidth={1} opacity={0.6} />
        <circle cx={20} cy={20} r={8} fill="none" stroke={secondary} strokeWidth={1} opacity={0.5} />
      </svg>
    ),
    street: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#111" />
        <text x={6} y={28} fontSize={20} fill={primary} opacity={0.7} fontWeight="bold">
          St
        </text>
      </svg>
    ),
    classic: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#1a1a1a" />
        <rect x={4} y={4} width={32} height={32} rx={4} fill="none" stroke={primary} strokeWidth={1.5} opacity={0.5} />
        <rect x={10} y={10} width={20} height={20} rx={2} fill="none" stroke={secondary} strokeWidth={1} opacity={0.3} />
      </svg>
    ),
    honeycomb: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#0a0a0a" />
        <polygon points="20,4 32,12 32,28 20,36 8,28 8,12" fill="none" stroke={primary} strokeWidth={1.5} opacity={0.6} />
        <polygon points="20,10 28,15 28,25 20,30 12,25 12,15" fill={primary} opacity={0.2} />
      </svg>
    ),
    jackson: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#0a0a0a" />
        <path d="M5,35 Q15,5 25,20 T38,8" fill="none" stroke={primary} strokeWidth={2} opacity={0.6} />
        <path d="M2,10 Q20,30 35,15" fill="none" stroke={secondary} strokeWidth={1.5} opacity={0.4} />
      </svg>
    ),
    marble: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#1a1a1a" />
        <path d="M0,20 Q10,10 20,20 T40,20" fill="none" stroke={primary} strokeWidth={1} opacity={0.3} />
        <path d="M0,25 Q15,15 25,25 T40,25" fill="none" stroke={secondary} strokeWidth={0.5} opacity={0.2} />
      </svg>
    ),
    smoky: (
      <svg viewBox="0 0 40 40" className="h-full w-full">
        <rect width={40} height={40} fill="#0a0a0a" />
        <circle cx={15} cy={20} r={12} fill={primary} opacity={0.15} />
        <circle cx={28} cy={18} r={10} fill={secondary} opacity={0.1} />
      </svg>
    ),
  };

  return (
    <div className="h-10 w-10 overflow-hidden rounded">
      {patterns[style] ?? (
        <div className="h-full w-full" style={{ backgroundColor: primary, opacity: 0.3 }} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function GoalDetailPage({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = use(params);

  const [data, setData] = useState<GoalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStyle, setSelectedStyle] = useState("geometric");
  const [selectedEffect, setSelectedEffect] = useState("default");
  const [generating, setGenerating] = useState(false);
  const [artImage, setArtImage] = useState<string | null>(null);
  const [artError, setArtError] = useState<string | null>(null);

  /* ---- Fetch goal data ---- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/euro-2024/goals/${goalId}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const json: GoalData = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [goalId]);

  /* ---- Team colours ---- */
  const teamName = data?.goal.team ?? "";
  const colours = TEAM_COLOURS[teamName] ?? { primary: "#DA291C", secondary: "#FFFFFF" };

  /* ---- Generate art ---- */
  const handleGenerate = useCallback(async () => {
    if (!data) return;
    setGenerating(true);
    setArtError(null);

    try {
      const res = await fetch("/api/art/goal-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          points: data.trajectory,
          style: selectedStyle,
          line_effect: selectedEffect,
          primary_color: colours.primary,
          secondary_color: colours.secondary,
          player: data.goal.player,
          team: data.goal.team,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Generation failed");
      setArtImage(json.image);
    } catch (err: any) {
      setArtError(err.message);
    } finally {
      setGenerating(false);
    }
  }, [data, selectedStyle, selectedEffect, colours]);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⚽</div>
          <p className="text-sm text-[#888888]">Loading goal…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">❌</div>
          <p className="text-sm text-[#888888]">{error ?? "Goal not found"}</p>
          <Link
            href="/competitions/euro-2024"
            className="mt-4 inline-block text-xs text-[#DA291C] hover:underline"
          >
            Back to Euro 2024
          </Link>
        </div>
      </div>
    );
  }

  const { goal, match, trajectory } = data;
  const matchContext = match
    ? `${match.home_team} ${match.home_score}-${match.away_score} ${match.away_team} · ${formatStage(match.stage)} · ${formatDate(match.date)}`
    : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* ================================================================ */}
      {/*  Header Bar                                                      */}
      {/* ================================================================ */}
      <header className="mb-8">
        <Link
          href="/competitions/euro-2024"
          className="inline-flex items-center gap-2 text-xs text-[#888888] transition hover:text-white"
        >
          <span>←</span>
          <span>EURO 2024</span>
        </Link>
        {match && (
          <p className="mt-2 text-sm text-[#888888]">{matchContext}</p>
        )}
      </header>

      {/* ================================================================ */}
      {/*  Hero — Dataline Canvas                                          */}
      {/* ================================================================ */}
      <section className="mb-8">
        {artImage ? (
          <ArtResult imageData={artImage} goalId={goalId} style={selectedStyle} />
        ) : (
          <DatalineCanvas
            trajectory={trajectory}
            teamColor={colours.primary}
            className="aspect-video w-full overflow-hidden rounded-lg border border-white/10"
          />
        )}

        {/* Goal info strip */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-lg">⚽</span>
          <span className="font-display text-sm font-bold text-white">{goal.player}</span>
          <span className="text-sm text-[#888888]">·</span>
          <span className="text-sm text-[#888888]">
            {goal.minute}&apos;{goal.second > 0 ? `${goal.second}"` : ""}
          </span>
          <span className="text-sm text-[#888888]">·</span>
          <span className="text-sm text-[#888888]">
            {goal.body_part}
            {goal.technique !== "Normal" ? ` (${goal.technique.toLowerCase()})` : ""}
            {goal.play_pattern !== "Regular Play"
              ? ` — ${goal.play_pattern.toLowerCase()}`
              : ""}
          </span>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Art Generation Panel                                            */}
      {/* ================================================================ */}
      <section className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_340px]">
        {/* ---- Left: Style Selection ---- */}
        <div>
          <h2 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-[#888888]">
            Choose Your Style
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {ART_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStyle(s.id);
                  setArtImage(null);
                }}
                className={`group relative flex items-center gap-3 rounded-lg border bg-[#111111] px-3 py-3 text-left transition ${
                  selectedStyle === s.id
                    ? "border-[#DA291C] shadow-[0_0_12px_rgba(218,41,28,0.2)]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <StyleSwatch
                  style={s.id}
                  primary={colours.primary}
                  secondary={colours.secondary}
                />
                <span
                  className={`text-xs font-semibold ${
                    selectedStyle === s.id ? "text-white" : "text-[#888888] group-hover:text-white"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ---- Right: Effect + Generate ---- */}
        <div className="flex flex-col gap-6">
          {/* Line effect pills */}
          <div>
            <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-[#888888]">
              Line Effect
            </h2>
            <div className="flex flex-wrap gap-2">
              {LINE_EFFECTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => {
                    setSelectedEffect(e.id);
                    setArtImage(null);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    selectedEffect === e.id
                      ? "bg-[#DA291C] text-white"
                      : "bg-[#111111] text-[#888888] hover:text-white border border-white/10"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#DA291C] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#DA291C]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating…
              </>
            ) : (
              <>
                <span>🎨</span> GENERATE ART
              </>
            )}
          </button>

          {artError && (
            <p className="text-xs text-red-400">{artError}</p>
          )}

          <p className="text-center text-[10px] text-[#555555]">
            Powered by EmotivX Art Engine
          </p>

          {/* Player badge preview */}
          <div>
            <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-widest text-[#888888]">
              Player Badge
            </h2>
            <div className="mx-auto w-80">
              <PlayerBadge
                playerName={goal.player}
                jerseyNumber={goal.minute}
                eventType="Goal"
                minute={goal.minute}
                matchResult={
                  match
                    ? `${match.home_score}-${match.away_score}`
                    : undefined
                }
                homeTeam={match?.home_team}
                awayTeam={match?.away_team}
                teamName={goal.team}
                teamPrimaryColor={colours.primary}
                teamSecondaryColor={colours.secondary}
                compact
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  Footer                                                          */}
      {/* ================================================================ */}
      <footer className="border-t border-white/5 pt-8 text-center text-xs text-[#888888]">
        <p>
          UEFA Euro 2024 · StatsBomb Open Data ·{" "}
          <Link
            href="/competitions/euro-2024"
            className="text-[#DA291C] hover:underline"
          >
            All Matches
          </Link>
        </p>
      </footer>
    </div>
  );
}
