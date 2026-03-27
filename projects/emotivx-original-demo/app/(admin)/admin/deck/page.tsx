"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DeckPage() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Minimal header with back button */}
      <div className="flex items-center gap-4 px-4 py-2 bg-black border-b border-white/10 shrink-0">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Admin
        </Link>
        <span className="text-xs text-[#555]">EmotivX · Investor Deck</span>
      </div>
      {/* Deck iframe */}
      <iframe
        src="/deck.html"
        className="flex-1 w-full border-0"
        title="EmotivX Pitch Deck"
      />
    </div>
  );
}
