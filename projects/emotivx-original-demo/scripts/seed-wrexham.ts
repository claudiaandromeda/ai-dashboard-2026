/**
 * Seed Wrexham + Ipswich data into Supabase
 * Separate competition/season from Euro 2024
 */
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seed() {
  console.log("🏴 Seeding Wrexham data...\n");

  // Competition: EFL Championship (StatsBomb comp ID for Championship)
  const { error: compErr } = await supabase.from("competitions").upsert({
    id: 44,
    name: "EFL Championship",
    country: "England",
    type: "domestic",
  });
  if (compErr) throw new Error(`Competition: ${compErr.message}`);
  console.log("  ✅ EFL Championship");

  // Season 2025/26
  const { error: seasonErr } = await supabase.from("seasons").upsert({
    id: 317,
    competition_id: 44,
    name: "2025/2026",
    start_date: "2025-08-09",
    end_date: "2026-05-03",
  });
  if (seasonErr) throw new Error(`Season: ${seasonErr.message}`);
  console.log("  ✅ 2025/2026 season");

  // Teams
  const teams = [
    {
      id: 1557,
      name: "Wrexham",
      short_code: "WXM",
      type: "club" as const,
      country: "Wales",
      home: { primary: "#E4002B", secondary: "#FFFFFF", accent: "#000000", background: "#1A0A0A" },
      away: { primary: "#003DA5", secondary: "#FFFFFF", accent: "#E4002B", background: "#001030" },
    },
    {
      id: 55,
      name: "Ipswich Town",
      short_code: "IPS",
      type: "club" as const,
      country: "England",
      home: { primary: "#0044AA", secondary: "#FFFFFF", accent: "#0044AA", background: "#001030" },
      away: { primary: "#FF6600", secondary: "#000000", accent: "#FFFFFF", background: "#2A1500" },
    },
  ];

  for (const t of teams) {
    const { error: teamErr } = await supabase.from("teams").upsert({
      id: t.id, name: t.name, short_code: t.short_code, type: t.type, country: t.country,
    });
    if (teamErr) throw new Error(`Team ${t.name}: ${teamErr.message}`);

    for (const kitType of ["home", "away"] as const) {
      const kit = t[kitType];
      const { error: kitErr } = await supabase.from("team_kits").upsert(
        {
          team_id: t.id, season_id: 317, kit_type: kitType,
          primary_color: kit.primary, secondary_color: kit.secondary,
          accent_color: kit.accent, background_color: kit.background,
          approved: true, approved_by: "seed-script",
        },
        { onConflict: "team_id,season_id,kit_type" }
      );
      if (kitErr) throw new Error(`Kit ${t.name} ${kitType}: ${kitErr.message}`);
    }
    console.log(`  ✅ ${t.name} (${t.short_code}) — home + away kits`);
  }

  // Match
  const matchData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "statsbomb", "events", "1377475.json"), "utf-8")
  );
  const m = matchData.match[0];

  const { error: matchErr } = await supabase.from("matches").upsert({
    id: m.match_id,
    competition_id: 44,
    season_id: 317,
    home_team_id: m.match_home_team_id,
    away_team_id: m.match_away_team_id,
    home_score: 5,
    away_score: 3,
    match_date: m.match_date,
    kick_off: m.match_local_kick_off,
    stage: m.round_type_name || "Regular Season",
    stadium_name: m.stadium_name,
    match_week: m.match_week,
    weather_conditions: m.match_weather,
  });
  if (matchErr) throw new Error(`Match: ${matchErr.message}`);
  console.log("  ✅ Wrexham 5-3 Ipswich Town");

  // Competition teams
  for (const t of teams) {
    const { error } = await supabase.from("competition_teams").upsert({
      competition_id: 44, season_id: 317, team_id: t.id,
    });
    if (error) throw new Error(`CompTeam: ${error.message}`);
  }

  console.log("\n🎉 Wrexham data seeded!");
}

seed().catch(err => { console.error("❌", err.message); process.exit(1); });
