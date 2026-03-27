"use client";

import { useState } from "react";

type Status = {
  is_live: boolean;
  is_hidden: boolean;
  approved_at?: string | null;
};

export default function MomentApprovalActions({
  momentId,
  status,
  onUpdated,
  compact = false,
}: {
  momentId: string;
  status: Status;
  onUpdated?: (updated?: Status) => void;
  compact?: boolean;
}) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");

  const callAction = async (action: "approve" | "unapprove" | "hide" | "unhide") => {
    setRunning(true);
    setMessage(null);
    setMessageTone("ok");
    try {
      const response = await fetch(`/api/admin/moments/${momentId}/${action}`, {
        method: "POST",
      });
      const raw = await response.text();
      console.log("Approval action response", {
        action,
        status: response.status,
        body: raw,
      });
      const data = raw
        ? (JSON.parse(raw) as {
            error?: string;
            data?: Status;
            details?: string | null;
            hint?: string | null;
            code?: string | null;
          })
        : {};
      if (!response.ok) {
        const extra = [data.code, data.details, data.hint]
          .filter(Boolean)
          .join(" | ");
        throw new Error(
          [data.error ?? raw ?? "Action failed.", extra]
            .filter(Boolean)
            .join(" ")
        );
      }
      setMessage(null);
      if (onUpdated) {
        onUpdated(data.data);
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
      setMessageTone("error");
      console.error("Approval action failed", error);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <button
        type="button"
        onClick={() => callAction("approve")}
        disabled={running}
        className="rounded-lg border border-emerald-400/40 px-3 py-1 text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-60"
      >
        Approve + Live
      </button>
      {status.approved_at && (
        <button
          type="button"
          onClick={() => callAction("unapprove")}
          disabled={running}
          className="rounded-lg border border-amber-400/40 px-3 py-1 text-amber-200 hover:bg-amber-400/10 disabled:opacity-60"
        >
          Unapprove
        </button>
      )}
      {status.is_hidden ? (
        <button
          type="button"
          onClick={() => callAction("unhide")}
          disabled={running}
          className="rounded-lg border border-white/10 px-3 py-1 text-white/70 hover:bg-white/5 disabled:opacity-60"
        >
          Unhide
        </button>
      ) : (
        <button
          type="button"
          onClick={() => callAction("hide")}
          disabled={running}
          className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-200 hover:bg-rose-400/10 disabled:opacity-60"
        >
          Hide
        </button>
      )}
      {message && (
        <div
          className={`mt-1 text-xs ${
            messageTone === "error" ? "text-rose-200" : "text-white/60"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
