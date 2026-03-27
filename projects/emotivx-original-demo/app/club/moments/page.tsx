"use client";

import { useState } from "react";
import {
  Search,
  ChevronDown,
  Plus,
  Eye,
  EyeOff,
  Star,
  Trash2,
  Filter,
} from "lucide-react";

/* ─── Demo: Wrexham AFC ─── */
const CLUB = { accent: "#E4002B" };

type MomentStatus = "Published" | "Draft" | "Hidden";

type Moment = {
  id: number;
  player: string;
  eventType: string;
  minute: number;
  match: string;
  date: string;
  status: MomentStatus;
  featured: boolean;
};

const demoMoments: Moment[] = [
  { id: 1, player: "Paul Mullin", eventType: "Goal", minute: 23, match: "Wrexham 3-1 Notts County", date: "2026-02-15", status: "Published", featured: true },
  { id: 2, player: "Ollie Palmer", eventType: "Goal", minute: 67, match: "Wrexham 3-1 Notts County", date: "2026-02-15", status: "Published", featured: false },
  { id: 3, player: "Elliot Lee", eventType: "Goal", minute: 89, match: "Wrexham 3-1 Notts County", date: "2026-02-15", status: "Published", featured: true },
  { id: 4, player: "Sam Dalby", eventType: "Goal", minute: 34, match: "Wrexham 2-0 Barrow", date: "2026-02-08", status: "Published", featured: false },
  { id: 5, player: "Paul Mullin", eventType: "Goal", minute: 78, match: "Wrexham 2-0 Barrow", date: "2026-02-08", status: "Draft", featured: false },
  { id: 6, player: "James McClean", eventType: "Assist", minute: 33, match: "Wrexham 2-0 Barrow", date: "2026-02-08", status: "Hidden", featured: false },
  { id: 7, player: "Ollie Palmer", eventType: "Goal", minute: 12, match: "Accrington 1-2 Wrexham", date: "2026-02-01", status: "Published", featured: false },
  { id: 8, player: "Luke Young", eventType: "Goal", minute: 55, match: "Accrington 1-2 Wrexham", date: "2026-02-01", status: "Draft", featured: false },
  { id: 9, player: "Paul Mullin", eventType: "Goal", minute: 41, match: "Wrexham 1-0 Mansfield", date: "2026-01-25", status: "Published", featured: true },
  { id: 10, player: "Jordan Davies", eventType: "Assist", minute: 40, match: "Wrexham 1-0 Mansfield", date: "2026-01-25", status: "Draft", featured: false },
];

const eventTypes = ["All", "Goal", "Assist", "Save", "Tackle"];

export default function ClubMomentsPage() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All");
  const [moments, setMoments] = useState(demoMoments);

  const filtered = moments.filter((m) => {
    const matchesSearch = m.player
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesEvent =
      eventFilter === "All" || m.eventType === eventFilter;
    return matchesSearch && matchesEvent;
  });

  const toggleStatus = (id: number) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              status:
                m.status === "Published"
                  ? "Hidden"
                  : ("Published" as MomentStatus),
            }
          : m
      )
    );
  };

  const toggleFeatured = (id: number) => {
    setMoments((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, featured: !m.featured } : m
      )
    );
  };

  const deleteMoment = (id: number) => {
    setMoments((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Moment Management
          </h1>
          <p className="mt-1 text-sm text-[#888888]">
            {filtered.length} moment{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: CLUB.accent }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Manual Moment
        </button>
      </div>

      {/* Filter bar */}
      <div
        className="flex flex-col gap-3 rounded-xl border bg-[#111111] p-4 sm:flex-row sm:items-center"
        style={{ borderColor: `${CLUB.accent}26` }}
      >
        <div className="flex items-center gap-2 text-xs text-[#888888]">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>

        {/* Event type dropdown */}
        <div className="relative">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="appearance-none rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 pr-8 text-xs text-white outline-none transition focus:border-white/20"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t === "All" ? "All Events" : t}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555555]" />
        </div>

        {/* Date range (placeholder) */}
        <input
          type="date"
          className="rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 text-xs text-white outline-none transition focus:border-white/20"
        />
        <span className="text-xs text-[#555555]">to</span>
        <input
          type="date"
          className="rounded-lg border border-white/10 bg-[#1F1F1F] px-3 py-2 text-xs text-white outline-none transition focus:border-white/20"
        />

        {/* Player search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#555555]" />
          <input
            type="text"
            placeholder="Search player..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#1F1F1F] py-2 pl-9 pr-3 text-xs text-white placeholder-[#555555] outline-none transition focus:border-white/20"
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-x-auto rounded-xl border"
        style={{ borderColor: `${CLUB.accent}26` }}
      >
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="bg-[#111111] text-[#888888]">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Thumbnail
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Player
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Event
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Min
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Match
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-[#0D0D0D]">
            {filtered.map((moment) => (
              <tr
                key={moment.id}
                className="transition hover:bg-white/[0.02]"
              >
                {/* Thumbnail placeholder */}
                <td className="px-4 py-3">
                  <div
                    className="flex h-10 w-14 items-center justify-center rounded border border-white/5 bg-[#1F1F1F]"
                  >
                    <div
                      className="h-4 w-8 rounded-sm opacity-30"
                      style={{ backgroundColor: CLUB.accent }}
                    />
                  </div>
                </td>

                <td className="px-4 py-3 font-medium text-white">
                  {moment.player}
                </td>

                <td className="px-4 py-3">
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${CLUB.accent}15`,
                      color: CLUB.accent,
                    }}
                  >
                    {moment.eventType}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span
                    className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: CLUB.accent }}
                  >
                    {moment.minute}&apos;
                  </span>
                </td>

                <td className="px-4 py-3 text-[#888888]">{moment.match}</td>

                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      moment.status === "Published"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : moment.status === "Draft"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-[#555555]"
                    }`}
                  >
                    {moment.status}
                  </span>
                  {moment.featured && (
                    <Star
                      className="ml-1.5 inline h-3 w-3"
                      style={{ color: CLUB.accent }}
                      fill={CLUB.accent}
                    />
                  )}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleStatus(moment.id)}
                      className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-white"
                      title={
                        moment.status === "Published"
                          ? "Unpublish"
                          : "Publish"
                      }
                    >
                      {moment.status === "Published" ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleFeatured(moment.id)}
                      className="rounded p-1 text-[#888888] transition hover:bg-white/5"
                      style={{
                        color: moment.featured ? CLUB.accent : undefined,
                      }}
                      title={
                        moment.featured ? "Remove feature" : "Feature"
                      }
                    >
                      <Star
                        className="h-3.5 w-3.5"
                        fill={moment.featured ? CLUB.accent : "none"}
                      />
                    </button>
                    <button
                      onClick={() => deleteMoment(moment.id)}
                      className="rounded p-1 text-[#888888] transition hover:bg-white/5 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-[#555555]"
                >
                  No moments match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
