"use client";

import { useState } from "react";

export default function CopyPayloadButton({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-cyan-400/20 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-400/10"
    >
      {copied ? "Copied" : "Copy payload"}
    </button>
  );
}
