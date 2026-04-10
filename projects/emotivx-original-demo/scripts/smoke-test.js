const fs = require("fs");
const path = require("path");

const usage = () => {
  console.log("Usage:");
  console.log("  node scripts/smoke-test.js <match_id>");
  console.log("Example:");
  console.log("  node scripts/smoke-test.js 3749246");
};

const main = () => {
  const [, , matchId] = process.argv;
  if (!matchId) {
    usage();
    process.exit(1);
  }

  const normalizedPath = path.join(
    "data",
    "normalized",
    "statsbomb",
    `${matchId}.json`
  );
  const momentsPath = path.join(
    "data",
    "moments",
    "statsbomb",
    `${matchId}.json`
  );

  if (!fs.existsSync(normalizedPath)) {
    console.error(`Missing normalized file: ${normalizedPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(momentsPath)) {
    console.error(`Missing moments file: ${momentsPath}`);
    process.exit(1);
  }

  const normalized = JSON.parse(fs.readFileSync(normalizedPath, "utf-8"));
  const moments = JSON.parse(fs.readFileSync(momentsPath, "utf-8"));

  const sampleMoment = moments[0] ?? null;
  const sampleLine = sampleMoment?.data_lines?.[0] ?? null;

  console.log("Smoke test results:");
  console.log(`- normalized events: ${normalized.length}`);
  console.log(`- moments: ${moments.length}`);
  console.log(`- sample moment id: ${sampleMoment?.moment_id ?? "none"}`);
  console.log(`- sample data line: ${sampleLine?.Label ?? "none"}`);
};

main();
