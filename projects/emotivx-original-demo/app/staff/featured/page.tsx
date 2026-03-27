"use client";

import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

export default function StaffFeaturedPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/staff/dashboard"
          className="text-[#888888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Featured Moments</h1>
      </div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111]">
        <Star className="mb-3 h-8 w-8 text-[#A855F7]" />
        <p className="text-sm text-white">No featured moments yet</p>
        <p className="mt-1 text-xs text-[#888888]">
          Curate which moments appear on the marketplace homepage
        </p>
      </div>
    </div>
  );
}
