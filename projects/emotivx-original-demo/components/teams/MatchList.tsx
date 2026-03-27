"use client";

import { Calendar } from "lucide-react";
import type { MatchData } from "@/lib/teams-data";

interface MatchListProps {
  matches: MatchData[];
  accentColor: string;
}

export default function MatchList({ matches, accentColor }: MatchListProps) {
  if (matches.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
        Select a Match
      </h3>

      <div className="space-y-2">
        {matches.map((match) => (
          <button
            key={match.id}
            className="group flex w-full items-center justify-between rounded-xl border border-white/5 bg-[#111111] px-5 py-4 text-left transition hover:border-white/10"
          >
            <div className="flex items-center gap-4">
              {/* Date */}
              <div className="hidden text-center sm:block">
                <p className="text-[10px] uppercase text-[#888888]">
                  {new Date(match.date).toLocaleDateString("en-GB", { month: "short" })}
                </p>
                <p className="text-lg font-bold text-white">
                  {new Date(match.date).getDate()}
                </p>
              </div>

              {/* Teams + score */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{match.homeTeam}</span>
                  <span
                    className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {match.homeScore} – {match.awayScore}
                  </span>
                  <span className="text-sm font-medium text-white">{match.awayTeam}</span>
                </div>
                <p className="text-[10px] text-[#888888]">{match.competition}</p>
              </div>
            </div>

            {/* Mobile date */}
            <span className="text-xs text-[#888888] sm:hidden">
              {new Date(match.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
          </button>
        ))}
      </div>

      {/* Post-selection empty state */}
      <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#111111] py-12">
        <Calendar className="h-8 w-8 text-[#888888]" />
        <p className="text-sm text-[#888888]">Select a match to view moments</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#111111] py-16">
      <Calendar className="h-10 w-10 text-[#888888]" />
      <p className="text-sm font-medium text-white">No matches available</p>
      <p className="text-xs text-[#888888]">Check back soon for match data</p>
    </div>
  );
}
