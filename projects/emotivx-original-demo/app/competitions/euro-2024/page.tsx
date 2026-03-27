"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

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
  goals: Goal[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Euro 2024 team colours — [primary, secondary] */
const TEAM_COLOURS: Record<string, [string, string]> = {
  Germany: ["#000000", "#DD0000"],
  Scotland: ["#003399", "#003399"],
  Hungary: ["#477050", "#CE2939"],
  Switzerland: ["#FF0000", "#FF0000"],
  Spain: ["#AA151B", "#F1BF00"],
  Croatia: ["#FF0000", "#0000FF"],
  Italy: ["#0066CC", "#0066CC"],
  Albania: ["#E41E20", "#E41E20"],
  Slovenia: ["#005DA6", "#005DA6"],
  Denmark: ["#C60C30", "#C60C30"],
  Serbia: ["#C6363C", "#1E3264"],
  England: ["#FFFFFF", "#CF081F"],
  Poland: ["#DC143C", "#DC143C"],
  Netherlands: ["#FF6600", "#FF6600"],
  Austria: ["#EF3340", "#EF3340"],
  France: ["#002654", "#ED2939"],
  Belgium: ["#E30613", "#FFE601"],
  Slovakia: ["#0B4EA2", "#0B4EA2"],
  Romania: ["#002B7F", "#FCD116"],
  Ukraine: ["#005BBB", "#FFD500"],
  Turkey: ["#E30A17", "#E30A17"],
  Georgia: ["#FF0000", "#FF0000"],
  "Czech Republic": ["#11457E", "#D7141A"],
  Portugal: ["#006600", "#FF0000"],
};

const STAGES = [
  { label: "All", value: "" },
  { label: "Group A", value: "group_a" },
  { label: "Group B", value: "group_b" },
  { label: "Group C", value: "group_c" },
  { label: "Group D", value: "group_d" },
  { label: "Group E", value: "group_e" },
  { label: "Group F", value: "group_f" },
  { label: "Round of 16", value: "round_of_16" },
  { label: "Quarter-finals", value: "quarter_finals" },
  { label: "Semi-finals", value: "semi_finals" },
  { label: "Final", value: "final" },
];

/** Stage → pill classes */
function stagePillClasses(stage: string): string {
  if (stage === "Final")
    return "bg-red-500/20 text-red-400 border border-red-500/30";
  if (stage === "Semi-finals")
    return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
  if (stage === "Quarter-finals")
    return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  if (stage === "Round of 16")
    return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  return "bg-white/10 text-white/50 border border-white/10";
}

/** Get the winning team's primary colour (for border glow on hover) */
function winnerColour(match: Match): string {
  if (match.home_score > match.away_score) {
    return TEAM_COLOURS[match.home_team]?.[0] ?? "#DA291C";
  }
  if (match.away_score > match.home_score) {
    return TEAM_COLOURS[match.away_team]?.[0] ?? "#DA291C";
  }
  return "#888888"; // draw
}

/* ------------------------------------------------------------------ */
/*  Lightning bolt SVG paths — dramatic single jagger variations       */
/* ------------------------------------------------------------------ */

/** 4 bolt path variations — each a single dramatic diagonal lightning strike */
/** Thin diagonal lightning bolt — steep angle, ONE jagger, away from score text */
const BOLT_PATHS: string[] = [
  "M 72,-2 L 52,44 L 58,44 L 28,102",
  "M 74,-2 L 54,42 L 60,42 L 26,102",
  "M 70,-2 L 50,46 L 56,46 L 30,102",
  "M 73,-2 L 53,43 L 59,43 L 27,102",
];

/* ------------------------------------------------------------------ */
/*  Match Card                                                         */
/* ------------------------------------------------------------------ */

function MatchCard({ match, index }: { match: Match; index: number }) {
  const homeColour = TEAM_COLOURS[match.home_team]?.[0] ?? "#333333";
  const awayColour = TEAM_COLOURS[match.away_team]?.[0] ?? "#333333";
  const glowColour = winnerColour(match);
  const goalCount = match.goals?.length ?? 0;
  const boltPath = BOLT_PATHS[index % BOLT_PATHS.length];
  const glowId = `bolt-glow-${match.id}`;
  const outerGlowId = `bolt-outer-${match.id}`;

  return (
    <Link
      href={`/moments/create?matchId=${match.id}`}
      className="group relative block overflow-hidden rounded-xl border border-white/[0.06] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        ["--glow" as string]: glowColour,
      }}
    >
      {/* Left team colour — gradient fade to centre */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to right, ${homeColour} 0%, ${homeColour} 30%, transparent 55%)`,
          opacity: 0.28,
        }}
      />
      {/* Right team colour — gradient fade from centre */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to left, ${awayColour} 0%, ${awayColour} 30%, transparent 55%)`,
          opacity: 0.28,
        }}
      />

      {/* Hover intensify */}
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-[0.12]"
        style={{
          background: `linear-gradient(to right, ${homeColour} 0%, transparent 50%, ${awayColour} 100%)`,
        }}
      />

      {/* Lightning bolt — SVG overlay with electric blue glow */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={outerGlowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Outer cyan halo */}
        <path
          d={boltPath}
          fill="none"
          stroke="#00BCD4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${outerGlowId})`}
          className="opacity-30 transition-opacity duration-300 group-hover:opacity-50"
        />
        {/* Inner electric blue glow */}
        <path
          d={boltPath}
          fill="none"
          stroke="#4FC3F7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter={`url(#${glowId})`}
          className="opacity-80 transition-opacity duration-300 group-hover:opacity-100"
        />
        {/* White-hot core */}
        <path
          d={boltPath}
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="opacity-90 transition-opacity duration-300 group-hover:opacity-100"
        />
      </svg>

      {/* Bolt pulse animation on hover */}
      <style jsx>{`
        @keyframes bolt-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 0.5; }
        }
        .group:hover .bolt-pulse-anim {
          animation: bolt-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      <svg
        className="bolt-pulse-anim absolute inset-0 w-full h-full pointer-events-none z-[1]"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={boltPath}
          fill="none"
          stroke="#4FC3F7"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="opacity-0 transition-opacity duration-300 group-hover:opacity-20"
          style={{ filter: "blur(8px)" }}
        />
      </svg>

      {/* Hover border glow */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 0 1px ${glowColour}40, 0 0 20px ${glowColour}15`,
        }}
      />

      {/* Card content */}
      <div className="relative z-10 p-5">
        {/* Stage pill */}
        <span
          className={`mb-4 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${stagePillClasses(match.stage)}`}
        >
          {match.stage}
        </span>

        {/* Score row */}
        <div className="flex items-center justify-between gap-2">
          {/* Home */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-white/90 uppercase tracking-wide">
              {match.home_team}
            </p>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-display text-5xl font-black text-white tabular-nums leading-none">
              {match.home_score}
            </span>
            <svg viewBox="0 0 12 28" className="h-7 w-3 shrink-0" aria-label="vs">
              <path d="M 8,0 L 4,11 L 8,11 L 3,28" fill="none" stroke="#4FC3F7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-display text-5xl font-black text-white tabular-nums leading-none">
              {match.away_score}
            </span>
          </div>

          {/* Away */}
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate font-display text-sm font-bold text-white/90 uppercase tracking-wide">
              {match.away_team}
            </p>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-4 flex items-end justify-between">
          {/* Date + Stadium */}
          <div className="text-[11px] text-white/40 leading-relaxed">
            <p>
              {new Date(match.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
            <p className="truncate max-w-[160px]">{match.stadium}</p>
          </div>

          {/* Goal count pill */}
          {goalCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DA291C]/15 px-3 py-1 text-[11px] font-semibold text-[#DA291C] transition group-hover:bg-[#DA291C]/25">
              <span>&#9917;</span>
              {goalCount} goal{goalCount !== 1 ? "s" : ""}
              <span className="text-[10px] transition-transform duration-200 group-hover:translate-x-0.5">
                &rarr;
              </span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Euro2024CompetitionPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState("");
  const [teamSearch, setTeamSearch] = useState("");

  /* ---- Fetch matches + nested goals from API ---- */
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/euro-2024/matches");
        const data: Match[] = await res.json();
        setMatches(data);
      } catch (err) {
        console.error("Failed to load matches", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  /* ---- Derived data ---- */
  const totalGoals = useMemo(
    () => matches.reduce((sum, m) => sum + (m.goals?.length ?? 0), 0),
    [matches],
  );

  const topScorer = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of matches) {
      for (const g of m.goals ?? []) {
        counts[g.player] = (counts[g.player] || 0) + 1;
      }
    }
    let best = "";
    let max = 0;
    for (const [player, count] of Object.entries(counts)) {
      if (count > max) {
        best = player;
        max = count;
      }
    }
    return best ? `${best} (${max})` : "\u2014";
  }, [matches]);

  /* ---- Filtered matches ---- */
  const filtered = useMemo(() => {
    let result = matches;
    if (stageFilter) {
      result = result.filter((m) => m.stage_slug === stageFilter);
    }
    if (teamSearch) {
      const q = teamSearch.toLowerCase();
      result = result.filter(
        (m) =>
          m.home_team.toLowerCase().includes(q) ||
          m.away_team.toLowerCase().includes(q),
      );
    }
    return result;
  }, [matches, stageFilter, teamSearch]);

  /* ---- Loading state ---- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">&#9917;</div>
          <p className="text-sm text-white/40">Loading Euro 2024&hellip;</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      {/* ======== Header ======== */}
      <header className="mb-12 text-center">
        <h1 className="font-display text-5xl font-extrabold text-white uppercase tracking-tight sm:text-6xl lg:text-7xl">
          Pick Your Moment
        </h1>
        <p className="mt-3 font-body text-base text-white/40 sm:text-lg">
          51 matches. 126 goals. Find the moment that gave you goosebumps — and wear it.
        </p>
      </header>

      {/* ======== Stats Bar — glowing pills ======== */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        {[
          { label: "Matches", value: "51" },
          { label: "Goals", value: String(totalGoals) },
          { label: "Top Scorer", value: topScorer },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-5 py-2 shadow-[0_0_15px_rgba(218,41,28,0.06)] backdrop-blur-sm"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mr-2">
              {s.label}
            </span>
            <span className="font-display text-sm font-bold text-white">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ======== Filter Bar ======== */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-[#DA291C]/40 backdrop-blur-sm"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value} className="bg-[#111]">
              {s.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search team\u2026"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          className="flex-1 sm:max-w-xs rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#DA291C]/40 backdrop-blur-sm"
        />

        <p className="self-center text-xs text-white/30">
          {filtered.length} match{filtered.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* ======== Match Grid ======== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((match, i) => (
          <MatchCard key={match.id} match={match} index={i} />
        ))}
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-sm text-white/40">
            No matches found. Try a different filter.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 border-t border-white/5 pt-8 text-center text-xs text-white/30">
        <p>
          UEFA Euro 2024 &middot; StatsBomb Open Data &middot; 51 matches &middot;{" "}
          {totalGoals} goals
        </p>
      </footer>
    </div>
  );
}
