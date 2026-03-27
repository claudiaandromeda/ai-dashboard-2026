"use client";

import { useState } from "react";

export default function MomentIdCell({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const short = value.length > 16 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group flex items-center gap-2">
      <span className="font-mono text-xs text-white" title={value}>
        {short}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/70 opacity-0 transition group-hover:opacity-100 hover:bg-white/5"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
