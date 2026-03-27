"use client";

import Link from "next/link";
import { ArrowLeft, Palette } from "lucide-react";

export default function ClubBrandingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/club/dashboard"
          className="text-[#888888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Branding</h1>
      </div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111111]">
        <Palette className="mb-3 h-8 w-8 text-[#E4002B]" />
        <p className="text-sm text-white">Club branding assets</p>
        <p className="mt-1 text-xs text-[#888888]">
          Upload logos, set colours, and manage sponsor assets
        </p>
      </div>
    </div>
  );
}
