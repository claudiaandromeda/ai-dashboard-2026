"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

interface ClubResult {
  id: string;
  name: string;
  short_name: string | null;
  primary_color: string | null;
}

interface PlayerResult {
  id: string;
  name: string;
  position: string | null;
  club_id: string | null;
  clubs: { name: string } | null;
}

interface CompetitionResult {
  id: string;
  name: string;
  short_name: string | null;
  country: string | null;
  season: string | null;
}

interface SearchResults {
  clubs: ClubResult[];
  players: PlayerResult[];
  competitions: CompetitionResult[];
}

export default function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data: SearchResults = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(() => search(value), 300);
  };

  const close = () => {
    setOpen(false);
  };

  const navigate = (path: string) => {
    close();
    setQuery("");
    router.push(path);
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const hasResults =
    results &&
    (results.clubs.length > 0 ||
      results.players.length > 0 ||
      results.competitions.length > 0);

  const showDropdown = open && (loading || results !== null);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#888888]" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => {
          if (results && query.trim().length >= 2) setOpen(true);
        }}
        placeholder="Search teams, players..."
        className="w-48 rounded-lg border border-white/10 bg-[#1F1F1F] py-2 pl-9 pr-3 text-xs text-white placeholder-[#888888] outline-none focus:border-[#8AE234]/40 focus:w-64 transition-all"
      />

      {showDropdown && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A] shadow-2xl">
          {loading && !results && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-[#888888]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Searching...
            </div>
          )}

          {results && !hasResults && !loading && (
            <div className="px-4 py-3 text-xs text-[#888888]">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results && hasResults && (
            <div className="max-h-80 overflow-y-auto">
              {/* Teams */}
              {results.clubs.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
                    Teams
                  </div>
                  {results.clubs.map((club) => (
                    <button
                      key={club.id}
                      onClick={() => navigate(`/teams/${club.id}`)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-white transition hover:bg-white/5"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: club.primary_color || "#888888",
                        }}
                      />
                      <span className="truncate font-medium">{club.name}</span>
                      {club.short_name && (
                        <span className="ml-auto shrink-0 text-[10px] text-[#888888]">
                          {club.short_name}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Players */}
              {results.players.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
                    Players
                  </div>
                  {results.players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => navigate(`/players/${player.id}`)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-white transition hover:bg-white/5"
                    >
                      <span className="truncate font-medium">
                        {player.name}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-[#888888]">
                        {player.position && <span>{player.position}</span>}
                        {player.clubs?.name && (
                          <>
                            {player.position && <span>&middot;</span>}
                            <span>{player.clubs.name}</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Competitions */}
              {results.competitions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
                    Competitions
                  </div>
                  {results.competitions.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => navigate(`/competitions/euro-2024`)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-xs text-white transition hover:bg-white/5"
                    >
                      <span className="truncate font-medium">{comp.name}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-[#888888]">
                        {comp.country && <span>{comp.country}</span>}
                        {comp.season && (
                          <>
                            {comp.country && <span>&middot;</span>}
                            <span>{comp.season}</span>
                          </>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading && results && (
            <div className="flex items-center gap-2 border-t border-white/5 px-4 py-2 text-[10px] text-[#888888]">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
