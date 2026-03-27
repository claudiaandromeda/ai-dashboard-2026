"use client";

/* ------------------------------------------------------------------ */
/*  PlayerBadge — landscape steampunk metal engraving                  */
/*  Brass nameplate × military dog tag × Victorian engineering plaque  */
/*  Sits below artwork on merch like an engraved museum plate.         */
/* ------------------------------------------------------------------ */

import { useEffect, useRef } from "react";

export interface PlayerBadgeProps {
  playerName: string;
  jerseyNumber: number;
  eventType?: string;
  minute?: number;
  xg?: number;
  technique?: string;
  bodyPart?: string;
  matchResult?: string;
  homeTeam?: string;
  awayTeam?: string;
  teamName: string;
  teamPrimaryColor: string;
  teamSecondaryColor?: string;
  competition?: string;
  date?: string;
  avatarUrl?: string;
  quote?: string;
  compact?: boolean;
}

/* ── Engraved text style ──────────────────────────────────────────── */
const ENGRAVED: React.CSSProperties = {
  color: "#999",
  textShadow:
    "0 -1px 0 rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.15)",
};

const ENGRAVED_DIM: React.CSSProperties = {
  color: "#666",
  textShadow:
    "0 -1px 0 rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.10)",
};

/* ── Quotes pool ──────────────────────────────────────────────────── */
const QUOTES = [
  "The beautiful game, immortalised",
  "A moment frozen in metal",
  "History cannot be unwritten",
  "Where legends are forged",
];

/* ── Keyframe injection ───────────────────────────────────────────── */
const SHEEN_ID = "playerBadge-sheen";
let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;

  const sheet = document.createElement("style");
  sheet.textContent = `
    @keyframes ${SHEEN_ID} {
      0%   { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(200%) skewX(-15deg); }
    }
  `;
  document.head.appendChild(sheet);
}

/* ── Rivet component ──────────────────────────────────────────────── */
function Rivet({
  top,
  left,
  right,
  bottom,
  size,
}: {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  size: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, #777 0%, #444 50%, #2a2a2e 100%)`,
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.6)",
        pointerEvents: "none",
      }}
    />
  );
}

/* ── Engraved divider with diamond ────────────────────────────────── */
function EngravedDivider({ compact }: { compact: boolean }) {
  const h = compact ? 1 : 1;
  const diamond = compact ? 4 : 5;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: `${compact ? 2 : 4}px 0`,
      }}
    >
      <div
        style={{
          flex: 1,
          height: h,
          background:
            "linear-gradient(90deg, transparent, #555 20%, #555 80%, transparent)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          width: diamond,
          height: diamond,
          transform: "rotate(45deg)",
          background: "#555",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.1), inset 0 0 1px rgba(0,0,0,0.5)",
          margin: `0 ${compact ? 3 : 5}px`,
          flexShrink: 0,
        }}
      />
      <div
        style={{
          flex: 1,
          height: h,
          background:
            "linear-gradient(90deg, transparent, #555 20%, #555 80%, transparent)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.08)",
        }}
      />
    </div>
  );
}

/* ================================================================== */
/*  PlayerBadge                                                        */
/* ================================================================== */

export default function PlayerBadge({
  playerName,
  jerseyNumber,
  eventType = "Goal",
  minute,
  xg,
  technique,
  bodyPart,
  matchResult,
  homeTeam,
  awayTeam,
  teamName,
  teamPrimaryColor,
  teamSecondaryColor,
  competition,
  date,
  avatarUrl,
  quote,
  compact = false,
}: PlayerBadgeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectStyles();
  }, []);

  /* ── Derived values ─────────────────────────────────────────────── */
  const teamInitial = teamName.charAt(0).toUpperCase();
  const playerInitial = playerName.charAt(0).toUpperCase();

  const displayQuote =
    quote || QUOTES[playerName.length % QUOTES.length];

  /* Build moment line parts */
  const momentParts = [technique, minute != null ? `${minute}TH MINUTE` : null, bodyPart]
    .filter(Boolean)
    .map((s) => (s as string).toUpperCase());

  /* ── Sizes ──────────────────────────────────────────────────────── */
  const rivetSize = compact ? 5 : 8;
  const rivetInset = compact ? 6 : 10;
  const innerBorderInset = compact ? 4 : 7;
  const crestSize = compact ? 28 : 44;
  const pad = compact ? 6 : 14;

  /* Cross-hatch SVG pattern */
  const crossHatchSvg = `url("data:image/svg+xml,%3Csvg width='8' height='8' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0L8 8M8 0L0 8' stroke='%23888' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E")`;

  return (
    <div
      ref={containerRef}
      className="group"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "5 / 2",
        userSelect: "none",
        perspective: 800,
      }}
    >
      {/* ── Outer plate ─────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: compact ? 4 : 6,
          border: "2px solid #555",
          boxShadow: [
            "inset 0 0 0 1px #333",
            "inset 0 0 0 3px #444",
            "0 4px 16px rgba(0,0,0,0.6)",
            "0 8px 32px rgba(0,0,0,0.3)",
          ].join(", "),
          background:
            "linear-gradient(135deg, #1a1a1e 0%, #3a3a40 30%, #4a4a50 50%, #3a3a40 70%, #1a1a1e 100%)",
          overflow: "hidden",
          transition:
            "transform 0.4s cubic-bezier(.25,.46,.45,.94)",
        }}
      >
        {/* ── Hover 3D tilt ─────────────────────────────────────── */}
        <style>{`
          .group:hover > div:first-child {
            transform: rotateY(2deg) rotateX(-1deg) scale(1.01);
          }
        `}</style>

        {/* ── Cross-hatch texture ───────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: crossHatchSvg,
            backgroundSize: "8px 8px",
            opacity: 0.04,
            pointerEvents: "none",
          }}
        />

        {/* ── Metallic sheen on hover ───────────────────────────── */}
        <div
          className="opacity-0 group-hover:opacity-100"
          style={{
            position: "absolute",
            inset: 0,
            overflow: "hidden",
            pointerEvents: "none",
            transition: "opacity 0.3s",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "50%",
              height: "100%",
              background:
                "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
              animation: `${SHEEN_ID} 1.2s ease-in-out`,
              animationFillMode: "forwards",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* ── Decorative inner border (engraved frame line) ────── */}
        <div
          style={{
            position: "absolute",
            top: innerBorderInset,
            left: innerBorderInset,
            right: innerBorderInset,
            bottom: innerBorderInset,
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.3)",
            borderRadius: compact ? 2 : 3,
            pointerEvents: "none",
          }}
        />

        {/* ── Corner rivets ─────────────────────────────────────── */}
        <Rivet top={rivetInset} left={rivetInset} size={rivetSize} />
        <Rivet top={rivetInset} right={rivetInset} size={rivetSize} />
        <Rivet bottom={rivetInset} left={rivetInset} size={rivetSize} />
        <Rivet bottom={rivetInset} right={rivetInset} size={rivetSize} />

        {/* ── Content layout ────────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            display: "flex",
            padding: `${pad + (compact ? 4 : 8)}px ${pad + (compact ? 6 : 12)}px`,
            gap: compact ? 6 : 14,
          }}
        >
          {/* ═══════════════════════════════════════════════════════
              LEFT ZONE — Team crest (20%)
          ═══════════════════════════════════════════════════════ */}
          <div
            style={{
              flex: "0 0 18%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: compact ? 2 : 5,
            }}
          >
            {/* Team crest circle */}
            <div
              style={{
                width: crestSize,
                height: crestSize,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                background:
                  "radial-gradient(circle at 40% 35%, #555 0%, #333 60%, #222 100%)",
                border: `${compact ? 1.5 : 2}px solid #666`,
                boxShadow: [
                  "inset 0 1px 2px rgba(0,0,0,0.5)",
                  "0 1px 0 rgba(255,255,255,0.08)",
                  `0 0 6px ${teamPrimaryColor}33`,
                ].join(", "),
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={playerName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    ...ENGRAVED,
                    fontSize: compact ? 10 : 16,
                    fontWeight: 700,
                    fontFamily:
                      "var(--font-display), 'Barlow Condensed', sans-serif",
                  }}
                >
                  {playerInitial}
                </span>
              )}
            </div>

            {/* Team name */}
            <span
              style={{
                ...ENGRAVED_DIM,
                fontSize: compact ? 4 : 7,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                textAlign: "center",
                fontFamily:
                  "var(--font-display), 'Barlow Condensed', sans-serif",
                lineHeight: 1.2,
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {teamName}
            </span>
          </div>

          {/* ═══════════════════════════════════════════════════════
              CENTRE ZONE — Main data (55%)
          ═══════════════════════════════════════════════════════ */}
          <div
            style={{
              flex: "1 1 55%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minWidth: 0,
            }}
          >
            {/* Player name — largest text */}
            <p
              style={{
                ...ENGRAVED,
                color: "#aaa",
                fontSize: compact ? 10 : 20,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                fontFamily:
                  "var(--font-display), 'Barlow Condensed', sans-serif",
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {playerName}
            </p>

            {/* Jersey number */}
            <p
              style={{
                ...ENGRAVED_DIM,
                fontSize: compact ? 6 : 11,
                fontWeight: 600,
                letterSpacing: "0.15em",
                fontFamily:
                  "var(--font-display), 'Barlow Condensed', sans-serif",
                marginTop: compact ? 0 : 1,
              }}
            >
              #{jerseyNumber}
            </p>

            {/* Divider */}
            <EngravedDivider compact={compact} />

            {/* Match result line */}
            {homeTeam && matchResult && awayTeam && (
              <p
                style={{
                  ...ENGRAVED,
                  fontSize: compact ? 5 : 9,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  fontFamily:
                    "var(--font-display), 'Barlow Condensed', sans-serif",
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {homeTeam}{" "}
                <span style={{ color: "#bbb", fontWeight: 700 }}>
                  {matchResult.replace("-", " – ")}
                </span>{" "}
                {awayTeam}
              </p>
            )}

            {/* Competition + date */}
            {(competition || date) && (
              <p
                style={{
                  ...ENGRAVED_DIM,
                  fontSize: compact ? 4 : 7,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontFamily:
                    "var(--font-body), sans-serif",
                  lineHeight: 1.3,
                  marginTop: compact ? 0 : 1,
                }}
              >
                {[competition, date].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Second divider */}
            {momentParts.length > 0 && (
              <EngravedDivider compact={compact} />
            )}

            {/* The moment line */}
            {momentParts.length > 0 && (
              <p
                style={{
                  ...ENGRAVED,
                  fontSize: compact ? 4 : 7,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontFamily:
                    "var(--font-body), sans-serif",
                  lineHeight: 1.3,
                }}
              >
                {momentParts.join(" · ")}
              </p>
            )}

            {/* xG stat */}
            {xg != null && (
              <p
                style={{
                  ...ENGRAVED_DIM,
                  fontSize: compact ? 4 : 7,
                  fontWeight: 500,
                  fontFamily: "var(--font-body), sans-serif",
                  marginTop: compact ? 0 : 1,
                }}
              >
                <span
                  style={{
                    fontSize: compact ? 3 : 6,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  xG:{" "}
                </span>
                {xg.toFixed(3)}
              </p>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════
              RIGHT ZONE — Minute + event type (25%)
          ═══════════════════════════════════════════════════════ */}
          <div
            style={{
              flex: "0 0 22%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: compact ? 1 : 3,
            }}
          >
            {/* Large minute number */}
            {minute != null && (
              <div style={{ textAlign: "center" }}>
                <span
                  style={{
                    ...ENGRAVED,
                    color: "#b8a472",
                    textShadow:
                      "0 -1px 0 rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.12), 0 0 12px rgba(184,164,114,0.15)",
                    fontSize: compact ? 20 : 42,
                    fontWeight: 800,
                    fontFamily:
                      "var(--font-display), 'Barlow Condensed', sans-serif",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {minute}
                </span>
                <span
                  style={{
                    ...ENGRAVED,
                    color: "#b8a472",
                    textShadow:
                      "0 -1px 0 rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.12)",
                    fontSize: compact ? 10 : 20,
                    fontWeight: 700,
                    fontFamily:
                      "var(--font-display), 'Barlow Condensed', sans-serif",
                    lineHeight: 1,
                  }}
                >
                  ʼ
                </span>
              </div>
            )}

            {/* Event type pill */}
            <span
              style={{
                display: "inline-block",
                padding: compact ? "1px 4px" : "2px 8px",
                borderRadius: compact ? 2 : 3,
                border: "1px solid #555",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.4)",
                background:
                  "linear-gradient(180deg, #3a3a40 0%, #2a2a2e 100%)",
                ...ENGRAVED,
                fontSize: compact ? 4 : 7,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontFamily:
                  "var(--font-display), 'Barlow Condensed', sans-serif",
              }}
            >
              {eventType}
            </span>

            {/* Quote */}
            {!compact && (
              <p
                style={{
                  ...ENGRAVED_DIM,
                  fontSize: 6,
                  fontStyle: "italic",
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  textAlign: "center",
                  lineHeight: 1.3,
                  maxWidth: "100%",
                  marginTop: 2,
                  color: "#555",
                }}
              >
                &ldquo;{displayQuote}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            BOTTOM STRIP — Authenticity footer
        ═══════════════════════════════════════════════════════════ */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: compact ? "1px 8px" : "3px 14px",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 100%)",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              ...ENGRAVED_DIM,
              fontSize: compact ? 3 : 5,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontFamily: "var(--font-body), sans-serif",
              color: "#444",
              textShadow:
                "0 -1px 0 rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            EMOTIVX · AUTHENTIC MOMENT · VERIFIED DATA · №{" "}
            {generateSerial(playerName, jerseyNumber)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Deterministic serial number from player name + jersey. */
function generateSerial(name: string, num: number): string {
  let hash = 0;
  const str = `${name}${num}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash);
  return `EMX-${String(abs).slice(0, 4).padStart(4, "0")}-${String(abs).slice(4, 8).padStart(4, "0")}`;
}
