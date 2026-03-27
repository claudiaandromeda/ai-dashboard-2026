"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import type { PlayerData, MatchData } from "@/lib/teams-data";

/* ------------------------------------------------------------------ */
/*  Demo event data (Rooney bicycle kick)                              */
/* ------------------------------------------------------------------ */

interface MatchEvent {
  id: string;
  minute: number;
  type: "goal" | "assist" | "card";
  label: string;
  description: string;
}

interface MatchWithEvents extends MatchData {
  events: MatchEvent[];
}

const DEMO_MATCH: MatchWithEvents = {
  id: "demo-m1",
  homeTeam: "Manchester United",
  awayTeam: "Manchester City",
  homeScore: 2,
  awayScore: 1,
  date: "2011-02-12",
  competition: "Premier League",
  events: [
    {
      id: "evt-1",
      minute: 78,
      type: "goal",
      label: "Goal",
      description:
        "Stunning overhead bicycle kick from the edge of the box. Nani delivered a cross from the left wing, and Rooney leapt into the air to execute a perfect overhead kick that flew past Joe Hart into the top corner. One of the greatest goals in Premier League history.",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PlayerDetailModalProps {
  player: PlayerData;
  teamName: string;
  teamCode: string;
  accentColor: string;
  onClose: () => void;
  onCreateMoment?: (event: MatchEvent, match: MatchWithEvents) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export type { MatchEvent, MatchWithEvents };

export default function PlayerDetailModal({
  player,
  teamName,
  teamCode,
  accentColor,
  onClose,
  onCreateMoment,
}: PlayerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"assets" | "matches">("assets");

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border bg-[#111111] md:max-h-[85vh]"
        style={{ borderColor: `${accentColor}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: `${accentColor}40` }}
            >
              {player.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                #{player.number} {player.name}
              </h2>
              <p className="text-[10px] uppercase tracking-wider text-[#888888]">
                {player.position} &middot; {teamName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#888888] transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          <TabButton
            label="Assets"
            icon="📋"
            active={activeTab === "assets"}
            accentColor={accentColor}
            onClick={() => setActiveTab("assets")}
          />
          <TabButton
            label="Matches"
            icon="⚽"
            active={activeTab === "matches"}
            accentColor={accentColor}
            onClick={() => setActiveTab("matches")}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeTab === "assets" ? (
            <AssetsTab
              player={player}
              teamCode={teamCode}
              accentColor={accentColor}
            />
          ) : (
            <MatchesTab
              player={player}
              accentColor={accentColor}
              onCreateMoment={onCreateMoment}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-xs font-medium text-white transition hover:bg-white/5"
          >
            Close
          </button>
          <button
            className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:opacity-90"
            style={{ backgroundColor: accentColor }}
          >
            ✏️ Edit Player
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

/* ------------------------------------------------------------------ */
/*  Tab button                                                         */
/* ------------------------------------------------------------------ */

function TabButton({
  label,
  icon,
  active,
  accentColor,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-5 py-3 text-xs font-semibold transition"
      style={{
        color: active ? "#FFFFFF" : "#888888",
        backgroundColor: active ? `${accentColor}18` : "transparent",
      }}
    >
      <span>{icon}</span>
      {label}
      {active && (
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5"
          style={{ backgroundColor: accentColor }}
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Assets tab — Badge Preview                                         */
/* ------------------------------------------------------------------ */

function AssetsTab({
  player,
  teamCode,
  accentColor,
}: {
  player: PlayerData;
  teamCode: string;
  accentColor: string;
}) {
  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
        Badge Preview
      </h4>

      {/* Badge card */}
      <div className="mx-auto max-w-xs">
        <div
          className="relative overflow-hidden rounded-2xl p-6"
          style={{ backgroundColor: accentColor }}
        >
          {/* Dotted pattern overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "12px 12px",
            }}
          />

          <div className="relative flex flex-col items-center gap-4">
            {/* Club crest placeholder */}
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">
              {teamCode.charAt(0)}
            </div>

            {/* Badge label */}
            <span className="rounded-full bg-black/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Goal
            </span>

            {/* Player name bar */}
            <div className="w-full rounded-lg bg-black/60 px-3 py-2 text-center">
              <p className="text-xs font-bold tracking-wider text-white">
                #{player.number} {player.name.toUpperCase()}
              </p>
            </div>

            {/* Avatar placeholder */}
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.25)" }}
            >
              {player.name.charAt(0)}
            </div>

            {/* Signature placeholder */}
            <p className="font-serif text-sm italic text-white/70">
              {player.name}
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-[10px] text-[#888888]">
        Merch patch / badge preview — sewn onto physical hoodies &amp; apparel
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Matches tab                                                        */
/* ------------------------------------------------------------------ */

function MatchesTab({
  player,
  accentColor,
  onCreateMoment,
}: {
  player: PlayerData;
  accentColor: string;
  onCreateMoment?: (event: MatchEvent, match: MatchWithEvents) => void;
}) {
  /* For the demo we only show the Rooney bicycle kick match */
  const isRooney =
    player.name.toLowerCase().includes("rooney") ||
    player.id === "eng-l4";

  const matches: MatchWithEvents[] = isRooney
    ? [DEMO_MATCH]
    : [
        {
          ...DEMO_MATCH,
          events: [
            {
              ...DEMO_MATCH.events[0],
              description: `Placeholder event for ${player.name}. Select Wayne Rooney (England Legends) for the full demo.`,
            },
          ],
        },
      ];

  return (
    <div className="space-y-4">
      <h4 className="text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
        Matches
      </h4>
      {matches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          accentColor={accentColor}
          onCreateMoment={onCreateMoment}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Match card with expandable events                                  */
/* ------------------------------------------------------------------ */

function MatchCard({
  match,
  accentColor,
  onCreateMoment,
}: {
  match: MatchWithEvents;
  accentColor: string;
  onCreateMoment?: (event: MatchEvent, match: MatchWithEvents) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fmtDate = new Date(match.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-white/5 bg-[#0D0A0A]">
      {/* Match header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-white">{match.homeTeam}</span>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: accentColor }}
            >
              {match.homeScore} – {match.awayScore}
            </span>
            <span className="font-medium text-white">{match.awayTeam}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 text-[10px] text-[#888888]">
            <span>📅 {fmtDate}</span>
            <span>⚽ {match.competition}</span>
            <span>📍 Old Trafford</span>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold text-white transition hover:bg-white/5"
        >
          {match.events.length} event{match.events.length !== 1 && "s"}
          {expanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Expanded events */}
      {expanded && (
        <div className="border-t border-white/5 px-5 py-4 space-y-4">
          {match.events.map((evt) => (
            <EventRow
              key={evt.id}
              event={evt}
              accentColor={accentColor}
              onCreateMoment={
                onCreateMoment
                  ? () => onCreateMoment(evt, match)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single event row                                                   */
/* ------------------------------------------------------------------ */

function EventRow({
  event,
  accentColor,
  onCreateMoment,
}: {
  event: MatchEvent;
  accentColor: string;
  onCreateMoment?: () => void;
}) {
  return (
    <div className="space-y-3">
      {/* Minute + icon + label */}
      <div className="flex items-center gap-3">
        <span
          className="rounded px-2 py-0.5 text-xs font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {event.minute}&apos;
        </span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs">
          ⚽
        </span>
        <span className="text-sm font-bold text-white">{event.label}</span>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed text-[#9CA3AF]">
        {event.description}
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button className="rounded-lg border border-white/10 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-white/5">
          Dataline
        </button>
        <button
          onClick={onCreateMoment}
          className="rounded-lg px-3 py-1.5 text-[10px] font-bold text-white transition hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          ✨ Create Moment
        </button>
      </div>
    </div>
  );
}
