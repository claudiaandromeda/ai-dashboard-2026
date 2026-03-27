"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

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
  stage: string;
  stage_slug: string;
}

interface GoalWithMatch extends Goal {
  match?: Match;
  goalId: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TEAM_COLOURS: Record<string, string> = {
  Germany: "#FFCC00",
  France: "#002395",
  Spain: "#AA151B",
  England: "#1D3461",
  Portugal: "#006847",
  Italy: "#0066B3",
  Netherlands: "#FF6600",
  Belgium: "#ED2939",
  Croatia: "#FF0000",
  Switzerland: "#FF0000",
  Austria: "#ED2939",
  Turkey: "#E30A17",
  Scotland: "#003399",
  Hungary: "#477050",
  Denmark: "#C8102E",
  Serbia: "#C6363C",
  Slovenia: "#005DA7",
  Romania: "#FCD116",
  Ukraine: "#005BBB",
  Poland: "#DC143C",
  "Czech Republic": "#D7141A",
  Albania: "#E41E20",
  Georgia: "#FF0000",
  Slovakia: "#0B4EA2",
};

const STAGES = [
  { label: "All Stages", value: "" },
  { label: "Group Stage", value: "group" },
  { label: "Round of 16", value: "Round of 16" },
  { label: "Quarter-finals", value: "Quarter-finals" },
  { label: "Semi-finals", value: "Semi-finals" },
  { label: "Final", value: "Final" },
];

const SORTS = [
  { label: "Newest", value: "newest" },
  { label: "Most Popular", value: "popular" },
  { label: "Team A-Z", value: "team_az" },
];

/* ------------------------------------------------------------------ */
/*  Seeded PRNG (mulberry32) — matches the API trajectory generator    */
/* ------------------------------------------------------------------ */

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateTrajectory(
  minute: number,
  second: number,
  playPattern: string,
): [number, number][] {
  const seed = minute * 60 + second;
  const rng = seededRandom(seed);
  const gx = 0.95;
  const gy = 0.4 + rng() * 0.2;

  switch (playPattern) {
    case "From Corner":
      return [
        [0.95, rng() > 0.5 ? 0.05 : 0.95],
        [0.85, 0.3 + rng() * 0.4],
        [0.88, 0.35 + rng() * 0.3],
        [gx, gy],
      ];
    case "From Free Kick":
      return [
        [0.65 + rng() * 0.15, 0.35 + rng() * 0.3],
        [0.82, 0.38 + rng() * 0.24],
        [gx, gy],
      ];
    case "From Counter":
      return [
        [0.3, 0.3 + rng() * 0.4],
        [0.5, 0.2 + rng() * 0.6],
        [0.65, 0.25 + rng() * 0.5],
        [0.8, 0.3 + rng() * 0.4],
        [gx, gy],
      ];
    default:
      return [
        [0.55, 0.2 + rng() * 0.6],
        [0.65, 0.25 + rng() * 0.5],
        [0.78, 0.3 + rng() * 0.4],
        [0.85, 0.35 + rng() * 0.3],
        [gx, gy],
      ];
  }
}

/* ------------------------------------------------------------------ */
/*  Dataline SVG                                                       */
/* ------------------------------------------------------------------ */

function DatalineSvg({
  goal,
  colour,
}: {
  goal: GoalWithMatch;
  colour: string;
}) {
  const points = generateTrajectory(
    goal.minute,
    goal.second,
    goal.play_pattern,
  );
  const w = 200;
  const h = 80;
  const scaled = points.map(
    ([x, y]) => [x * w, y * h] as [number, number],
  );
  const d = scaled
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-16"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke={colour}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
      {scaled.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === scaled.length - 1 ? 4 : 2}
          fill={i === scaled.length - 1 ? colour : `${colour}88`}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton card                                                      */
/* ------------------------------------------------------------------ */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/5 bg-[#111111] overflow-hidden animate-pulse">
      <div className="h-1 bg-white/10" />
      <div className="p-5 space-y-4">
        <div className="h-16 rounded bg-white/5" />
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter dropdown                                                    */
/* ------------------------------------------------------------------ */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="relative">
      <label className="block text-[10px] uppercase tracking-widest text-[#888888] mb-1">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 pr-8 text-sm text-white outline-none focus:border-white/20"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888888]" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Moment Card                                                        */
/* ------------------------------------------------------------------ */

function MomentCard({ goal }: { goal: GoalWithMatch }) {
  const colour = TEAM_COLOURS[goal.team] || "#DA291C";
  const matchLine = goal.match
    ? `${goal.match.home_team} ${goal.match.home_score}–${goal.match.away_score} ${goal.match.away_team}`
    : "";

  return (
    <Link href={`/goals/${goal.goalId}`} className="group block">
      <div
        className="rounded-xl border bg-[#111111] overflow-hidden transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = colour)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")
        }
      >
        {/* Team colour accent bar */}
        <div className="h-1" style={{ backgroundColor: colour }} />

        <div className="p-5 space-y-3">
          {/* Dataline preview */}
          <div className="rounded-lg bg-black/40 p-2">
            <DatalineSvg goal={goal} colour={colour} />
          </div>

          {/* Goal info */}
          <p className="text-sm font-semibold text-white">
            {"\u26BD"} {goal.player} &middot; {goal.minute}&apos;
          </p>

          {/* Match */}
          {matchLine && (
            <p className="text-xs text-[#9CA3AF]">{matchLine}</p>
          )}

          {/* Competition badge */}
          <div className="flex items-center justify-between">
            <span className="inline-block rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#888888]">
              EURO 2024
            </span>
            <span className="text-xs font-semibold text-[#888888] transition group-hover:text-white">
              View &amp; Customise &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MomentsGalleryPage() {
  const [goals, setGoals] = useState<GoalWithMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const [team, setTeam] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("newest");

  /* Fetch all goals + matches, merge them */
  useEffect(() => {
    async function load() {
      try {
        const [goalsRes, matchesRes] = await Promise.all([
          fetch("/api/euro-2024/goals"),
          fetch("/api/euro-2024/matches"),
        ]);
        const goalsData: Goal[] = await goalsRes.json();
        const matchesData: Match[] = await matchesRes.json();

        const matchMap = new Map(matchesData.map((m) => [m.id, m]));

        const merged: GoalWithMatch[] = goalsData.map((g) => ({
          ...g,
          match: matchMap.get(g.match_id),
          goalId: `${g.match_id}-${g.minute}-${g.second}`,
        }));

        setGoals(merged);
      } catch (err) {
        console.error("Failed to load moments", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* Derive team options from loaded data */
  const teamOptions = useMemo(() => {
    const teams = [...new Set(goals.map((g) => g.team))].sort();
    return [
      { label: "All Teams", value: "" },
      ...teams.map((t) => ({ label: t, value: t })),
    ];
  }, [goals]);

  /* Filter + sort */
  const filtered = useMemo(() => {
    let result = goals;

    if (team) {
      result = result.filter((g) => g.team === team);
    }

    if (stage) {
      if (stage === "group") {
        result = result.filter((g) => g.match?.stage?.startsWith("Group"));
      } else {
        result = result.filter((g) => g.match?.stage === stage);
      }
    }

    switch (sort) {
      case "newest":
        result = [...result].sort((a, b) => {
          const dateA = a.match?.date || "";
          const dateB = b.match?.date || "";
          if (dateB !== dateA) return dateB.localeCompare(dateA);
          return b.minute - a.minute;
        });
        break;
      case "popular":
        // Deterministic "popularity" — use player name length + minute as proxy
        result = [...result].sort(
          (a, b) =>
            b.player.length + b.minute - (a.player.length + a.minute),
        );
        break;
      case "team_az":
        result = [...result].sort((a, b) =>
          a.team.localeCompare(b.team),
        );
        break;
    }

    return result;
  }, [goals, team, stage, sort]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
            Euro 2024
          </span>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Moments Gallery
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[#9CA3AF]">
            Browse every goal from Euro 2024. Pick a moment, customise it, wear
            it.
          </p>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FilterSelect
              label="Competition"
              value="euro2024"
              onChange={() => {}}
              options={[{ label: "Euro 2024", value: "euro2024" }]}
            />
            <FilterSelect
              label="Team"
              value={team}
              onChange={setTeam}
              options={teamOptions}
            />
            <FilterSelect
              label="Stage"
              value={stage}
              onChange={setStage}
              options={STAGES}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={setSort}
              options={SORTS}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm text-[#888888]">
              No moments found for this selection
            </p>
            <button
              onClick={() => {
                setTeam("");
                setStage("");
              }}
              className="mt-4 text-xs font-semibold text-[#DA291C] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="mb-6 text-xs text-[#888888]">
              {filtered.length} moment{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((goal) => (
                <MomentCard key={goal.goalId} goal={goal} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
