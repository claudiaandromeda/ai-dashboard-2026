/**
 * Wrexham 360 Premium — Full redesign
 * Diagonal match card, 3D data showcase, creative merch ideas
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, ChevronLeft, Download, Sparkles, Zap } from "lucide-react";

/* ─── types ──────────────────────────────────────────────────── */

interface Goal {
  index: number;
  player: string;
  team: string;
  teamId: number;
  minute: number;
  second: number;
  xg: number;
  startZ: number;
  endZ: number;
  hasFreezeFrame: boolean;
  isOwnGoal: boolean;
}

interface GeneratedMoment {
  imageUrl: string;
  match: string;
  format: string;
  stats: any;
}

/* ─── constants ──────────────────────────────────────────────── */

const STYLES = [
  { id: "pebbles", label: "Pebbles", desc: "Voronoi tessellation" },
  { id: "broken_glass", label: "Broken Glass", desc: "Delaunay shatter" },
  { id: "spider_web", label: "Spider Web", desc: "Radial spokes" },
  { id: "honeycomb", label: "Honeycomb", desc: "Hex grid" },
  { id: "street", label: "Street", desc: "Spray paint" },
  { id: "geometric", label: "Geometric", desc: "Hard angles" },
  { id: "futuristic", label: "Futuristic", desc: "Neon grid" },
];

const WREXHAM_ID = 1557;
const IPSWICH_ID = 55;
const MATCH_ID = 1377475;
const WREXHAM_RED = "#E4002B";
const IPSWICH_BLUE = "#0000FF";

/* ─── merch data ─────────────────────────────────────────────── */

const MERCH_IDEAS = [
  {
    title: "3D PRINTED GOAL SCULPTURE",
    desc: "The actual ball trajectory printed as a physical 3D object. Metal finish, mounted on a base. The trajectory curve includes height — it swoops up and down in true 3D space. Desk ornament or trophy for the shelf.",
    price: "45",
    shape: "sculpture" as const,
  },
  {
    title: "CRYSTAL ETCHED MOMENT",
    desc: "Laser-etched 3D trajectory inside a crystal block. The ball path floats inside the glass, illuminated by an LED base. The goal, frozen in time, viewed from every angle.",
    price: "85",
    shape: "crystal" as const,
  },
  {
    title: "TRAJECTORY NECKLACE",
    desc: "The ball path's simplest arc rendered as a gold or silver pendant. Each goal has a unique curve — your moment, worn. No two goals are alike.",
    price: "35",
    shape: "necklace" as const,
  },
  {
    title: "WALL ART — LAYERED ACRYLIC",
    desc: "Multiple layers of cut acrylic showing different passes and shots. Creates depth and parallax when viewed. Team colours in each layer. The data becomes architecture.",
    price: "120",
    shape: "acrylic" as const,
  },
  {
    title: "DATA SOUNDWAVE",
    desc: "Convert the trajectory data to a sound wave pattern. Print on a poster or engrave on metal. Like those custom soundwave art pieces — but with goal data instead of audio.",
    price: "25",
    shape: "soundwave" as const,
  },
];

/* ─── animated counter hook ──────────────────────────────────── */

function useCountUp(target: number, duration = 1800, trigger = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setValue(target);
        clearInterval(id);
      } else {
        setValue(start);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, trigger]);
  return value;
}

/* ─── merch product mockup shapes ────────────────────────────── */

function MerchMockup({ shape }: { shape: string }) {
  if (shape === "sculpture")
    return (
      <div className="relative h-32 w-full flex items-end justify-center">
        {/* Base */}
        <div className="absolute bottom-0 w-24 h-3 rounded-sm bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 opacity-80" />
        {/* Vertical stand */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1 h-10 bg-gradient-to-t from-amber-600 to-amber-400 opacity-70" />
        {/* 3D trajectory arc */}
        <svg viewBox="0 0 100 60" className="absolute bottom-10 w-28 h-16">
          <path d="M10 50 Q30 5 50 20 Q70 35 90 10" fill="none" stroke="url(#sculptureGrad)" strokeWidth="3" strokeLinecap="round" />
          <defs>
            <linearGradient id="sculptureGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#F5D76E" />
            </linearGradient>
          </defs>
          {/* Ball at end */}
          <circle cx="90" cy="10" r="3" fill="#F5D76E" />
        </svg>
        {/* Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded" />
      </div>
    );

  if (shape === "crystal")
    return (
      <div className="relative h-32 w-full flex items-center justify-center">
        {/* Crystal block */}
        <div className="relative w-20 h-24 rounded-sm overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(200,220,255,0.12) 0%, rgba(100,160,255,0.08) 50%, rgba(200,220,255,0.12) 100%)", border: "1px solid rgba(200,220,255,0.15)" }}>
          {/* Inner trajectory */}
          <svg viewBox="0 0 80 96" className="absolute inset-0 w-full h-full">
            <path d="M15 75 Q30 20 45 45 Q60 70 70 25" fill="none" stroke="rgba(100,180,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="70" cy="25" r="2" fill="rgba(100,180,255,0.6)" />
            <circle cx="15" cy="75" r="1.5" fill="rgba(100,180,255,0.4)" />
          </svg>
          {/* Glass reflections */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-8 h-8 bg-white/5 rounded-full blur-md" />
        </div>
        {/* LED base glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-2 rounded-sm bg-blue-500/30" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-blue-400/10 rounded-full blur-lg" />
      </div>
    );

  if (shape === "necklace")
    return (
      <div className="relative h-32 w-full flex items-center justify-center">
        {/* Chain */}
        <svg viewBox="0 0 100 80" className="w-24 h-20">
          <path d="M30 5 Q50 0 70 5" fill="none" stroke="#D4AF37" strokeWidth="0.8" opacity="0.6" />
          {/* Pendant - trajectory arc */}
          <path d="M40 30 Q50 10 60 25" fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
          {/* Bail connecting chain to pendant */}
          <circle cx="50" cy="15" r="3" fill="none" stroke="#D4AF37" strokeWidth="0.8" />
          <line x1="30" y1="5" x2="47" y2="13" stroke="#D4AF37" strokeWidth="0.8" opacity="0.6" />
          <line x1="70" y1="5" x2="53" y2="13" stroke="#D4AF37" strokeWidth="0.8" opacity="0.6" />
          {/* Small ball detail at peak */}
          <circle cx="50" cy="18" r="1" fill="#F5D76E" />
        </svg>
        {/* Shimmer */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-3 h-3 bg-yellow-300/20 rounded-full blur-md" />
      </div>
    );

  if (shape === "acrylic")
    return (
      <div className="relative h-32 w-full flex items-center justify-center">
        {/* Layered acrylic panels */}
        <div className="relative w-24 h-20">
          {/* Back layer - blue */}
          <div className="absolute inset-0 rounded-sm border border-blue-400/20 bg-blue-500/10" style={{ transform: "translateZ(0) translateX(-4px) translateY(-4px)" }}>
            <svg viewBox="0 0 96 80" className="w-full h-full"><path d="M10 60 L40 30 L80 50" fill="none" stroke={IPSWICH_BLUE} strokeWidth="1" opacity="0.4" /></svg>
          </div>
          {/* Middle layer - white/data */}
          <div className="absolute inset-0 rounded-sm border border-white/15 bg-white/5" style={{ transform: "translateX(0px) translateY(0px)" }}>
            <svg viewBox="0 0 96 80" className="w-full h-full"><path d="M15 55 Q50 15 85 40" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" /></svg>
          </div>
          {/* Front layer - red */}
          <div className="absolute inset-0 rounded-sm border border-red-400/20 bg-red-500/10" style={{ transform: "translateX(4px) translateY(4px)" }}>
            <svg viewBox="0 0 96 80" className="w-full h-full"><path d="M20 45 Q55 10 80 35" fill="none" stroke={WREXHAM_RED} strokeWidth="1" opacity="0.5" /></svg>
          </div>
        </div>
      </div>
    );

  // soundwave
  return (
    <div className="relative h-32 w-full flex items-center justify-center">
      <svg viewBox="0 0 120 50" className="w-32 h-14">
        {[...Array(30)].map((_, i) => {
          const h = Math.abs(Math.sin(i * 0.45 + 1) * 20 + Math.sin(i * 0.9) * 8);
          return <rect key={i} x={i * 4} y={25 - h / 2} width="2" height={Math.max(h, 2)} rx="1" fill={`rgba(228, 0, 43, ${0.3 + (h / 28) * 0.5})`} />;
        })}
      </svg>
    </div>
  );
}

/* ─── 3D arc preview SVG for goal cards ──────────────────────── */

function TrajectoryArc({ endZ, teamColor }: { endZ: number; teamColor: string }) {
  const peakY = Math.max(10, 50 - endZ * 12);
  return (
    <svg viewBox="0 0 120 60" className="w-full h-12">
      <defs>
        <linearGradient id={`arc-${endZ}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={teamColor} stopOpacity="0.3" />
          <stop offset="50%" stopColor={teamColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={teamColor} stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Ground line */}
      <line x1="0" y1="55" x2="120" y2="55" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Height markers */}
      <line x1="110" y1="55" x2="110" y2={peakY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="115" y={peakY + 4} fill="rgba(255,255,255,0.3)" fontSize="6">{endZ.toFixed(1)}m</text>
      {/* Trajectory arc */}
      <path d={`M10 55 Q60 ${peakY - 5} 110 ${peakY}`} fill="none" stroke={`url(#arc-${endZ})`} strokeWidth="2" strokeLinecap="round" />
      {/* Ball */}
      <circle cx="110" cy={peakY} r="3" fill={teamColor} />
      <circle cx="110" cy={peakY} r="5" fill={teamColor} opacity="0.2" />
    </svg>
  );
}

/* ─── 2D vs 3D comparison visual ─────────────────────────────── */

function ComparisonVisual() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 2D - flat */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Euro 2024 — 2D Data</div>
        <svg viewBox="0 0 200 100" className="w-full h-28 mb-4">
          {/* Pitch outline */}
          <rect x="10" y="10" width="180" height="80" rx="2" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          {/* Flat line - no height */}
          <line x1="30" y1="70" x2="170" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="70" r="3" fill="rgba(255,255,255,0.2)" />
          <circle cx="170" cy="40" r="3" fill="rgba(255,255,255,0.3)" />
          {/* Labels */}
          <text x="100" y="95" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7">x, y only</text>
        </svg>
        <p className="text-sm text-gray-500">Flat. No height. No drama.</p>
        <p className="text-xs text-gray-600 mt-1">A straight line from A to B</p>
      </div>

      {/* 3D - with height */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">360 Premium — 3D Data</div>
        <svg viewBox="0 0 200 100" className="w-full h-28 mb-4">
          {/* Pitch outline */}
          <rect x="10" y="10" width="180" height="80" rx="2" fill="none" stroke="rgba(228,0,43,0.15)" strokeWidth="0.5" />
          {/* Ground shadow */}
          <line x1="30" y1="70" x2="170" y2="40" stroke="rgba(228,0,43,0.1)" strokeWidth="1" strokeDasharray="3,3" />
          {/* 3D arc with height */}
          <path d="M30 70 Q80 5 130 20 Q160 30 170 40" fill="none" stroke={WREXHAM_RED} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          {/* Height indicator */}
          <line x1="80" y1="12" x2="80" y2="55" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeDasharray="2,2" />
          <text x="84" y="35" fill="rgba(228,0,43,0.5)" fontSize="6">z: 3.9m</text>
          {/* Ball glow */}
          <circle cx="170" cy="40" r="4" fill={WREXHAM_RED} />
          <circle cx="170" cy="40" r="8" fill={WREXHAM_RED} opacity="0.15" />
          <circle cx="30" cy="70" r="2.5" fill="rgba(228,0,43,0.4)" />
          {/* Labels */}
          <text x="100" y="95" textAnchor="middle" fill="rgba(228,0,43,0.4)" fontSize="7">x, y, z — ball height!</text>
        </svg>
        <p className="text-sm text-red-300">Height. Arc. True trajectory.</p>
        <p className="text-xs text-red-400/60 mt-1">The ball&apos;s real path through 3D space</p>
      </div>
    </div>
  );
}

/* ─── dragon watermark SVG ───────────────────────────────────── */

function DragonWatermark() {
  return (
    <svg viewBox="0 0 400 500" className="absolute right-0 top-0 h-full w-auto opacity-[0.03] pointer-events-none" preserveAspectRatio="xMaxYMid slice">
      {/* Stylized Welsh dragon silhouette */}
      <path d="M200 50 Q220 30 250 45 Q280 20 300 50 Q320 40 330 70 Q350 60 340 90 Q360 85 350 110 Q370 120 350 140 Q360 160 340 170 Q350 190 330 200 Q340 220 320 230 L300 250 Q310 270 290 280 Q300 300 280 310 Q290 330 270 340 L250 360 Q260 380 240 390 Q250 410 230 420 L200 450 L170 420 Q150 410 160 390 L140 360 Q120 350 130 330 Q110 310 120 300 Q100 280 110 270 L80 250 Q70 230 80 220 Q60 200 70 190 Q50 170 60 160 Q40 140 50 120 Q30 110 50 90 Q40 70 60 60 Q70 40 80 50 Q100 20 120 45 Q150 30 180 45 Z" fill="currentColor" className="text-red-500" />
      {/* Wing detail */}
      <path d="M250 100 Q300 80 340 100 Q310 110 280 105 Q260 102 250 100Z" fill="currentColor" className="text-red-500" />
      <path d="M150 100 Q100 80 60 100 Q90 110 120 105 Q140 102 150 100Z" fill="currentColor" className="text-red-500" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN PAGE                                                     */
/* ═══════════════════════════════════════════════════════════════ */

export default function WrexhamPage() {
  const [step, setStep] = useState<"showcase" | "generate" | "customize">("showcase");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [style, setStyle] = useState("broken_glass");
  const [generating, setGenerating] = useState(false);
  const [moment, setMoment] = useState<GeneratedMoment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);

  // scroll counter trigger
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  // sliders
  const [bgDetail, setBgDetail] = useState(50);
  const [dataDetail, setDataDetail] = useState(50);
  const [bloom, setBloom] = useState(50);
  const [intensity, setIntensity] = useState(60);
  const [dataScale, setDataScale] = useState(50);
  const [edgeVisibility, setEdgeVisibility] = useState(30);
  const [secondaryAccent, setSecondaryAccent] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [repeatSize, setRepeatSize] = useState(0);
  const [motifScale, setMotifScale] = useState(50);
  const [markerSize, setMarkerSize] = useState(50);
  const [buildupDepth, setBuildupDepth] = useState(100);
  const [seed, setSeed] = useState(42);
  const [invertColors, setInvertColors] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);
  const [randomRotate, setRandomRotate] = useState(false);
  const [gradient, setGradient] = useState("none");
  const [resolution, setResolution] = useState(1024);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isCustomizing = step === "customize" && moment !== null && !generating;

  // intersection observer for stats counter
  useEffect(() => {
    if (!statsRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  // animated counters
  const countEvents = useCountUp(2282, 2000, statsVisible);
  const countShots = useCountUp(23, 1200, statsVisible);
  const countGoals = useCountUp(8, 1000, statsVisible);

  useEffect(() => {
    fetch(`/api/wrexham/goals?matchId=${MATCH_ID}`)
      .then(r => r.json())
      .then(data => {
        setGoals(data.goals || []);
        setHomeScore(data.homeScore || 0);
        setAwayScore(data.awayScore || 0);
      })
      .catch(() => setError("Failed to load goals"));
  }, []);

  useEffect(() => {
    if (!isCustomizing) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => generate(selectedGoalIndex), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [style, bgDetail, dataDetail, bloom, intensity, dataScale, edgeVisibility,
      secondaryAccent, rotation, repeatSize, motifScale, markerSize, seed,
      invertColors, showMarkers, randomRotate, gradient, resolution, buildupDepth]);

  const generate = async (goalIndex: number) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/wrexham/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: MATCH_ID, goalIndex, style,
          bgDetail, dataDetail, bloom, intensity, dataScale,
          motifScale, repeatSize, randomRotate, rotation,
          invertColors, showMarkers, markerSize, seed,
          edgeVisibility, gradient, secondaryAccent, buildupDepth,
          width: resolution,
        }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      setMoment(JSON.parse(text));
      setStep("customize");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectGoal = (idx: number) => {
    setSelectedGoalIndex(idx);
    setStep("generate");
    generate(idx);
  };

  const handleExport = () => {
    if (!moment) return;
    const link = document.createElement("a");
    link.href = moment.imageUrl;
    const goal = goals[selectedGoalIndex];
    link.download = `wrexham-${goal?.player?.replace(/\s/g, "_")}-${goal?.minute}min-${style}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const wrexhamGoals = goals.filter(g => g.teamId === WREXHAM_ID);
  const ipswichGoals = goals.filter(g => g.teamId === IPSWICH_ID);
  const selectedGoal = goals[selectedGoalIndex];

  /* ─── SHOWCASE (main page) ─────────────────────────────────── */
  if (step === "showcase") {
    return (
      <div className="min-h-screen bg-[#080810] text-white relative overflow-hidden">
        <DragonWatermark />

        {/* ── HERO ──────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Lightning bolt split bg */}
          <div className="absolute inset-0" style={{
            background: WREXHAM_RED,
            opacity: 0.12,
            clipPath: "polygon(0 0, 54% 0, 46% 10%, 55% 20%, 43% 35%, 52% 48%, 45% 62%, 56% 78%, 47% 90%, 50% 100%, 0 100%)",
          }} />
          <div className="absolute inset-0" style={{
            background: IPSWICH_BLUE,
            opacity: 0.1,
            clipPath: "polygon(54% 0, 100% 0, 100% 100%, 50% 100%, 47% 90%, 56% 78%, 45% 62%, 52% 48%, 43% 35%, 55% 20%, 46% 10%)",
          }} />
          {/* Hero bolt crack line */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M54,0 L46,10 L55,20 L43,35 L52,48 L45,62 L56,78 L47,90 L50,100" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Noise overlay */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, rgba(228,0,43,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(0,0,255,0.1) 0%, transparent 50%)"
          }} />

          <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-16 text-center">
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 mb-8">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Premium 360 Data</span>
            </div>

            {/* Main title */}
            <h1 className="font-display text-6xl font-extrabold uppercase leading-none tracking-tight md:text-8xl lg:text-9xl">
              <span style={{ color: WREXHAM_RED }}>Wrexham</span>
              <span className="text-white/30 mx-3 md:mx-6">5-3</span>
              <span style={{ color: IPSWICH_BLUE }}>Ipswich</span>
            </h1>

            <p className="mt-6 font-display text-lg font-semibold uppercase tracking-[0.3em] text-white/40 md:text-xl">
              Premium 360 Data — The Future of Sports Art
            </p>
            <p className="mt-2 text-sm text-white/25">EFL Championship — Racecourse Ground — 21 February 2026</p>

            {/* Stats bar with animated counters */}
            <div ref={statsRef} className="mt-12 inline-flex flex-wrap items-center justify-center gap-px rounded-xl overflow-hidden border border-white/10">
              {[
                { label: "Events", value: countEvents.toLocaleString() },
                { label: "Shots", value: countShots.toString() },
                { label: "Goals", value: countGoals.toString() },
                { label: "Data", value: "3D" },
              ].map((stat, i) => (
                <div key={stat.label} className="flex flex-col items-center px-6 py-4 md:px-10 bg-white/5" style={{
                  borderRight: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none"
                }}>
                  <span className="font-display text-2xl font-bold text-white md:text-3xl">{stat.value}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-1">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MATCH CARD — LIGHTNING BOLT SPLIT ──────────────── */}
        <section className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10">
            {/* Left team colour — lightning clip */}
            <div className="absolute inset-0" style={{
              background: WREXHAM_RED,
              opacity: 0.18,
              clipPath: "polygon(0 0, 52% 0, 48% 12%, 56% 22%, 44% 38%, 54% 52%, 46% 68%, 55% 82%, 48% 100%, 0 100%)",
            }} />
            {/* Right team colour — inverse clip */}
            <div className="absolute inset-0" style={{
              background: IPSWICH_BLUE,
              opacity: 0.18,
              clipPath: "polygon(52% 0, 100% 0, 100% 100%, 48% 100%, 55% 82%, 46% 68%, 54% 52%, 44% 38%, 56% 22%, 48% 12%)",
            }} />
            {/* Lightning crack SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[1]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <filter id="wrex-bolt-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M52,0 L48,12 L56,22 L44,38 L54,52 L46,68 L55,82 L48,100" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" filter="url(#wrex-bolt-glow)" className="transition-all duration-300 group-hover:[stroke:rgba(255,255,255,0.9)] group-hover:[stroke-width:1]" />
              <path d="M52,0 L48,12 L56,22 L44,38 L54,52 L46,68 L55,82 L48,100" fill="none" stroke="white" strokeWidth="0.3" vectorEffect="non-scaling-stroke" className="opacity-30 transition-opacity duration-300 group-hover:opacity-70" />
            </svg>
            {/* Spark particles */}
            <div className="absolute inset-0 pointer-events-none z-[2]">
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" style={{ top: "22%", left: "52%", boxShadow: "0 0 8px 3px rgba(255,255,255,0.3)" }} />
              <div className="absolute w-1 h-1 rounded-full bg-white/40 animate-pulse" style={{ top: "52%", left: "48%", animationDelay: "0.4s", boxShadow: "0 0 6px 2px rgba(255,255,255,0.25)" }} />
              <div className="absolute w-1.5 h-1.5 rounded-full bg-white/35 animate-pulse" style={{ top: "78%", left: "54%", animationDelay: "0.8s", boxShadow: "0 0 7px 3px rgba(255,255,255,0.2)" }} />
            </div>
            <div className="relative px-8 py-12 md:px-16 md:py-16">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Wrexham side */}
                <div className="flex-1 text-center md:text-right">
                  <div className="inline-flex items-center gap-3 mb-4 md:flex-row-reverse">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center font-display text-xl font-bold text-white" style={{ backgroundColor: WREXHAM_RED }}>W</div>
                    <div className="md:text-right">
                      <h3 className="font-display text-2xl font-bold uppercase">Wrexham</h3>
                      <p className="text-xs text-white/40">Home</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-4">
                    {wrexhamGoals.map(g => (
                      <p key={g.index} className="text-sm text-white/60">
                        <span className="text-white/80 font-medium">{g.player}</span>
                        <span className="text-red-400/80 ml-2">{g.minute}&apos;</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-center">
                  <div className="font-display text-8xl font-extrabold leading-none md:text-9xl">
                    <span style={{ color: WREXHAM_RED }}>{homeScore}</span>
                    <span className="text-white/15 mx-2">-</span>
                    <span style={{ color: IPSWICH_BLUE }}>{awayScore}</span>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/20 mt-3">Full Time</p>
                </div>

                {/* Ipswich side */}
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-lg flex items-center justify-center font-display text-xl font-bold text-white" style={{ backgroundColor: IPSWICH_BLUE }}>I</div>
                    <div>
                      <h3 className="font-display text-2xl font-bold uppercase">Ipswich</h3>
                      <p className="text-xs text-white/40">Away</p>
                    </div>
                  </div>
                  <div className="space-y-1 mt-4">
                    {ipswichGoals.map(g => (
                      <p key={g.index} className="text-sm text-white/60">
                        <span className="text-white/80 font-medium">{g.player}</span>
                        <span className="text-blue-400/80 ml-2">{g.minute}&apos;</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── THE 360 DIFFERENCE ─────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 mb-6">
              <Zap className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-red-300">The Difference</span>
            </div>
            <h2 className="font-display text-4xl font-extrabold uppercase md:text-6xl">See The Difference</h2>
            <p className="mt-4 text-white/40 max-w-2xl mx-auto">
              Standard event data gives you x and y — where on the pitch. 360 Premium adds z — ball height.
              That means dramatic arcs, dipping volleys, headers looping over keepers. The data that makes art <em>move</em>.
            </p>
          </div>
          <ComparisonVisual />
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { title: "Height = Drama", desc: "A 3.9m ball height means top corner. A 0.3m means low driven. The z-axis tells the story." },
              { title: "True Trajectory", desc: "Not a flat line between two points — the actual curved path the ball takes through 3D space." },
              { title: "Better Art", desc: "More data dimensions = richer generative artwork. Arcs, swoops, and curves that flat data can't produce." },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <h4 className="font-display text-sm font-bold uppercase tracking-wider text-red-300 mb-2">{item.title}</h4>
                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── GOAL GALLERY ───────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-extrabold uppercase md:text-6xl">8 Goals</h2>
            <p className="mt-4 text-white/40">Each with full 3D trajectory data. Pick a moment. Generate art.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {goals.map((goal) => {
              const isWrexham = goal.teamId === WREXHAM_ID;
              const teamColor = isWrexham ? WREXHAM_RED : IPSWICH_BLUE;
              const heightLabel = goal.endZ > 2.5 ? "Top corner!" : goal.endZ > 1.5 ? "Aerial" : goal.endZ > 0.5 ? "Mid-height" : "Low driven";
              return (
                <div key={goal.index} className="group relative rounded-xl border border-white/10 overflow-hidden transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5">
                  {/* Team colour top accent */}
                  <div className="h-1" style={{ backgroundColor: teamColor }} />
                  <div className="p-5 bg-white/[0.02]">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-display text-lg font-bold">{goal.player}</p>
                        <p className="text-xs text-white/40">{isWrexham ? "Wrexham" : "Ipswich"}</p>
                      </div>
                      <span className="font-display text-2xl font-extrabold" style={{ color: teamColor }}>{goal.minute}&apos;</span>
                    </div>

                    {/* Trajectory arc preview */}
                    <div className="my-3 rounded-lg bg-black/30 p-2">
                      <TrajectoryArc endZ={goal.endZ} teamColor={teamColor} />
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-[11px] text-white/40 mb-4">
                      <span>Height: <span className="text-white/70 font-medium">{goal.endZ.toFixed(2)}m</span></span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: `${teamColor}20`, color: teamColor }}>{heightLabel}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-white/30 mb-4">
                      <span>xG: {goal.xg.toFixed(2)}</span>
                      {goal.hasFreezeFrame && <span className="text-cyan-400/60">Freeze Frame</span>}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleSelectGoal(goal.index)}
                      className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110"
                      style={{ backgroundColor: `${teamColor}CC` }}
                    >
                      Generate Art
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {goals.length === 0 && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-white/30 mr-3" />
              <span className="text-white/30">Loading goals...</span>
            </div>
          )}
        </section>

        {/* ── CREATIVE MERCH IDEAS ───────────────────────────── */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">New Products</span>
            </div>
            <h2 className="font-display text-4xl font-extrabold uppercase md:text-5xl">
              Beyond Hoodies
            </h2>
            <p className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-white/30 mt-2">
              360 Data Unlocks New Products
            </p>
            <p className="mt-4 text-white/40 max-w-2xl mx-auto">
              With 3D trajectory data, the ball&apos;s path becomes a physical shape. A curve you can hold, wear, or display.
              These aren&apos;t just prints — they&apos;re data made tangible.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MERCH_IDEAS.map((item) => (
              <div key={item.title} className="group relative rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5">
                {/* Mockup illustration */}
                <div className="bg-black/40 border-b border-white/5 py-4 px-6">
                  <MerchMockup shape={item.shape} />
                </div>
                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">{item.title}</h3>
                    <span className="flex-shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">Coming Soon</span>
                  </div>
                  <p className="text-sm text-white/35 leading-relaxed mb-4">{item.desc}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/50">
                      from <span className="font-display text-lg font-bold text-white">&pound;{item.price}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER CTA ────────────────────────────────────── */}
        <section className="relative mx-auto max-w-7xl px-6 py-20">
          <div className="relative overflow-hidden rounded-2xl border border-red-500/20 text-center" style={{
            background: `linear-gradient(135deg, ${WREXHAM_RED}15 0%, rgba(10,10,10,0.95) 50%, ${IPSWICH_BLUE}10 100%)`
          }}>
            <div className="relative px-8 py-16">
              <h2 className="font-display text-3xl font-extrabold uppercase md:text-5xl">
                The Future of Sports Art
              </h2>
              <p className="mt-4 text-white/40 max-w-xl mx-auto">
                360 Premium data transforms every goal into a three-dimensional moment.
                Not just where — but how. Height, arc, trajectory. Data you can feel.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300">2,282 Events</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/50">3D Ball Height</span>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">Premium Tier</span>
              </div>
            </div>
          </div>
        </section>

        {/* Error toast */}
        {error && (
          <div className="fixed top-4 right-4 max-w-md rounded-lg border border-red-400 bg-red-900 p-4 text-white shadow-lg z-50">
            <p className="font-bold">Error</p>
            <p className="mt-1 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 rounded bg-red-700 px-3 py-1 text-xs">Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  /* ─── GENERATING STATE ─────────────────────────────────────── */
  if (step === "generate") {
    return (
      <div className="min-h-screen bg-[#080810] text-white flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-red-400" />
        <p className="mt-4 text-xl font-semibold">Generating 360° artwork...</p>
        {selectedGoal && (
          <p className="text-white/40 mt-2">{selectedGoal.player} {selectedGoal.minute}&apos; — 3D ball height active</p>
        )}
      </div>
    );
  }

  /* ─── CUSTOMIZE STATE ──────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <button onClick={() => setStep("showcase")} className="rounded-lg border border-white/10 p-2 text-white/50 hover:bg-white/5 hover:text-white transition">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-lg font-bold uppercase">360° Art Studio</h1>
            {selectedGoal && (
              <p className="text-xs text-white/40">{selectedGoal.player} {selectedGoal.minute}&apos; — {selectedGoal.team}</p>
            )}
          </div>
          <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs text-red-300">360 DATA</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-display text-xl font-semibold text-red-300">360° Artwork</h2>
                {selectedGoal && (
                  <p className="text-sm text-white/40">
                    {selectedGoal.player} {selectedGoal.minute}&apos; — xG: {selectedGoal.xg.toFixed(2)} — Height: {selectedGoal.endZ.toFixed(1)}m
                  </p>
                )}
              </div>
            </div>
            <div className="relative rounded-lg border border-white/10 overflow-hidden">
              {generating && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-red-400" />
                </div>
              )}
              {moment && <img src={moment.imageUrl} alt="Wrexham 360 artwork" className="w-full" />}
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-2">
            <div>
              <h3 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-wider">Style</h3>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button key={s.id} onClick={() => setStyle(s.id)}
                    className={`rounded px-2 py-2 text-left text-xs transition ${style === s.id ? "border border-red-400 bg-red-400/10 text-red-300" : "border border-white/10 bg-white/5 text-white hover:border-white/20"}`}>
                    <div className="font-medium">{s.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => setInvertColors(!invertColors)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${invertColors ? "border-amber-400 bg-amber-400/10 text-amber-300" : "border-white/10 text-white/60"}`}>
                Invert
              </button>
              <button onClick={() => setShowMarkers(!showMarkers)}
                className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition ${showMarkers ? "border-teal-400 bg-teal-400/10 text-teal-300" : "border-white/10 text-white/60"}`}>
                Markers
              </button>
              <button onClick={() => setSeed(Math.floor(Math.random() * 10000))}
                className="rounded-lg border border-white/10 px-2 py-1.5 text-xs text-white/60 hover:bg-white/5 transition">Randomise</button>
            </div>

            {[
              { label: "Background Detail", value: bgDetail, set: setBgDetail },
              { label: "Data Line Detail", value: dataDetail, set: setDataDetail },
              { label: "Bloom", value: bloom, set: setBloom },
              { label: "Intensity", value: intensity, set: setIntensity },
              { label: "Data Fill", value: dataScale, set: setDataScale },
              { label: "Edge Visibility", value: edgeVisibility, set: setEdgeVisibility },
              { label: "Secondary Accent", value: secondaryAccent, set: setSecondaryAccent },
              { label: "Buildup Depth", value: buildupDepth, set: setBuildupDepth },
              { label: "Marker Size", value: markerSize, set: setMarkerSize },
              { label: "Motif Scale", value: motifScale, set: setMotifScale },
              { label: "Pattern Repeat", value: repeatSize, set: setRepeatSize },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/40">{s.label}</span>
                  <span className="text-red-400 font-semibold">{s.value}</span>
                </div>
                <input type="range" min="0" max="100" value={s.value}
                  onChange={e => s.set(Number(e.target.value))}
                  className="w-full accent-red-500 h-1.5" />
              </div>
            ))}

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/40">Rotation</span>
                <span className="text-red-400 font-semibold">{rotation}°</span>
              </div>
              <input type="range" min="0" max="360" step="5" value={rotation}
                onChange={e => setRotation(Number(e.target.value))}
                className="w-full accent-red-500 h-1.5" />
            </div>

            <div className="space-y-2 sticky bottom-0 bg-gradient-to-t from-[#080810] via-[#080810] pt-4 pb-2">
              <button onClick={handleExport} disabled={generating}
                className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
                {generating ? "Rendering..." : "Download PNG"}
              </button>
              <button onClick={() => setStep("showcase")}
                className="w-full rounded-lg border border-white/10 px-4 py-2 text-sm text-white hover:bg-white/5 transition">
                <ChevronLeft className="inline mr-1 h-4 w-4" /> Back to Showcase
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 max-w-md rounded-lg border border-red-400 bg-red-900 p-4 text-white shadow-lg z-50">
          <p className="font-bold">Error</p>
          <p className="mt-1 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="mt-2 rounded bg-red-700 px-3 py-1 text-xs">Dismiss</button>
        </div>
      )}
    </div>
  );
}
