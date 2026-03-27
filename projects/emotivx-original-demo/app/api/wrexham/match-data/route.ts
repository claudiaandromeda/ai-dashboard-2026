import { readFileSync } from "fs";
import { join } from "path";

/**
 * Extracts a clean, continuous ball path for a goal's buildup.
 *
 * Problem: StatsBomb events are interleaved from both teams simultaneously.
 * Chaining them naively causes the ball to teleport between unrelated positions.
 *
 * Strategy:
 *  1. Only use same-team events with BOTH start and end coords (passes + shot).
 *  2. Build a chain backwards from the shot: each pass is included only if
 *     its end_x/end_y is within CARRY_TOLERANCE of the next event's start.
 *  3. Gaps between pass.end and next_pass.start are inferred as ground carries.
 *  4. Output: clean { x, y, z, type } waypoints for a CatmullRom spline.
 */
function extractCleanBallPath(
  events: any[],
  shot: any,
  { maxChain = 12, maxIndexGap = 40, carryTolerance = 32 }: { maxChain?: number; maxIndexGap?: number; carryTolerance?: number } = {}
): Array<{ x: number; y: number; z: number; type: "pass" | "carry" | "shot" }> {
  const teamId = shot.team_id;
  const shotIdx = shot.index;
  const CARRY_TOLERANCE = carryTolerance; // max spatial gap to bridge with an inferred carry (pitch units)
  const MAX_CHAIN = maxChain;        // max passes to trace back
  const MAX_INDEX_GAP = maxIndexGap;   // max event-index gap between consecutive chain events
                               // (prevents grabbing passes from earlier possessions)

  // All passes from this team before the shot that have both endpoints
  const passes = events
    .filter(e =>
      e.team_id === teamId &&
      e.index < shotIdx &&
      e.name === "pass" &&
      e.start_x != null && e.end_x != null &&
      e.start_y != null && e.end_y != null
    )
    .sort((a, b) => a.index - b.index);

  // Track which passes we've already used so we don't double-chain
  const usedIndices = new Set<number>();

  // Build chain backwards from shot.
  // At each step, first try a spatial match (pass end within CARRY_TOLERANCE of chain head).
  // If no spatial match, fall back to the most recent same-team pass within MAX_INDEX_GAP
  // (temporal fallback — the ball got there somehow: deflection, header, data imprecision).
  const chain: any[] = [shot];
  let headX = shot.start_x;
  let headY = shot.start_y;
  let headIdx = shotIdx;

  for (let attempt = 0; attempt < MAX_CHAIN; attempt++) {
    let bestMatch: any = null;
    let bestDist = Infinity;

    // Pass 1: strict spatial match (pass.end near chain head)
    for (let i = passes.length - 1; i >= 0; i--) {
      const ev = passes[i];
      if (ev.index >= headIdx) continue;
      if (usedIndices.has(ev.index)) continue;
      if (headIdx - ev.index > MAX_INDEX_GAP) break;
      const dx = ev.end_x - headX;
      const dy = ev.end_y - headY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= CARRY_TOLERANCE && dist < bestDist) {
        bestDist = dist;
        bestMatch = ev;
      }
    }

    // Pass 2: temporal fallback — grab the most recent same-team pass before head
    if (!bestMatch) {
      for (let i = passes.length - 1; i >= 0; i--) {
        const ev = passes[i];
        if (ev.index >= headIdx) continue;
        if (usedIndices.has(ev.index)) continue;
        if (headIdx - ev.index > MAX_INDEX_GAP) break;
        // Take the first (most recent) candidate regardless of spatial distance
        bestMatch = ev;
        break;
      }
    }

    if (!bestMatch) break;
    usedIndices.add(bestMatch.index);
    chain.unshift(bestMatch);
    headX = bestMatch.start_x;
    headY = bestMatch.start_y;
    headIdx = bestMatch.index;
  }

  // Convert to waypoints, inserting carry segments for any spatial gaps
  // Each waypoint has an eventIndex so the frontend can step through individual chain events
  const waypoints: Array<{ x: number; y: number; z: number; type: "pass" | "carry" | "shot"; eventIndex: number }> = [];

  for (let i = 0; i < chain.length; i++) {
    const ev = chain[i];
    const isShot = i === chain.length - 1;
    const evType: "pass" | "carry" | "shot" = isShot ? "shot" : "pass";

    // Start of this event
    const startPt = { x: ev.start_x, y: ev.start_y, z: ev.start_z ?? 0, type: evType, eventIndex: i };

    if (i === 0) {
      waypoints.push(startPt);
    } else {
      // Check gap from previous event's end to this event's start
      const prev = chain[i - 1];
      const prevEndX = prev.end_x ?? prev.start_x;
      const prevEndY = prev.end_y ?? prev.start_y;
      const gapDx = ev.start_x - prevEndX;
      const gapDy = ev.start_y - prevEndY;
      const gap = Math.sqrt(gapDx * gapDx + gapDy * gapDy);

      if (gap > 1.5) {
        // Inferred carry — ball was dribbled on the ground
        // Carries get their own eventIndex (between the two passes)
        const carryIdx = i - 0.5; // fractional index to distinguish carries
        waypoints.push({ x: prevEndX, y: prevEndY, z: 0.1, type: "carry", eventIndex: carryIdx });
        waypoints.push({ x: ev.start_x, y: ev.start_y, z: 0.1, type: "carry", eventIndex: carryIdx });
      }
    }

    // End of this event
    const endZ = isShot ? (ev.end_z ?? 0) : 0.15; // passes stay low; shot may arc
    waypoints.push({ x: ev.end_x, y: ev.end_y, z: endZ, type: evType, eventIndex: i });
  }

  return waypoints;
}

function describeWeather(code: number): string {
  if (code === 0) return "Clear sky ☀️";
  if (code <= 3) return "Partly cloudy ⛅";
  if (code <= 48) return "Foggy 🌫️";
  if (code <= 55) return "Light drizzle 🌦️";
  if (code <= 57) return "Freezing drizzle 🥶";
  if (code <= 65) return "Rain 🌧️";
  if (code <= 67) return "Freezing rain 🥶🌧️";
  if (code <= 77) return "Snow ❄️";
  if (code <= 82) return "Rain showers 🌧️";
  if (code <= 86) return "Snow showers ❄️";
  if (code <= 99) return "Thunderstorm ⛈️";
  return "Unknown";
}

/**
 * GET /api/wrexham/match-data?matchId=1377475
 * Returns the full 360 match bundle: goals, freeze frames, player cards,
 * timeline events, team stats — everything the UI needs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId") || "1377475";
  const maxChain = parseInt(searchParams.get("maxChain") || "12", 10);
  const maxIndexGap = parseInt(searchParams.get("maxIndexGap") || "40", 10);
  const carryTolerance = parseInt(searchParams.get("carryTolerance") || "32", 10);

  try {
    const filePath = join(process.cwd(), "data", "statsbomb", "events", `${matchId}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    const events = data.events;
    const lineups: Record<number, any> = {};
    for (const l of data.lineups) lineups[l.player_id] = l;
    const match = data.match[0];

    // Goals with freeze frames + shot speed
    const goals = events
      .filter((e: any) => e.goal_for != null && e.goal_for !== 0)
      .sort((a: any, b: any) => a.minute - b.minute)
      .map((e: any, index: number) => {
        const player = lineups[e.player_id] || {};
        let freezeFrame = e.freeze_frame;
        if (typeof freezeFrame === "string") freezeFrame = JSON.parse(freezeFrame);

        // Calculate shot speed from distance and duration
        const sx = e.start_x || 0, sy = e.start_y || 0, sz = e.start_z || 0;
        const ex = e.end_x || sx, ey = e.end_y || sy, ez = e.end_z || 0;
        const dx = (ex - sx) * (109.7 / 120); // yards to metres
        const dy = (ey - sy) * (73.2 / 80);
        const dz = ez - sz;
        const distM = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const durS = (e.duration || 0) / 1000; // ms to seconds
        const speedKmh = durS > 0 ? (distM / durS) * 3.6 : 0;
        const speedMph = speedKmh * 0.621371;

        return {
          index,
          player: player.player_name || "Unknown",
          team: player.team_name || "Unknown",
          teamId: e.team_id,
          minute: e.minute,
          xg: e.xg || 0,
          bodyPart: e.body_part || "unknown",
          technique: e.technique || "normal",
          startX: e.start_x, startY: e.start_y, startZ: e.start_z || 0,
          endX: e.end_x, endY: e.end_y, endZ: e.end_z || 0,
          distanceM: Math.round(distM * 10) / 10,
          distanceToGoal: e.distance_to_opponents_goal || 0,
          durationMs: e.duration || 0,
          speedKmh: Math.round(speedKmh),
          speedMph: Math.round(speedMph),
          freezeFrame: (freezeFrame || []).map((p: any, fi: number) => {
            // Try to identify player by matching closest lineup position
            // Assign jersey numbers deterministically for display
            const isTeammate = p.teammate;
            const isGk = p.goalkeeper;
            const teamLineup = data.lineups.filter((l: any) =>
              isTeammate ? l.team_id === e.team_id : l.team_id !== e.team_id
            );
            // Simple assignment by index for now — stable per freeze frame
            const assignedPlayer = teamLineup[fi % teamLineup.length];
            return {
              x: p.x, y: p.y, teammate: p.teammate, goalkeeper: p.goalkeeper,
              playerName: assignedPlayer?.player_name?.split(" ").pop() || `#${fi + 1}`,
              jersey: isGk
                ? (teamLineup.find((l: any) => l.position === "Goalkeeper")?.lineup_jersey || 1)
                : (assignedPlayer?.lineup_jersey || fi + 2),
            };
          }),
          // Build-up: Clean chain with interpolated player positions
          buildup: (() => {
            const goalIdx = events.indexOf(e);

            // Step 1: Build the event chain (last 12 meaningful events)
            const rawWindow: any[] = [];
            for (let j = Math.max(0, goalIdx - 50); j <= goalIdx; j++) {
              const be = events[j];
              const btype = be.name || be.type || "";
              if (["ball-receipt", "pressure", "duel", "dribble-past", "miscontrol"].includes(btype)) continue;
              if (["pass", "carry", "dribble", "shot", "ball-recovery", "block",
                   "clearance", "interception", "tackle"].includes(btype)) {
                rawWindow.push({ idx: j, event: be, type: btype });
              }
            }
            const chain = rawWindow.slice(-12);
            if (chain.length === 0) return [];

            // Step 2: Collect ALL known positions for every player across the match
            // Build a timeline: for each player, list of (eventIdx, x, y)
            const playerTimeline: Record<number, { idx: number; x: number; y: number }[]> = {};
            const playerMeta: Record<number, { name: string; teamId: number; jersey: number }> = {};

            for (let j = 0; j <= goalIdx; j++) {
              const be = events[j];
              const addPos = (pid: number, x: number, y: number, tid: number) => {
                if (!pid || !x || x <= 0) return;
                const bp = lineups[pid] || {};
                if (!playerTimeline[pid]) playerTimeline[pid] = [];
                playerTimeline[pid].push({ idx: j, x, y });
                playerMeta[pid] = {
                  name: bp.player_name?.split(" ").pop() || "Unknown",
                  teamId: tid, jersey: bp.lineup_jersey || 0,
                };
              };
              if (be.player_id && be.start_x) addPos(be.player_id, be.start_x, be.start_y, be.team_id);
              if (be.recipient_id && be.end_x && be.end_x > 0) addPos(be.recipient_id, be.end_x, be.end_y, be.team_id);
              const btype = be.name || be.type || "";
              if ((btype === "carry" || btype === "dribble") && be.end_x && be.end_x > 0) {
                addPos(be.player_id, be.end_x, be.end_y, be.team_id);
              }
            }

            // Step 3: For each chain event, interpolate ALL player positions
            const chainStart = chain[0].idx;
            const chainEnd = chain[chain.length - 1].idx;

            const interpolatePlayer = (pid: number, atIdx: number): { x: number; y: number } | null => {
              const timeline = playerTimeline[pid];
              if (!timeline || timeline.length === 0) return null;

              // Find bracketing positions
              let before = null, after = null;
              for (const pos of timeline) {
                if (pos.idx <= atIdx) before = pos;
                if (pos.idx >= atIdx && !after) after = pos;
              }
              if (!before && !after) return null;
              if (!before) return { x: after!.x, y: after!.y };
              if (!after || before.idx === after.idx) return { x: before.x, y: before.y };

              // Linear interpolation between known positions
              const t = (atIdx - before.idx) / (after.idx - before.idx);
              return {
                x: before.x + (after.x - before.x) * t,
                y: before.y + (after.y - before.y) * t,
              };
            };

            // Get all player IDs that were active near this sequence
            const relevantPlayers = new Set<number>();
            for (const [pidStr, timeline] of Object.entries(playerTimeline)) {
              const pid = Number(pidStr);
              const lastBefore = timeline.filter(t => t.idx <= chainEnd).pop();
              if (lastBefore && chainStart - lastBefore.idx < 100) {
                relevantPlayers.add(pid);
              }
            }

            // Step 4: Build events with interpolated positions
            const buildupEvents: any[] = [];
            for (let ci = 0; ci < chain.length; ci++) {
              const { idx: j, event: be, type: btype } = chain[ci];
              const bPlayer = lineups[be.player_id] || {};
              const isGoalShot = j === goalIdx;

              let endX = be.end_x || 0;
              let endY = be.end_y || 0;
              if (!endX || endX <= 0) { endX = be.start_x || 0; endY = be.start_y || 0; }

              const recipientPlayer = be.recipient_id ? lineups[be.recipient_id] : null;

              // Interpolate ALL players at this event index
              const snapshot: any[] = [];
              for (const pid of relevantPlayers) {
                const pos = interpolatePlayer(pid, j);
                if (!pos) continue;
                const meta = playerMeta[pid] || { name: "?", teamId: 0, jersey: 0 };
                snapshot.push({
                  id: pid,
                  x: pos.x, y: pos.y,
                  name: meta.name, teamId: meta.teamId, jersey: meta.jersey,
                  isActive: pid === be.player_id,
                  isRecipient: pid === be.recipient_id,
                });
              }

              buildupEvents.push({
                type: isGoalShot ? "goal" : btype,
                playerName: bPlayer.player_name?.split(" ").pop() || "Unknown",
                playerId: be.player_id,
                teamId: be.team_id,
                startX: be.start_x || 0, startY: be.start_y || 0,
                startZ: be.start_z || 0,
                endX, endY,
                endZ: be.end_z || 0,
                minute: be.minute, second: be.second || 0,
                duration: be.duration || 0,
                bodyPart: be.body_part || null,
                passHeight: be.height || null,
                outcome: be.outcome || null,
                technique: be.technique || null,
                recipient: recipientPlayer?.player_name?.split(" ").pop() || null,
                recipientId: be.recipient_id || null,
                xg: be.xg || null,
                keyPass: be.key_pass || false,
                firstTime: be.first_time || false,
                hasFreezeFrame: !!(be.freeze_frame && (Array.isArray(be.freeze_frame) ? be.freeze_frame.length : true)),
                playerPositions: snapshot,
              });
            }
            return buildupEvents;
          })(),
          ballPath: extractCleanBallPath(events, e, { maxChain, maxIndexGap, carryTolerance }),
          playerData: {
            name: player.player_name,
            jersey: player.lineup_jersey,
            height: player.player_height,
            weight: player.player_weight,
            foot: player.player_preferred_foot,
            dob: player.player_date_of_birth,
            nationality: player.player_nationality,
          },
        };
      });

    // Player stats for scorers
    const scorerIds = new Set(goals.map((g: any) => {
      const p = data.lineups.find((l: any) => l.player_name === g.player);
      return p?.player_id;
    }).filter(Boolean));

    const playerStats: Record<string, any> = {};
    for (const ps of data.player_stats) {
      if (scorerIds.has(ps.player_id)) {
        const name = lineups[ps.player_id]?.player_name || ps.player_id;
        if (!playerStats[name]) playerStats[name] = {};
        playerStats[name][ps.stat_name] = ps.value;
      }
    }

    // Timeline: key events in chronological order
    const timeline = events
      .filter((e: any) => {
        const name = e.name || e.type || "";
        return e.goal_for || e.goal_against || e.card === "yellow-card" ||
               e.card === "red-card" || name === "shot" ||
               e.key_pass || name === "substitution";
      })
      .sort((a: any, b: any) => a.minute - b.minute)
      .map((e: any) => {
        const player = lineups[e.player_id] || {};
        let type = "event";
        if (e.goal_for) type = "goal";
        else if (e.card === "yellow-card") type = "yellow";
        else if (e.card === "red-card") type = "red";
        else if (e.key_pass) type = "key-pass";
        else if ((e.name || "") === "shot") type = "shot";
        return {
          minute: e.minute,
          type,
          player: player.player_name || "Unknown",
          team: player.team_name || "Unknown",
          teamId: e.team_id,
          xg: e.xg || null,
        };
      });

    // Team stats
    const teamStats: Record<string, Record<string, number>> = { wrexham: {}, ipswich: {} };
    for (const ts of data.team_stats) {
      const key = ts.team_id === 1557 ? "wrexham" : "ipswich";
      teamStats[key][ts.stat_name] = ts.value;
    }

    // Weather data (fetched from Open-Meteo for match date)
    let weather = null;
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=53.05&longitude=-2.99&start_date=${match.match_date}&end_date=${match.match_date}&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code&timezone=Europe/London`
      );
      const weatherData = await weatherRes.json();
      if (weatherData.hourly) {
        const kickOffHour = parseInt(match.match_local_kick_off?.split(":")[0] || "15");
        weather = {
          temperature: weatherData.hourly.temperature_2m[kickOffHour],
          precipitation: weatherData.hourly.precipitation[kickOffHour],
          windSpeed: weatherData.hourly.wind_speed_10m[kickOffHour],
          weatherCode: weatherData.hourly.weather_code[kickOffHour],
          description: describeWeather(weatherData.hourly.weather_code[kickOffHour]),
        };
      }
    } catch { /* weather is optional */ }

    return Response.json({
      matchId: Number(matchId),
      homeTeam: "Wrexham",
      awayTeam: "Ipswich Town",
      homeScore: 5,
      awayScore: 3,
      stadium: match.stadium_name,
      date: match.match_date,
      kickOff: match.match_local_kick_off,
      attendance: match.match_attendance,
      weather,
      goals,
      playerStats,
      timeline,
      teamStats,
      totalEvents: events.length,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
