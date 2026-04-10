const { spawnSync } = require("child_process");
const fs = require("fs/promises");
const path = require("path");

const usage = () => {
  console.log("Usage:");
  console.log(
    "  node scripts/pipeline-statsbomb.js <match_id> <competition_id> <season_id>"
  );
  console.log(
    "  node scripts/pipeline-statsbomb.js --auto-latest <competition_id> <season_id>"
  );
  console.log("Example:");
  console.log("  node scripts/pipeline-statsbomb.js 3749246 2 44");
  console.log("  node scripts/pipeline-statsbomb.js --auto-latest 2 44");
};

const run = (label, command, args) => {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const main = async () => {
  const [, , firstArg, secondArg, thirdArg] = process.argv;
  let matchId = null;
  let competitionId = null;
  let seasonId = null;

  if (firstArg === "--auto-latest") {
    competitionId = secondArg;
    seasonId = thirdArg;
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
    matches.sort((a, b) => (a.match_date > b.match_date ? -1 : 1));
    matchId = String(matches[0]?.match_id ?? "");
    if (!matchId) {
      console.error("Could not pick latest match.");
      process.exit(1);
    }
    console.log(`Auto-picked match: ${matchId}`);
  } else {
    matchId = firstArg;
    competitionId = secondArg;
    seasonId = thirdArg;
    if (!matchId || !competitionId || !seasonId) {
      usage();
      process.exit(1);
    }
  }

  run("Fetch matches", "node", [
    "scripts/fetch-statsbomb.js",
    "matches",
    competitionId,
    seasonId,
  ]);

  run("Fetch events", "node", [
    "scripts/fetch-statsbomb.js",
    "events",
    matchId,
  ]);

  run("Fetch lineups", "node", [
    "scripts/fetch-statsbomb.js",
    "lineups",
    matchId,
  ]);

  run("Normalize events", "node", [
    "scripts/normalize-statsbomb.js",
    matchId,
    "--competition-id",
    competitionId,
    "--season-id",
    seasonId,
  ]);

  run("Detect moments", "node", [
    "scripts/detect-moments.js",
    matchId,
    competitionId,
    seasonId,
  ]);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
