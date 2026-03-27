"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { TeamData, PlayerData, LegendData } from "@/lib/teams-data";
import TeamHeader from "@/components/teams/TeamHeader";
import TabBar from "@/components/teams/TabBar";
import PlayerGrid from "@/components/teams/PlayerGrid";
import MatchList from "@/components/teams/MatchList";
import PlayerDetailModal from "@/components/players/PlayerDetailModal";
import CreateMomentModal from "@/components/moments/CreateMomentModal";
import type { MatchEvent, MatchWithEvents } from "@/components/players/PlayerDetailModal";

interface Props {
  team: TeamData;
}

export default function TeamPageClient({ team }: Props) {
  const [activeTab, setActiveTab] = useState("featured");
  const accent = team.primaryColor;

  /* Modal state */
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerData | null>(null);
  const [momentCtx, setMomentCtx] = useState<{
    event: MatchEvent;
    match: MatchWithEvents;
  } | null>(null);

  function handlePlayerClick(p: PlayerData | LegendData) {
    /* Normalise LegendData → PlayerData shape */
    const asPlayer: PlayerData = {
      id: p.id,
      name: p.name,
      number: p.number,
      position: "position" in p ? p.position : "Legend",
    };
    setSelectedPlayer(asPlayer);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        <TeamHeader
          name={team.name}
          code={team.code}
          primaryColor={accent}
        />

        {/* Tabs */}
        <div className="mt-8">
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            accentColor={accent}
          />
        </div>

        {/* Tab content */}
        <div className="mt-8">
          {activeTab === "featured" && <FeaturedTab />}
          {activeTab === "players" && (
            <PlayerGrid
              players={team.players}
              legends={team.legends}
              accentColor={accent}
              onPlayerClick={handlePlayerClick}
            />
          )}
          {activeTab === "matches" && (
            <MatchList matches={team.matches} accentColor={accent} />
          )}
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          teamName={team.name}
          teamCode={team.code}
          accentColor={accent}
          onClose={() => setSelectedPlayer(null)}
          onCreateMoment={(evt, match) => setMomentCtx({ event: evt, match })}
        />
      )}

      {/* Create Moment Modal (layered on top) */}
      {momentCtx && selectedPlayer && (
        <CreateMomentModal
          event={momentCtx.event}
          match={momentCtx.match}
          playerName={selectedPlayer.name}
          playerNumber={selectedPlayer.number}
          accentColor={accent}
          onClose={() => setMomentCtx(null)}
        />
      )}
    </div>
  );
}

function FeaturedTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-[#888888]">
        Featured Moments
      </h3>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-white/5 bg-[#111111] py-16">
        <Star className="h-10 w-10 text-[#888888]" />
        <p className="text-sm font-medium text-white">No featured moments yet</p>
        <p className="text-xs text-[#888888]">
          Check back soon for curated content
        </p>
      </div>
    </div>
  );
}
