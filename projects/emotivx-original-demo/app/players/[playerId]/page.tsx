import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getPlayerDetail,
  getAllPlayerIds,
  type PlayerDetail,
  type PlayerMoment,
} from "@/lib/player-details";

/* ------------------------------------------------------------------ */
/*  Static params                                                      */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllPlayerIds().map((id) => ({ playerId: id }));
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const p = getPlayerDetail(playerId);
  if (!p) return { title: "Player Not Found" };
  return {
    title: `${p.name} — EmotivX`,
    description: `${p.name} #${p.number} — stats, moments, and signature data line.`,
  };
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function PlayerCardPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const player = getPlayerDetail(playerId);
  if (!player) notFound();

  return (
    <div className="min-h-screen bg-[#080810]">
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-10">
        {/* Back link */}
        <Link
          href={player.teamId ? `/teams/${player.teamId}` : "/"}
          className="inline-flex items-center gap-1.5 text-xs text-[#888888] transition hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to {player.teamName}
        </Link>

        {/* ---- Header ---- */}
        <HeaderSection player={player} />

        {/* ---- Stats Grid ---- */}
        <StatsGrid player={player} />

        {/* ---- Data Line Visualisation ---- */}
        <DataLineSection player={player} />

        {/* ---- Moments ---- */}
        <MomentsSection player={player} />

        {/* ---- CTA ---- */}
        <div className="mt-12 text-center">
          <Link
            href={`/moments/create?player=${player.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-8 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Create Merch from This Player &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header Section                                                     */
/* ------------------------------------------------------------------ */

function HeaderSection({ player }: { player: PlayerDetail }) {
  const initials = player.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  return (
    <section
      className="mt-8 flex flex-col items-center gap-6 rounded-2xl border border-white/5 px-6 py-10 md:flex-row md:gap-10 md:px-10"
      style={{
        background: `linear-gradient(135deg, ${player.teamColor}18 0%, #111111 60%)`,
      }}
    >
      {/* Large avatar circle */}
      <div className="relative shrink-0">
        <div
          className="flex h-[140px] w-[140px] items-center justify-center rounded-full text-5xl font-bold text-white md:h-[180px] md:w-[180px] md:text-6xl"
          style={{ backgroundColor: `${player.teamColor}40` }}
        >
          {initials}
        </div>
        {/* Jersey number badge */}
        <span
          className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: player.teamColor }}
        >
          #{player.number}
        </span>
      </div>

      {/* Name + meta */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-bold text-white md:text-4xl">
          {player.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 md:justify-start">
          <span
            className="rounded-full px-3 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: player.teamColor }}
          >
            #{player.number}
          </span>
          <span className="text-sm text-[#888888]">{player.teamName}</span>
          <span className="text-sm text-[#888888]">&middot;</span>
          <span className="text-sm text-[#888888]">{player.position}</span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats Grid (2 rows x 4 cols)                                       */
/* ------------------------------------------------------------------ */

function StatsGrid({ player }: { player: PlayerDetail }) {
  const stats = [
    { label: "Appearances", value: player.stats.appearances },
    { label: "Goals", value: player.stats.goals },
    { label: "Assists", value: player.stats.assists },
    { label: "Minutes Played", value: player.stats.minutesPlayed },
    { label: "Yellow Cards", value: player.stats.yellowCards },
    { label: "Red Cards", value: player.stats.redCards },
  ];

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        Stats
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-white/5 bg-[#111111] px-4 py-5 text-center"
          >
            <p
              className="text-3xl font-bold"
              style={{ color: player.teamColor }}
            >
              {s.value.toLocaleString()}
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-widest text-[#888888]">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Data Line Visualisation (placeholder)                              */
/* ------------------------------------------------------------------ */

function DataLineSection({ player }: { player: PlayerDetail }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        Data Line Visualisation
      </h2>
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-white/5 bg-black">
        <p className="text-sm text-[#888888]" style={{ color: `${player.teamColor}88` }}>
          Player data line coming soon
        </p>
      </div>
      {player.signatureDescription && (
        <p className="mt-3 text-xs text-[#9CA3AF]">
          {player.signatureDescription}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Moments Section                                                    */
/* ------------------------------------------------------------------ */

function MomentsSection({ player }: { player: PlayerDetail }) {
  if (player.moments.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
          Moments
        </h2>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-white/5 bg-[#111111] py-14">
          <p className="text-sm text-white">No moments yet</p>
          <p className="text-xs text-[#888888]">
            Check back during live matches
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#888888]">
        Moments
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {player.moments.map((m) => (
          <MomentCard key={m.id} moment={m} teamColor={player.teamColor} />
        ))}
      </div>
    </section>
  );
}

function MomentCard({
  moment,
  teamColor,
}: {
  moment: PlayerMoment;
  teamColor: string;
}) {
  const fmtDate = new Date(moment.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-[#111111] p-5">
      <div>
        {/* Event type badge */}
        <span
          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white ${
            moment.type === "goal" ? "bg-red-600" : "bg-blue-600"
          }`}
        >
          {moment.type}
        </span>

        {/* Minute */}
        <p className="mt-3 text-lg font-bold text-white">
          {moment.minute}&apos;
        </p>

        {/* Match info */}
        <p className="mt-1 text-xs text-[#888888]">
          vs {moment.opponent} &middot; {fmtDate}
        </p>

        {/* Description */}
        <p className="mt-2 text-xs leading-relaxed text-[#9CA3AF]">
          {moment.description}
        </p>
      </div>

      <Link
        href={`/moments/create?moment=${moment.id}`}
        className="mt-4 text-xs font-bold transition hover:opacity-80"
        style={{ color: teamColor }}
      >
        Create Merch &rarr;
      </Link>
    </div>
  );
}
