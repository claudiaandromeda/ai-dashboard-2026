"use client";

import { useMemo, useState } from "react";

export default function BackfillDataLinesCard({
  matchId,
  initialCompetitionId = "",
  initialSeasonId = "",
  initialMatchLabel = "",
}: {
  matchId: string;
  initialCompetitionId?: string;
  initialSeasonId?: string;
  initialMatchLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [competitionId, setCompetitionId] = useState(initialCompetitionId);
  const [seasonId, setSeasonId] = useState(initialSeasonId);
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [matchLabel, setMatchLabel] = useState(initialMatchLabel);
  const command = useMemo(() => {
    const safeMatch = matchId || "<match_id>";
    const safeCompetition = competitionId || "<competition_id>";
    const safeSeason = seasonId || "<season_id>";
    return `npm run statsbomb:detect -- ${safeMatch} ${safeCompetition} ${safeSeason} --push`;
  }, [matchId, competitionId, seasonId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setStatusMessage(null);
    try {
      const response = await fetch("/api/admin/moments/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          competitionId,
          seasonId,
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        queued?: boolean;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start backfill.");
      }
      if (data.queued) {
        setStatusMessage(
          data.message ??
            "Request queued. A platform admin will process it."
        );
      } else {
        setStatusMessage("Backfill started. Check ingest runs for progress.");
      }
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to start backfill."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
      <div className="text-xs text-white/50">Backfill Data Lines</div>
      <p className="mt-2 text-sm text-white/70">
        This runs detection for the full match to backfill all moments. Match
        metadata will auto-fill if available locally.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-white/50">
          Match ID
          <input
            value={matchId}
            readOnly
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70"
          />
        </label>
        <label className="text-xs text-white/50">
          Competition ID
          <input
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
            placeholder="Competition ID"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 placeholder:text-white/40"
          />
        </label>
        <label className="text-xs text-white/50">
          Season ID
          <input
            value={seasonId}
            onChange={(event) => setSeasonId(event.target.value)}
            placeholder="Season ID"
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70 placeholder:text-white/40"
          />
        </label>
      </div>
      {matchLabel && (
        <div className="mt-2 text-xs text-white/50">Match: {matchLabel}</div>
      )}
      {!matchId ? (
        <div className="mt-2 text-xs text-amber-200">
          Match ID not available yet. Try refreshing the page.
        </div>
      ) : !competitionId || !seasonId ? (
        <div className="mt-2 text-xs text-white/50">
          Match metadata not found in Supabase. Re-run detection with --push to
          backfill the matches table.
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white/70">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-cyan-400/40 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10"
        >
          {copied ? "Copied" : "Copy command"}
        </button>
        <button
          type="button"
          disabled={!matchId || !competitionId || !seasonId || running}
          onClick={handleRun}
          className="rounded-lg border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? "Starting..." : "Run backfill (match)"}
        </button>
      </div>
      {statusMessage && (
        <div className="mt-3 text-xs text-white/60">{statusMessage}</div>
      )}
    </div>
  );
}
