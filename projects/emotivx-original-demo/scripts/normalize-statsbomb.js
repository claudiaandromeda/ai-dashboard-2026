const fs = require("fs/promises");
const path = require("path");

const normalizeXY = (location) => {
  if (!Array.isArray(location) || location.length < 2) return null;
  const [x, y] = location;
  return [x / 120, y / 80];
};

const usage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/normalize-statsbomb.js <match_id> [match_date] [--competition-id X] [--season-id Y] [--league \"Premier League\"] [--push] [--limit N]"
  );
  console.log(
    "  node scripts/normalize-statsbomb.js <match_id> <competition_id> <season_id>"
  );
  console.log("Examples:");
  console.log(
    "  node scripts/normalize-statsbomb.js 3749246 2004-03-28 --league \"Premier League\""
  );
  console.log(
    "  node scripts/normalize-statsbomb.js 3749246 --competition-id 2 --season-id 44"
  );
};

const getArgValue = (args, key) => {
  const index = args.indexOf(key);
  if (index === -1) return null;
  return args[index + 1] ?? null;
};

const extractPositional = (args) => {
  const skipNextFor = new Set([
    "--competition-id",
    "--season-id",
    "--league",
    "--limit",
  ]);
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (skipNextFor.has(arg)) {
      i += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    positional.push(arg);
  }
  return positional;
};

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const main = async () => {
  const args = process.argv.slice(2);
  const positional = extractPositional(args);
  const matchId = positional[0];
  const secondArg = positional[1] ?? null;
  const thirdArg = positional[2] ?? null;
  const matchDateInput = secondArg && isDate(secondArg) ? secondArg : null;

  if (!matchId) {
    usage();
    process.exit(1);
  }

  let league = getArgValue(args, "--league") ?? null;
  let competitionId = getArgValue(args, "--competition-id");
  let seasonId = getArgValue(args, "--season-id");
  const limit = parseInt(getArgValue(args, "--limit") ?? "0", 10);
  const push =
    args.includes("--push") || process.env.PUSH_TO_SUPABASE === "true";

  let matchDate = matchDateInput;
  if (!matchDate && !competitionId && !seasonId && secondArg && thirdArg) {
    competitionId = secondArg;
    seasonId = thirdArg;
  }
  if (!matchDate) {
    if (!competitionId || !seasonId) {
      usage();
      process.exit(1);
    }
    const matchesPath = path.join(
      "data",
      "statsbomb",
      "matches",
      competitionId,
      `${seasonId}.json`
    );
    const matchesRaw = await fs.readFile(matchesPath, "utf-8");
    const matches = JSON.parse(matchesRaw);
    const match = matches.find((m) => String(m.match_id) === String(matchId));
    if (!match?.match_date) {
      console.error("Could not resolve match_date from matches file.");
      process.exit(1);
    }
    matchDate = match.match_date;
    league = league ?? match.competition?.competition_name ?? null;
  }

  const filePath = path.join("data", "statsbomb", "events", `${matchId}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  const events = JSON.parse(raw);

  const normalizedEvents = events.map((event) => {
    const eventTimestamp = event.timestamp ?? "00:00:00.000";
    const timestamp = `${matchDate}T${eventTimestamp}Z`;

    const payload = {
      ...event,
      normalized_location: normalizeXY(event.location),
      normalized_pass_end_location: normalizeXY(
        event.pass?.end_location ?? null
      ),
      normalized_shot_end_location: normalizeXY(
        event.shot?.end_location ?? null
      ),
    };

    return {
      ingest_run_id: null,
      event_id: event.id,
      match_id: String(event.match_id ?? matchId),
      timestamp,
      sport: "soccer",
      league,
      payload_json: payload,
    };
  });

  const trimmed =
    limit > 0 ? normalizedEvents.slice(0, limit) : normalizedEvents;

  const outPath = path.join(
    "data",
    "normalized",
    "statsbomb",
    `${matchId}.json`
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(trimmed, null, 2), "utf-8");
  console.log(`Saved normalized: ${outPath}`);

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

    const batchSize = 500;
    for (let i = 0; i < trimmed.length; i += batchSize) {
      const batch = trimmed.slice(i, i + batchSize);
      const { error } = await supabase
        .from("normalized_events")
        .insert(batch);
      if (error) {
        console.error("Insert failed:", error.message);
        process.exit(1);
      }
      console.log(`Inserted ${Math.min(i + batchSize, trimmed.length)} events`);
    }
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
