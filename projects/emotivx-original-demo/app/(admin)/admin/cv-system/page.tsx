"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Cpu, Eye, AlertCircle, Play, CheckCircle, Clock, Zap, Camera, Activity, GitBranch, Terminal } from "lucide-react";

const CV_LOGS = [
  { time: "08:31:04", type: "info", msg: "Frame batch received: match_id=3941017, frames=240" },
  { time: "08:31:05", type: "success", msg: "Pitch calibration loaded from DB (homography matrix: 4 corners)" },
  { time: "08:31:07", type: "info", msg: "YOLO v8 inference running · 240 frames @ 25fps" },
  { time: "08:31:12", type: "success", msg: "Ball detected in 234/240 frames (97.5% confidence)" },
  { time: "08:31:12", type: "warning", msg: "Frames 156-161: occlusion detected (player cluster), interpolating trajectory" },
  { time: "08:31:14", type: "success", msg: "Player tracking: 22/22 players detected" },
  { time: "08:31:14", type: "info", msg: "Possession classifier: threshold=0.65" },
  { time: "08:31:16", type: "warning", msg: "Possession ambiguous at t=87.3s (2 players within 1.2m of ball)" },
  { time: "08:31:17", type: "success", msg: "Event sequence generated: 14 events (7 passes, 2 dribbles, 1 shot, 1 goal)" },
  { time: "08:31:18", type: "info", msg: "Data line exported to emotivx format · moment_id=WRX_241203_001" },
];

const SYSTEM_STATUS = [
  { label: "YOLO v8 Model", status: "operational", detail: "v8n-ball-sport · 97.5% mAP" },
  { label: "Pitch Calibration", status: "operational", detail: "Homography matrix loaded" },
  { label: "Player Tracker", status: "operational", detail: "22-player simultaneous tracking" },
  { label: "Possession Classifier", status: "degraded", detail: "False positives ~12% at threshold 0.65" },
  { label: "Data Line Export", status: "operational", detail: "EmotivX format v2.1" },
  { label: "Realtime Mode", status: "not-ready", detail: "Batch processing only (ETA: Q2 2026)" },
];

const RECENT_JOBS = [
  { id: "WRX_241203_001", match: "Wrexham vs Burnley", minute: "45+2", player: "Paul Mullin", type: "Goal", status: "complete", confidence: 94 },
  { id: "WRX_241116_003", match: "Wrexham vs Luton", minute: "67", player: "Sam Dalby", type: "Goal", status: "complete", confidence: 91 },
  { id: "WRX_241116_001", match: "Wrexham vs Luton", minute: "23", player: "Ollie Palmer", type: "Goal", status: "complete", confidence: 87 },
  { id: "WRX_241029_002", match: "Wrexham vs Stoke", minute: "78", player: "Elliot Lee", type: "Goal", status: "review", confidence: 71 },
  { id: "WRX_241012_001", match: "Wrexham vs Millwall", minute: "34", player: "James McClean", type: "Goal", status: "review", confidence: 68 },
];

const STATUS_COLORS = {
  operational: { bg: "bg-green-500/10", text: "text-green-400", dot: "bg-green-400" },
  degraded: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  "not-ready": { bg: "bg-white/5", text: "text-[#555555]", dot: "bg-[#333333]" },
};

export default function CVSystemPage() {
  const [activeTab, setActiveTab] = useState<"status" | "jobs" | "logs">("status");
  const [liveMode, setLiveMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#080810] pb-20">
      {/* Header */}
      <div className="border-b border-emerald-500/20 bg-gradient-to-b from-emerald-950/30 to-[#080810] px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin" className="mb-6 inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-400 transition">
            <ArrowLeft className="h-3 w-3" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
              Admin Only · Internal Feature
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-wide text-white sm:text-4xl">
            Elliot's CV System
          </h1>
          <p className="mt-2 text-sm text-[#888888]">
            Computer vision pitch tracking · Automated moment generation from broadcast footage
          </p>

          {/* Status summary */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-300">System Online</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-300">Possession classifier: work in progress</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <Clock className="h-3.5 w-3.5 text-[#888888]" />
              <span className="text-xs text-[#888888]">Realtime mode: Q2 2026</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Architecture diagram (text-based) */}
        <div className="mb-8 rounded-xl border border-white/5 bg-[#111111] p-6">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#888888] flex items-center gap-2">
            <GitBranch className="h-3.5 w-3.5" />
            Pipeline Architecture
          </h2>
          <div className="grid gap-2 sm:grid-cols-5 text-center">
            {[
              { icon: Camera, label: "Broadcast Feed", sub: "Video ingest", color: "text-blue-400" },
              { icon: Eye, label: "YOLO v8", sub: "Ball + player detection", color: "text-purple-400" },
              { icon: Activity, label: "Pitch Calibration", sub: "Homography transform", color: "text-orange-400" },
              { icon: Cpu, label: "Possession AI", sub: "Team attribution", color: "text-yellow-400" },
              { icon: Zap, label: "EmotivX Export", sub: "Data line generation", color: "text-green-400" },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="relative flex flex-col items-center">
                  {i > 0 && (
                    <div className="absolute -left-1 top-5 hidden h-0.5 w-full bg-white/10 sm:block" />
                  )}
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    <Icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <p className="mt-2 text-[10px] font-semibold text-white">{step.label}</p>
                  <p className="text-[9px] text-[#555555]">{step.sub}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-white/5">
          {(["status", "jobs", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 py-2.5 text-xs font-medium capitalize transition ${
                activeTab === tab ? "text-white" : "text-[#888888] hover:text-white/70"
              }`}
            >
              {tab === "logs" ? "Live Logs" : tab === "jobs" ? "Recent Jobs" : "System Status"}
              {activeTab === tab && <span className="absolute bottom-0 left-0 h-0.5 w-full bg-emerald-500" />}
            </button>
          ))}
        </div>

        {/* System Status Tab */}
        {activeTab === "status" && (
          <div className="space-y-3">
            {SYSTEM_STATUS.map((item) => {
              const colors = STATUS_COLORS[item.status as keyof typeof STATUS_COLORS];
              return (
                <div key={item.label} className={`flex items-center justify-between rounded-xl border border-white/5 ${colors.bg} p-4`}>
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs text-[#666666]">{item.detail}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${colors.bg} ${colors.text}`}>
                    {item.status.replace("-", " ")}
                  </span>
                </div>
              );
            })}
            <div className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-300">Known Limitations</p>
                  <ul className="mt-2 space-y-1 text-xs text-[#888888]">
                    <li>• Possession classification fails when 2+ players within 1.2m of ball</li>
                    <li>• Ball occlusion &gt; 6 frames causes trajectory interpolation artifacts</li>
                    <li>• Current accuracy: 97.5% ball detection, ~88% possession attribution</li>
                    <li>• Batch mode only (no real-time streaming yet)</li>
                    <li>• Target: 95%+ possession accuracy before club release</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Jobs Tab */}
        {activeTab === "jobs" && (
          <div className="space-y-3">
            {RECENT_JOBS.map((job) => (
              <div key={job.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-[#111111] p-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-[#555555]">{job.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${
                      job.status === "complete" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{job.match} · {job.minute}'</p>
                  <p className="text-xs text-[#666666]">{job.player} · {job.type}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${job.confidence >= 90 ? "text-green-400" : job.confidence >= 75 ? "text-yellow-400" : "text-orange-400"}`}>
                    {job.confidence}%
                  </div>
                  <div className="text-[10px] text-[#555555]">confidence</div>
                  <Link href="/merch-preview" className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#8AE234] hover:underline">
                    View merch <Zap className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="rounded-xl border border-white/5 bg-[#0D0D0D] p-4 font-mono">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400">cv-system · live output</span>
              </div>
              <button
                onClick={() => setLiveMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                  liveMode ? "bg-green-500/20 text-green-400" : "bg-white/5 text-[#555555] hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${liveMode ? "bg-green-400 animate-pulse" : "bg-[#333333]"}`} />
                {liveMode ? "Streaming" : "Start stream"}
              </button>
            </div>
            <div className="space-y-1">
              {CV_LOGS.map((log, i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <span className="shrink-0 text-[#444444]">{log.time}</span>
                  <span className={`shrink-0 w-14 ${
                    log.type === "success" ? "text-green-500" :
                    log.type === "warning" ? "text-yellow-500" :
                    "text-[#555555]"
                  }`}>
                    [{log.type.toUpperCase()}]
                  </span>
                  <span className={`${
                    log.type === "success" ? "text-green-300" :
                    log.type === "warning" ? "text-yellow-300" :
                    "text-[#888888]"
                  }`}>
                    {log.msg}
                  </span>
                </div>
              ))}
              {liveMode && (
                <div className="flex gap-3 text-xs animate-pulse">
                  <span className="shrink-0 text-[#444444]">08:31:19</span>
                  <span className="shrink-0 w-14 text-[#555555]">[INFO]</span>
                  <span className="text-[#666666]">Waiting for next frame batch...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
