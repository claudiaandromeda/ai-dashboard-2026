require("dotenv").config();

const fs = require("fs/promises");
const path = require("path");

const usage = () => {
  console.log("Usage: node scripts/push-matches.js [--reset]");
};

const main = async () => {
  const shouldReset = process.argv.includes("--reset");
  const competitionArg = (() => {
    const idx = process.argv.indexOf("--competition-id");
    if (idx === -1) return null;
    return process.argv[idx + 1] ?? null;
  })();
  const seasonArg = (() => {
    const idx = process.argv.indexOf("--season-id");
    if (idx === -1) return null;
    return process.argv[idx + 1] ?? null;
  })();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const matchesRoot = path.join("data", "statsbomb", "matches");
  let total = 0;

  if (shouldReset) {
    const { error } = await supabase.from("matches").delete().neq("match_id", "");
    if (error) {
      console.error("Failed to reset matches table:", error.message);
      process.exit(1);
    }
    console.log("Cleared matches table before StatsBomb upsert.");
  }

  const competitionDirs = await fs.readdir(matchesRoot, { withFileTypes: true });
  for (const dir of competitionDirs) {
    if (!dir.isDirectory()) continue;
    if (competitionArg && dir.name !== String(competitionArg)) continue;
    const dirPath = path.join(matchesRoot, dir.name);
    const seasonFiles = await fs.readdir(dirPath);
    for (const seasonFile of seasonFiles) {
      if (!seasonFile.endsWith(".json")) continue;
      const seasonId = seasonFile.replace(".json", "");
      if (seasonArg && seasonId !== String(seasonArg)) continue;
      const filePath = path.join(dirPath, seasonFile);
      const raw = await fs.readFile(filePath, "utf-8");
      const matches = JSON.parse(raw);
      const rows = matches.map((match) => ({
        match_id: String(match.match_id),
        competition_id: match.competition?.competition_id
          ? String(match.competition.competition_id)
          : String(dir.name),
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
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from("matches")
          .upsert(rows, { onConflict: "match_id" });
        if (error) {
          console.error("Upsert failed:", error.message);
          process.exit(1);
        }
        total += rows.length;
      }
    }
  }

  console.log(`Upserted ${total} matches.`);
};

main().catch((err) => {
  console.error(err);
  usage();
  process.exit(1);
});
