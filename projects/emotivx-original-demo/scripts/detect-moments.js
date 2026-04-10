const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const usage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/detect-moments.js <match_id> <competition_id> <season_id> [--push] [--limit N]"
  );
  console.log("Example:");
  console.log("  node scripts/detect-moments.js 3749246 2 44 --limit 5");
};

const getArgValue = (args, key) => {
  const index = args.indexOf(key);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const buildMomentId = ({ feedProvider, matchId, eventId, timestamp, ruleset }) =>
  sha256([feedProvider, matchId, eventId, timestamp, ruleset].join("|"));

const toDataLineEntry = (event, sequence) => {
  const payload = event.payload_json ?? {};
  const location = payload.normalized_location ?? null;
  return {
    Sequence: sequence,
    Timestamp: event.timestamp,
    Label: payload.type?.name ?? "Event",
    Value: payload.id ?? event.event_id,
    Actor: payload.player?.name,
    Team: payload.team?.name,
    X: location ? location[0] : null,
    Y: location ? location[1] : null,
    Context: payload.play_pattern
      ? { Phase: payload.play_pattern?.name }
      : undefined,
  };
};

const buildDataLines = (events, event, eventIndex) => {
  const payload = event.payload_json ?? {};
  const possession = payload.possession;
  let leadUpEvents = [];

  if (possession !== undefined && possession !== null) {
    leadUpEvents = events.filter(
      (item) =>
        item.payload_json?.possession === possession &&
        item.timestamp <= event.timestamp
    );
  } else if (eventIndex !== null) {
    leadUpEvents = events.slice(Math.max(eventIndex - 5, 0), eventIndex + 1);
  } else {
    leadUpEvents = [event];
  }

  const dataLineEvents = leadUpEvents.slice(-6);
  return dataLineEvents.map((entry, index) => toDataLineEntry(entry, index + 1));
};

const parseArgs = (argv) => {
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      if (["--limit"].includes(arg)) {
        i += 1;
      }
      continue;
    }
    positional.push(arg);
  }
  return positional;
};

const main = async () => {
  const args = process.argv.slice(2);
  const positional = parseArgs(args);
  const [matchId, competitionId, seasonId] = positional;
  if (!matchId || !competitionId || !seasonId) {
    usage();
    process.exit(1);
  }

  const limit = parseInt(getArgValue(args, "--limit") ?? "0", 10);
  const push =
    args.includes("--push") || process.env.PUSH_TO_SUPABASE === "true";
  const includeAll = args.includes("--all");

  const matchFile = path.join(
    "data",
    "statsbomb",
    "matches",
    competitionId,
    `${seasonId}.json`
  );
  const matches = JSON.parse(await fs.readFile(matchFile, "utf-8"));
  const match = matches.find((m) => String(m.match_id) === String(matchId));
  if (!match) {
    console.error("Match not found in matches file.");
    process.exit(1);
  }

  const eventsFile = path.join(
    "data",
    "normalized",
    "statsbomb",
    `${matchId}.json`
  );
  const events = JSON.parse(await fs.readFile(eventsFile, "utf-8"));

  const goalEvents = events.filter(
    (event) =>
      event.payload_json?.type?.name === "Shot" &&
      event.payload_json?.shot?.outcome?.name === "Goal"
  );

  const assistEvents = events.filter((event) => {
    const pass = event.payload_json?.pass;
    return pass?.goal_assist === true || pass?.assisted_shot_id;
  });

  const redCardEvents = events.filter((event) => {
    if (event.payload_json?.type?.name !== "Foul Committed") return false;
    const card = event.payload_json?.foul_committed?.card?.name;
    return card === "Red Card" || card === "Second Yellow";
  });

  const yellowCardEvents = events.filter((event) => {
    if (event.payload_json?.type?.name !== "Foul Committed") return false;
    const card = event.payload_json?.foul_committed?.card?.name;
    return card === "Yellow Card";
  });

  const secondYellowEvents = events.filter((event) => {
    if (event.payload_json?.type?.name !== "Foul Committed") return false;
    const card = event.payload_json?.foul_committed?.card?.name;
    return card === "Second Yellow";
  });

  const substitutionEvents = events.filter(
    (event) => event.payload_json?.type?.name === "Substitution"
  );

  const penaltyEvents = events.filter((event) => {
    if (event.payload_json?.type?.name !== "Shot") return false;
    return event.payload_json?.shot?.type?.name === "Penalty";
  });

  const ownGoalEvents = events.filter(
    (event) =>
      event.payload_json?.type?.name === "Shot" &&
      event.payload_json?.shot?.outcome?.name === "Own Goal"
  );

  const trimmedGoals = limit > 0 ? goalEvents.slice(0, limit) : goalEvents;
  const trimmedAssists = limit > 0 ? assistEvents.slice(0, limit) : assistEvents;
  const trimmedRedCards = limit > 0 ? redCardEvents.slice(0, limit) : redCardEvents;
  const trimmedYellows = limit > 0 ? yellowCardEvents.slice(0, limit) : yellowCardEvents;
  const trimmedSecondYellows = limit > 0 ? secondYellowEvents.slice(0, limit) : secondYellowEvents;
  const trimmedSubs = limit > 0 ? substitutionEvents.slice(0, limit) : substitutionEvents;
  const trimmedPenalties = limit > 0 ? penaltyEvents.slice(0, limit) : penaltyEvents;
  const trimmedOwnGoals = limit > 0 ? ownGoalEvents.slice(0, limit) : ownGoalEvents;

  const indexedEvents = new Map(events.map((event, index) => [event.event_id, index]));

  const buildMoment = (event, momentType, rulesetVersion, descriptionOverride) => {
    const payload = event.payload_json ?? {};
    const opponent =
      payload.team?.name === match.home_team?.home_team_name
        ? match.away_team?.away_team_name
        : match.home_team?.home_team_name;
    const teamName = payload.team?.name ?? null;
    const playerName = payload.player?.name ?? "Unknown";
    const dataLines = buildDataLines(events, event, indexedEvents.get(event.event_id) ?? null);

    return {
      moment_id: buildMomentId({
        feedProvider: "statsbomb",
        matchId: String(matchId),
        eventId: event.event_id,
        timestamp: event.timestamp,
        ruleset: rulesetVersion,
      }),
      match_id: String(matchId),
      event_id: event.event_id,
      moment_type: momentType,
      title: `${playerName} ${momentType} vs ${opponent}`,
      description:
        descriptionOverride ??
        payload.shot?.outcome?.name ??
        payload.foul_committed?.card?.name ??
        payload.type?.name ??
        momentType,
      timestamp: event.timestamp,
      sport: "soccer",
      league: match.competition?.competition_name ?? "Unknown",
      competition: match.competition?.competition_name ?? null,
      venue: match.stadium?.name ?? null,
      ruleset_version: rulesetVersion,
      team_name: teamName,
      opponent_name: opponent ?? null,
      is_live: false,
      is_hidden: false,
      data_lines: dataLines,
    };
  };

  const moments = includeAll
    ? (limit > 0 ? events.slice(0, limit) : events).map((event) =>
        buildMoment(
          event,
          event.payload_json?.type?.name ?? "Event",
          "statsbomb-event-v1"
        )
      )
    : [
        ...trimmedGoals.map((event) =>
          buildMoment(event, "Goal", "statsbomb-goal-v1")
        ),
        ...trimmedAssists.map((event) =>
          buildMoment(event, "Assist", "statsbomb-assist-v1", "Goal Assist")
        ),
        ...trimmedRedCards.map((event) =>
          buildMoment(event, "Red Card", "statsbomb-red-card-v1")
        ),
        ...trimmedYellows.map((event) =>
          buildMoment(event, "Yellow Card", "statsbomb-yellow-card-v1")
        ),
        ...trimmedSecondYellows.map((event) =>
          buildMoment(event, "Second Yellow", "statsbomb-second-yellow-v1")
        ),
        ...trimmedSubs.map((event) =>
          buildMoment(event, "Substitution", "statsbomb-substitution-v1")
        ),
        ...trimmedPenalties.map((event) => {
          const outcome = event.payload_json?.shot?.outcome?.name ?? "Penalty";
          const type =
            outcome === "Goal" ? "Penalty Goal" : `Penalty ${outcome}`;
          return buildMoment(event, type, "statsbomb-penalty-v1", outcome);
        }),
        ...trimmedOwnGoals.map((event) =>
          buildMoment(event, "Own Goal", "statsbomb-own-goal-v1")
        ),
      ];

  const outPath = path.join(
    "data",
    "moments",
    "statsbomb",
    `${matchId}.json`
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(moments, null, 2), "utf-8");
  console.log(`Saved moments: ${outPath}`);

  if (push) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --push"
      );
      process.exit(1);
    }

    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const matchMeta = {
      match_id: String(matchId),
      competition_id: match.competition?.competition_id
        ? String(match.competition.competition_id)
        : String(competitionId),
      season_id: match.season?.season_id
        ? String(match.season.season_id)
        : String(seasonId),
      competition_name: match.competition?.competition_name ?? null,
      season_name: match.season?.season_name ?? null,
      home_team_name: match.home_team?.home_team_name ?? null,
      away_team_name: match.away_team?.away_team_name ?? null,
      source: "statsbomb",
      payload_json: match,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("matches").upsert(matchMeta, { onConflict: "match_id" });

    for (const moment of moments) {
      const { data_lines, ...momentRow } = moment;
      const dataLineRows = data_lines.map((line) => ({
        moment_id: momentRow.moment_id,
        sequence: line.Sequence,
        timestamp: line.Timestamp,
        label: line.Label,
        value: line.Value ?? null,
        actor: line.Actor ?? null,
        team: line.Team ?? null,
        x: line.X ?? null,
        y: line.Y ?? null,
        context: line.Context ?? null,
      }));

      const { error } = await supabase.rpc("insert_moment_with_lines", {
        moment_row: momentRow,
        data_lines: dataLineRows,
      });
      if (error) {
        console.error("Moment insert failed:", error.message);
        process.exit(1);
      }
    }
    console.log(`Inserted ${moments.length} moments into Supabase (transaction).`);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
