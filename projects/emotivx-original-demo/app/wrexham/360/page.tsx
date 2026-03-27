/**
 * Wrexham 360° Data Lab
 * All 5 visualisations: Freeze Frame, Ball Arc, Player Card, Timeline, Technique Art
 */
"use client";

import { useState, useEffect } from "react";

interface FreezePlayer { x: number; y: number; teammate: boolean; goalkeeper: boolean; }
interface PlayerData { name: string; jersey: number; height: number; weight: number; foot: string; dob: string; nationality: string; }
interface Goal {
  index: number; player: string; team: string; teamId: number; minute: number;
  xg: number; bodyPart: string; technique: string;
  startX: number; startY: number; startZ: number;
  endX: number; endY: number; endZ: number;
  distanceM: number; distanceToGoal: number; durationMs: number;
  speedKmh: number; speedMph: number;
  freezeFrame: FreezePlayer[]; playerData: PlayerData;
}
interface TimelineEvent { minute: number; type: string; player: string; team: string; teamId: number; xg: number | null; }
interface Weather { temperature: number; precipitation: number; windSpeed: number; weatherCode: number; description: string; }
interface MatchData {
  goals: Goal[]; playerStats: Record<string, Record<string, number>>;
  timeline: TimelineEvent[]; teamStats: Record<string, Record<string, number>>;
  totalEvents: number; weather: Weather | null; attendance: number; date: string;
}

const WREXHAM_ID = 1557;
const PITCH_W = 120, PITCH_H = 80;

export default function Wrexham360Page() {
  const [data, setData] = useState<MatchData | null>(null);
  const [selectedGoal, setSelectedGoal] = useState(0);

  useEffect(() => {
    fetch("/api/wrexham/match-data?matchId=1377475").then(r => r.json()).then(setData);
  }, []);

  if (!data) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading 360° data...</div>;

  const goal = data.goals[selectedGoal];
  const isWrexham = goal?.teamId === WREXHAM_ID;
  const accent = isWrexham ? "red" : "blue";
  const stats = data.playerStats[goal?.player] || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      {/* Header */}
      <div className="border-b border-red-500/20 bg-black/40 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🔬 360° Data Lab</h1>
              <p className="text-gray-400 text-sm">Wrexham 5 - 3 Ipswich Town — All 5 Visualisations</p>
            </div>
            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-3 py-1 text-xs text-red-300">EXPERIMENTAL</span>
          </div>
        </div>
      </div>

      {/* Weather + Match Info Bar */}
      {data.weather && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="flex items-center gap-4 text-sm rounded-lg border border-white/10 bg-white/5 px-4 py-2 flex-wrap">
            <span className="text-gray-400">📅 {data.date}</span>
            <span className="text-gray-400">🏟️ Racecourse Ground — {data.attendance?.toLocaleString()} fans</span>
            <span className="text-gray-400">{data.weather.description}</span>
            <span className="text-gray-400">🌡️ {data.weather.temperature}°C</span>
            <span className="text-gray-400">💨 {data.weather.windSpeed}km/h</span>
            {data.weather.precipitation > 0 && <span className="text-gray-400">🌧️ {data.weather.precipitation}mm</span>}
          </div>
        </div>
      )}

      {/* Goal Selector */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {data.goals.map((g, i) => (
            <button key={i} onClick={() => setSelectedGoal(i)}
              className={`shrink-0 rounded-lg border px-4 py-2 text-sm transition ${
                selectedGoal === i
                  ? (g.teamId === WREXHAM_ID ? "border-red-400 bg-red-400/10 text-red-300" : "border-blue-400 bg-blue-400/10 text-blue-300")
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
              }`}>
              <span className="font-bold">{g.minute}&apos;</span> {g.player.split(" ").pop()}
              <span className="ml-2 text-[10px] opacity-60">{g.technique}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-8 space-y-6">

        {/* ═══ 1. FREEZE FRAME MAP ═══ */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-cyan-300 mb-4">🎯 Freeze Frame — {goal.player} {goal.minute}&apos;</h2>
          <div className="relative bg-green-900/30 border border-green-500/20 rounded-lg overflow-hidden" style={{ aspectRatio: "120/80" }}>
            {/* Pitch markings */}
            <svg viewBox="0 0 120 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Pitch outline */}
              <rect x="0" y="0" width="120" height="80" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
              {/* Center line */}
              <line x1="60" y1="0" x2="60" y2="80" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              {/* Center circle */}
              <circle cx="60" cy="40" r="9.15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              {/* Penalty boxes */}
              <rect x="0" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              <rect x="102" y="18" width="18" height="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              {/* 6-yard boxes */}
              <rect x="0" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              <rect x="114" y="30" width="6" height="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.2" />
              {/* Goals */}
              <rect x="-1" y="36" width="1" height="8" fill="rgba(255,255,255,0.2)" />
              <rect x="120" y="36" width="1" height="8" fill="rgba(255,255,255,0.2)" />

              {/* Ball trajectory */}
              <line x1={goal.startX} y1={goal.startY} x2={goal.endX || 120} y2={goal.endY || 40}
                stroke={isWrexham ? "#ff4444" : "#4488ff"} strokeWidth="0.4" strokeDasharray="1,0.5" />
              
              {/* Freeze frame players */}
              {goal.freezeFrame.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={p.goalkeeper ? 1.5 : 1.2}
                    fill={p.goalkeeper ? "#ffaa00" : (p.teammate ? (isWrexham ? "#ff4444" : "#4488ff") : "rgba(255,255,255,0.7)")}
                    stroke="rgba(0,0,0,0.5)" strokeWidth="0.2" />
                </g>
              ))}

              {/* Shooter */}
              <circle cx={goal.startX} cy={goal.startY} r="2"
                fill={isWrexham ? "#ff0000" : "#0066ff"} stroke="white" strokeWidth="0.3" />
              <circle cx={goal.startX} cy={goal.startY} r="3.5"
                fill="none" stroke={isWrexham ? "rgba(255,0,0,0.3)" : "rgba(0,100,255,0.3)"} strokeWidth="0.3" />

              {/* Ball end (goal) */}
              <circle cx={goal.endX || 120} cy={goal.endY || 40} r="1"
                fill="white" stroke="rgba(255,255,255,0.8)" strokeWidth="0.2" />
            </svg>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] bg-black/60 rounded px-2 py-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Teammates</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white inline-block" /> Opponents</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Goalkeeper</span>
            </div>
          </div>
          <div className="mt-3 flex gap-4 text-sm text-gray-400 flex-wrap">
            <span>xG: <strong className="text-white">{goal.xg.toFixed(2)}</strong></span>
            <span>🚀 <strong className={`${goal.speedKmh > 80 ? "text-red-400" : goal.speedKmh > 50 ? "text-amber-400" : "text-white"}`}>{goal.speedKmh}km/h</strong> ({goal.speedMph}mph)</span>
            <span>📏 <strong className="text-white">{goal.distanceM}m</strong> in {(goal.durationMs / 1000).toFixed(2)}s</span>
            <span>Players: <strong className="text-white">{goal.freezeFrame.length}</strong></span>
            <span>{goal.technique} / {goal.bodyPart}</span>
          </div>
        </div>

        {/* ═══ 2. 3D BALL FLIGHT ARC ═══ */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-emerald-300 mb-4">🏔️ Ball Flight Arc</h2>
          <div className="relative bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden" style={{ height: "200px" }}>
            <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Ground line */}
              <line x1="10" y1="85" x2="190" y2="85" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              {/* Crossbar height reference */}
              <line x1="10" y1="25" x2="190" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.3" strokeDasharray="2,2" />
              <text x="192" y="27" fill="rgba(255,255,255,0.2)" fontSize="4">crossbar</text>
              {/* Goal frame at right */}
              <rect x="185" y="25" width="3" height="60" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
              
              {/* Ball arc — quadratic bezier from start height to end height */}
              {(() => {
                const startH = 85 - (goal.startZ / 2.44) * 60;
                const endH = 85 - ((goal.endZ || 0) / 2.44) * 60;
                const peakH = Math.min(startH, endH) - 15; // Arc peak above highest point
                return (
                  <>
                    <path d={`M 20 ${startH} Q 100 ${peakH} 185 ${endH}`}
                      fill="none" stroke={isWrexham ? "#ff4444" : "#4488ff"} strokeWidth="1.5" />
                    {/* Ball at start */}
                    <circle cx="20" cy={startH} r="3" fill={isWrexham ? "#ff4444" : "#4488ff"} />
                    {/* Ball at end */}
                    <circle cx="185" cy={endH} r="3" fill="white" stroke={isWrexham ? "#ff4444" : "#4488ff"} strokeWidth="0.5" />
                    {/* Height labels */}
                    <text x="20" y={startH - 6} fill="white" fontSize="5" textAnchor="middle">{goal.startZ.toFixed(1)}m</text>
                    <text x="185" y={endH - 6} fill="white" fontSize="5" textAnchor="middle">{(goal.endZ || 0).toFixed(1)}m</text>
                  </>
                );
              })()}
              
              {/* Ground labels */}
              <text x="20" y="95" fill="rgba(255,255,255,0.3)" fontSize="4" textAnchor="middle">Shot</text>
              <text x="185" y="95" fill="rgba(255,255,255,0.3)" fontSize="4" textAnchor="middle">Goal</text>
            </svg>
          </div>
          <div className="flex gap-6 mt-3 text-sm flex-wrap">
            <div>
              <span className="text-gray-400">Height: </span>
              <strong className="text-white">{goal.startZ.toFixed(1)}m → {(goal.endZ || 0).toFixed(1)}m</strong>
              {goal.bodyPart === "head" && <span className="ml-2 text-yellow-300">🤯 Header</span>}
              {goal.endZ > 2.0 && goal.bodyPart !== "head" && <span className="ml-2 text-emerald-300">⬆️ Top corner!</span>}
              {(goal.endZ || 0) < 0.5 && <span className="ml-2 text-emerald-300">⬇️ Low drive</span>}
            </div>
            <div>
              <span className="text-gray-400">Speed: </span>
              <strong className={`text-2xl ${goal.speedKmh > 80 ? "text-red-400" : goal.speedKmh > 50 ? "text-amber-400" : "text-emerald-400"}`}>
                {goal.speedKmh}km/h
              </strong>
              <span className="text-gray-500 ml-1">({goal.speedMph}mph)</span>
            </div>
            <div>
              <span className="text-gray-400">Distance: </span>
              <strong className="text-white">{goal.distanceM}m</strong>
              <span className="text-gray-500 ml-1">({(goal.durationMs / 1000).toFixed(2)}s flight)</span>
            </div>
          </div>
        </div>

        {/* ═══ 3. PLAYER CARD ═══ */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-amber-300 mb-4">📊 Player Card</h2>
          <div className={`rounded-xl border ${isWrexham ? "border-red-500/30 bg-gradient-to-br from-red-900/20 to-gray-900" : "border-blue-500/30 bg-gradient-to-br from-blue-900/20 to-gray-900"} p-6 max-w-md`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-3xl font-black">{goal.playerData.jersey}</div>
                <div className="text-xl font-bold mt-1">{goal.player}</div>
                <div className="text-sm text-gray-400">{goal.team}</div>
              </div>
              <div className="text-right text-sm text-gray-400">
                <div>{goal.playerData.height}cm / {goal.playerData.weight}kg</div>
                <div>{goal.playerData.foot} foot</div>
                <div>{goal.playerData.nationality}</div>
              </div>
            </div>

            {/* Goal info */}
            <div className={`rounded-lg ${isWrexham ? "bg-red-500/10 border border-red-500/20" : "bg-blue-500/10 border border-blue-500/20"} p-3 mb-4`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">⚽ Goal {goal.minute}&apos;</span>
                <span className="text-sm">xG: <strong>{goal.xg.toFixed(2)}</strong></span>
              </div>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span>{goal.bodyPart}</span>
                <span>{goal.technique}</span>
                <span>Height: {(goal.endZ || 0).toFixed(1)}m</span>
              </div>
            </div>

            {/* Match stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              {[
                { label: "Touches", value: stats["touches"] },
                { label: "Passes", value: stats["passes-completed"] },
                { label: "Pass %", value: stats["pass-success-ratio"] ? `${(stats["pass-success-ratio"] * 100).toFixed(0)}%` : null },
                { label: "Shots", value: stats["shots"] },
                { label: "On Target", value: stats["shots-on-target"] },
                { label: "Key Pass", value: stats["key-passes"] },
                { label: "Dribbles", value: stats["dribbles-completed"] },
                { label: "Tackles", value: stats["tackles-won"] },
                { label: "Aerials", value: stats["aerials-won"] },
              ].filter(s => s.value != null).map(s => (
                <div key={s.label} className="rounded bg-white/5 p-2">
                  <div className="font-bold text-white">{s.value}</div>
                  <div className="text-[10px] text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ 4. MATCH MOMENTUM TIMELINE ═══ */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-violet-300 mb-4">⚡ Match Timeline — {data.totalEvents} events</h2>
          
          {/* Possession bar */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-red-300">WXM {((data.teamStats.wrexham?.possession || 0.5) * 100).toFixed(0)}%</span>
            <div className="flex-1 h-3 bg-blue-600/30 rounded overflow-hidden">
              <div className="h-full bg-red-500/60 rounded-l" style={{ width: `${(data.teamStats.wrexham?.possession || 0.5) * 100}%` }} />
            </div>
            <span className="text-sm text-blue-300">{((data.teamStats.ipswich?.possession || 0.5) * 100).toFixed(0)}% IPS</span>
          </div>

          {/* Timeline */}
          <div className="relative h-24 bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
            {/* Minute markers */}
            {[0, 15, 30, 45, 60, 75, 90].map(m => (
              <div key={m} className="absolute bottom-0 top-0 border-l border-white/5" style={{ left: `${(m / 95) * 100}%` }}>
                <span className="absolute bottom-1 text-[8px] text-white/20 -translate-x-1/2">{m}</span>
              </div>
            ))}
            {/* Half time line */}
            <div className="absolute top-0 bottom-0 border-l border-white/20 border-dashed" style={{ left: `${(45/95)*100}%` }} />

            {/* Events */}
            {data.timeline.map((evt, i) => {
              const left = `${(evt.minute / 95) * 100}%`;
              const isW = evt.teamId === WREXHAM_ID;
              const top = isW ? "10%" : "55%";

              if (evt.type === "goal") {
                return <div key={i} className="absolute" style={{ left, top }}>
                  <div className={`w-5 h-5 rounded-full ${isW ? "bg-red-500" : "bg-blue-500"} flex items-center justify-center text-[8px] font-bold border-2 border-white shadow-lg`}>⚽</div>
                </div>;
              }
              if (evt.type === "yellow") {
                return <div key={i} className="absolute" style={{ left, top }}>
                  <div className="w-3 h-4 bg-yellow-400 rounded-sm border border-yellow-600" />
                </div>;
              }
              if (evt.type === "shot") {
                return <div key={i} className="absolute" style={{ left, top }}>
                  <div className={`w-2 h-2 rounded-full ${isW ? "bg-red-400/40" : "bg-blue-400/40"}`} />
                </div>;
              }
              if (evt.type === "key-pass") {
                return <div key={i} className="absolute" style={{ left, top }}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isW ? "bg-red-300/30" : "bg-blue-300/30"}`} />
                </div>;
              }
              return null;
            })}

            {/* Team labels */}
            <div className="absolute top-1 left-2 text-[9px] text-red-400/50 font-bold">WREXHAM</div>
            <div className="absolute bottom-6 left-2 text-[9px] text-blue-400/50 font-bold">IPSWICH</div>
          </div>

          {/* Team comparison */}
          <div className="grid grid-cols-4 gap-3 mt-4 text-center text-sm">
            {[
              { label: "Shots", w: data.teamStats.wrexham?.shots, i: data.teamStats.ipswich?.shots },
              { label: "On Target", w: data.teamStats.wrexham?.["shots-on-target"], i: data.teamStats.ipswich?.["shots-on-target"] },
              { label: "Passes", w: data.teamStats.wrexham?.["passes-completed"], i: data.teamStats.ipswich?.["passes-completed"] },
              { label: "Tackles", w: data.teamStats.wrexham?.["tackles-won"], i: data.teamStats.ipswich?.["tackles-won"] },
            ].map(s => (
              <div key={s.label} className="rounded bg-white/5 p-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-red-400 font-bold">{s.w || 0}</span>
                  <span className="text-blue-400 font-bold">{s.i || 0}</span>
                </div>
                <div className="text-[10px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ 5. TECHNIQUE SIGNATURE ═══ */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold text-rose-300 mb-4">🎨 Technique Signature</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.goals.map((g, i) => {
              const isW = g.teamId === WREXHAM_ID;
              const techniqueStyle = {
                "normal": "bg-gradient-to-br from-gray-800 to-gray-900",
                "half-volley": "bg-gradient-to-br from-orange-900/30 to-red-900/30",
                "volley": "bg-gradient-to-br from-purple-900/30 to-pink-900/30",
                "header": "bg-gradient-to-br from-yellow-900/30 to-amber-900/30",
              }[g.technique] || "bg-gradient-to-br from-gray-800 to-gray-900";

              const techniqueEmoji = {
                "normal": "🦶",
                "half-volley": "⚡",
                "volley": "🔥",
                "header": "🤯",
              }[g.technique] || "⚽";

              const heightBar = Math.min(100, ((g.endZ || 0) / 2.44) * 100);

              return (
                <button key={i} onClick={() => setSelectedGoal(i)}
                  className={`${techniqueStyle} rounded-lg border p-4 text-left transition ${
                    selectedGoal === i ? (isW ? "border-red-400 ring-1 ring-red-400/30" : "border-blue-400 ring-1 ring-blue-400/30") : "border-white/10 hover:border-white/20"
                  }`}>
                  <div className="text-2xl mb-1">{techniqueEmoji}</div>
                  <div className="font-bold text-sm">{g.player.split(" ").pop()}</div>
                  <div className="text-xs text-gray-400">{g.minute}&apos; — {g.technique}</div>
                  <div className="text-xs text-gray-400">{g.bodyPart}</div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="flex-1 h-8 bg-white/5 rounded overflow-hidden flex items-end">
                      <div className={`w-full ${isW ? "bg-red-500/40" : "bg-blue-500/40"} rounded-t`} style={{ height: `${heightBar}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-500">{(g.endZ || 0).toFixed(1)}m</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>xG: {g.xg.toFixed(2)}</span>
                    <span className={g.speedKmh > 80 ? "text-red-400 font-bold" : ""}>{g.speedKmh}km/h</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
