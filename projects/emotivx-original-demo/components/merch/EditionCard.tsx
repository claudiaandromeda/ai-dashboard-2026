"use client";

export interface EditionCardProps {
  scorerName: string;
  scorerNumber?: number | null;
  minute: number | null;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  matchDate: string;
  teamColour?: string;
  accentColour?: string;
}

/** Smart abbreviation — preserves Sheffield UTD vs WED disambiguation */
function abbrev(name: string): string {
  return name
    .toUpperCase()
    .replace("UNITED", "UTD")
    .replace("WEDNESDAY", "WED")
    .replace("ATHLETIC", "ATH")
    .replace("WANDERERS", "WAN");
}

/** Format ordinal suffix: 80 → "80TH", 1 → "1ST" */
function ordinal(n: number): string {
  const s = ["TH", "ST", "ND", "RD"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Format display name: "Josh Windass" → "J. WINDASS" */
function fmtName(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(" ").toUpperCase()}`;
  }
  return raw.toUpperCase();
}

export default function EditionCard({
  scorerName,
  scorerNumber,
  minute,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchDate,
  teamColour = "#8AE234",
  accentColour = "#C9A84C",
}: EditionCardProps) {
  const disp    = fmtName(scorerName);
  const minStr  = minute != null ? `${minute}'` : "";
  const minLbl  = minute != null ? `${ordinal(minute)} MINUTE` : "";
  const ht      = abbrev(homeTeam);
  const at      = abbrev(awayTeam);
  const matchup =
    homeScore != null && awayScore != null
      ? `${ht}  ${homeScore} – ${awayScore}  ${at}`
      : `${ht}  vs  ${at}`;

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{
        background: "rgb(18,18,20)",
        border: `2px solid ${accentColour}`,
        boxShadow: `0 0 0 1px rgba(40,38,28,0.6) inset, 0 0 18px 2px ${accentColour}22`,
      }}
    >
      {/* Corner rivets */}
      {[
        "top-2 left-2",
        "top-2 right-2",
        "bottom-2 left-2",
        "bottom-2 right-2",
      ].map((pos) => (
        <span
          key={pos}
          className={`absolute ${pos} h-2.5 w-2.5 rounded-full`}
          style={{
            background: "rgb(40,38,30)",
            border: `1.5px solid ${accentColour}99`,
          }}
        />
      ))}

      <div className="flex items-stretch px-4 py-4">
        {/* ── LEFT COL: minute + GOAL pill ───────────────────── */}
        <div
          className="flex shrink-0 flex-col items-center justify-center gap-2 pr-3"
          style={{ minWidth: "4.5rem" }}
        >
          {/* Big minute */}
          <span
            className="block text-center font-black leading-none tabular-nums"
            style={{ color: accentColour, fontSize: "2.6rem" }}
          >
            {minStr}
          </span>

          {/* GOAL pill */}
          <span
            className="block rounded px-3 py-1 text-center text-xs font-black tracking-widest uppercase"
            style={{
              color: accentColour,
              border: `1.5px solid ${accentColour}cc`,
              background: "rgb(30,28,18)",
              letterSpacing: "0.12em",
            }}
          >
            GOAL
          </span>
        </div>

        {/* Vertical divider */}
        <div
          className="mx-1 shrink-0 self-stretch rounded-full"
          style={{ width: 1, background: `${accentColour}44` }}
        />

        {/* ── RIGHT COL: player info ──────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pl-3">
          {/* Player name */}
          <p
            className="truncate text-lg font-black leading-tight"
            style={{ color: "rgb(235,232,220)" }}
          >
            {disp}
          </p>

          {/* Jersey number */}
          {scorerNumber != null && (
            <p
              className="text-sm font-bold leading-tight"
              style={{ color: `${accentColour}cc` }}
            >
              #{scorerNumber}
            </p>
          )}

          {/* Matchup */}
          <p
            className="truncate text-[11px] font-semibold leading-snug"
            style={{ color: "rgb(180,175,145)" }}
          >
            {matchup}
          </p>

          {/* Minute label */}
          {minLbl && (
            <p
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "rgb(140,135,105)" }}
            >
              {minLbl}
            </p>
          )}
        </div>
      </div>

      {/* Tagline */}
      <p
        className="border-t pb-2 pt-1.5 text-center text-[9px] tracking-wide"
        style={{
          borderColor: `${accentColour}22`,
          color: "rgb(90,85,60)",
        }}
      >
        Officially certified moment · 1 of 200 · emotivx.com
      </p>
    </div>
  );
}
