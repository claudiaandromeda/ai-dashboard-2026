"use client";

import { Check } from "lucide-react";

const FALLBACK_STYLES = [
  { id: "street",     label: "🎨 Street",     previewUrl: "/previews/style-street.png" },
  { id: "jackson",    label: "🎭 Jackson",    previewUrl: "/previews/style-jackson.png" },
  { id: "geometric",  label: "📐 Geometric",  previewUrl: "/previews/style-geometric.png" },
  { id: "marble",     label: "🏛️ Marble",     previewUrl: "/previews/style-marble.png" },
  { id: "smoky",      label: "💨 Smoky",      previewUrl: "/previews/style-smoky.png" },
  { id: "futuristic", label: "🕸️ Spider",  previewUrl: "/previews/style-futuristic.png" },
  { id: "camo",       label: "🪖 Camo",       previewUrl: "/previews/style-camo.png" },
  { id: "classic",    label: "📰 Classic",    previewUrl: "/previews/style-classic.png" },
  { id: "dali",       label: "🫠 Dalí",       previewUrl: "/previews/style-dali.png" },
] as const;

export type StyleId = string;

export interface PatternOption {
  id: string;
  label: string;
  previewUrl?: string | null;
}

interface Props {
  selected: StyleId;
  onSelect: (id: StyleId) => void;
  accentColor?: string;
  patterns?: PatternOption[];
}

export default function StyleGrid({
  selected,
  onSelect,
  accentColor = "#DA291C",
  patterns,
}: Props) {
  const items: PatternOption[] =
    patterns && patterns.length > 0
      ? patterns
      : FALLBACK_STYLES.map((s) => ({ id: s.id, label: s.label }));

  return (
    <div>
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        🎨 Background Pattern
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {items.map((style) => {
          const active = selected === style.id;
          return (
            <button
              key={style.id}
              onClick={() => onSelect(style.id)}
              className="relative overflow-hidden rounded-lg border bg-[#1A1111] px-3 py-4 text-center text-xs font-medium text-white transition hover:border-opacity-60"
              style={{
                borderColor: active ? accentColor : "rgba(255,255,255,0.08)",
                borderWidth: active ? 2 : 1,
              }}
            >
              {style.previewUrl && (
                <img
                  src={style.previewUrl}
                  alt={style.label}
                  className={`absolute inset-0 h-full w-full object-cover transition ${active ? "opacity-100" : "opacity-40"}`}
                />
              )}
              {active && (
                <span
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                  style={{ backgroundColor: accentColor }}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}
              <span className="relative">{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
