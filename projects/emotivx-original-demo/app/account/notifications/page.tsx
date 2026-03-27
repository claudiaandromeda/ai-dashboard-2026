"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Notifications</h1>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-white/5 bg-[#111111]">
        <Bell className="mb-3 h-8 w-8 text-[#888888]" />
        <p className="text-sm text-white">No notifications</p>
        <p className="mt-1 text-xs text-[#888888]">
          You&apos;re all caught up
        </p>
      </div>
    </div>
  );
}
