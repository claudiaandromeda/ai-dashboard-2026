"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, Trash2 } from "lucide-react";
import type { MatchEvent, MatchWithEvents } from "@/components/players/PlayerDetailModal";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CreateMomentModalProps {
  event: MatchEvent;
  match: MatchWithEvents;
  playerName: string;
  playerNumber: number;
  accentColor: string;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/*  Demo art history data                                              */
/* ------------------------------------------------------------------ */

interface ArtVersion {
  id: string;
  timestamp: string;
  isCurrent: boolean;
}

const DEMO_ART_HISTORY: ArtVersion[] = [
  { id: "art-3", timestamp: "2026-03-05 14:32", isCurrent: true },
  { id: "art-2", timestamp: "2026-03-05 13:18", isCurrent: false },
  { id: "art-1", timestamp: "2026-03-04 22:05", isCurrent: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CreateMomentModal({
  event,
  match,
  playerName,
  playerNumber,
  accentColor,
  onClose,
}: CreateMomentModalProps) {
  const [showHistory, setShowHistory] = useState(false);

  const fmtDate = new Date(match.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const modal = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-[#1A1111]"
        style={{ borderColor: `${accentColor}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <h2 className="text-sm font-bold text-white">
              Create Historical Moment
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Summary card */}
          <div
            className="rounded-xl p-5 text-center"
            style={{
              background: `linear-gradient(135deg, ${accentColor}25 0%, #111111 70%)`,
              border: `1px solid ${accentColor}30`,
            }}
          >
            <span
              className="inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase text-white"
              style={{ backgroundColor: accentColor }}
            >
              ⚽ {event.label}
            </span>
            <p className="mt-3 text-lg font-bold text-white">
              {playerName} — {event.minute}&apos;
            </p>
            <p className="mt-1 text-xs text-[#888888]">
              {match.homeTeam} {match.homeScore} – {match.awayScore}{" "}
              {match.awayTeam} &middot; {fmtDate}
            </p>
          </div>

          {/* Source dataline */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
              Source Dataline
            </h4>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
              {/* Placeholder red zigzag SVG line */}
              <svg
                viewBox="0 0 400 200"
                className="absolute inset-0 h-full w-full"
                preserveAspectRatio="none"
              >
                <polyline
                  points="20,160 60,140 100,80 140,110 180,40 220,90 260,30 300,70 340,20 380,60"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Glow effect */}
                <polyline
                  points="20,160 60,140 100,80 140,110 180,40 220,90 260,30 300,70 340,20 380,60"
                  fill="none"
                  stroke={accentColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.2"
                />
              </svg>
            </div>
            <p className="text-[10px] italic text-[#888888]">
              Trajectory data — overhead bicycle kick path from edge of box to
              top corner
            </p>
          </div>

          {/* Event description */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
              Event Description
            </h4>
            <p className="text-xs leading-relaxed text-[#9CA3AF]">
              {event.description}
            </p>
          </div>

          {/* Art history */}
          <div className="space-y-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-white/5"
            >
              <Clock className="h-3 w-3" />
              {showHistory ? "Hide Art History" : "Show Art History"}
            </button>

            {showHistory && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {DEMO_ART_HISTORY.map((v) => (
                  <ArtVersionCard
                    key={v.id}
                    version={v}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            ✨ Generate Dataline Art
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

/* ------------------------------------------------------------------ */
/*  Art version card                                                   */
/* ------------------------------------------------------------------ */

function ArtVersionCard({
  version,
  accentColor,
}: {
  version: ArtVersion;
  accentColor: string;
}) {
  return (
    <div
      className="flex-shrink-0 rounded-xl border p-2"
      style={{
        borderColor: version.isCurrent ? "#22c55e" : "rgba(255,255,255,0.05)",
        width: 140,
      }}
    >
      {/* Thumbnail placeholder */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black/60">
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
        >
          <polyline
            points="10,80 30,60 50,30 70,50 90,20"
            fill="none"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Timestamp */}
      <p className="mt-1.5 text-center text-[9px] text-[#888888]">
        {version.timestamp}
      </p>

      {/* Status / actions */}
      {version.isCurrent ? (
        <div className="mt-1 flex justify-center">
          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-green-400">
            Current
          </span>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-center gap-2">
          <button className="flex items-center gap-0.5 text-[9px] font-semibold text-white hover:text-[#9CA3AF]">
            <Clock className="h-2.5 w-2.5" /> Restore
          </button>
          <button className="text-[#888888] hover:text-red-400">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
