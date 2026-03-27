"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

const TEAMS = [
  { id: "man-utd", name: "Manchester United" },
  { id: "wrexham", name: "Wrexham AFC" },
  { id: "spain", name: "Spain" },
  { id: "france", name: "France" },
  { id: "germany", name: "Germany" },
  { id: "england", name: "England" },
  { id: "portugal", name: "Portugal" },
  { id: "netherlands", name: "Netherlands" },
  { id: "italy", name: "Italy" },
  { id: "croatia", name: "Croatia" },
];

export default function ProfilePage() {
  const { profile } = useAuth();

  const [displayName, setDisplayName] = useState(
    profile?.display_name ?? ""
  );
  const [favouriteTeam, setFavouriteTeam] = useState(
    profile?.favourite_team_id ?? ""
  );
  const [saved, setSaved] = useState(false);

  const initial = profile?.display_name?.[0] ?? profile?.email?.[0] ?? "?";

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Profile</h1>

      {/* Avatar */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1a1a1a] text-3xl font-bold uppercase text-white ring-2 ring-[rgba(220,38,38,0.3)]">
          {initial}
        </div>
        <div>
          <p className="text-sm text-[#888]">
            Your avatar is generated from your initials
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Display name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your name"
            className="w-full rounded border border-[rgba(220,38,38,0.15)] bg-[#1F1F1F] px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors focus:border-[#DC2626]"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
            Email
          </label>
          <input
            type="email"
            value={profile?.email ?? ""}
            readOnly
            className="w-full cursor-not-allowed rounded border border-[rgba(220,38,38,0.1)] bg-[#161616] px-3 py-2.5 text-sm text-[#666]"
          />
        </div>

        {/* Favourite team */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#888]">
            Favourite Team
          </label>
          <select
            value={favouriteTeam}
            onChange={(e) => setFavouriteTeam(e.target.value)}
            className="w-full rounded border border-[rgba(220,38,38,0.15)] bg-[#1F1F1F] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#DC2626]"
          >
            <option value="">Select a team</option>
            {TEAMS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="mt-2 rounded bg-[#DC2626] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#b91c1c]"
        >
          {saved ? "Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
