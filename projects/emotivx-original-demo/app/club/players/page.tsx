"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Upload,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ─── Demo: Wrexham AFC ─── */
const CLUB = { accent: "#E4002B" };

type Player = {
  id: number;
  number: number;
  name: string;
  position: string;
  imageRights: "Active" | "Pending" | "Inactive";
  hasPhoto: boolean;
};

const demoPlayers: Player[] = [
  { id: 1, number: 1, name: "Ben Foster", position: "Goalkeeper", imageRights: "Active", hasPhoto: true },
  { id: 2, number: 2, name: "Eoghan O'Connell", position: "Defender", imageRights: "Active", hasPhoto: true },
  { id: 3, number: 3, name: "James McClean", position: "Midfielder", imageRights: "Active", hasPhoto: true },
  { id: 4, number: 4, name: "Luke Young", position: "Midfielder", imageRights: "Active", hasPhoto: false },
  { id: 5, number: 7, name: "Paul Mullin", position: "Forward", imageRights: "Active", hasPhoto: true },
  { id: 6, number: 9, name: "Ollie Palmer", position: "Forward", imageRights: "Active", hasPhoto: true },
  { id: 7, number: 10, name: "Elliot Lee", position: "Midfielder", imageRights: "Active", hasPhoto: true },
  { id: 8, number: 11, name: "Sam Dalby", position: "Forward", imageRights: "Active", hasPhoto: false },
  { id: 9, number: 14, name: "Jordan Davies", position: "Midfielder", imageRights: "Pending", hasPhoto: true },
  { id: 10, number: 17, name: "Ryan Barnett", position: "Defender", imageRights: "Active", hasPhoto: true },
  { id: 11, number: 20, name: "Anthony Forde", position: "Midfielder", imageRights: "Active", hasPhoto: true },
  { id: 12, number: 23, name: "Max Cleworth", position: "Defender", imageRights: "Active", hasPhoto: false },
  { id: 13, number: 25, name: "Jacob Sherring", position: "Defender", imageRights: "Pending", hasPhoto: false },
  { id: 14, number: 28, name: "Tom O'Connor", position: "Midfielder", imageRights: "Active", hasPhoto: true },
  { id: 15, number: 30, name: "Mark Howard", position: "Goalkeeper", imageRights: "Active", hasPhoto: true },
];

const PLAYERS_PER_PAGE = 8;

export default function ClubPlayersPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("number");
  const [page, setPage] = useState(1);

  const filtered = demoPlayers.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "position") return a.position.localeCompare(b.position);
    return a.number - b.number;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PLAYERS_PER_PAGE));
  const paged = sorted.slice(
    (page - 1) * PLAYERS_PER_PAGE,
    page * PLAYERS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Player Roster</h1>
          <p className="mt-1 text-sm text-[#888888]">
            {sorted.length} player{sorted.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: CLUB.accent }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Player
        </button>
      </div>

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
            className="w-64 rounded-lg border border-white/10 bg-[#1F1F1F] py-2 pl-9 pr-3 text-xs text-white placeholder-[#555555] outline-none transition focus:border-white/20"
          />
        </div>
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 pr-8 text-xs text-white outline-none transition focus:border-white/20"
          >
            <option value="number">Sort by Number</option>
            <option value="name">Sort by Name</option>
            <option value="position">Sort by Position</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555555]" />
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: `${CLUB.accent}26` }}
      >
        <table className="w-full min-w-[640px] text-left text-xs">
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
                Photo
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#0D0D0D]">
            {paged.map((player) => (
              <tr
                key={player.id}
                className="transition hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3 font-bold text-white">
                  {player.number}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-[10px] font-bold text-[#888888]">
                      {player.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
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
                  {player.hasPhoto ? (
                    <span className="text-[10px] text-emerald-400">
                      Uploaded
                    </span>
                  ) : (
                    <button
                      className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition hover:bg-white/5"
                      style={{ color: CLUB.accent }}
                    >
                      <Upload className="h-3 w-3" />
                      Upload
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-white">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-white">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
    </div>
  );
}
