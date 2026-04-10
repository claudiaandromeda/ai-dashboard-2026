require("dotenv").config();

const { spawnSync } = require("child_process");

const run = (label, command, args) => {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const main = () => {
  run("Fetch Euro 2024 matches", "node", [
    "scripts/fetch-statsbomb.js",
    "matches",
    "55",
    "282",
  ]);

  run("Reset matches table", "node", [
    "scripts/push-matches.js",
    "--reset",
    "--competition-id",
    "55",
    "--season-id",
    "282",
  ]);

  run("Clear StatsBomb 360 tables", "node", ["scripts/reset-statsbomb-360.js"]);

  run("Ingest Euro 2024 360 data", "python", [
    "scripts/ingest_statsbomb_360.py",
    "--competition-id",
    "55",
    "--season-id",
    "282",
  ]);
};

main();
