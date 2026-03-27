"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  ArrowRight, Zap, Shirt, Shield, Users, TrendingUp,
  ChevronRight, Play, Star, Crown, Flame, Package
} from "lucide-react";
import { DEFAULT_TEXTURE_CONTROLS } from "@/components/merch/GarmentViewer3D";

const GarmentViewerWithFallback = dynamic(
  () => import("@/components/merch/GarmentViewerWithFallback"),
  { ssr: false }
);

/* ─── Live ticker data ─── */
const TICKER_ITEMS = [
  "🔴 MULLIN 11' vs Shrewsbury · Legendary Edition — SOLD OUT",
  "🔥 DALBY 18' vs Birmingham · Epic Edition — 3 remaining",
  "⚽ NEW DROP: Lee 55' vs Rotherham · All editions available now",
  "💥 MULLIN 78' vs Bolton · Rare Edition — SOLD OUT",
  "🎯 PALMER 44' vs Barnsley · Uncommon Edition — 47 remaining",
  "👑 MULLIN 9' vs Northampton · Legendary — 1 of 5 just claimed",
  "🔴 DALBY 67' vs Wrexham 2-1 Stockport · Common Edition live",
  "⚡ NEW: Forde 89' vs Peterborough · Generate your moment →",
];

/* ─── Stats ─── */
const PLATFORM_STATS = [
  { value: "2.4M", label: "Data points per match", sub: "every touch, every run" },
  { value: "£312k", label: "Revenue generated", sub: "Wrexham AFC — season to date" },
  { value: "805", label: "Editions sold", sub: "across 3 published moments" },
  { value: "24", label: "EFL clubs", sub: "ready to onboard" },
];

/* ─── Audiences ─── */
const AUDIENCES = [
  {
    icon: Users,
    title: "For Fans",
    color: "#BA0C2F",
    headline: "Own the moment. Wear the memory.",
    points: [
      "Real goal data turned into wearable art",
      "Every piece is a numbered edition — truly yours",
      "Hoodies, tees, prints, phone cases",
      "Ships worldwide, printed on demand",
    ],
    cta: "Browse Moments",
    href: "/merch-preview?team=wrexham",
  },
  {
    icon: Shield,
    title: "For Clubs",
    color: "#C9A84C",
    headline: "Your moments. Your IP. Your revenue.",
    points: [
      "Full control over your data and brand",
      "Set rarity tiers — Common to Legendary",
      "Real-time sales dashboard and calculator",
      "New revenue stream with zero upfront cost",
    ],
    cta: "Club Portal",
    href: "/staff/dashboard",
  },
  {
    icon: TrendingUp,
    title: "For Investors",
    color: "#8B5CF6",
    headline: "Sports IP meets digital commerce.",
    points: [
      "£11M+ per club per season at full sell-through",
      "Scalable across all 72 EFL clubs",
      "Proprietary data pipeline — no dependency on third parties",
      "CV tracking eliminates StatsBomb licensing costs",
    ],
    cta: "View Platform",
    href: "/admin",
  },
];

/* ─── Featured moments ─── */
const FEATURED_MOMENTS = [
  {
    player: "PAUL MULLIN",
    position: "Forward",
    minute: "11'",
    match: "Wrexham 4–0 Shrewsbury",
    xg: "0.88",
    rarity: "Legendary",
    rarityColor: "#F59E0B",
    rarityIcon: Crown,
    editions: "5 total · 4 sold",
    price: "£1,580",
  },
  {
    player: "SAM DALBY",
    position: "Forward",
    minute: "18'",
    match: "Wrexham 2–0 Birmingham",
    xg: "0.74",
    rarity: "Epic",
    rarityColor: "#8B5CF6",
    rarityIcon: Flame,
    editions: "25 total · 22 sold",
    price: "£395",
  },
  {
    player: "ELLIOT LEE",
    position: "Midfielder",
    minute: "55'",
    match: "Wrexham 3–0 Rotherham",
    xg: "0.33",
    rarity: "Rare",
    rarityColor: "#3B82F6",
    rarityIcon: Star,
    editions: "75 total · 61 sold",
    price: "£198",
  },
];

/* ─── Animated data line SVG ─── */
function AnimatedDataLine() {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let start: number | null = null;
    const duration = 2400;

    function step(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      setProgress(Math.min(elapsed / duration, 1));
      if (elapsed < duration) {
        animRef.current = requestAnimationFrame(step);
      } else {
        // Loop after pause
        setTimeout(() => {
          start = null;
          setProgress(0);
          animRef.current = requestAnimationFrame(step);
        }, 2000);
      }
    }

    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  const pathLength = 1300;
  const drawn = progress * pathLength;

  return (
    <svg viewBox="0 -15 600 240" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pitch markings */}
      <rect x="30" y="20" width="540" height="180" rx="3" stroke="#1a1a1a" strokeWidth="1.5" />
      <line x1="300" y1="20" x2="300" y2="200" stroke="#1a1a1a" strokeWidth="1" />
      <circle cx="300" cy="110" r="35" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <rect x="30" y="70" width="60" height="80" stroke="#1a1a1a" strokeWidth="1" fill="none" />
      <rect x="510" y="70" width="60" height="80" stroke="#1a1a1a" strokeWidth="1" fill="none" />

      {[14, 5, 2.5, 0.8].map((w, li) => (
        <path
          key={li}
          d="M222.4 66.6 C223.1 70.2, 227.1 84.7, 226.4 88.2 C225.7 91.8, 225.4 94.4, 218.3 87.9 C211.2 81.4, 197.1 56.2, 183.9 49.4 C170.8 42.6, 137.4 29.9, 139.4 47.1 C141.4 64.3, 179.7 140.8, 196.1 152.6 C212.5 164.4, 228.3 121.0, 237.9 118.2 C247.5 115.4, 251.7 126.9, 253.4 135.8 C255.1 144.8, 242.2 165.6, 248.0 171.9 C253.8 178.2, 250.6 188.4, 288.5 173.6 C326.4 158.8, 444.4 108.4, 475.5 83.2 C506.6 58.0, 465.0 26.9, 474.8 22.2 C484.6 17.5, 518.3 55.6, 534.2 55.2 C550.1 54.8, 564.0 7.6, 570.0 20.0 C576.0 32.4, 656.1 114.4, 570.0 129.7 C483.9 145.0, 133.0 115.7, 53.6 111.6 C-25.8 107.5, 84.3 102.0, 93.4 105.1 C102.5 108.2, 97.4 140.0, 108.3 130.1 C119.2 120.1, 146.1 61.5, 158.9 45.4 C171.7 29.3, 133.9 24.9, 185.2 33.3 C236.5 41.7, 411.6 83.2, 466.7 96.0 C521.8 108.8, 498.8 108.9, 516.0 110.0 C533.2 111.1, 561.0 104.0, 570.0 102.8"
          stroke={li === 3 ? "white" : "#BA0C2F"}
          strokeWidth={w}
          strokeLinecap="round"
          pathLength={pathLength}
          opacity={li === 0 ? 0.05 : li === 1 ? 0.14 : li === 2 ? 0.95 : 0.3 * progress}
          strokeDasharray={`${drawn} ${pathLength}`}
        />
      ))}

      {/* Waypoints — appear as path progresses */}
      {/* Direction-change waypoints — red dots appear as line passes */}
      {[
        { x: 226.4, y: 88.2,  pct: 0.05 },
        { x: 183.9, y: 49.4,  pct: 0.14 },
        { x: 196.1, y: 152.6, pct: 0.23 },
        { x: 253.4, y: 135.8, pct: 0.32 },
        { x: 288.5, y: 173.6, pct: 0.41 },
        { x: 474.8, y: 22.2,  pct: 0.50 },
        { x: 570.0, y: 20.0,  pct: 0.59 },
        { x: 53.6,  y: 111.6, pct: 0.68 },
        { x: 108.3, y: 130.1, pct: 0.77 },
        { x: 185.2, y: 33.3,  pct: 0.86 },
        { x: 516.0, y: 110.0, pct: 0.95 },
      ].map((pt, i) => (
        progress >= pt.pct ? (
          <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#BA0C2F" opacity="0.85" />
        ) : null
      ))}

      {/* GOAL — white dot + rings + text, only at the very end */}
      {progress >= 0.97 && (
        <g>
          <circle cx={570} cy={102.8} r="6" fill="white" />
          <circle cx={570} cy={102.8} r="13" stroke="white" strokeWidth="1.5" fill="none" opacity="0.4" />
          <circle cx={570} cy={102.8} r="22" stroke="#BA0C2F" strokeWidth="1" fill="none" opacity="0.2" />
          <text x={536} y={95} fill="white" fontSize="11" fontFamily="monospace" fontWeight="bold">GOAL</text>
        </g>
      )}

      {/* Labels */}
      {progress > 0.05 && (
        <text x="222" y="58" fill="#555" fontSize="9" fontFamily="monospace">WINDASS</text>
      )}

      <text x="30" y="215" fill="#333" fontSize="8" fontFamily="monospace">WREXHAM AFC vs SHEFF UTD · 80&apos; · LEAGUE ONE</text>
      <text x="430" y="215" fill="#333" fontSize="8" fontFamily="monospace">EMOTIVX DATA LINE™</text>
    </svg>
  );
}

/* ─── Ticker ─── */
function LiveTicker() {
  const [offset, setOffset] = useState(0);
  const itemWidth = 420;

  useEffect(() => {
    const id = setInterval(() => {
      setOffset(prev => (prev + 1) % (TICKER_ITEMS.length * itemWidth));
    }, 30);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden border-y border-white/5 bg-[#0D0D0D] py-2.5">
      <div
        className="flex gap-12 whitespace-nowrap text-xs font-medium text-[#888888]"
        style={{ transform: `translateX(-${offset}px)`, transition: "transform 0.03s linear" }}
      >
        {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
          <span key={i} className="shrink-0">{item}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function HomePage() {
  const [activeAudience, setActiveAudience] = useState(0);
  const [liveArtUrl, setLiveArtUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("emotivx_merch_art");
    if (stored) setLiveArtUrl(stored);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }}
        />
        {/* Red glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-[#BA0C2F] opacity-[0.06] blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div className="space-y-8">
              {/* Wrexham badge + pill */}
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10">
                  <Image
                    src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
                    alt="Wrexham AFC"
                    fill className="object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-full border border-[#BA0C2F]/30 bg-[#BA0C2F]/10 px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#BA0C2F] animate-pulse" />
                  <span className="text-xs font-semibold text-[#BA0C2F]">Wrexham AFC · Live</span>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h1 className="font-display text-6xl sm:text-7xl font-extrabold uppercase leading-none tracking-tight text-white">
                  Every goal<br />
                  <span className="text-[#BA0C2F]">becomes</span><br />
                  something<br />
                  <span className="italic text-[#555]">real.</span>
                </h1>
              </div>

              <p className="text-lg text-[#888888] leading-relaxed max-w-md">
                EmotivX transforms real match data into limited-edition merchandise.
                The goal happened. The data is permanent. Now it's yours to wear.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/merch-preview?team=wrexham"
                  className="flex items-center gap-2 rounded-xl bg-[#BA0C2F] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition"
                >
                  <Shirt className="h-4 w-4" />
                  Shop Wrexham Moments
                </Link>
                <Link
                  href="/staff/dashboard"
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/5 transition"
                >
                  <Shield className="h-4 w-4" />
                  Club Portal
                </Link>
              </div>

              {/* Mini stats */}
              <div className="flex gap-6 pt-2">
                {[
                  { v: "£312k", l: "Revenue this season" },
                  { v: "805", l: "Editions sold" },
                  { v: "3", l: "Goal moments live" },
                ].map(s => (
                  <div key={s.l}>
                    <p className="text-xl font-bold text-white">{s.v}</p>
                    <p className="text-[10px] text-[#555555]">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — animated data line */}
            <div className="rounded-2xl border border-white/5 bg-[#111111] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#BA0C2F] uppercase tracking-wider">Live Data Line</p>
                  <p className="text-xs text-[#555555]">Windass · 80&apos; · Wrexham 2–1 Sheff Utd · xG 0.75</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-[#10B981]/10 px-2.5 py-1 text-[10px] font-bold text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  LIVE
                </span>
              </div>
              <AnimatedDataLine />
              <div className="mt-4 flex items-center justify-between">
                <Link
                  href="/merch-preview?team=wrexham"
                  className="flex items-center gap-1.5 rounded-lg bg-[#BA0C2F]/10 px-3 py-2 text-xs font-semibold text-[#BA0C2F] hover:bg-[#BA0C2F]/20 transition"
                >
                  <Shirt className="h-3.5 w-3.5" />
                  Preview on Merch
                </Link>
                <div className="flex gap-2 text-[10px] text-[#555555]">
                  <span className="rounded bg-white/5 px-2 py-1">Legendary: 4/5 sold</span>
                  <span className="rounded bg-white/5 px-2 py-1">Epic: 22/25 sold</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ TICKER ═══ */}
      <LiveTicker />

      {/* ═══ PHYGITAL MOMENTS ═══ */}
      <section className="border-t border-white/5 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left — 3D hoodie viewer */}
            <div className="w-full h-[360px] sm:h-[480px] rounded-2xl overflow-hidden bg-black">
              <GarmentViewerWithFallback
                productType="hoodie"
                artworkUrl={liveArtUrl ?? "/textures-v2/001-neon-laser-beam-glow-on-pure-black-backg.png"}
                textureControls={DEFAULT_TEXTURE_CONTROLS}
                viewControls={{ zoom: 1.9, spinSpeed: 0.6 }}
                badgeData={{
                  scorerName: "WINDASS",
                  scorerNumber: 10,
                  minute: 80,
                  homeTeam: "Wrexham",
                  awayTeam: "Sheff Utd",
                  homeScore: 2,
                  awayScore: 1,
                  matchDate: "2024",
                }}
                playerName="WINDASS"
                playerNumber={10}
                showNameNumber={true}
                showLogo={true}
                logoUrl="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
                teamPrimaryColour="#BA0C2F"
                garmentColour="#BA0C2F"
                height={480}
              />
            </div>

            {/* Right — copy */}
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F]">
                Phygital Moment
              </p>
              <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase leading-tight text-white">
                FROM LIVE TO YOUR HANDS
              </h2>
              <p className="text-base text-[#888888] leading-relaxed max-w-md">
                The Windass goal — captured live and ready for you as limited edition
                merchandise. Every purchase is unique, and your digital receipt unlocks
                real world value: discounts, exclusive experiences, or one-of-a-kind gifts.
              </p>

              {/* Stat pills */}
              <div className="flex flex-wrap gap-2">
                {["WINDASS · 80'", "WREXHAM 2-1 SHEFF UTD"].map(
                  (chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-[#888888]"
                    >
                      {chip}
                    </span>
                  )
                )}
              </div>

              {/* CTA */}
              <Link
                href="/merch-preview"
                className="inline-flex items-center gap-2 rounded-xl bg-[#BA0C2F] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition"
              >
                <Shirt className="h-4 w-4" />
                View on Merch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOR EVERYONE ═══ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F] mb-3">The Platform</p>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-white">
            Built for everyone<br /><span className="text-[#555]">in football.</span>
          </h2>
        </div>

        {/* Audience tabs */}
        <div className="flex justify-center gap-2 mb-8">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                onClick={() => setActiveAudience(i)}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeAudience === i ? "text-white" : "text-[#555555] hover:text-white"
                }`}
                style={activeAudience === i ? { backgroundColor: a.color + "20", border: `1px solid ${a.color}40`, color: a.color } : { border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.title}
              </button>
            );
          })}
        </div>

        {/* Active audience panel */}
        {AUDIENCES.map((a, i) => {
          if (i !== activeAudience) return null;
          const Icon = a.icon;
          return (
            <div key={i} className="rounded-2xl border border-white/5 bg-[#111111] p-8">
              <div className="grid sm:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: a.color + "20" }}>
                      <Icon className="h-5 w-5" style={{ color: a.color }} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{a.headline}</h3>
                  </div>
                  <ul className="space-y-3">
                    {a.points.map((pt, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-[#888888]">
                        <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ backgroundColor: a.color + "20", color: a.color }}>✓</span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={a.href}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                {/* Right side visual */}
                <div className="rounded-xl border border-white/5 bg-[#0A0A0A] p-6 flex flex-col gap-3">
                  {i === 0 && (
                    <>
                      <p className="text-xs text-[#555555] uppercase tracking-wider">Featured Drop</p>
                      {FEATURED_MOMENTS.slice(0, 2).map((m, j) => {
                        const RIcon = m.rarityIcon;
                        return (
                          <div key={j} className="flex items-center gap-3 rounded-lg border border-white/5 p-3">
                            <RIcon className="h-4 w-4 shrink-0" style={{ color: m.rarityColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white">{m.player} · {m.minute}</p>
                              <p className="text-[10px] text-[#555555] truncate">{m.match}</p>
                            </div>
                            <span className="text-xs font-bold text-white">{m.price}</span>
                          </div>
                        );
                      })}
                    </>
                  )}
                  {i === 1 && (
                    <>
                      <p className="text-xs text-[#555555] uppercase tracking-wider">This Season</p>
                      {[
                        { l: "Moments published", v: "3" },
                        { l: "Total editions", v: "805" },
                        { l: "Revenue generated", v: "£312,450" },
                        { l: "Potential (season)", v: "£11.2M" },
                      ].map(s => (
                        <div key={s.l} className="flex justify-between text-sm">
                          <span className="text-[#555555]">{s.l}</span>
                          <span className="font-bold text-white">{s.v}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {i === 2 && (
                    <>
                      <p className="text-xs text-[#555555] uppercase tracking-wider">Market Opportunity</p>
                      {[
                        { l: "EFL clubs total", v: "72" },
                        { l: "Championship clubs", v: "24" },
                        { l: "Avg goals per season", v: "115 / club" },
                        { l: "Revenue per club (max)", v: "£11M+" },
                        { l: "Total addressable", v: "£1B+" },
                      ].map(s => (
                        <div key={s.l} className="flex justify-between text-sm">
                          <span className="text-[#555555]">{s.l}</span>
                          <span className="font-bold text-white">{s.v}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* ═══ FEATURED MOMENTS ═══ */}
      <section className="border-t border-white/5 bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F] mb-2">Wrexham AFC</p>
              <h2 className="font-display text-4xl font-extrabold uppercase text-white">Featured Moments</h2>
            </div>
            <Link href="/merch-preview?team=wrexham" className="flex items-center gap-1.5 text-sm text-[#888888] hover:text-white transition">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {FEATURED_MOMENTS.map((m, i) => {
              const RIcon = m.rarityIcon;
              return (
                <Link key={i} href="/merch-preview?team=wrexham" className="group rounded-2xl border border-white/5 bg-[#111111] p-5 hover:border-[#BA0C2F]/30 transition flex flex-col gap-4">
                  {/* Data line preview */}
                  <div className="rounded-xl bg-[#0A0A0A] p-4">
                    <svg viewBox="0 0 200 80" className="w-full" fill="none">
                      <path
                        d={i === 0
                          ? "M10 70 C22 62, 35 50, 48 44 C38 36, 22 30, 18 22 C30 14, 50 16, 64 24 C76 32, 85 46, 95 40 C105 34, 112 18, 126 14 C118 8, 104 10, 98 6 C112 2, 130 6, 144 14 C156 22, 162 36, 172 30 C180 24, 185 14, 192 10"
                          : i === 1
                          ? "M10 72 C18 64, 28 48, 42 42 C55 36, 68 44, 78 38 C88 32, 92 16, 108 12 C120 8, 130 18, 138 26 C128 32, 112 28, 106 36 C118 40, 136 38, 150 30 C162 22, 168 10, 180 6 C186 10, 190 16, 192 12"
                          : "M10 74 C20 66, 32 54, 44 60 C36 50, 24 40, 20 30 C32 22, 48 26, 60 34 C72 42, 80 56, 94 50 C106 44, 116 28, 130 22 C142 16, 152 26, 160 34 C150 40, 136 36, 130 44 C144 48, 162 44, 174 34 C182 26, 188 18, 192 14"}
                        stroke="#BA0C2F" strokeWidth="2" strokeLinecap="round" opacity="0.9"
                      />
                      <circle cx="192" cy={i === 0 ? 10 : i === 1 ? 12 : 14} r="4" fill="#fff" />
                      <circle cx="192" cy={i === 0 ? 10 : i === 1 ? 12 : 14} r="9" stroke="#BA0C2F" strokeWidth="1" fill="none" opacity="0.3" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <RIcon className="h-3.5 w-3.5" style={{ color: m.rarityColor }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: m.rarityColor }}>{m.rarity}</span>
                    </div>
                    <p className="text-lg font-bold text-white">{m.player}</p>
                    <p className="text-xs text-[#888888]">{m.match}</p>
                    <p className="text-xs text-[#555555] mt-0.5">{m.minute} · xG {m.xg}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <div>
                      <p className="text-xs text-[#555555]">{m.editions}</p>
                      <p className="text-lg font-bold text-white">{m.price}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-lg bg-[#BA0C2F]/10 px-3 py-1.5 text-xs font-semibold text-[#BA0C2F] group-hover:bg-[#BA0C2F]/20 transition">
                      Get It <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ PLATFORM STATS ═══ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {PLATFORM_STATS.map(s => (
            <div key={s.label} className="rounded-2xl border border-white/5 bg-[#111111] p-6 text-center">
              <p className="font-display text-4xl font-extrabold text-[#BA0C2F]">{s.value}</p>
              <p className="mt-2 text-sm font-semibold text-white">{s.label}</p>
              <p className="mt-1 text-[10px] text-[#555555]">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="border-t border-white/5 bg-[#0D0D0D]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F] mb-3">The Process</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-white">
              Goal to garment.<br /><span className="text-[#555]">In minutes.</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { n: "01", icon: Zap, title: "Goal Happens", desc: "Real match data captured — every pass, shot, and trajectory recorded by our CV system" },
              { n: "02", icon: TrendingUp, title: "Data Line Generated", desc: "The ball's exact path becomes a unique visual signature — your Data Line™" },
              { n: "03", icon: Package, title: "Art Created", desc: "AI renders the Data Line into team-coloured artwork across limited edition tiers" },
              { n: "04", icon: Shirt, title: "Merch Ships", desc: "Fans order their edition, printed on demand, shipped worldwide. Every piece numbered." },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative rounded-2xl border border-white/5 bg-[#111111] p-6">
                  {i < 3 && (
                    <div className="absolute top-9 -right-2 hidden sm:block z-10">
                      <ChevronRight className="h-4 w-4 text-[#333]" />
                    </div>
                  )}
                  <p className="font-display text-4xl font-extrabold text-[#BA0C2F]/20 mb-4">{step.n}</p>
                  <Icon className="h-6 w-6 text-[#BA0C2F] mb-3" />
                  <p className="text-sm font-bold text-white mb-2">{step.title}</p>
                  <p className="text-xs text-[#555555] leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══ CLUBS ═══ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F] mb-2">Clubs</p>
            <h2 className="font-display text-4xl font-extrabold uppercase text-white">
              Live now.<br /><span className="text-[#555]">EFL-wide coming soon.</span>
            </h2>
          </div>
          <Link href="/admin" className="flex items-center gap-1.5 text-sm text-[#888888] hover:text-white transition">
            View all clubs <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* Wrexham — live */}
          <Link href="/staff/dashboard" className="group rounded-2xl border border-[#BA0C2F]/30 bg-[#BA0C2F]/5 p-6 hover:border-[#BA0C2F]/50 transition">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative h-14 w-14">
                <Image src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png" alt="Wrexham" fill className="object-contain" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">Wrexham AFC</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span className="text-xs text-[#10B981] font-semibold">Live · Earning</span>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-[#555555]">Moments live</span><span className="text-white font-bold">3</span></div>
              <div className="flex justify-between"><span className="text-[#555555]">Revenue</span><span className="font-bold" style={{ color: "#C9A84C" }}>£312,450</span></div>
              <div className="flex justify-between"><span className="text-[#555555]">Sell-through</span><span className="text-white font-bold">~94%</span></div>
            </div>
          </Link>

          {/* Pending cards */}
          {[
            { name: "Birmingham City", logo: "https://r2.thesportsdb.com/images/media/team/badge/uxyqys1424033798.png", color: "#4444FF" },
            { name: "Stockport County", logo: "https://r2.thesportsdb.com/images/media/team/badge/jcsz9k1594450753.png", color: "#0033A0" },
          ].map(club => (
            <div key={club.name} className="rounded-2xl border p-6 transition" style={{ borderColor: `${club.color}40`, background: `${club.color}08` }}>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative h-14 w-14">
                  <Image src={club.logo} alt={club.name} fill className="object-contain" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">{club.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                    <span className="text-xs text-[#F59E0B] font-semibold">Pending · In Talks</span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-[#555555]">Moments live</span><span className="text-[#333] font-bold">—</span></div>
                <div className="flex justify-between"><span className="text-[#555555]">Revenue</span><span className="text-[#333] font-bold">—</span></div>
                <div className="flex justify-between"><span className="text-[#555555]">Sell-through</span><span className="text-[#333] font-bold">—</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="border-t border-white/5 bg-[#0D0D0D]">
        <div className="mx-auto max-w-4xl px-4 py-24 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#BA0C2F] mb-4">Early Access</p>
          <h2 className="font-display text-5xl sm:text-6xl font-extrabold uppercase text-white mb-6">
            Your club.<br />Your moments.<br /><span className="text-[#BA0C2F]">Your revenue.</span>
          </h2>
          <p className="text-lg text-[#888888] mb-10 max-w-lg mx-auto">
            EmotivX is live with Wrexham AFC. We're onboarding EFL League One clubs now.
            Zero upfront cost. Revenue from day one.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/staff/dashboard"
              className="flex items-center gap-2 rounded-xl bg-[#BA0C2F] px-8 py-4 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition"
            >
              <Shield className="h-4 w-4" />
              Club Portal Demo
            </Link>
            <Link
              href="/merch-preview?team=wrexham"
              className="flex items-center gap-2 rounded-xl border border-white/10 px-8 py-4 text-sm font-semibold text-white hover:bg-white/5 transition"
            >
              <Shirt className="h-4 w-4" />
              Fan Experience
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
