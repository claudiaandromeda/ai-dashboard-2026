"use client";

import { useMemo, useState } from "react";

type DataLine = {
  sequence: number;
  label: string;
  actor: string | null;
  team: string | null;
  x: number | null;
  y: number | null;
  timestamp: string;
  value?: unknown;
  context?: unknown;
};

const labelColor = (label: string) => {
  const value = label.toLowerCase();
  if (value.includes("goal")) return "bg-emerald-400";
  if (value.includes("shot") || value.includes("penalty")) return "bg-amber-400";
  if (value.includes("card") || value.includes("foul"))
    return "bg-rose-400";
  if (value.includes("substitution")) return "bg-purple-400";
  if (value.includes("pass") || value.includes("assist")) return "bg-cyan-400";
  return "bg-slate-400";
};

export default function MomentDataLinesPanel({
  dataLines,
}: {
  dataLines: DataLine[];
}) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const jsonText = useMemo(
    () => JSON.stringify(dataLines, null, 2),
    [dataLines]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/50">Data Line Timeline</div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/5"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {!collapsed && dataLines.length > 0 && (
          <ol className="mt-3 space-y-3">
            {dataLines.map((line) => (
              <li key={line.sequence} className="flex items-start gap-3">
                <div
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${labelColor(
                    line.label
                  )}`}
                />
                <div className="text-sm text-white/70">
                  <div className="text-white">
                    {line.sequence}. {line.label}
                  </div>
                  <div className="text-xs text-white/50">
                    {line.actor ?? "Unknown"} · {line.team ?? "Team"} ·{" "}
                    {line.timestamp}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {collapsed && (
          <div className="mt-3 text-xs text-white/50">
            Timeline collapsed.
          </div>
        )}
        {!collapsed && dataLines.length === 0 && (
          <div className="mt-3 text-xs text-white/50">
            No data lines to display yet.
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/50">Data Line JSON</div>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-cyan-400/40 px-3 py-1 text-xs text-cyan-200 hover:bg-cyan-400/10"
          >
            {copied ? "Copied" : "Copy JSON"}
          </button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/60 p-3 text-xs text-white/70">
          {jsonText}
        </pre>
      </div>
    </div>
  );
}
