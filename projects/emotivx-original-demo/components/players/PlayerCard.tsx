import Link from "next/link";

interface PlayerCardProps {
  id: string;
  name: string;
  number: number;
  position: string;
  accentColor: string;
  /** When true, the card links to /players/[id] */
  linked?: boolean;
}

export default function PlayerCard({
  id,
  name,
  number,
  position,
  accentColor,
  linked = false,
}: PlayerCardProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("");

  const card = (
    <div className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-white/5 bg-[#111111] p-4 transition hover:border-white/10">
      {/* Avatar */}
      <div className="relative">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: `${accentColor}33` }}
        >
          {initials}
        </div>
        {/* Jersey number badge */}
        <span
          className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
          style={{ backgroundColor: accentColor }}
        >
          {number}
        </span>
      </div>
      <p className="text-center text-xs font-medium text-white">{name}</p>
      <p className="text-[10px] uppercase tracking-wider text-[#888888]">
        {position}
      </p>
    </div>
  );

  if (linked) {
    return <Link href={`/players/${id}`}>{card}</Link>;
  }

  return card;
}
