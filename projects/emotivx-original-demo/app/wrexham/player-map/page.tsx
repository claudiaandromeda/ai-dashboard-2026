"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Crosshair, Loader2 } from "lucide-react";

/* ── Art styles (same as merch preview) ────────────────────────────── */

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

/* ── Types ─────────────────────────────────────────────────────────── */

interface PlayerInfo {
  player_id: number;
  player_name: string;
  jersey: number;
  shots: number;
  goals: number;
}

interface PlayerMapResult {
  imageUrl: string;
  style: string;
  playerName: string;
  goals: number;
  shots: number;
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function PlayerMapPage() {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [matchIds, setMatchIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("geometric");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PlayerMapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Load players on mount */
  useEffect(() => {
    fetch("/api/moments/player-map")
      .then((r) => r.json())
      .then((data) => {
        if (data.players) {
          setPlayers(data.players);
          setMatchIds(data.matchIds ?? []);
          // Pre-select first player with shots
          const firstWithShots = data.players.find((p: PlayerInfo) => p.shots > 0);
          if (firstWithShots) setSelectedPlayer(firstWithShots.player_name);
        }
      })
      .catch(() => setError("Failed to load players"))
      .finally(() => setLoading(false));
  }, []);

  /* Generate handler */
  async function handleGenerate() {
    if (!selectedPlayer || matchIds.length === 0) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/moments/player-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: selectedPlayer,
          matchIds,
          style: selectedStyle,
          width: 2048,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.detail || err.error || "Generation failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  const selectedPlayerInfo = players.find((p) => p.player_name === selectedPlayer);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/wrexham"
          className="mb-3 inline-flex items-center gap-1 text-xs text-[#888888] transition hover:text-white"
        >
          <ChevronLeft className="h-3 w-3" />
          Wrexham
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Player Shot Map
        </h1>
        <p className="mt-1 text-sm text-[#888888]">
          Composite shot map across all Wrexham Premier League matches — generated as art.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-8 rounded-xl border border-white/5 bg-[#111111] p-5 space-y-5">
        {/* Player selector */}
        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
            Player
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#888888]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading players…
            </div>
          ) : (
            <select
              value={selectedPlayer}
              onChange={(e) => {
                setSelectedPlayer(e.target.value);
                setResult(null);
              }}
              className="w-full rounded-lg border border-white/10 bg-[#080810] px-3 py-2.5 text-sm text-white focus:border-[#8AE234] focus:outline-none"
            >
              <option value="" disabled>
                Select a player…
              </option>
              {players
                .filter((p) => p.shots > 0)
                .map((p) => (
                  <option key={p.player_id} value={p.player_name}>
                    #{p.jersey} {p.player_name} — {p.goals}G / {p.shots}S
                  </option>
                ))}
            </select>
          )}
          {selectedPlayerInfo && selectedPlayerInfo.shots > 0 && (
            <p className="mt-2 text-xs text-[#888888]">
              <span className="text-[#8AE234] font-semibold">{selectedPlayerInfo.goals} goals</span>
              {" "}from {selectedPlayerInfo.shots} shots across {matchIds.length} matches
            </p>
          )}
        </div>

        {/* Style selector */}
        <div>
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
            Art Style
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {ART_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStyle(s.id);
                  setResult(null);
                }}
                className={`rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                  selectedStyle === s.id
                    ? "bg-[#8AE234] text-white"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedPlayer || matchIds.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8AE234] px-4 py-3 text-sm font-bold text-[#080810] transition-colors hover:bg-[#b82318] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4" />
              Generate Shot Map
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{result.playerName}</h2>
              <p className="text-xs text-[#888888]">
                <span className="text-[#8AE234] font-semibold">{result.goals} goals</span>
                {" "}/ {result.shots} shots — {result.style} style
              </p>
            </div>
            {result.imageUrl.startsWith("http") && (
              <a
                href={result.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#888888] transition hover:border-white/20 hover:text-white"
              >
                Open full size
              </a>
            )}
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt={`${result.playerName} shot map`}
            className="w-full rounded-xl border border-white/5"
          />
        </div>
      )}

      {/* Empty state */}
      {!result && !generating && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111111] py-20 text-center">
          <Crosshair className="mb-4 h-12 w-12 text-[#888888]/30" />
          <p className="text-sm text-[#888888]">
            Select a player and style, then generate your shot map artwork.
          </p>
        </div>
      )}
    </div>
  );
}
