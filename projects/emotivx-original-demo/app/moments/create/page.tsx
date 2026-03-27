/**
 * Create Your Moment
 * 
 * 5-step wizard:
 * 1. Pick a match (Euro 2024)
 * 2. Pick a goal (from real StatsBomb data)
 * 3. Generate artwork (Python engine with real buildup path)
 * 4. Customize (full slider suite + style picker)
 * 5. Export (download PNG)
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ChevronLeft, Download } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface Match {
  match_id: number;
  id: number;
  home_team: { home_team_name: string } | string;
  away_team: { away_team_name: string } | string;
  home_score: number;
  away_score: number;
  match_date: string;
  date: string;
}

// Helper to extract team name from either format
function teamName(t: { home_team_name?: string; away_team_name?: string } | string | undefined): string {
  if (!t) return "Unknown";
  if (typeof t === "string") return t;
  return t.home_team_name ?? t.away_team_name ?? "Unknown";
}

function matchDate(m: Match): string {
  const d = m.match_date || m.date;
  if (!d) return "";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

interface Goal {
  index: number;
  player: string;
  team: string;
  minute: number;
  second: number;
  isOwnGoal?: boolean;
  ownGoalPlayer?: string;  // The actual player who scored the OG
  ownGoalTeam?: string;    // Their team (the ones who conceded)
}

interface GeneratedMoment {
  imageUrl: string;
  match: string;
  stats: {
    home_passes: number;
    away_passes: number;
    home_shots: number;
    away_shots: number;
    home_possession: number;
  };
}

type Step = "select" | "goals" | "generate" | "customize" | "export";

const STYLES = [
  { id: "street",     label: "🎨 Street",     desc: "Spray paint graffiti — drips, overspray, brick wall", previewUrl: "/previews/style-street.png" },
  { id: "jackson",    label: "🎭 Jackson",    desc: "Pollock drip painting — chaotic, physical, raw",     previewUrl: "/previews/style-jackson.png" },
  { id: "geometric",  label: "📐 Geometric",  desc: "Voronoi tessellation — stained glass crystal",       previewUrl: "/previews/style-geometric.png" },
  { id: "marble",     label: "🏛️ Marble",     desc: "Italian marble veining — polished stone luxury",     previewUrl: "/previews/style-marble.png" },
  { id: "smoky",      label: "💨 Smoky",      desc: "Ethereal coloured smoke — atmospheric depth",        previewUrl: "/previews/style-smoky.png" },
  { id: "futuristic", label: "🕸️ Spiderweb",  desc: "Radial silk web — dewdrops, organic beauty",         previewUrl: "/previews/style-futuristic.png" },
  { id: "camo",       label: "🪖 Camo",       desc: "Military camouflage — team colour blobs",            previewUrl: "/previews/style-camo.png" },
  { id: "classic",    label: "📰 Classic",    desc: "Vintage sports poster — halftone, retro",            previewUrl: "/previews/style-classic.png" },
  { id: "dali",       label: "🫠 Dalí",       desc: "Surrealist — melting, warping, dreamlike",           previewUrl: "/previews/style-dali.png" },
];

const GRADIENTS = [
  { id: "none", label: "None" },
  { id: "radial", label: "Radial" },
  { id: "linear", label: "Linear" },
  { id: "diagonal", label: "Diagonal" },
];

export default function CreateMomentPage() {
  const { role } = useAuth();
  const isStaff = role === "platform_admin" || role === "club_admin";
  const [step, setStep] = useState<Step>("select");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [style, setStyle] = useState("street");
  const [generating, setGenerating] = useState(false);
  const [moment, setMoment] = useState<GeneratedMoment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Full slider suite (matching last night's marketplace build) ───
  const [bgDetail, setBgDetail] = useState(50);
  const [dataDetail, setDataDetail] = useState(50);
  const [bloom, setBloom] = useState(50);
  const [intensity, setIntensity] = useState(50);
  const [dataScale, setDataScale] = useState(50);
  const [edgeVisibility, setEdgeVisibility] = useState(30);
  const [secondaryAccent, setSecondaryAccent] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [repeatSize, setRepeatSize] = useState(0);
  const [motifScale, setMotifScale] = useState(50);
  const [markerSize, setMarkerSize] = useState(50);
  const [seed, setSeed] = useState(42);
  // ─── New: buildup depth — how many pre-goal events to include ───
  const [buildupDepth, setBuildupDepth] = useState(100); // 0-100% of available events

  // Toggles
  const [invertColors, setInvertColors] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [randomRotate, setRandomRotate] = useState(false);
  const [gradient, setGradient] = useState("none");

  // Debounced regeneration — 600ms after last change
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isCustomizing = step === "customize" && moment !== null && !generating;

  useEffect(() => {
    if (!isCustomizing || !selectedMatch) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generateMoment(selectedMatch, selectedGoalIndex);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, bgDetail, dataDetail, bloom, intensity, dataScale, edgeVisibility,
      secondaryAccent, rotation, repeatSize, motifScale, markerSize, seed,
      invertColors, showMarkers, randomRotate, gradient, buildupDepth]);

  // Load matches on mount, auto-select if matchId in URL
  useEffect(() => {
    fetch("/api/euro-2024/matches")
      .then(r => r.json())
      .then((allMatches: Match[]) => {
        setMatches(allMatches);
        // Check for ?matchId= in URL
        const params = new URLSearchParams(window.location.search);
        const matchId = params.get("matchId");
        if (matchId) {
          const match = allMatches.find((m: Match) => m.id === Number(matchId) || m.match_id === Number(matchId));
          if (match) handleSelectMatch(match);
        }
      })
      .catch(() => setError("Failed to load matches"));
  }, []);

  const handleSelectMatch = async (match: Match) => {
    setSelectedMatch(match);
    setError(null);
    try {
      const response = await fetch(`/api/moments/goals?matchId=${match.id ?? match.match_id}`);
      const data = await response.json();
      if (data.goals?.length > 0) {
        setGoals(data.goals);
        setSelectedGoalIndex(0);
        setStep("goals");
      } else {
        setGoals([]);
        setError("No goals found for this match. Please select another match.");
        setStep("select");
      }
    } catch {
      setGoals([]);
      setError("Failed to load goals for this match. Please try again.");
      setStep("select");
    }
  };

  const handleSelectGoal = (goalIndex: number) => {
    setSelectedGoalIndex(goalIndex);
    setStep("generate");
    if (selectedMatch) generateMoment(selectedMatch, goalIndex);
  };

  const generateMoment = async (match: Match, goalIndex: number) => {
    setGenerating(true);
    setError(null);

    try {
      const payload = {
        matchId: match.id ?? match.match_id,
        style,
        bgDetail,
        dataDetail,
        bloom,
        intensity,
        dataScale,
        motifScale,
        repeatSize,
        repeatMode: "tiled",
        randomRotate,
        rotation,
        invertColors,
        showMarkers,
        markerSize,
        seed,
        edgeVisibility,
        gradient,
        secondaryAccent,
        goalIndex,
        buildupDepth,
        width: 2048,
      };

      const response = await fetch("/api/moments/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      if (!response.ok) throw new Error(`API returned ${response.status}: ${text}`);

      const data = JSON.parse(text);
      setMoment(data);
      setStep("customize");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (step === "generate") setStep("goals");
    } finally {
      setGenerating(false);
    }
  };

  /** Export high-res artwork — staff/admin only (for Printful production pipeline) */
  const handleExport = () => {
    if (!moment) return;
    const link = document.createElement("a");
    link.href = moment.imageUrl;
    link.download = `emotivx-${selectedMatch?.id ?? selectedMatch?.match_id}-goal${selectedGoalIndex}-${style}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 10000));

  const selectedGoal = goals[selectedGoalIndex];

  // Label helpers
  const bgLabel = bgDetail < 20 ? "Clean" : bgDetail < 40 ? "Moderate" : bgDetail < 60 ? "Detailed" : bgDetail < 80 ? "Fine" : "Ultra-Fine";
  const dataLabel = dataDetail < 20 ? "Broad" : dataDetail < 40 ? "Moderate" : dataDetail < 60 ? "Detailed" : dataDetail < 80 ? "Fine" : "Ultra-Fine";
  const bloomLabel = bloom < 20 ? "Laser" : bloom < 40 ? "Tight" : bloom < 60 ? "Soft" : bloom < 80 ? "Spread" : "Maximum";
  const intensityLabel = intensity < 20 ? "Dim" : intensity < 40 ? "Subtle" : intensity < 60 ? "Normal" : intensity < 80 ? "Bright" : "Blazing";
  const buildupLabel = buildupDepth < 20 ? "Final shot only" : buildupDepth < 40 ? "Last few passes" : buildupDepth < 60 ? "Key buildup" : buildupDepth < 80 ? "Extended play" : "Full possession";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <h1 className="font-display text-3xl font-bold uppercase">✨ Create Your Moment</h1>
          <p className="mt-2 text-gray-400">
            Transform Euro 2024 goals into stunning artwork from real match data
          </p>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {[
            { key: "select", label: "1. Match" },
            { key: "goals", label: "2. Goal" },
            { key: "generate", label: "3. Generate" },
            { key: "customize", label: "4. Customize" },

          ].map((s, i, arr) => (
            <span key={s.key} className="flex items-center gap-2">
              <span className={step === s.key ? "font-bold text-cyan-400" : "text-gray-500"}>
                {s.label}
              </span>
              {i < arr.length - 1 && (
                <div className={`h-1 w-6 ${arr.findIndex(x => x.key === step) > i ? "bg-cyan-500" : "bg-gray-700"}`} />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-6">

        {/* ─── Step 1: Select Match ─── */}
        {step === "select" && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl font-semibold text-cyan-300">Choose a Match</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {matches
                .filter(m => m.home_score + m.away_score > 0)
                .sort((a, b) => (b.home_score + b.away_score) - (a.home_score + a.away_score))
                .map((match) => (
                <button
                  key={match.id ?? match.match_id}
                  onClick={() => handleSelectMatch(match)}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-cyan-400/50 hover:bg-white/10 text-left"
                >
                  <div className="font-display font-semibold">
                    {teamName(match.home_team)} {match.home_score} - {match.away_score} {teamName(match.away_team)}
                  </div>
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-gray-400">
                      {matchDate(match)}
                    </span>
                    <span className="text-cyan-400/60">
                      {match.home_score + match.away_score} goal{match.home_score + match.away_score !== 1 ? "s" : ""}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 2: Select Goal — Split by Team ─── */}
        {step === "goals" && selectedMatch && (() => {
          const homeName = teamName(selectedMatch.home_team);
          const awayName = teamName(selectedMatch.away_team);
          const homeGoals = goals.filter(g => g.team === homeName);
          const awayGoals = goals.filter(g => g.team === awayName);

          return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <button onClick={() => setStep("select")} className="text-gray-400 hover:text-white">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h2 className="font-display text-2xl font-semibold text-cyan-300">Choose a Goal</h2>
                  <p className="text-gray-400">
                    {homeName} {selectedMatch.home_score} - {selectedMatch.away_score} {awayName}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Home Team */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <span className="text-2xl">🏠</span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{homeName}</h3>
                      <p className="text-sm text-gray-400">{homeGoals.length} goal{homeGoals.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="ml-auto font-display text-3xl font-bold text-white/80">{selectedMatch.home_score}</span>
                  </div>
                  <div className="space-y-3">
                    {homeGoals.length > 0 ? homeGoals.map((goal) => (
                      <button
                        key={goal.index}
                        onClick={() => handleSelectGoal(goal.index)}
                        className={`w-full rounded-lg border p-4 transition text-left ${
                          goal.isOwnGoal
                            ? "border-red-500/30 bg-red-500/5 hover:border-red-400/50 hover:bg-red-500/10 ring-1 ring-red-500/20"
                            : "border-white/10 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {goal.isOwnGoal ? (
                              <>
                                <span className="font-semibold text-red-300">{goal.ownGoalPlayer || "Unknown"}</span>
                                <span className="text-[10px] font-bold bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded ring-1 ring-red-500/40">OG</span>
                              </>
                            ) : (
                              <span className="font-semibold text-white">{goal.player}</span>
                            )}
                          </div>
                          <span className={`text-xl font-bold ${goal.isOwnGoal ? "text-red-400" : "text-cyan-400"}`}>{goal.minute}&apos;</span>
                        </div>
                        {goal.isOwnGoal && (
                          <p className="text-[11px] text-red-400/60 mt-1">
                            Scored by {goal.ownGoalPlayer || "opponent"} ({goal.ownGoalTeam || "?"})
                          </p>
                        )}
                      </button>
                    )) : (
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-gray-500 text-sm">No goals scored</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Away Team */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                    <span className="text-2xl">✈️</span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{awayName}</h3>
                      <p className="text-sm text-gray-400">{awayGoals.length} goal{awayGoals.length !== 1 ? "s" : ""}</p>
                    </div>
                    <span className="ml-auto font-display text-3xl font-bold text-white/80">{selectedMatch.away_score}</span>
                  </div>
                  <div className="space-y-3">
                    {awayGoals.length > 0 ? awayGoals.map((goal) => (
                      <button
                        key={goal.index}
                        onClick={() => handleSelectGoal(goal.index)}
                        className={`w-full rounded-lg border p-4 transition text-left ${
                          goal.isOwnGoal
                            ? "border-red-500/30 bg-red-500/5 hover:border-red-400/50 hover:bg-red-500/10 ring-1 ring-red-500/20"
                            : "border-white/10 bg-white/5 hover:border-cyan-400/50 hover:bg-white/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {goal.isOwnGoal ? (
                              <>
                                <span className="font-semibold text-red-300">{goal.ownGoalPlayer || "Unknown"}</span>
                                <span className="text-[10px] font-bold bg-red-500/30 text-red-300 px-1.5 py-0.5 rounded ring-1 ring-red-500/40">OG</span>
                              </>
                            ) : (
                              <span className="font-semibold text-white">{goal.player}</span>
                            )}
                          </div>
                          <span className={`text-xl font-bold ${goal.isOwnGoal ? "text-red-400" : "text-cyan-400"}`}>{goal.minute}&apos;</span>
                        </div>
                        {goal.isOwnGoal && (
                          <p className="text-[11px] text-red-400/60 mt-1">
                            Scored by {goal.ownGoalPlayer || "opponent"} ({goal.ownGoalTeam || "?"})
                          </p>
                        )}
                      </button>
                    )) : (
                      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center">
                        <p className="text-gray-500 text-sm">No goals scored</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* All Goals option */}
              {goals.length > 1 && (
                <button
                  onClick={() => handleSelectGoal(0)}
                  className="w-full rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 transition hover:border-cyan-400/40 hover:bg-cyan-400/10 text-center"
                >
                  <span className="font-semibold text-cyan-300">🎯 All {goals.length} Goals — Overlay all buildup paths</span>
                </button>
              )}
            </div>
          );
        })()}

        {/* ─── Step 3: Generating ─── */}
        {step === "generate" && (
          <div className="flex flex-col items-center justify-center space-y-6 py-20">
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400" />
            <div className="text-center">
              <p className="text-xl font-semibold">Generating your artwork...</p>
              <p className="mt-2 text-gray-400">
                {teamName(selectedMatch?.home_team)} vs {teamName(selectedMatch?.away_team)}
                {selectedGoal && ` — ${selectedGoal.player} ${selectedGoal.minute}'`}
              </p>
              <p className="mt-1 text-sm text-gray-500">Real match data → tessellation engine</p>
            </div>
          </div>
        )}

        {/* ─── Step 4: Customize ─── */}
        {step === "customize" && moment && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Image Preview (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="font-display text-xl font-semibold text-cyan-300">Your Artwork</h2>
                {selectedGoal && (
                  <span className="text-sm text-gray-400">
                    ⚽ {selectedGoal.player} {selectedGoal.minute}&apos; — {selectedGoal.team}
                  </span>
                )}
              </div>

              <div className="relative rounded-lg border border-white/10 overflow-hidden">
                {generating && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  </div>
                )}
                <img src={moment.imageUrl} alt="Generated moment" className="w-full" />
              </div>

              {/* Match Stats */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold text-cyan-400">{moment.match}</p>
                <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Passes</p>
                    <p className="font-semibold">{moment.stats.home_passes} | {moment.stats.away_passes}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Shots</p>
                    <p className="font-semibold">{moment.stats.home_shots} | {moment.stats.away_shots}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Possession</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${moment.stats.home_possession}%` }} />
                      </div>
                      <span className="text-xs font-semibold">{moment.stats.home_possession}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Controls Panel (1 col, scrollable) ─── */}
            <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
              {/* Style Selector */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Style</h3>
                <div className="grid grid-cols-3 gap-2">
                  {STYLES.map((s) => {
                    const active = style === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStyle(s.id)}
                        className={`relative overflow-hidden rounded-lg px-2 py-3 text-center transition text-xs ${
                          active
                            ? "border-2 border-[#DA291C] text-white"
                            : "border border-white/10 bg-[#1A1111] text-white hover:border-white/20"
                        }`}
                      >
                        {s.previewUrl && (
                          <img
                            src={s.previewUrl}
                            alt={s.label}
                            className={`absolute inset-0 h-full w-full object-cover transition ${active ? "opacity-100" : "opacity-40"}`}
                          />
                        )}
                        <span className="relative font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggles Row */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Toggles</h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setInvertColors(!invertColors)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${invertColors ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                    🔄 Invert
                  </button>
                  <button onClick={() => setShowMarkers(!showMarkers)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${showMarkers ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                    📍 Data Points
                  </button>
                  <button onClick={() => setRandomRotate(!randomRotate)}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${randomRotate ? "border-violet-400 bg-violet-400/10 text-violet-300" : "border-white/10 text-white/60 hover:border-white/30"}`}>
                    🔀 Random Rotate
                  </button>
                  <button onClick={randomizeSeed}
                    className="rounded-lg border border-white/10 px-2 py-1.5 text-xs font-medium text-white/60 hover:border-white/30">
                    🎲 New Seed
                  </button>
                </div>
              </div>

              {/* Gradient */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Gradient</h3>
                <div className="flex gap-2">
                  {GRADIENTS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => setGradient(g.id)}
                      className={`rounded px-3 py-1 text-xs font-medium ${
                        gradient === g.id
                          ? "border border-cyan-400 bg-cyan-400/10 text-cyan-300"
                          : "border border-white/10 text-white/60 hover:border-white/30"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Buildup Depth Slider ─── */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Data Path</h3>
                <SliderControl
                  label="Buildup Depth"
                  value={buildupDepth}
                  onChange={setBuildupDepth}
                  badge={buildupLabel}
                  color="amber"
                  min="Shot only"
                  max="Full possession"
                />
              </div>

              {/* Sliders */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Background</h3>
                <div className="space-y-3">
                  <SliderControl label="Background Detail" value={bgDetail} onChange={setBgDetail} badge={bgLabel} color="cyan" min="Clean" max="Ultra-Fine" />
                  <SliderControl label="Cell Edge Visibility" value={edgeVisibility} onChange={setEdgeVisibility} badge={`${edgeVisibility}%`} color="slate" min="Smooth" max="Faceted" />
                  <SliderControl label="Secondary Colour" value={secondaryAccent} onChange={setSecondaryAccent} badge={secondaryAccent === 0 ? "Off" : `${secondaryAccent}%`} color="indigo" min="None" max="Strong" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Data Line</h3>
                <div className="space-y-3">
                  <SliderControl label="Data Line Detail" value={dataDetail} onChange={setDataDetail} badge={dataLabel} color="emerald" min="Broad" max="Ultra-Fine" />
                  <SliderControl label="Data Line Bloom" value={bloom} onChange={setBloom} badge={bloomLabel} color="rose" min="Laser" max="Maximum" />
                  <SliderControl label="Data Line Intensity" value={intensity} onChange={setIntensity} badge={intensityLabel} color="yellow" min="Dim" max="Blazing" />
                  <SliderControl label="Data Fill" value={dataScale} onChange={setDataScale} badge={dataScale < 20 ? "Compact" : dataScale < 60 ? "Medium" : "Full"} color="lime" min="Compact" max="Full Canvas" />
                  <SliderControl label="Data Points" value={markerSize} onChange={setMarkerSize} badge={markerSize < 10 ? "Hidden" : markerSize < 60 ? "Normal" : "Blazing"} color="teal" min="Hidden" max="Blazing" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-wider">Transform</h3>
                <div className="space-y-3">
                  <SliderControl label="Rotation" value={rotation} onChange={setRotation} badge={`${rotation}°`} color="orange" min="0°" max="360°" sliderMax={360} step={5} />
                  <SliderControl label="Pattern Repeat" value={repeatSize} onChange={setRepeatSize} badge={repeatSize === 0 ? "Single" : repeatSize < 60 ? "Tiled" : "Micro"} color="purple" min="No repeat" max="Micro tiles" />
                  <SliderControl label="Motif Size" value={motifScale} onChange={setMotifScale} badge={motifScale < 40 ? "Small" : motifScale < 60 ? "Normal" : "Large"} color="fuchsia" min="Tiny" max="Huge" />
                </div>
              </div>

              {/* Seed display */}
              <div className="text-center text-[10px] text-white/30 pb-2">Seed: {seed}</div>

              {/* Action Buttons */}
              <div className="space-y-2 sticky bottom-0 bg-gradient-to-t from-gray-950 via-gray-950 pt-4 pb-2">
                {/* PRIMARY CTA — Order on Hoodie */}
                <button
                  onClick={() => {
                    if (moment?.imageUrl) {
                      // If it's a Supabase URL, pass directly. If base64, use localStorage fallback.
                      const isUrl = moment.imageUrl.startsWith("http");
                      if (!isUrl) localStorage.setItem("emotivx_merch_art", moment.imageUrl);
                      const params = new URLSearchParams({
                        style,
                        goal: `${teamName(selectedMatch?.home_team)} vs ${teamName(selectedMatch?.away_team)}`,
                        matchId: String(selectedMatch?.id ?? selectedMatch?.match_id ?? ""),
                        goalIndex: String(selectedGoalIndex),
                        ...(isUrl ? { artUrl: moment.imageUrl } : {}),
                      });
                      window.location.href = `/merch-preview?${params.toString()}`;
                    }
                  }}
                  disabled={generating || !moment}
                  className="w-full rounded-lg bg-[#DA291C] px-4 py-3 font-display font-bold text-white text-lg uppercase tracking-wide hover:bg-[#c0241a] disabled:opacity-50 transition"
                >
                  🛒 ORDER ON A HOODIE →
                </button>

                {/* ─── Product Preview Thumbnails ─── */}
                {moment?.imageUrl && (
                  <ProductPreviewRow
                    artworkUrl={moment.imageUrl}
                    buildMerchUrl={(productType: string) => {
                      const isUrl = moment.imageUrl.startsWith("http");
                      if (!isUrl) localStorage.setItem("emotivx_merch_art", moment.imageUrl);
                      const params = new URLSearchParams({
                        style,
                        goal: `${teamName(selectedMatch?.home_team)} vs ${teamName(selectedMatch?.away_team)}`,
                        matchId: String(selectedMatch?.id ?? selectedMatch?.match_id ?? ""),
                        goalIndex: String(selectedGoalIndex),
                        productType,
                        ...(isUrl ? { artUrl: moment.imageUrl } : {}),
                      });
                      return `/merch-preview?${params.toString()}`;
                    }}
                  />
                )}

                {/* Staff-only: export high-res for Printful production pipeline */}
                {isStaff && moment && (
                  <button
                    onClick={handleExport}
                    className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 hover:bg-amber-500/20"
                  >
                    <Download className="inline mr-1 h-4 w-4" /> Export Production File (Staff)
                  </button>
                )}

                {goals.length > 1 && (
                  <button onClick={() => setStep("goals")}
                    className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">
                    ⚽ Change Goal ({goals.length} available)
                  </button>
                )}
                <button onClick={() => { setStep("select"); setSelectedMatch(null); setMoment(null); setGoals([]); }}
                  className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5">
                  <ChevronLeft className="inline mr-1 h-4 w-4" /> Back to Matches
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export step removed — merch flow is the primary output */}

        {/* Error Toast */}
        {error && (
          <div className="fixed top-4 right-4 max-w-md rounded-lg border border-red-400 bg-red-900 p-4 text-white shadow-lg z-50">
            <p className="font-bold">Error</p>
            <p className="mt-1 text-sm text-red-100">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 rounded bg-red-700 px-3 py-1 text-xs hover:bg-red-600">Dismiss</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Reusable Slider Component ─── */
function SliderControl({ label, value, onChange, badge, color, min, max, sliderMax = 100, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  badge: string; color: string; min: string; max: string;
  sliderMax?: number; step?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs font-semibold text-${color}-400`}>{badge}</span>
      </div>
      <input
        type="range"
        min="0"
        max={sliderMax}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-500 h-1.5"
      />
      <div className="flex justify-between text-[10px] text-white/20 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

/* ─── Product Preview Thumbnails ─── */

const PRODUCT_THUMBS = [
  { type: "hoodie",  label: "Hoodie",     price: "£65", template: "/templates/hoodie-front.svg",  aspect: "3 / 4" },
  { type: "phone",   label: "Phone Case", price: "£20", template: "/templates/phonecase.svg",      aspect: "1 / 2" },
  { type: "mug",     label: "Mug",        price: "£18", template: "/templates/mug-side.svg",       aspect: "4 / 3" },
  { type: "tote",    label: "Tote Bag",   price: "£22", template: "/templates/tote-front.svg",     aspect: "5 / 6" },
] as const;

function ProductPreviewRow({ artworkUrl, buildMerchUrl }: {
  artworkUrl: string;
  buildMerchUrl: (productType: string) => string;
}) {
  return (
    <div className="pt-3 pb-1">
      <h4
        className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2"
        style={{ fontFamily: "'Barlow Condensed', var(--font-display), sans-serif" }}
      >
        YOUR MOMENT ON EVERYTHING
      </h4>
      <div className="grid grid-cols-4 gap-2">
        {PRODUCT_THUMBS.map((p) => (
          <ProductThumbnail
            key={p.type}
            templatePath={p.template}
            artworkUrl={artworkUrl}
            label={p.label}
            price={p.price}
            aspect={p.aspect}
            href={buildMerchUrl(p.type)}
          />
        ))}
      </div>
    </div>
  );
}

function ProductThumbnail({ templatePath, artworkUrl, label, price, aspect, href }: {
  templatePath: string;
  artworkUrl: string;
  label: string;
  price: string;
  aspect: string;
  href: string;
}) {
  const [maskUrl, setMaskUrl] = useState<string>("");

  useEffect(() => {
    fetch(templatePath)
      .then((r) => r.text())
      .then((raw) => {
        const filled = raw
          .replace(/filter="url\(#[^"]*\)"/g, "")
          .replace(/<rect[^>]*stroke-dasharray[^>]*\/>/g, "")
          .replace(/stroke="rgba\([^"]*\)"/g, 'stroke="white"')
          .replace(/stroke-width="[^"]*"/g, 'stroke-width="30"')
          .replace(/<g stroke=/g, '<g fill="white" stroke=');
        const blob = new Blob([filled], { type: "image/svg+xml" });
        setMaskUrl(URL.createObjectURL(blob));
      })
      .catch(() => setMaskUrl(""));

    return () => {
      if (maskUrl) URL.revokeObjectURL(maskUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatePath]);

  return (
    <a
      href={href}
      className="group flex flex-col items-center rounded-lg border border-white/10 bg-white/[0.03] p-2 transition hover:border-cyan-400/40 hover:bg-white/[0.06]"
    >
      {/* Masked artwork */}
      <div
        className="w-full"
        style={{
          aspectRatio: aspect,
          backgroundImage: `url(${artworkUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          WebkitMaskImage: maskUrl ? `url(${maskUrl})` : undefined,
          maskImage: maskUrl ? `url(${maskUrl})` : undefined,
          WebkitMaskSize: "contain",
          maskSize: "contain" as string,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat" as string,
          WebkitMaskPosition: "center",
          maskPosition: "center" as string,
        }}
      />
      {/* Label + price */}
      <span className="mt-1 text-[10px] font-medium text-white/70 group-hover:text-cyan-300 transition leading-tight text-center">
        {label}
      </span>
      <span className="text-[10px] text-white/40">{price}</span>
    </a>
  );
}
