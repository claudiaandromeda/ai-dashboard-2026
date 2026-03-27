"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CVPage() {
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
        <span className="text-xs text-[#555]">EmotivX · CV Tracking System</span>
        <span className="ml-auto rounded-full bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#10B981] uppercase tracking-widest">Live</span>
      </div>
      {/* Streamlit iframe */}
      <iframe
        src="http://192.168.0.82:8502"
        className="flex-1 w-full border-0"
        title="EmotivX CV Tracking System"
      />
    </div>
  );
}
