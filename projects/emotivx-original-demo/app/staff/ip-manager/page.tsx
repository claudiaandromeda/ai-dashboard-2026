"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Users,
  Palette,
  Sparkles,
  Search,
  ChevronDown,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Upload,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

/* ─── Demo Data ─── */

type Player = {
  id: number;
  number: number;
  name: string;
  position: string;
  imageRights: "Active" | "Pending" | "Inactive";
  avatarUrl?: string | null;
};

const demoPlayers: Player[] = [
  { id: 1, number: 1, name: "Ben Foster", position: "Goalkeeper", imageRights: "Active" },
  { id: 2, number: 2, name: "Eoghan O'Connell", position: "Defender", imageRights: "Active" },
  { id: 3, number: 3, name: "James McClean", position: "Midfielder", imageRights: "Active" },
  { id: 4, number: 4, name: "Luke Young", position: "Midfielder", imageRights: "Active" },
  { id: 5, number: 7, name: "Paul Mullin", position: "Forward", imageRights: "Active" },
  { id: 6, number: 9, name: "Ollie Palmer", position: "Forward", imageRights: "Active" },
  { id: 7, number: 10, name: "Elliot Lee", position: "Midfielder", imageRights: "Active" },
  { id: 8, number: 11, name: "Sam Dalby", position: "Forward", imageRights: "Active" },
  { id: 9, number: 14, name: "Jordan Davies", position: "Midfielder", imageRights: "Pending" },
  { id: 10, number: 17, name: "Ryan Barnett", position: "Defender", imageRights: "Active" },
  { id: 11, number: 20, name: "Anthony Forde", position: "Midfielder", imageRights: "Active" },
  { id: 12, number: 23, name: "Max Cleworth", position: "Defender", imageRights: "Active" },
  // Euro 2024 guest players for demo
  { id: 13, number: 7, name: "Jamal Musiala", position: "Midfielder", imageRights: "Active" },
  { id: 14, number: 10, name: "Kylian Mbappé", position: "Forward", imageRights: "Active" },
  { id: 15, number: 21, name: "Dani Olmo", position: "Midfielder", imageRights: "Active" },
];

const PLAYERS_PER_PAGE = 8;

/* ─── Tabs ─── */

type Tab = "players" | "branding" | "backgrounds";

const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
  { id: "players", label: "Players", icon: Users, count: demoPlayers.length },
  { id: "branding", label: "Team Branding", icon: Palette },
  { id: "backgrounds", label: "Artistic Backgrounds", icon: Sparkles, count: 1 },
];

/* ─── Page Component ─── */

export default function IPManagerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("players");

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/staff/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-[#888888] transition hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E4002B] text-sm font-bold text-white">
          WX
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">IP Asset Manager</h1>
          <p className="text-sm text-[#888888]">Wrexham AFC</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-medium transition ${
                active ? "text-white" : "text-[#888888] hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active
                      ? "bg-[#DA291C]/20 text-[#DA291C]"
                      : "bg-white/5 text-[#555555]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {active && (
                <span className="absolute bottom-0 left-0 h-0.5 w-full bg-[#DA291C]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "players" && <PlayersTab />}
      {activeTab === "branding" && <BrandingTab />}
      {activeTab === "backgrounds" && <BackgroundsTab />}
    </div>
  );
}

/* ══════════════════════════════════════════
   PLAYERS TAB
   ══════════════════════════════════════════ */

function PlayersTab() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("number");
  const [page, setPage] = useState(1);
  const [players, setPlayers] = useState<Player[]>(demoPlayers);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [previewPlayer, setPreviewPlayer] = useState<Player | null>(null);

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return a.number - b.number;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PLAYERS_PER_PAGE));
  const paged = sorted.slice(
    (page - 1) * PLAYERS_PER_PAGE,
    page * PLAYERS_PER_PAGE
  );

  async function handleGenerateAvatar(player: Player) {
    setGeneratingId(player.id);
    try {
      const res = await fetch("/api/players/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName: player.name,
          teamName: "Wrexham AFC",
          primaryColor: "#E4002B",
          jerseyNumber: String(player.number),
          position: player.position,
        }),
      });
      const data = await res.json();
      if (data.ok && data.avatarUrl) {
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === player.id ? { ...p, avatarUrl: data.avatarUrl } : p
          )
        );
        setPreviewPlayer({ ...player, avatarUrl: data.avatarUrl });
      } else {
        alert(`Avatar generation failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(`Avatar generation failed: ${err}`);
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-[#888888]">
        Player Roster
      </h3>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-64 rounded-lg border border-white/10 bg-[#1F1F1F] py-2 pl-9 pr-3 text-xs text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/40"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 pr-8 text-xs text-white outline-none transition focus:border-[#DA291C]/40"
            >
              <option value="number">Sort by Number</option>
              <option value="name">Sort by Name</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555555]" />
          </div>
          <button className="flex items-center gap-1.5 rounded-lg bg-[#DA291C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#DA291C]/90">
            <Plus className="h-3.5 w-3.5" />
            Add Player
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[rgba(220,38,38,0.15)]">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="bg-[#111111] text-[#888888]">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Position
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Image Rights
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Avatar
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#0D0D0D]">
            {paged.map((player) => {
              const isGenerating = generatingId === player.id;
              return (
                <tr key={player.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-bold text-white">
                    {player.number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {player.avatarUrl ? (
                        <Image
                          src={player.avatarUrl}
                          alt={player.name}
                          width={28}
                          height={28}
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-[10px] font-bold text-[#888888]">
                          {player.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                      )}
                      <span className="font-medium text-white">
                        {player.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#888888]">
                    {player.position}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        player.imageRights === "Active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : player.imageRights === "Pending"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-white/5 text-[#555555]"
                      }`}
                    >
                      {player.imageRights}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleGenerateAvatar(player)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 rounded-lg border border-[#DA291C]/30 px-3 py-1.5 text-[10px] font-semibold text-[#DA291C] transition hover:bg-[#DA291C]/10 disabled:opacity-50"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          Generate Avatar
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => player.avatarUrl && setPreviewPlayer(player)}
                        className={`rounded p-1 transition ${player.avatarUrl ? "text-[#888888] hover:bg-white/5 hover:text-white" : "text-[#333333] cursor-not-allowed"}`}
                        disabled={!player.avatarUrl}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-white">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-[#DA291C]">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[#888888]">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5 disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" />
          Previous
        </button>
        <span>
          Page {page} of {totalPages}{" "}
          <span className="text-[#555555]">({sorted.length} players)</span>
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/5 disabled:opacity-30"
        >
          Next
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Avatar Preview Modal */}
      {previewPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewPlayer(null)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewPlayer(null)}
              className="absolute right-4 top-4 rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="mb-1 text-sm font-bold text-white">
              {previewPlayer.name}
            </h3>
            <p className="mb-4 text-xs text-[#888888]">
              #{previewPlayer.number} &middot; {previewPlayer.position}
            </p>
            {previewPlayer.avatarUrl && (
              <Image
                src={previewPlayer.avatarUrl}
                alt={`${previewPlayer.name} avatar`}
                width={512}
                height={512}
                className="w-full rounded-xl"
                unoptimized
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              {previewPlayer.avatarUrl && (
                <a
                  href={previewPlayer.avatarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs text-[#888888] transition hover:bg-white/5 hover:text-white"
                >
                  <Download className="h-3 w-3" />
                  Download
                </a>
              )}
              <button
                onClick={() => setPreviewPlayer(null)}
                className="rounded-lg bg-[#DA291C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#DA291C]/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   TEAM BRANDING TAB
   ══════════════════════════════════════════ */

function BrandingTab() {
  const [colors, setColors] = useState({
    primary: "#E4002B",
    secondary: "#FFFFFF",
    tertiary: "#000000",
  });

  return (
    <div className="space-y-8">
      {/* Logo uploads */}
      <UploadSection
        title="Primary Logo"
        description="Team crest / primary emblem"
      />
      <UploadSection
        title="Apparel Sponsor"
        description="Main shirt sponsor logo"
      />
      <UploadSection
        title="Avatar Style Reference"
        description="Reference image for AI-generated player avatars. Upload a cartoon/illustrated style example."
      />

      {/* Team Colors */}
      <div className="rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#888888]">
          Team Colors
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["primary", "secondary", "tertiary"] as const).map((key) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
                {key}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colors[key]}
                  onChange={(e) =>
                    setColors((c) => ({ ...c, [key]: e.target.value }))
                  }
                  className="h-9 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
                />
                <input
                  type="text"
                  value={colors[key]}
                  onChange={(e) =>
                    setColors((c) => ({ ...c, [key]: e.target.value }))
                  }
                  className="w-28 rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 text-xs uppercase text-white outline-none transition focus:border-[#DA291C]/40"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="rounded-lg bg-[#DA291C] px-6 py-2.5 text-xs font-semibold text-white transition hover:bg-[#DA291C]/90">
          Save Branding
        </button>
      </div>
    </div>
  );
}

function UploadSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-6">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-[#888888]">
        {title}
      </h3>
      <p className="mb-4 text-[10px] text-[#555555]">{description}</p>
      <div className="flex items-center gap-4">
        {/* Thumbnail placeholder */}
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/10 bg-[#0A0A0A]">
          <Upload className="h-5 w-5 text-[#555555]" />
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-[#DA291C] px-4 py-2 text-xs font-semibold text-[#DA291C] transition hover:bg-[#DA291C]/10">
            Upload Logo
          </button>
          <button className="rounded-lg border border-white/10 px-4 py-2 text-xs text-[#888888] transition hover:bg-white/5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   ARTISTIC BACKGROUNDS TAB
   ══════════════════════════════════════════ */

function BackgroundsTab() {
  return (
    <div className="space-y-8">
      {/* Form */}
      <div className="rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111] p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Background Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Red Marble"
              className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-2.5 text-xs text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Style
            </label>
            <div className="relative">
              <select className="w-full appearance-none rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-2.5 pr-8 text-xs text-white outline-none transition focus:border-[#DA291C]/40">
                <option>Abstract</option>
                <option>Geometric</option>
                <option>Organic</option>
                <option>Textured</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555555]" />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Custom Prompt
          </label>
          <textarea
            rows={3}
            placeholder="Describe the artistic background you want to generate..."
            className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] px-4 py-2.5 text-xs text-white placeholder-[#555555] outline-none transition focus:border-[#DA291C]/40"
          />
        </div>

        {/* Upload zone */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#888888]">
            Reference Image
          </label>
          <div className="flex min-h-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-[#0A0A0A] transition hover:border-[#DA291C]/30">
            <div className="text-center">
              <Upload className="mx-auto mb-2 h-6 w-6 text-[#555555]" />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#555555]">
                Click to upload reference image
              </p>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#DA291C] py-3 text-xs font-semibold text-white transition hover:bg-[#DA291C]/90">
          <Sparkles className="h-3.5 w-3.5" />
          Generate Background
        </button>
      </div>

      {/* Gallery */}
      <div>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#888888]">
          Generated Backgrounds
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Demo card */}
          <div className="overflow-hidden rounded-xl border border-[rgba(220,38,38,0.15)] bg-[#111111]">
            <div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#DA291C]/20 via-[#111111] to-[#DA291C]/10">
              <span className="text-xs text-[#555555]">Preview</span>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-semibold text-white">Red Marble</p>
                <span className="mt-1 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#888888]">
                  Abstract
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="rounded p-1.5 text-[#888888] transition hover:bg-white/5 hover:text-white">
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button className="rounded p-1.5 text-[#888888] transition hover:bg-white/5 hover:text-[#DA291C]">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
