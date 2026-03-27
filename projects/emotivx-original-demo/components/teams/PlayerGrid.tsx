"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import type { PlayerData, LegendData } from "@/lib/teams-data";

interface PlayerGridProps {
  players: PlayerData[];
  legends: LegendData[];
  accentColor: string;
  onPlayerClick?: (player: PlayerData | LegendData) => void;
}

export default function PlayerGrid({ players, legends, accentColor, onPlayerClick }: PlayerGridProps) {
  const hasLegends = legends.length > 0;
  const [view, setView] = useState<"active" | "legends">("active");

  return (
    <div className="space-y-6">
      {/* Toggle pills — only show if both tabs have content */}
      {hasLegends && (
        <div className="flex gap-2">
          <button
            onClick={() => setView("active")}
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
            style={
              view === "active"
                ? { backgroundColor: accentColor, color: "#FFFFFF" }
                : { backgroundColor: "transparent", color: "#888888", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            ⚡ Active Squad
          </button>
          <button
            onClick={() => setView("legends")}
            className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
            style={
              view === "legends"
                ? { backgroundColor: accentColor, color: "#FFFFFF" }
                : { backgroundColor: "transparent", color: "#888888", border: "1px solid rgba(255,255,255,0.1)" }
            }
          >
            🏆 Legends
          </button>
        </div>
      )}

      {/* Heading */}
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
        {view === "active" ? "Current Squad" : "Club Legends"}
      </h3>

      {/* Grid */}
      {view === "active" ? (
        players.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {players.map((p) => (
              <PlayerCard key={p.id} id={p.id} name={p.name} number={p.number} accentColor={accentColor} onClick={() => onPlayerClick?.(p)} />
            ))}
          </div>
        ) : (
          <EmptySquad />
        )
      ) : legends.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {legends.map((l) => (
            <LegendCard key={l.id} legend={l} accentColor={accentColor} onClick={() => onPlayerClick?.(l)} />
          ))}
        </div>
      ) : (
        <EmptySquad label="No legends added yet" />
      )}
    </div>
  );
}

function EmptySquad({ label = "No players added yet" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#111111] py-16">
      <Users className="h-10 w-10 text-[#888888]" />
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="text-xs text-[#888888]">Player data will appear here once added</p>
    </div>
  );
}

function PlayerCard({
  id,
  name,
  number,
  accentColor,
  onClick,
}: {
  id: string;
  name: string;
  number: number;
  accentColor: string;
  onClick?: () => void;
}) {
  const initial = name.charAt(0);
  return (
    <Link href={`/players/${id}`} onClick={onClick}>
      <div className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/5 bg-[#111111] p-4 transition hover:border-white/10">
        {/* Avatar */}
        <div className="relative">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
            style={{ backgroundColor: `${accentColor}33` }}
          >
            {initial}
          </div>
          {/* Jersey number badge */}
          <span
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: accentColor }}
          >
            {number}
          </span>
        </div>
        <p className="text-center text-xs font-medium text-white">{name}</p>
      </div>
    </Link>
  );
}

function LegendCard({
  legend,
  accentColor,
  onClick,
}: {
  legend: LegendData;
  accentColor: string;
  onClick?: () => void;
}) {
  const initial = legend.name.charAt(0);
  return (
    <div onClick={onClick} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/5 bg-[#111111] p-4 transition hover:border-white/10">
      {/* Avatar */}
      <div className="relative">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: `${accentColor}33` }}
        >
          {initial}
        </div>
        <span
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {legend.number}
        </span>
      </div>
      <p className="text-center text-xs font-medium text-white">{legend.name}</p>
      <div className="flex gap-3 text-[10px] text-[#888888]">
        <span>{legend.apps} apps</span>
        <span>{legend.goals} goals</span>
      </div>
      <p className="text-[10px] text-[#888888]">{legend.era}</p>
    </div>
  );
}
