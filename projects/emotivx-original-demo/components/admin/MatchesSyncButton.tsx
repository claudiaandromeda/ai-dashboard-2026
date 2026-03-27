"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MatchesStatus = {
  count: number;
  last_updated_at: string | null;
};

type MatchesSyncButtonProps = {
  onSyncStart?: () => void;
  pulse?: boolean;
};

export default function MatchesSyncButton({
  onSyncStart,
  pulse = false,
}: MatchesSyncButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [matchesStatus, setMatchesStatus] = useState<MatchesStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    const response = await fetch("/api/admin/matches/status", { cache: "no-store" });
    const data = (await response.json()) as MatchesStatus & { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Failed to fetch match status.");
    }
    setMatchesStatus({ count: data.count, last_updated_at: data.last_updated_at });
    return data;
  }, []);

  useEffect(() => {
    fetchStatus().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Failed to load status.");
    });

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [fetchStatus]);

  const handleSync = async () => {
    setRunning(true);
    setStatus(null);
    let baseline = matchesStatus?.last_updated_at ?? null;
    try {
      onSyncStart?.();
      const response = await fetch(`/api/admin/matches/sync`, {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start match sync.");
      }
      setStatus("Sync started. Watching for updates...");

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const latest = await fetchStatus();
          if (latest.last_updated_at && latest.last_updated_at !== baseline) {
            setStatus("Matches synced. Safe to search.");
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch (error) {
          console.error(error);
        }
      }, 3000);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Failed to start match sync."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className={`rounded-xl px-6 py-3 text-sm font-extrabold uppercase tracking-wide transition ${
          pulse
            ? "sync-pulse bg-emerald-600 text-black shadow-[0_0_32px_rgba(16,185,129,0.95)] ring-2 ring-emerald-300/80"
            : "border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {running ? "Syncing..." : "Sync the Data"}
      </button>
      <button
        type="button"
        onClick={() => fetchStatus()}
        className="rounded-lg border border-white/15 px-3 py-2 text-xs text-white/70 hover:bg-white/5"
      >
        Refresh status
      </button>
      {matchesStatus ? (
        <span className="text-white/60">
          {matchesStatus.count} matches ·{" "}
          {matchesStatus.last_updated_at
            ? `Last sync ${new Date(matchesStatus.last_updated_at).toLocaleString()}`
            : "No sync yet"}
        </span>
      ) : null}
      {status && (() => {
        const isSynced = status.toLowerCase().includes("synced");
        const tone = isSynced
          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.55)]"
          : "border-amber-400/50 bg-amber-400/15 text-amber-100 shadow-[0_0_18px_rgba(251,191,36,0.55)]";
        return (
          <span
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${tone}`}
          >
            {status}
          </span>
        );
      })()}
    </div>
  );
}
