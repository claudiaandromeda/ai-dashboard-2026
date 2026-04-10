const fs = require("fs/promises");
const path = require("path");

const BASE_URL =
  "https://raw.githubusercontent.com/statsbomb/open-data/master/data";

const usage = () => {
  console.log("Usage:");
  console.log("  node scripts/fetch-statsbomb.js competitions");
  console.log("  node scripts/fetch-statsbomb.js matches <competition_id> <season_id>");
  console.log("  node scripts/fetch-statsbomb.js events <match_id>");
  console.log("  node scripts/fetch-statsbomb.js lineups <match_id>");
  console.log("  node scripts/fetch-statsbomb.js three-sixty <match_id>");
};

const buildRequest = (type, args) => {
  switch (type) {
    case "competitions":
      return {
        url: `${BASE_URL}/competitions.json`,
        outPath: path.join("data", "statsbomb", "competitions.json"),
      };
    case "matches": {
      const [competitionId, seasonId] = args;
      if (!competitionId || !seasonId) return null;
      return {
        url: `${BASE_URL}/matches/${competitionId}/${seasonId}.json`,
        outPath: path.join(
          "data",
          "statsbomb",
          "matches",
          competitionId,
          `${seasonId}.json`
        ),
      };
    }
    case "events": {
      const [matchId] = args;
      if (!matchId) return null;
      return {
        url: `${BASE_URL}/events/${matchId}.json`,
        outPath: path.join("data", "statsbomb", "events", `${matchId}.json`),
      };
    }
    case "lineups": {
      const [matchId] = args;
      if (!matchId) return null;
      return {
        url: `${BASE_URL}/lineups/${matchId}.json`,
        outPath: path.join("data", "statsbomb", "lineups", `${matchId}.json`),
      };
    }
    case "three-sixty": {
      const [matchId] = args;
      if (!matchId) return null;
      return {
        url: `${BASE_URL}/three-sixty/${matchId}.json`,
        outPath: path.join(
          "data",
          "statsbomb",
          "three-sixty",
          `${matchId}.json`
        ),
      };
    }
    default:
      return null;
  }
};

const main = async () => {
  const [, , type, ...args] = process.argv;
  const request = buildRequest(type, args);

  if (!request) {
    usage();
    process.exit(1);
  }

  const res = await fetch(request.url);
  if (!res.ok) {
    console.error(`Failed to fetch ${request.url}: ${res.status}`);
    process.exit(1);
  }

  const data = await res.text();
  await fs.mkdir(path.dirname(request.outPath), { recursive: true });
  await fs.writeFile(request.outPath, data, "utf-8");
  console.log(`Saved: ${request.outPath}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
