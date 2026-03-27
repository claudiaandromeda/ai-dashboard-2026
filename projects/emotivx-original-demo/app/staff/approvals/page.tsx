"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle } from "lucide-react";

export default function StaffApprovalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/staff/dashboard"
          className="text-[#888888] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Approvals</h1>
      </div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111]">
        <CheckCircle className="mb-3 h-8 w-8 text-[#10B981]" />
        <p className="text-sm text-white">No pending approvals</p>
        <p className="mt-1 text-xs text-[#888888]">
          Moments awaiting review will appear here
        </p>
      </div>
    </div>
  );
}
