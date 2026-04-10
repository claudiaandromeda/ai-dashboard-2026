"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sparkles, RefreshCw, Download, Zap, User, Palette, ChevronRight } from "lucide-react";

const WREXHAM_PLAYERS = [
  { id: 1, name: "Paul Mullin", number: 10, position: "Forward", avatar: null },
  { id: 2, name: "Sam Dalby", number: 11, position: "Forward", avatar: null },
  { id: 3, name: "Elliot Lee", number: 10, position: "Midfielder", avatar: null },
  { id: 4, name: "Ollie Palmer", number: 9, position: "Forward", avatar: null },
  { id: 5, name: "James McClean", number: 3, position: "Midfielder", avatar: null },
  { id: 6, name: "Anthony Forde", number: 20, position: "Midfielder", avatar: null },
  { id: 7, name: "Ben Foster", number: 1, position: "Goalkeeper", avatar: null },
  { id: 8, name: "Max Cleworth", number: 23, position: "Defender", avatar: null },
];

const STYLES = [
  { id: "data-art", label: "Data Art", desc: "Player silhouette built from match data points", icon: "⚡", color: "#BA0C2F" },
  { id: "illustrated", label: "Illustrated", desc: "Bold graphic illustration, team colours", icon: "🎨", color: "#8B5CF6" },
  { id: "geometric", label: "Geometric", desc: "Low-poly geometric portrait", icon: "◈", color: "#3B82F6" },
  { id: "glitch", label: "Glitch Art", desc: "Digital glitch aesthetic, neon accents", icon: "▒", color: "#10B981" },
];

const EDITIONS = [
  { id: "standard", label: "Standard", price: "Free with purchase", desc: "Included with every merch order" },
  { id: "rare", label: "Rare Avatar", price: "£15", desc: "Animated version, unlocks exclusive digital frame" },
  { id: "legendary", label: "Legendary Avatar", price: "£49", desc: "1-of-1 handcrafted, signed digital certificate" },
];

// Placeholder avatar generation — uses our existing artwork as a stand-in
const AVATAR_PREVIEWS: Record<string, string> = {
  "data-art": "/competitions/euro_2024/geometric/03_Spain_France.png",
  "illustrated": "/competitions/euro_2024/geometric/23_Netherlands_France.png",
  "geometric": "/competitions/euro_2024/geometric/06_Netherlands_Austria.png",
  "glitch": "/competitions/euro_2024/geometric/29_Italy_Albania.png",
};

export default function AvatarGeneratorPage() {
  const [selectedPlayer, setSelectedPlayer] = useState(WREXHAM_PLAYERS[0]);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedEdition, setSelectedEdition] = useState(EDITIONS[0]);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function handleGenerate() {
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2500);
  }

  return (
    <div className="min-h-screen bg-[#080810] px-4 py-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition mb-4">
            <ArrowLeft className="h-3 w-3" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#BA0C2F]/20 border border-[#BA0C2F]/30">
              <User className="h-6 w-6 text-[#BA0C2F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-extrabold uppercase text-white">Player Avatar Generator</h1>
                <span className="rounded bg-[#C9A84C]/20 px-2 py-0.5 text-[10px] font-bold text-[#C9A84C]">PHYGITAL</span>
              </div>
              <p className="text-sm text-[#888888]">Every merch purchase unlocks a paired digital avatar — own it physically and digitally</p>
            </div>
          </div>
        </div>

        {/* Phygital explainer */}
        <div className="mb-6 rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-[#C9A84C] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#C9A84C] mb-0.5">What is Phygital?</p>
            <p className="text-xs text-[#888888] leading-relaxed">
              Every EmotivX merch purchase creates a <strong className="text-white">physical + digital twin</strong>.
              Buy the Mullin 11' hoodie → you also receive a unique digital avatar of Mullin, built from that exact goal's data.
              The physical exists in your wardrobe. The digital exists on the blockchain. Both are yours.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* Left — configurator */}
          <div className="lg:col-span-2 space-y-5">

            {/* Step 1 — Player */}
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">
                <span className="text-[#BA0C2F] mr-2">01</span> Select Player
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WREXHAM_PLAYERS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPlayer(p); setGenerated(false); }}
                    className={`rounded-lg border p-3 text-left transition ${selectedPlayer.id === p.id ? "border-[#BA0C2F]/50 bg-[#BA0C2F]/5" : "border-white/5 hover:border-white/10"}`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#BA0C2F]/20 mb-2">
                      <span className="text-xs font-bold text-[#BA0C2F]">{p.number}</span>
                    </div>
                    <p className="text-xs font-bold text-white leading-tight">{p.name.split(" ")[1]}</p>
                    <p className="text-[10px] text-[#555555]">{p.position}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Style */}
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">
                <span className="text-[#BA0C2F] mr-2">02</span> Choose Style
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {STYLES.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStyle(s); setGenerated(false); }}
                    className={`rounded-lg border p-3 text-left transition ${selectedStyle.id === s.id ? "border-white/20 bg-white/5" : "border-white/5 hover:border-white/10"}`}
                    style={selectedStyle.id === s.id ? { borderColor: s.color + "50", background: s.color + "10" } : {}}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{s.icon}</span>
                      <p className="text-xs font-bold text-white">{s.label}</p>
                    </div>
                    <p className="text-[10px] text-[#555555]">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3 — Edition */}
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-3">
                <span className="text-[#BA0C2F] mr-2">03</span> Edition Type
              </p>
              <div className="space-y-2">
                {EDITIONS.map(e => (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEdition(e)}
                    className={`w-full rounded-lg border p-3 text-left transition flex items-center gap-3 ${selectedEdition.id === e.id ? "border-[#BA0C2F]/50 bg-[#BA0C2F]/5" : "border-white/5 hover:border-white/10"}`}
                  >
                    <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selectedEdition.id === e.id ? "border-[#BA0C2F]" : "border-[#333]"}`}>
                      {selectedEdition.id === e.id && <div className="h-2 w-2 rounded-full bg-[#BA0C2F]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white">{e.label}</p>
                        <p className="text-xs font-bold text-[#C9A84C]">{e.price}</p>
                      </div>
                      <p className="text-[10px] text-[#555555]">{e.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-xl bg-[#BA0C2F] py-4 text-sm font-bold text-white hover:bg-[#BA0C2F]/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generating ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Generating Avatar...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate {selectedStyle.label} Avatar</>
              )}
            </button>
          </div>

          {/* Right — preview */}
          <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-[#111111] p-5 flex flex-col">
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-4">Preview</p>

              {/* Avatar display */}
              <div className="rounded-xl bg-[#080810] border border-white/5 aspect-square flex items-center justify-center relative overflow-hidden mb-4">
                {generated ? (
                  <>
                    <Image
                      src={AVATAR_PREVIEWS[selectedStyle.id]}
                      alt="Generated avatar"
                      fill
                      className="object-cover"
                    />
                    {/* Overlay with player name */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <p className="font-display text-lg font-extrabold uppercase text-white">{selectedPlayer.name}</p>
                      <p className="text-[10px] text-[#888888]">Wrexham AFC · {selectedStyle.label} · {selectedEdition.label}</p>
                    </div>
                    {/* Edition badge */}
                    <div className="absolute top-3 right-3 rounded-full bg-[#BA0C2F] px-2.5 py-1 text-[10px] font-bold text-white">
                      {selectedEdition.label}
                    </div>
                  </>
                ) : generating ? (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    <RefreshCw className="h-8 w-8 text-[#BA0C2F] animate-spin" />
                    <p className="text-xs text-[#555555]">Rendering {selectedStyle.label} style...</p>
                    <p className="text-[10px] text-[#333]">Building from match data</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center p-6">
                    <div className="h-16 w-16 rounded-full border border-dashed border-white/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-[#222]" />
                    </div>
                    <p className="text-xs text-[#555555]">Select player + style,<br />then generate</p>
                  </div>
                )}
              </div>

              {/* Config summary */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-[#555555]">Player</span>
                  <span className="text-white font-semibold">{selectedPlayer.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-[#555555]">Style</span>
                  <span className="text-white font-semibold">{selectedStyle.label}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-[#555555]">Edition</span>
                  <span className="text-white font-semibold">{selectedEdition.label}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#555555]">Price</span>
                  <span className="font-bold text-[#C9A84C]">{selectedEdition.price}</span>
                </div>
              </div>

              {generated && (
                <div className="mt-4 flex gap-2">
                  <button className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-2 text-xs font-semibold text-white hover:bg-white/5 transition">
                    <Download className="h-3.5 w-3.5" /> Save
                  </button>
                  <Link
                    href="/merch-preview?team=wrexham"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#BA0C2F] py-2 text-xs font-bold text-white hover:bg-[#BA0C2F]/90 transition"
                  >
                    Add to Merch <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Phygital info */}
            <div className="rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4 space-y-2">
              <p className="text-xs font-bold text-[#C9A84C]">Your Digital Twin</p>
              <p className="text-[11px] text-[#888888] leading-relaxed">
                This avatar is permanently linked to your merch order. It lives in your EmotivX account,
                can be displayed in-game, used as a profile picture, or traded.
              </p>
              <Link href="/account" className="inline-flex items-center gap-1 text-[10px] text-[#C9A84C] hover:underline">
                View My Digital Assets <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
