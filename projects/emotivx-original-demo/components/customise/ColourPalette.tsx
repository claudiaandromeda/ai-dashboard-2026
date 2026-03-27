"use client";

import { Lock } from "lucide-react";

export interface ColourValues {
  primary: string;
  secondary: string;
  accent: string;
}

interface Props {
  useTeamColours: boolean;
  onToggleTeamColours: (value: boolean) => void;
  colours: ColourValues;
  onChangeColours: (colours: ColourValues) => void;
  teamColours: ColourValues;
  accentColor?: string;
}

export default function ColourPalette({
  useTeamColours,
  onToggleTeamColours,
  colours,
  onChangeColours,
  teamColours,
  accentColor = "#BA0C2F",
}: Props) {
  const displayed = useTeamColours ? teamColours : colours;
  const fields: { key: keyof ColourValues; label: string }[] = [
    { key: "primary", label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "accent", label: "Accent" },
  ];

  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        🎨 Colour Palette
      </h3>

      {/* Toggle */}
      <label className="mb-4 flex cursor-pointer items-center gap-3">
        <div className="relative">
          <input
            type="checkbox"
            checked={useTeamColours}
            onChange={(e) => onToggleTeamColours(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-[#333] transition peer-checked:bg-opacity-100" style={{ backgroundColor: useTeamColours ? accentColor : "#333" }} />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
        </div>
        <span className="text-xs text-[#9CA3AF]">Use team colours</span>
      </label>

      {/* Colour pickers */}
      <div className="space-y-3">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <div
              className="h-8 w-8 shrink-0 rounded border border-white/10"
              style={{ backgroundColor: displayed[key] }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-[#888888]">
                {label}
              </p>
              {useTeamColours ? (
                <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                  <Lock className="h-3 w-3" />
                  {displayed[key]}
                </div>
              ) : (
                <input
                  type="text"
                  value={displayed[key]}
                  onChange={(e) =>
                    onChangeColours({ ...colours, [key]: e.target.value })
                  }
                  className="w-full rounded border border-white/10 bg-[#1F1F1F] px-2 py-1 text-xs text-white outline-none focus:border-white/20"
                  maxLength={7}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
