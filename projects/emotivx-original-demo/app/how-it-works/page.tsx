"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Shirt, Zap, TrendingUp, Package, ChevronRight } from "lucide-react";

/* ─── Animated pitch-to-product visual ─── */

type Stage = "pitch" | "dataline" | "artwork" | "merch";

const PASS_SEQUENCE = [
  { x: 40,  y: 175 },
  { x: 90,  y: 145 },
  { x: 60,  y: 110 },
  { x: 140, y: 90  },
  { x: 200, y: 105 },
  { x: 170, y: 65  },
  { x: 250, y: 75  },
  { x: 310, y: 55  },
  { x: 370, y: 70  },
];

function PitchStage({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      setProgress(Math.min((ts - start) / 2000, 1));
      if (ts - start < 2000) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [active]);

  const totalSegments = PASS_SEQUENCE.length - 1;
  const segProgress = progress * totalSegments;
  const segIndex = Math.min(Math.floor(segProgress), totalSegments - 1);
  const segFrac = segProgress - segIndex;
  const from = PASS_SEQUENCE[segIndex];
  const to = PASS_SEQUENCE[segIndex + 1] ?? PASS_SEQUENCE[segIndex];
  const ballX = from.x + (to.x - from.x) * segFrac;
  const ballY = from.y + (to.y - from.y) * segFrac;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#071407] border border-white/10 flex items-center justify-center">
      <svg viewBox="0 0 400 225" className="w-full h-full" fill="none">
        {/* Pitch */}
        <rect x="10" y="10" width="380" height="205" rx="3" stroke="#1a4a1a" strokeWidth="1" />
        <line x1="200" y1="10" x2="200" y2="215" stroke="#1a4a1a" strokeWidth="0.5" />
        <circle cx="200" cy="112" r="30" stroke="#1a4a1a" strokeWidth="0.5" fill="none" />
        <rect x="10" y="70" width="50" height="85" stroke="#1a4a1a" strokeWidth="0.5" fill="none" />
        <rect x="340" y="70" width="50" height="85" stroke="#1a4a1a" strokeWidth="0.5" fill="none" />

        {/* Pass lines between players */}
        {PASS_SEQUENCE.map((pt, i) => {
          if (i === 0) return null;
          const prev = PASS_SEQUENCE[i - 1];
          const lineProgress = progress * totalSegments;
          const opacity = lineProgress >= i ? 0.5 : lineProgress >= i - 1 ? (lineProgress - (i - 1)) * 0.5 : 0;
          return (
            <line key={`line-${i}`} x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y}
              stroke="#8AE234" strokeWidth="1.5" strokeDasharray="4 3" opacity={opacity} />
          );
        })}

        {/* Players at pass waypoints */}
        {PASS_SEQUENCE.map((pt, i) => (
          <circle key={`player-${i}`} cx={pt.x} cy={pt.y} r={5}
            fill={i % 2 === 0 ? "#8AE234" : "#3B82F6"} opacity="0.7" />
        ))}

        {/* Ball */}
        {active && progress > 0 && (
          <circle cx={ballX} cy={ballY} r="5" fill="white" />
        )}

        {/* Goal flash */}
        {progress > 0.92 && (
          <text x="340" y="55" fill="white" fontSize="18" fontWeight="bold" fontFamily="monospace">GOAL!</text>
        )}

        <text x="10" y="222" fill="#1a4a1a" fontSize="8" fontFamily="monospace">RACECOURSE GROUND · WREXHAM AFC</text>
      </svg>
    </div>
  );
}

function DataLineStage({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setProgress(0); return; }
    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      setProgress(Math.min((ts - start) / 1800, 1));
      if (ts - start < 1800) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [active]);

  const pathLen = 420;
  const drawn = progress * pathLen;

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#080810] border border-white/10 flex items-center justify-center">
      <svg viewBox="0 0 400 225" className="w-full h-full" fill="none">
        {/* Grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#111" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="400" height="225" fill="url(#grid)" />

        {/* Glow */}
        {active && <path d="M20 190 C70 170, 110 100, 155 115 S215 65, 260 80 S325 42, 385 58" stroke="#8AE234" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${drawn} ${pathLen}`} opacity="0.08" />}

        {/* Main line */}
        {active && <path d="M20 190 C70 170, 110 100, 155 115 S215 65, 260 80 S325 42, 385 58" stroke="#8AE234" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${drawn} ${pathLen}`} />}

        {/* Waypoints */}
        {progress > 0.2 && <circle cx="155" cy="115" r="4" fill="#8AE234" />}
        {progress > 0.55 && <circle cx="260" cy="80" r="4" fill="#8AE234" />}
        {progress > 0.9 && <>
          <circle cx="385" cy="58" r="6" fill="white" />
          <circle cx="385" cy="58" r="14" stroke="#8AE234" strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="385" cy="58" r="24" stroke="#8AE234" strokeWidth="1" fill="none" opacity="0.2" />
        </>}

        {/* Data labels */}
        {progress > 0.3 && <text x="130" y="132" fill="#555" fontSize="7" fontFamily="monospace">PASS</text>}
        {progress > 0.6 && <text x="235" y="97" fill="#555" fontSize="7" fontFamily="monospace">SHOT</text>}
        {progress > 0.92 && <text x="355" y="45" fill="white" fontSize="10" fontFamily="monospace" fontWeight="bold">GOAL</text>}

        <text x="10" y="220" fill="#333" fontSize="7" fontFamily="monospace">MULLIN · 11' · xG 0.88 · EMOTIVX DATA LINE™</text>
      </svg>
    </div>
  );
}

function ArtworkStage({ active }: { active: boolean }) {
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    if (!active) { setReveal(0); return; }
    let start: number | null = null;
    function tick(ts: number) {
      if (!start) start = ts;
      setReveal(Math.min((ts - start) / 1500, 1));
      if (ts - start < 1500) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [active]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#080810] border border-white/10">
      {/* Base — data line art representation */}
      <svg viewBox="0 0 400 225" className="absolute inset-0 w-full h-full" fill="none">
        <rect width="400" height="225" fill="#080810" />

        {/* Texture layers appearing */}
        {reveal > 0.1 && (
          <path d="M20 190 C70 170, 110 100, 155 115 S215 65, 260 80 S325 42, 385 58"
            stroke="#8AE234" strokeWidth="60" strokeLinecap="round" opacity={Math.min(reveal * 0.15, 0.12)} />
        )}
        {reveal > 0.2 && (
          <path d="M20 190 C70 170, 110 100, 155 115 S215 65, 260 80 S325 42, 385 58"
            stroke="#C9A84C" strokeWidth="30" strokeLinecap="round" opacity={Math.min(reveal * 0.12, 0.1)} />
        )}
        {/* Main line */}
        <path d="M20 190 C70 170, 110 100, 155 115 S215 65, 260 80 S325 42, 385 58"
          stroke="#8AE234" strokeWidth="3" strokeLinecap="round" opacity={reveal} />

        {/* Data points on the line */}
        {reveal > 0.3 && (
          <>
            {[
              { cx: 20, cy: 190 },
              { cx: 85, cy: 150 },
              { cx: 155, cy: 115 },
              { cx: 210, cy: 90 },
              { cx: 260, cy: 80 },
              { cx: 320, cy: 65 },
              { cx: 385, cy: 58 },
            ].map((pt, i) => (
              <circle key={i} cx={pt.cx} cy={pt.cy} r={2} fill="#8AE234" opacity={reveal * 0.7} />
            ))}
          </>
        )}

        {/* Typography */}
        {reveal > 0.7 && (
          <>
            <text x="15" y="30" fill="white" fontSize="22" fontFamily="var(--font-display)" fontWeight="900" opacity={reveal}>MULLIN</text>
            <text x="15" y="50" fill="#8AE234" fontSize="11" fontFamily="monospace" opacity={reveal}>11' · xG 0.88 · WREXHAM AFC · 2024/25</text>
          </>
        )}

        {/* Rarity badge */}
        {reveal > 0.85 && (
          <g>
            <rect x="297" y="18" width="100" height="13" rx="3" fill="#C9A84C" opacity={reveal} />
            <text x="300" y="28" fill="black" fontSize="9" fontFamily="monospace" fontWeight="bold" opacity={reveal}>LEGENDARY #3/5</text>
          </g>
        )}

        <text x="10" y="220" fill="#333" fontSize="7" fontFamily="monospace">ARTWORK GENERATED BY EMOTIVX AI ENGINE</text>
      </svg>
    </div>
  );
}

function MerchStage({ active }: { active: boolean }) {
  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-[#111111] border border-white/10 flex items-center justify-center">
      <div className={`text-center transition-all duration-700 ${active ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
        <div className="mb-4 w-28 h-28 mx-auto rounded-xl overflow-hidden"><img src="/hoodie-allover-red.jpg" alt="Hoodie" className="w-full h-full object-cover" /></div>
        <p className="font-display text-2xl font-extrabold uppercase text-white">Hoodie</p>
        <p className="text-sm text-[#888888] mt-1">All-over print · Numbered edition</p>
        <div className="mt-4 flex gap-2 justify-center">
          <span className="rounded-full bg-[#C9A84C]/20 border border-[#C9A84C]/30 px-3 py-1 text-xs font-bold text-[#C9A84C]">Legendary #3/5</span>
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-[#888888]">£1,580</span>
        </div>
        <div className="mt-3 text-xs text-[#555555]">+ Digital Avatar Twin included</div>
        <Link href="/merch-preview?team=wrexham" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#8AE234] px-5 py-2.5 text-sm font-bold text-[#080810] hover:bg-[#8AE234]/90 transition">
          Preview It <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

const STAGES: { id: Stage; label: string; icon: typeof Zap; desc: string; color: string }[] = [
  { id: "pitch", label: "The Goal", icon: Zap, desc: "Paul Mullin scores in the 11th minute. xG 0.88. The moment is captured.", color: "#8AE234" },
  { id: "dataline", label: "Data Line", icon: TrendingUp, desc: "Ball trajectory extracted from match data. The signature EmotivX Data Line™ is born.", color: "#3B82F6" },
  { id: "artwork", label: "Artwork", icon: Package, desc: "AI renders the Data Line into unique artwork in Wrexham's colours. Rarity tier assigned.", color: "#8B5CF6" },
  { id: "merch", label: "Merch", icon: Shirt, desc: "Fan orders the Legendary edition. Printed on demand. Ships worldwide. Paired digital twin created.", color: "#10B981" },
];

export default function HowItWorksPage() {
  const [currentStage, setCurrentStage] = useState<Stage>("pitch");
  const [auto, setAuto] = useState(true);

  const stageOrder: Stage[] = ["pitch", "dataline", "artwork", "merch"];
  const currentIdx = stageOrder.indexOf(currentStage);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      setCurrentStage(prev => {
        const idx = stageOrder.indexOf(prev);
        return stageOrder[(idx + 1) % stageOrder.length];
      });
    }, 3500);
    return () => clearInterval(id);
  }, [auto]);

  const stage = STAGES.find(s => s.id === currentStage)!;

  return (
    <div className="min-h-screen bg-[#080810] px-4 py-12">
      <div className="mx-auto max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8AE234] mb-3">The Process</p>
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold uppercase text-white mb-4">
            Goal to garment.<br /><span className="text-[#555]">Watch it happen.</span>
          </h1>
          <p className="text-[#888888] max-w-lg mx-auto">
            Every EmotivX piece starts with a real moment. Here's the journey from the pitch to your door.
          </p>
        </div>

        {/* Stage tabs */}
        <div className="flex justify-center gap-1 mb-6 bg-[#111111] rounded-xl p-1 border border-white/5">
          {STAGES.map((s, i) => {
            const Icon = s.icon;
            const active = currentStage === s.id;
            const done = stageOrder.indexOf(currentStage) > i;
            return (
              <button
                key={s.id}
                onClick={() => { setCurrentStage(s.id); setAuto(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${active ? "bg-[#080810] text-white border border-white/10" : "text-[#555555] hover:text-white"}`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: active ? s.color : undefined }} />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Main visual */}
        <div className="mb-6">
          {currentStage === "pitch" && <PitchStage active={true} />}
          {currentStage === "dataline" && <DataLineStage active={true} />}
          {currentStage === "artwork" && <ArtworkStage active={true} />}
          {currentStage === "merch" && <MerchStage active={true} />}
        </div>

        {/* Stage info */}
        <div className="rounded-xl border border-white/5 bg-[#111111] p-5 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-display text-3xl font-bold opacity-20" style={{ color: stage.color }}>0{currentIdx + 1}</span>
            <div>
              <p className="text-lg font-bold text-white">{stage.label}</p>
              <p className="text-sm text-[#888888]">{stage.desc}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {stageOrder.map((s, i) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${i <= currentIdx ? "" : "bg-white/5"}`}
                style={i <= currentIdx ? { background: stage.color } : {}} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setCurrentStage(stageOrder[Math.max(0, currentIdx - 1)]); setAuto(false); }}
            disabled={currentIdx === 0}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#888888] hover:text-white transition disabled:opacity-30"
          >
            ← Previous
          </button>
          <button
            onClick={() => setAuto(a => !a)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${auto ? "bg-white/5 text-white" : "border border-white/10 text-[#888888]"}`}
          >
            {auto ? "⏸ Pause" : "▶ Auto-play"}
          </button>
          {currentIdx < stageOrder.length - 1 ? (
            <button
              onClick={() => { setCurrentStage(stageOrder[currentIdx + 1]); setAuto(false); }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#888888] hover:text-white transition"
            >
              Next →
            </button>
          ) : (
            <Link href="/merch-preview?team=wrexham" className="flex items-center gap-1.5 rounded-full bg-[#8AE234] px-4 py-2 text-sm font-bold text-[#080810] hover:bg-[#8AE234]/90 transition">
              Shop Now <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
