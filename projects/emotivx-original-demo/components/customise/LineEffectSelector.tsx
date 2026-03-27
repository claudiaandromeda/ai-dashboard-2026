"use client";

const EFFECTS = [
  { id: "default", label: "Default", icon: "〰️" },
  { id: "laser", label: "Laser", icon: "⚡" },
  { id: "flame", label: "Flame", icon: "🔥" },
  { id: "lightning", label: "Lightning", icon: "⛈️" },
  { id: "ink", label: "Ink", icon: "🖋️" },
  { id: "dotted", label: "Dotted", icon: "⚬" },
] as const;

export type LineEffectId = (typeof EFFECTS)[number]["id"];

interface Props {
  selected: LineEffectId;
  onSelect: (id: LineEffectId) => void;
  accentColor?: string;
}

export default function LineEffectSelector({
  selected,
  onSelect,
  accentColor = "#DA291C",
}: Props) {
  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        ✨ Data Line Effect
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {EFFECTS.map((effect) => {
          const active = selected === effect.id;
          return (
            <button
              key={effect.id}
              onClick={() => onSelect(effect.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-medium transition"
              style={{
                backgroundColor: active ? accentColor : "transparent",
                borderColor: active ? accentColor : "rgba(255,255,255,0.1)",
                color: active ? "#fff" : "#9CA3AF",
              }}
            >
              <span>{effect.icon}</span>
              {effect.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
