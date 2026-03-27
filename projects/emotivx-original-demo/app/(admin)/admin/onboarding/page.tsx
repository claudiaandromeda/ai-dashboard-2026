"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft, CheckCircle, Clock, Circle, ChevronRight,
  Shield, Palette, Zap, DollarSign, Users, FileText,
  ArrowRight, Building2, Lock
} from "lucide-react";

type Stage = "prospect" | "invited" | "contract" | "setup" | "live";

interface Club {
  id: string;
  name: string;
  logo: string;
  primary: string;
  stage: Stage;
  contact: string;
  value: string;
  daysInStage: number;
}

const PIPELINE: Club[] = [
  { id: "sunderland", name: "Sunderland", logo: "https://r2.thesportsdb.com/images/media/team/badge/xpswry1421434838.png", primary: "#EB172B", stage: "invited", contact: "Head of Commercial", value: "£8.2M", daysInStage: 5 },
  { id: "leeds", name: "Leeds United", logo: "https://r2.thesportsdb.com/images/media/team/badge/vwpvry1448813215.png", primary: "#FFCD00", stage: "invited", contact: "CEO", value: "£9.1M", daysInStage: 3 },
  { id: "burnley", name: "Burnley", logo: "https://r2.thesportsdb.com/images/media/team/badge/tuvxqw1448813123.png", primary: "#6C1D45", stage: "prospect", contact: "Unknown", value: "£7.4M", daysInStage: 12 },
  { id: "sheffield-utd", name: "Sheffield United", logo: "https://r2.thesportsdb.com/images/media/team/badge/AD76jv1710177603.png", primary: "#EE2737", stage: "prospect", contact: "Unknown", value: "£7.8M", daysInStage: 12 },
  { id: "middlesbrough", name: "Middlesbrough", logo: "https://r2.thesportsdb.com/images/media/team/badge/zwpvrx1421429578.png", primary: "#EF3340", stage: "contract", contact: "Commercial Dir.", value: "£6.9M", daysInStage: 2 },
  { id: "wrexham", name: "Wrexham AFC", logo: "https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png", primary: "#BA0C2F", stage: "live", contact: "Rob McElhenney", value: "£11.2M", daysInStage: 28 },
];

const STAGES: { id: Stage; label: string; color: string; count?: number }[] = [
  { id: "prospect", label: "Prospect", color: "#555555" },
  { id: "invited", label: "Invited", color: "#3B82F6" },
  { id: "contract", label: "Contract", color: "#F59E0B" },
  { id: "setup", label: "Setup", color: "#8B5CF6" },
  { id: "live", label: "Live", color: "#10B981" },
];

const ONBOARDING_STEPS = [
  {
    step: "01",
    icon: Building2,
    title: "Initial Contact",
    desc: "EmotivX reaches out to club's Commercial Director. Share one-pager + platform demo link.",
    detail: "Zero commitment ask. Just a conversation.",
    stage: "prospect",
    color: "#555555",
  },
  {
    step: "02",
    icon: Users,
    title: "Demo Meeting",
    desc: "Live platform walkthrough — club portal, moment generator, fan merch preview, revenue calculator.",
    detail: "This exact demo you're seeing now.",
    stage: "invited",
    color: "#3B82F6",
  },
  {
    step: "03",
    icon: FileText,
    title: "Contract & IP Agreement",
    desc: "Simple revenue share agreement. Club retains full IP ownership. 75/15/10 split (Club/EmotivX/Players).",
    detail: "No upfront cost. No exclusivity required.",
    stage: "contract",
    color: "#F59E0B",
  },
  {
    step: "04",
    icon: Palette,
    title: "Brand Setup",
    desc: "Upload club badge, set kit colours, configure player image rights, add sponsors.",
    detail: "Takes 30 minutes. We handle the rest.",
    stage: "setup",
    color: "#8B5CF6",
  },
  {
    step: "05",
    icon: Zap,
    title: "First Moment Generated",
    desc: "First goal of the season auto-generates a merch set. Club reviews, approves, goes live.",
    detail: "Revenue from day one.",
    stage: "setup",
    color: "#8B5CF6",
  },
  {
    step: "06",
    icon: DollarSign,
    title: "Revenue Flowing",
    desc: "Fans buy editions, Printful ships, revenue split happens automatically. Monthly reporting dashboard.",
    detail: "Completely hands-off for the club.",
    stage: "live",
    color: "#10B981",
  },
];

function stageColor(stage: Stage) {
  return STAGES.find(s => s.id === stage)?.color || "#555555";
}

function StageIcon({ stage }: { stage: Stage }) {
  if (stage === "live") return <CheckCircle className="h-3.5 w-3.5 text-[#10B981]" />;
  if (stage === "contract") return <Clock className="h-3.5 w-3.5 text-[#F59E0B]" />;
  if (stage === "invited") return <Clock className="h-3.5 w-3.5 text-[#3B82F6]" />;
  return <Circle className="h-3.5 w-3.5 text-[#555555]" />;
}

export default function OnboardingPage() {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [activeStage, setActiveStage] = useState<Stage | "all">("all");

  const filtered = activeStage === "all" ? PIPELINE : PIPELINE.filter(c => c.stage === activeStage);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs text-[#888888] hover:text-white transition mb-4">
          <ArrowLeft className="h-3 w-3" /> Back to Admin
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#8B5CF6]/20 border border-[#8B5CF6]/30">
            <Users className="h-6 w-6 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Club Onboarding Pipeline</h1>
            <p className="text-sm text-[#888888]">Track every club from prospect to live revenue</p>
          </div>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {STAGES.map(s => {
          const count = PIPELINE.filter(c => c.stage === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(activeStage === s.id ? "all" : s.id)}
              className={`shrink-0 rounded-xl border px-4 py-3 text-left transition min-w-[100px] ${activeStage === s.id ? "border-white/20 bg-white/5" : "border-white/5 bg-[#111111] hover:border-white/10"}`}
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>{count}</p>
              <p className="text-[10px] text-[#555555] uppercase tracking-wider mt-0.5">{s.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Club list */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#888888] uppercase tracking-wider">Pipeline</p>
          {filtered.map(club => (
            <button
              key={club.id}
              onClick={() => setSelectedClub(selectedClub?.id === club.id ? null : club)}
              className={`w-full text-left rounded-xl border p-4 transition ${selectedClub?.id === club.id ? "border-white/20 bg-white/5" : "border-white/5 bg-[#111111] hover:border-white/10"}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0">
                  <Image src={club.logo} alt={club.name} fill className="object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{club.name}</p>
                  <p className="text-[10px] text-[#555555]">{club.contact} · {club.daysInStage}d in stage</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <StageIcon stage={club.stage} />
                    <span className="text-[10px] font-bold capitalize" style={{ color: stageColor(club.stage) }}>{club.stage}</span>
                  </div>
                  <p className="text-xs font-bold text-[#C9A84C]">{club.value}</p>
                </div>
              </div>

              {/* Stage progress bar */}
              <div className="mt-3 flex gap-1">
                {STAGES.map((s, i) => {
                  const stageIdx = STAGES.findIndex(st => st.id === club.stage);
                  const done = i <= stageIdx;
                  return (
                    <div
                      key={s.id}
                      className="flex-1 h-1 rounded-full transition-all"
                      style={{ background: done ? stageColor(club.stage) : "#1a1a1a" }}
                    />
                  );
                })}
              </div>
            </button>
          ))}
        </div>

        {/* Right panel — either club detail or onboarding flow */}
        {selectedClub ? (
          <div className="rounded-xl border border-white/5 bg-[#111111] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12">
                <Image src={selectedClub.logo} alt={selectedClub.name} fill className="object-contain" />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selectedClub.name}</p>
                <div className="flex items-center gap-1.5">
                  <StageIcon stage={selectedClub.stage} />
                  <span className="text-xs font-bold capitalize" style={{ color: stageColor(selectedClub.stage) }}>{selectedClub.stage}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {[
                { label: "Contact", value: selectedClub.contact },
                { label: "Est. season value", value: selectedClub.value },
                { label: "Days in current stage", value: `${selectedClub.daysInStage} days` },
                { label: "EmotivX cut (15%)", value: `£${(parseFloat(selectedClub.value.replace("£", "").replace("M", "")) * 0.15).toFixed(1)}M` },
              ].map(s => (
                <div key={s.label} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                  <span className="text-[#555555]">{s.label}</span>
                  <span className="text-white font-semibold">{s.value}</span>
                </div>
              ))}
            </div>

            {/* Next actions */}
            <div>
              <p className="text-xs font-bold text-[#888888] uppercase tracking-wider mb-2">Next Actions</p>
              {selectedClub.stage === "prospect" && (
                <div className="space-y-2">
                  <button className="w-full rounded-lg bg-[#3B82F6] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3B82F6]/90 transition text-left">
                    Send platform demo link →
                  </button>
                  <button className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-xs text-[#888888] hover:text-white transition text-left">
                    Find commercial director contact
                  </button>
                </div>
              )}
              {selectedClub.stage === "invited" && (
                <div className="space-y-2">
                  <button className="w-full rounded-lg bg-[#F59E0B] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#F59E0B]/90 transition text-left">
                    Send contract for review →
                  </button>
                  <button className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-xs text-[#888888] hover:text-white transition text-left">
                    Schedule follow-up call
                  </button>
                </div>
              )}
              {selectedClub.stage === "contract" && (
                <button className="w-full rounded-lg bg-[#8B5CF6] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#8B5CF6]/90 transition text-left">
                  Begin brand setup session →
                </button>
              )}
              {selectedClub.stage === "live" && (
                <Link href="/admin/teams/wrexham" className="flex items-center justify-between w-full rounded-lg bg-[#10B981] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#10B981]/90 transition">
                  Open club admin <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Onboarding flow diagram */
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#888888] uppercase tracking-wider">How Onboarding Works</p>
            {ONBOARDING_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: step.color + "40", background: step.color + "15" }}>
                      <Icon className="h-4 w-4" style={{ color: step.color }} />
                    </div>
                    {i < ONBOARDING_STEPS.length - 1 && <div className="w-px flex-1 bg-white/5 mt-1" />}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold font-mono" style={{ color: step.color }}>{step.step}</span>
                      <p className="text-xs font-bold text-white">{step.title}</p>
                    </div>
                    <p className="text-[11px] text-[#888888] leading-relaxed">{step.desc}</p>
                    <p className="text-[10px] text-[#444] mt-0.5 italic">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
