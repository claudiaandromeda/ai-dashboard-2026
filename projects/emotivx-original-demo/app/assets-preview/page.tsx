"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, Layers } from "lucide-react";

const TEXTURES = [
  { file: "001-dramatic-electric-lightning-storm-with-v.png", name: "Lightning Storm", category: "Lightning", style: "dramatic" },
  { file: "001-electric-lightning-with-very-prominent-b.png", name: "Electric Lightning", category: "Lightning", style: "intense" },
  { file: "001-intense-dramatic-flames-emanating-radial.png", name: "Radial Flames", category: "Fire", style: "dramatic" },
  { file: "001-intense-jackson-pollock-style-abstract-e.png", name: "Pollock Intense", category: "Abstract", style: "intense" },
  { file: "001-intense-neon-laser-beam-on-pure-black-ba.png", name: "Neon Laser Intense", category: "Laser", style: "intense" },
  { file: "001-intense-spray-paint-explosion-on-pure-bl.png", name: "Spray Explosion", category: "Spray", style: "intense" },
  { file: "001-jackson-pollock-style-abstract-expressio.png", name: "Pollock Classic", category: "Abstract", style: "classic" },
  { file: "001-medium-electric-lightning-with-prominent.png", name: "Lightning Medium", category: "Lightning", style: "medium" },
  { file: "001-medium-flames-emanating-radially-in-all-.png", name: "Radial Flames Medium", category: "Fire", style: "medium" },
  { file: "001-medium-jackson-pollock-style-abstract-ex.png", name: "Pollock Medium", category: "Abstract", style: "medium" },
  { file: "001-neon-laser-beam-glow-on-pure-black-backg.png", name: "Neon Laser Glow", category: "Laser", style: "classic" },
  { file: "001-spray-paint-particles-on-pure-black-back.png", name: "Spray Particles", category: "Spray", style: "classic" },
  { file: "001-spray-paint-particles-scattered-on-pure-.png", name: "Spray Scattered", category: "Spray", style: "subtle" },
  { file: "001-subtle-flames-emanating-radially-in-all-.png", name: "Radial Flames Subtle", category: "Fire", style: "subtle" },
  { file: "001-subtle-neon-laser-beam-glow-on-pure-blac.png", name: "Neon Laser Subtle", category: "Laser", style: "subtle" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Lightning: "#F59E0B",
  Fire: "#EF4444",
  Abstract: "#8B5CF6",
  Laser: "#06B6D4",
  Spray: "#10B981",
};

const STYLE_BADGE: Record<string, string> = {
  dramatic: "bg-red-500/20 text-red-400",
  intense: "bg-orange-500/20 text-orange-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  classic: "bg-blue-500/20 text-blue-400",
  subtle: "bg-green-500/20 text-green-400",
};

const CATEGORIES = ["All", "Lightning", "Fire", "Abstract", "Laser", "Spray"];

export default function AssetsPreviewPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = TEXTURES.filter(
    (t) => activeCategory === "All" || t.category === activeCategory
  );

  return (
    <div className="min-h-screen bg-[#080810] pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-[#111111] to-[#080810] px-6 py-14 text-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#8AE234] blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8AE234]/30 bg-[#8AE234]/10 px-4 py-1.5 text-xs font-semibold text-[#8AE234] uppercase tracking-wider">
            <Layers className="h-3 w-3" />
            Work In Progress
          </div>
          <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide text-white sm:text-5xl">
            AI Texture Library
          </h1>
          <p className="mt-4 text-base text-[#888888]">
            15 generative textures produced for composite hoodie artwork. These will be layered with the EmotivX data lines to create the final all-over-print designs.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-[#555555]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#8AE234]" />15 textures generated</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#888888]" />5 categories</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#444444]" />Composite stage: pending</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Back link */}
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition">
          <ArrowLeft className="h-3 w-3" />
          Back to Home
        </Link>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={activeCategory === cat && cat !== "All" ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat], backgroundColor: `${CATEGORY_COLORS[cat]}15` } : {}}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition ${
                activeCategory === cat
                  ? "border-[#8AE234] bg-[#8AE234]/10 text-white"
                  : "border-white/10 text-[#888888] hover:border-white/30 hover:text-white"
              }`}
            >
              {cat} {cat === "All" ? `(${TEXTURES.length})` : `(${TEXTURES.filter((t) => t.category === cat).length})`}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((texture) => (
            <div
              key={texture.file}
              onClick={() => setLightbox(texture.file)}
              className="group cursor-pointer overflow-hidden rounded-xl border border-white/5 bg-[#111111] transition hover:border-white/20 hover:shadow-xl"
            >
              <div className="relative aspect-square overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/textures/${texture.file}`}
                  alt={texture.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium text-white">View full size</span>
                  <ExternalLink className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-white">{texture.name}</p>
                    <p className="mt-0.5 text-[10px] text-[#555555]" style={{ color: CATEGORY_COLORS[texture.category] }}>
                      {texture.category}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STYLE_BADGE[texture.style]}`}>
                    {texture.style}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Next Steps */}
        <div className="mt-12 rounded-2xl border border-white/5 bg-[#111111] p-8">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Next Steps — Composite Pipeline</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { step: "01", title: "Select Texture", desc: "Choose from the 15 AI-generated backgrounds based on moment intensity and team colours", status: "ready" },
              { step: "02", title: "Composite Data Line", desc: "Overlay the EmotivX goal data line SVG on top of the chosen texture at full-garment scale", status: "next" },
              { step: "03", title: "Hoodie Mockup", desc: "Apply composite to the garment template and send to Printful for production-ready print files", status: "pending" },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-white/5 bg-[#080810] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-2xl font-extrabold text-[#333333]">{item.step}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    item.status === "ready" ? "bg-green-500/20 text-green-400" :
                    item.status === "next" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-white/5 text-[#555555]"
                  }`}>
                    {item.status === "ready" ? "Ready" : item.status === "next" ? "Up Next" : "Pending"}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#666666]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/textures/${lightbox}`} alt="Texture" className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain" />
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
