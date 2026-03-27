/**
 * Your Moment — Public page for anyone to create their own moment
 *
 * Upload match footage → pick team colours → describe the key moment →
 * we scan ±3 minutes and generate the best data-driven artwork.
 */

"use client";

import { useState, useRef } from "react";
import {
  Upload,
  Palette,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Film,
  Shirt,
  X,
  Camera,
  Zap,
  Trophy,
  Star,
} from "lucide-react";
import Image from "next/image";

/* ── Colour presets (popular school/college colours) ─────────────── */
const COLOUR_PRESETS = [
  { name: "Red & White", primary: "#DA291C", secondary: "#FFFFFF" },
  { name: "Blue & Gold", primary: "#003DA5", secondary: "#FFD700" },
  { name: "Green & White", primary: "#006B3F", secondary: "#FFFFFF" },
  { name: "Black & Amber", primary: "#1A1A1A", secondary: "#FFB81C" },
  { name: "Navy & Sky", primary: "#0A1F44", secondary: "#87CEEB" },
  { name: "Maroon & Gold", primary: "#7A003C", secondary: "#CBA135" },
  { name: "Purple & White", primary: "#4B0082", secondary: "#FFFFFF" },
  { name: "Orange & Black", primary: "#FF6600", secondary: "#1A1A1A" },
];

export default function YourMomentPage() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [stripImage, setStripImage] = useState<File | null>(null);
  const [stripPreview, setStripPreview] = useState<string | null>(null);
  const [primaryColour, setPrimaryColour] = useState("#DA291C");
  const [secondaryColour, setSecondaryColour] = useState("#FFFFFF");
  const [colourMode, setColourMode] = useState<"picker" | "image">("picker");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventMinute, setEventMinute] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const videoRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLInputElement>(null);

  /* ── Handlers ───────────────────────────────────────────────────── */
  function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function handleStripUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStripImage(file);
    setStripPreview(URL.createObjectURL(file));
  }

  function handleGenerate() {
    setGenerating(true);
    // Simulate generation (in production this calls the art engine)
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 3000);
  }

  const canGenerate = videoFile && homeTeam && awayTeam && playerName && eventMinute;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-[#DA291C]/10 via-transparent to-[#DA291C]/5" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DA291C]/30 bg-[#DA291C]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#DA291C]">
            <Sparkles className="h-3.5 w-3.5" />
            Now Available for Everyone
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            Turn{" "}
            <span className="bg-gradient-to-r from-[#DA291C] to-[#ff6b6b] bg-clip-text text-transparent">
              Any Goal
            </span>{" "}
            Into Wearable Art
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-[#999]">
            Upload footage from any match — school, college, Sunday league, your kid&apos;s first goal —
            and we&apos;ll transform the real play data into a unique piece of art printed on premium merchandise.
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-[#666]">
            <span className="flex items-center gap-1.5">
              <Film className="h-4 w-4 text-[#DA291C]" /> Upload any footage
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#DA291C]" /> AI-powered analysis
            </span>
            <span className="flex items-center gap-1.5">
              <Shirt className="h-4 w-4 text-[#DA291C]" /> Premium merch
            </span>
          </div>
        </div>
      </section>

      {/* ── Main Form ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-6 py-12">
        <div className="space-y-8">

          {/* ── Step 1: Upload Footage ──────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DA291C] text-sm font-black">1</div>
              <div>
                <h2 className="text-lg font-bold">Upload Match Footage</h2>
                <p className="text-sm text-[#666]">
                  Phone footage, GoPro, anything — we&apos;ll extract the play data using computer vision
                </p>
                <p className="mt-1 text-xs text-[#DA291C]/70 italic">
                  For best results, upload a short clip of around 3–5 minutes with the key moment roughly in the middle.
                  The more of the pitch visible, the better our AI can track the action.
                </p>
              </div>
            </div>

            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              className="hidden"
            />

            {!videoPreview ? (
              <button
                onClick={() => videoRef.current?.click()}
                className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.01] px-6 py-12 transition hover:border-[#DA291C]/40 hover:bg-[#DA291C]/5"
              >
                <Upload className="h-8 w-8 text-[#555] transition group-hover:text-[#DA291C]" />
                <div className="text-left">
                  <p className="font-semibold text-[#888] group-hover:text-white">
                    Drop your match video here or click to browse
                  </p>
                  <p className="mt-1 text-xs text-[#555]">
                    MP4, MOV, AVI — any quality, any camera angle
                  </p>
                </div>
              </button>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-white/10">
                <video
                  src={videoPreview}
                  controls
                  className="w-full rounded-xl"
                  style={{ maxHeight: 300 }}
                />
                <button
                  onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                  className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 transition hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-green-400">
                  ✓ {videoFile?.name}
                </div>
              </div>
            )}
          </div>

          {/* ── Step 2: Team Details ───────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DA291C] text-sm font-black">2</div>
              <div>
                <h2 className="text-lg font-bold">Match &amp; Team Details</h2>
                <p className="text-sm text-[#666]">Tell us about the game</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  Home Team
                </label>
                <input
                  type="text"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  placeholder="e.g. Westfield Academy"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  Away Team
                </label>
                <input
                  type="text"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  placeholder="e.g. Riverside College"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                />
              </div>
            </div>
          </div>

          {/* ── Step 3: Team Colours ──────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DA291C] text-sm font-black">3</div>
              <div>
                <h2 className="text-lg font-bold">Team Colours</h2>
                <p className="text-sm text-[#666]">
                  Upload a photo of the strip or pick colours manually
                </p>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => setColourMode("picker")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  colourMode === "picker"
                    ? "bg-[#DA291C] text-white"
                    : "bg-white/5 text-[#888] hover:bg-white/10"
                }`}
              >
                <Palette className="h-4 w-4" /> Pick Colours
              </button>
              <button
                onClick={() => setColourMode("image")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  colourMode === "image"
                    ? "bg-[#DA291C] text-white"
                    : "bg-white/5 text-[#888] hover:bg-white/10"
                }`}
              >
                <Camera className="h-4 w-4" /> Upload Strip Photo
              </button>
            </div>

            {colourMode === "picker" ? (
              <div className="space-y-4">
                {/* Presets */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#666]">
                    Quick Pick
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {COLOUR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => { setPrimaryColour(p.primary); setSecondaryColour(p.secondary); }}
                        className={`group flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          primaryColour === p.primary && secondaryColour === p.secondary
                            ? "border-[#DA291C]/50 bg-[#DA291C]/10 text-white"
                            : "border-white/10 bg-white/5 text-[#888] hover:border-white/20"
                        }`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-white/20"
                          style={{ background: `linear-gradient(135deg, ${p.primary} 50%, ${p.secondary} 50%)` }}
                        />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom pickers */}
                <div className="flex gap-6">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                      Primary
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColour}
                        onChange={(e) => setPrimaryColour(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                      />
                      <span className="font-mono text-xs text-[#666]">{primaryColour}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                      Secondary
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColour}
                        onChange={(e) => setSecondaryColour(e.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
                      />
                      <span className="font-mono text-xs text-[#666]">{secondaryColour}</span>
                    </div>
                  </div>
                  {/* Live preview swatch */}
                  <div className="flex items-end">
                    <div
                      className="h-10 w-24 rounded-lg border border-white/10"
                      style={{ background: `linear-gradient(135deg, ${primaryColour} 50%, ${secondaryColour} 50%)` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={stripRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStripUpload}
                  className="hidden"
                />
                {!stripPreview ? (
                  <button
                    onClick={() => stripRef.current?.click()}
                    className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/[0.01] px-6 py-8 transition hover:border-[#DA291C]/40 hover:bg-[#DA291C]/5"
                  >
                    <Shirt className="h-6 w-6 text-[#555] transition group-hover:text-[#DA291C]" />
                    <div className="text-left">
                      <p className="font-semibold text-[#888] group-hover:text-white">
                        Upload a photo of the team strip
                      </p>
                      <p className="mt-1 text-xs text-[#555]">
                        We&apos;ll extract the exact colours automatically
                      </p>
                    </div>
                  </button>
                ) : (
                  <div className="relative inline-block">
                    <Image
                      src={stripPreview}
                      alt="Team strip"
                      width={200}
                      height={200}
                      className="rounded-xl border border-white/10 object-cover"
                      style={{ maxHeight: 200 }}
                    />
                    <button
                      onClick={() => { setStripImage(null); setStripPreview(null); }}
                      className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="mt-2 text-xs text-green-400">✓ Colours will be extracted automatically</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Step 4: The Moment ────────────────────────────── */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DA291C] text-sm font-black">4</div>
              <div>
                <h2 className="text-lg font-bold">Describe the Moment</h2>
                <p className="text-sm text-[#666]">
                  Tell us which player and when — we&apos;ll scan ±3 minutes either side
                  and pick the very best data line available
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  Player Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Jake Thompson"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  Shirt Number <span className="normal-case text-[#555]">(optional)</span>
                </label>
                <input
                  type="text"
                  value={playerNumber}
                  onChange={(e) => setPlayerNumber(e.target.value)}
                  placeholder="e.g. 9"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  Approximate Minute
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#555]" />
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={eventMinute}
                    onChange={(e) => setEventMinute(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#555]">min</span>
                </div>
                <p className="mt-1 text-[10px] text-[#555]">We&apos;ll scan from {eventMinute ? Math.max(0, parseInt(eventMinute) - 3) : "?"}&apos; to {eventMinute ? parseInt(eventMinute) + 3 : "?"}&apos;</p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[#888]">
                  What Happened?
                </label>
                <input
                  type="text"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="e.g. Winning goal from outside the box"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none transition focus:border-[#DA291C]/50 focus:ring-1 focus:ring-[#DA291C]/30"
                />
              </div>
            </div>
          </div>

          {/* ── Generate Button ───────────────────────────────── */}
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || generating}
              className={`group flex items-center gap-3 rounded-2xl px-10 py-4 text-lg font-black uppercase tracking-wider transition ${
                canGenerate && !generating
                  ? "bg-[#DA291C] text-white shadow-lg shadow-[#DA291C]/25 hover:bg-[#ff3333] hover:shadow-xl hover:shadow-[#DA291C]/30"
                  : "cursor-not-allowed bg-white/5 text-[#555]"
              }`}
            >
              {generating ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Analysing Footage...
                </>
              ) : generated ? (
                <>
                  <Trophy className="h-5 w-5" />
                  Create Another
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 transition group-hover:rotate-12" />
                  Generate My Moment
                  <ChevronRight className="h-5 w-5 transition group-hover:translate-x-1" />
                </>
              )}
            </button>
            {!canGenerate && !generating && !generated && (
              <p className="text-xs text-[#555]">
                Fill in the video, teams, player and minute to continue
              </p>
            )}
          </div>

          {/* ── Generated Result ──────────────────────────────── */}
          {generated && (
            <div className="rounded-2xl border border-[#DA291C]/30 bg-[#DA291C]/5 p-6 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#DA291C]/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#DA291C]">
                <Star className="h-3.5 w-3.5" /> Moment Generated
              </div>
              <h3 className="text-2xl font-black">
                {playerName}&apos;s {eventDescription || "Goal"} — {eventMinute}&apos;
              </h3>
              <p className="mt-1 text-sm text-[#888]">
                {homeTeam} vs {awayTeam}
              </p>
              <div className="mx-auto mt-6 max-w-md rounded-xl border border-white/10 bg-black/30 p-8">
                <div className="flex items-center justify-center gap-4">
                  <div
                    className="h-32 w-32 rounded-xl"
                    style={{ background: `linear-gradient(135deg, ${primaryColour}, ${secondaryColour})` }}
                  />
                  <div className="text-left">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#666]">Preview</p>
                    <p className="mt-1 text-sm text-[#999]">
                      Your unique data-driven artwork is ready.
                      Choose your merchandise and customise the design.
                    </p>
                    <button className="mt-3 flex items-center gap-2 rounded-lg bg-[#DA291C] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#ff3333]">
                      Customise &amp; Order <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── How It Works (mini) ───────────────────────────────── */}
      <section className="border-t border-white/5 bg-white/[0.01]">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h2 className="mb-8 text-center text-2xl font-black">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: <Film className="h-6 w-6" />, title: "Upload", desc: "Film the match on any device — phone, tablet, GoPro. Any angle, any quality." },
              { icon: <Zap className="h-6 w-6" />, title: "We Analyse", desc: "Our CV system tracks every player, pass and shot. We find the perfect moment in ±3 minutes of your timestamp." },
              { icon: <Shirt className="h-6 w-6" />, title: "Wear It", desc: "Your moment becomes data-driven art on hoodies, t-shirts, prints — truly one of a kind." },
            ].map((step, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#DA291C]/10 text-[#DA291C]">
                  {step.icon}
                </div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-1 text-xs text-[#888]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ──────────────────────────────────────── */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-6 py-10 text-center">
          <p className="text-sm text-[#666]">
            Join thousands of parents, coaches and players turning grassroots football into art.
          </p>
          <div className="mt-4 flex items-center justify-center gap-8 text-[#555]">
            <span className="text-lg font-black text-white">2,400+</span>
            <span className="text-xs">Moments Created</span>
            <span className="text-lg font-black text-white">180+</span>
            <span className="text-xs">Schools &amp; Clubs</span>
            <span className="text-lg font-black text-white">4.9★</span>
            <span className="text-xs">Parent Rating</span>
          </div>
        </div>
      </section>
    </div>
  );
}
