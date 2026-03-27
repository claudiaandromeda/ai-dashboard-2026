"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Clock, Mail, ChevronRight } from "lucide-react";
import { useParams } from "next/navigation";

// Team name formatter
function formatName(slug: string) {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const LOGO_MAP: Record<string, string> = {
  "sunderland": "https://r2.thesportsdb.com/images/media/team/badge/xpswry1421434838.png",
  "leeds": "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1448813215.png",
  "burnley": "https://r2.thesportsdb.com/images/media/team/badge/tuvxqw1448813123.png",
  "sheffield-utd": "https://r2.thesportsdb.com/images/media/team/badge/AD76jv1710177603.png",
  "middlesbrough": "https://r2.thesportsdb.com/images/media/team/badge/zwpvrx1421429578.png",
  "coventry": "https://r2.thesportsdb.com/images/media/team/badge/uxyqys1424033798.png",
  "derby": "https://r2.thesportsdb.com/images/media/team/badge/xpvuru1421431891.png",
  "norwich": "https://r2.thesportsdb.com/images/media/team/badge/twpvqx1421429128.png",
  "west-brom": "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1421433991.png",
  "hull": "https://r2.thesportsdb.com/images/media/team/badge/sqxrtv1421432627.png",
  "cardiff": "https://r2.thesportsdb.com/images/media/team/badge/sywxry1421430654.png",
  "stoke": "https://r2.thesportsdb.com/images/media/team/badge/xwyvru1421433298.png",
};

export default function TeamAdminPage() {
  const params = useParams();
  const team = params.team as string;
  const name = formatName(team);
  const logo = LOGO_MAP[team];

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16 space-y-6">
      <Link
        href="/admin"
        className="self-start flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to All Teams
      </Link>

      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="h-20 w-20 object-contain opacity-60" />
      )}

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{name}</h1>
        <div className="flex items-center justify-center gap-2">
          <Clock className="h-4 w-4 text-[#F59E0B]" />
          <span className="text-sm text-[#F59E0B] font-medium">Invited — Awaiting Onboarding</span>
        </div>
      </div>

      <div className="max-w-sm rounded-xl border border-white/5 bg-[#111111] p-6 space-y-4">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-white/5">
          <Lock className="h-6 w-6 text-[#555555]" />
        </div>
        <p className="text-sm text-[#888888] leading-relaxed">
          This club has been invited to the EmotivX platform but hasn't completed onboarding yet.
          Once they sign up, you'll have full admin access to their moments, IP, and revenue.
        </p>
        <div className="flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 rounded-lg bg-[#DA291C] py-2.5 text-sm font-bold text-white hover:bg-[#DA291C]/90 transition">
            <Mail className="h-4 w-4" />
            Resend Invitation
          </button>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2.5 text-sm text-[#888888] hover:text-white transition"
          >
            View All Teams <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Show Wrexham as the working example */}
      <div className="rounded-xl border border-[#BA0C2F]/20 bg-[#BA0C2F]/5 p-4 max-w-sm">
        <p className="text-xs text-[#888888] mb-2">See a fully onboarded club:</p>
        <Link
          href="/admin/teams/wrexham"
          className="flex items-center gap-2 text-sm font-bold text-[#BA0C2F] hover:underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png"
            alt="Wrexham"
            className="h-6 w-6 object-contain"
          />
          Wrexham AFC Admin →
        </Link>
      </div>
    </div>
  );
}
