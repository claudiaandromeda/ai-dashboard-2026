"use client";

import { Heart } from "lucide-react";

type FavouriteMoment = {
  id: string;
  title: string;
  player: string;
  match: string;
  minute: number;
};

const PLACEHOLDER_FAVOURITES: FavouriteMoment[] = [
  {
    id: "fav-1",
    title: "Bicycle Kick vs Man City",
    player: "Wayne Rooney",
    match: "Man Utd 2-1 Man City",
    minute: 78,
  },
  {
    id: "fav-2",
    title: "Volley vs Scotland",
    player: "Jamal Musiala",
    match: "Germany 5-1 Scotland",
    minute: 68,
  },
  {
    id: "fav-3",
    title: "Header vs France",
    player: "Dani Olmo",
    match: "Spain 2-1 France",
    minute: 25,
  },
];

export default function FavouritesPage() {
  const favourites = PLACEHOLDER_FAVOURITES;

  if (favourites.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <Heart size={48} className="mb-4 text-[#333]" />
        <p className="text-[#888]">No favourites yet</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Your Favourites</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {favourites.map((fav) => (
          <div
            key={fav.id}
            className="group rounded-lg border border-[rgba(220,38,38,0.15)] bg-[#111] p-4 transition-colors hover:border-[rgba(220,38,38,0.35)]"
          >
            {/* Placeholder image area */}
            <div className="mb-3 flex h-32 items-center justify-center rounded bg-[#1a1a1a]">
              <span className="text-xs uppercase tracking-widest text-[#333]">
                Moment Preview
              </span>
            </div>

            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{fav.title}</h3>
                <p className="mt-0.5 text-xs text-[#888]">{fav.player}</p>
                <p className="mt-1 text-xs text-[#666]">
                  {fav.match} · {fav.minute}&apos;
                </p>
              </div>
              <button className="text-[#DC2626] transition-opacity hover:opacity-70">
                <Heart size={16} fill="currentColor" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
