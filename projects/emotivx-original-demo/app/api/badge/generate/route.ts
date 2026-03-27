import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  POST /api/badge/generate                                           */
/*  Receives badge data, returns server-rendered HTML of the badge.    */
/*  In a future phase this can use html-to-image / canvas to return    */
/*  a PNG — for now we return the HTML string as base64.               */
/* ------------------------------------------------------------------ */

interface BadgePayload {
  playerName: string;
  jerseyNumber: number;
  eventType?: string;
  minute?: number;
  matchResult?: string;
  homeTeam?: string;
  awayTeam?: string;
  teamName: string;
  teamPrimaryColor: string;
  teamSecondaryColor?: string;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as BadgePayload;

  const {
    playerName,
    jerseyNumber,
    eventType = "Goal",
    minute,
    matchResult,
    homeTeam,
    awayTeam,
    teamName,
    teamPrimaryColor,
    teamSecondaryColor,
  } = body;

  if (!playerName || jerseyNumber == null || !teamName || !teamPrimaryColor) {
    return NextResponse.json(
      { error: "Missing required fields: playerName, jerseyNumber, teamName, teamPrimaryColor" },
      { status: 400 },
    );
  }

  const initial = playerName.charAt(0).toUpperCase();
  const teamInitial = teamName.charAt(0).toUpperCase();
  const secondary = teamSecondaryColor || teamPrimaryColor;

  const matchLine = [
    minute != null ? `${minute} min` : null,
    homeTeam && matchResult && awayTeam ? `${homeTeam} ${matchResult} ${awayTeam}` : null,
  ]
    .filter(Boolean)
    .join(" \u00B7 ");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: transparent; }
  .badge {
    width: 300px;
    height: 400px;
    border-radius: 16px;
    background: ${teamPrimaryColor};
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', 'SF Mono', monospace;
  }
  .dots {
    position: absolute;
    inset: 0;
    opacity: 0.08;
    background-image: radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px);
    background-size: 10px 10px;
  }
  .diag {
    position: absolute;
    inset: 0;
    opacity: 0.04;
    background-image: repeating-linear-gradient(135deg, transparent, transparent 8px, rgba(255,255,255,0.3) 8px, rgba(255,255,255,0.3) 9px);
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%);
  }
  .content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 24px;
    width: 100%;
    height: 100%;
  }
  .crest {
    width: 48px; height: 48px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    font-weight: bold; font-size: 18px; color: white;
  }
  .event-pill {
    background: rgba(0,0,0,0.55);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 4px 16px;
    font-size: 10px; font-weight: bold;
    text-transform: uppercase; letter-spacing: 0.2em;
    color: white;
  }
  .name-strip {
    width: 100%;
    background: rgba(0,0,0,0.65);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 8px;
    padding: 8px 12px;
    text-align: center;
  }
  .name-strip p {
    font-size: 12px; font-weight: bold;
    letter-spacing: 0.1em; color: white;
  }
  .avatar {
    width: 96px; height: 96px; border-radius: 50%;
    background: ${secondary};
    border: 3px solid rgba(255,255,255,0.12);
    display: flex; align-items: center; justify-content: center;
    font-size: 30px; font-weight: bold; color: white;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .signature {
    font-family: Georgia, serif;
    font-style: italic;
    font-size: 14px;
    color: rgba(255,255,255,0.6);
  }
  .match-info {
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    text-align: center;
  }
</style>
</head>
<body>
<div class="badge">
  <div class="dots"></div>
  <div class="diag"></div>
  <div class="vignette"></div>
  <div class="content">
    <div class="crest">${teamInitial}</div>
    <span class="event-pill">${eventType}</span>
    <div class="name-strip"><p>#${jerseyNumber} ${playerName.toUpperCase()}</p></div>
    <div style="flex:1;display:flex;align-items:center">
      <div class="avatar">${initial}</div>
    </div>
    <span class="signature">${playerName}</span>
    ${matchLine ? `<span class="match-info">${matchLine}</span>` : ""}
  </div>
</div>
</body>
</html>`;

  const base64 = Buffer.from(html).toString("base64");

  return NextResponse.json({
    html: base64,
    format: "text/html",
    width: 300,
    height: 400,
  });
}
