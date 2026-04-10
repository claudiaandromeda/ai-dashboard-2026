const fs = require("fs/promises");
const path = require("path");

const usage = () => {
  console.log("Usage:");
  console.log("  node scripts/list-statsbomb-matches.js <competition_id> <season_id>");
};

const main = async () => {
  const [, , competitionId, seasonId] = process.argv;
  if (!competitionId || !seasonId) {
    usage();
    process.exit(1);
  }

  const filePath = path.join(
    "data",
    "statsbomb",
    "matches",
    competitionId,
    `${seasonId}.json`
  );

  const raw = await fs.readFile(filePath, "utf-8");
  const matches = JSON.parse(raw);

  console.log(`Matches for competition ${competitionId}, season ${seasonId}`);
  matches.slice(0, 10).forEach((match) => {
    const home = match.home_team?.home_team_name ?? "Home";
    const away = match.away_team?.away_team_name ?? "Away";
    console.log(
      `${match.match_id} | ${match.match_date} | ${home} vs ${away}`
    );
  });
  console.log(`Showing ${Math.min(matches.length, 10)} of ${matches.length}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
