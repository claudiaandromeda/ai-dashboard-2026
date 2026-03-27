"use client";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

export default function ClubSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/club/dashboard"
          className="text-[#888888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Club Settings</h1>
      </div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111111]">
        <Settings className="mb-3 h-8 w-8 text-[#888888]" />
        <p className="text-sm text-white">Club portal settings</p>
        <p className="mt-1 text-xs text-[#888888]">
          Manage notifications, permissions, and integration preferences
        </p>
      </div>
    </div>
  );
}
