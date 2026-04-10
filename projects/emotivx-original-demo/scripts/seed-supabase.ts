/**
 * Seed Supabase with Euro 2024 data
 * 
 * Populates: competitions, seasons, teams, team_kits, competition_teams, matches
 * Source: StatsBomb open data (local files) + researched kit colours
 * 
 * Usage: npx tsx scripts/seed-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// ═══════════════════════════════════════════════════
// Euro 2024 Kit Colours — researched from actual kits
// ═══════════════════════════════════════════════════
const EURO_2024_KITS: Record<number, { short: string; country: string; home: Kit; away: Kit }> = {
  906:  { short: "ALB", country: "Albania",        home: { primary: "#E41E20", secondary: "#000000", accent: "#FFFFFF", background: "#1A0A0A" }, away: { primary: "#FFFFFF", secondary: "#E41E20", accent: "#000000", background: "#2D2D2D" } },
  915:  { short: "AUT", country: "Austria",         home: { primary: "#ED1C24", secondary: "#FFFFFF", accent: "#ED1C24", background: "#1A0A0A" }, away: { primary: "#FFFFFF", secondary: "#ED1C24", accent: "#000000", background: "#F5F5F5" } },
  782:  { short: "BEL", country: "Belgium",         home: { primary: "#E30613", secondary: "#000000", accent: "#FDCB04", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#E30613", accent: "#000000", background: "#2D2D2D" } },
  785:  { short: "CRO", country: "Croatia",         home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#171796", background: "#1A0A0A" }, away: { primary: "#171796", secondary: "#FFFFFF", accent: "#FF0000", background: "#0A0A2A" } },
  912:  { short: "CZE", country: "Czech Republic",  home: { primary: "#D7141A", secondary: "#FFFFFF", accent: "#11457E", background: "#1A0A0A" }, away: { primary: "#FFFFFF", secondary: "#D7141A", accent: "#11457E", background: "#F5F5F5" } },
  776:  { short: "DEN", country: "Denmark",         home: { primary: "#C8102E", secondary: "#FFFFFF", accent: "#C8102E", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#C8102E", accent: "#000000", background: "#F5F5F5" } },
  768:  { short: "ENG", country: "England",         home: { primary: "#FFFFFF", secondary: "#CF081F", accent: "#041E42", background: "#F5F5F5" }, away: { primary: "#6C1D45", secondary: "#FFFFFF", accent: "#CF081F", background: "#1A0A15" } },
  771:  { short: "FRA", country: "France",          home: { primary: "#002654", secondary: "#FFFFFF", accent: "#ED2939", background: "#001030" }, away: { primary: "#FFFFFF", secondary: "#002654", accent: "#ED2939", background: "#F5F5F5" } },
  2138: { short: "GEO", country: "Georgia",         home: { primary: "#FFFFFF", secondary: "#FF0000", accent: "#000000", background: "#F5F5F5" }, away: { primary: "#8AE234", secondary: "#FFFFFF", accent: "#000000", background: "#1A0A0A" } },
  770:  { short: "GER", country: "Germany",         home: { primary: "#FFFFFF", secondary: "#000000", accent: "#DD0000", background: "#F5F5F5" }, away: { primary: "#5C1D5E", secondary: "#FFFFFF", accent: "#DD0000", background: "#1A0A1A" } },
  916:  { short: "HUN", country: "Hungary",         home: { primary: "#CE2939", secondary: "#FFFFFF", accent: "#477050", background: "#1A0A0A" }, away: { primary: "#FFFFFF", secondary: "#CE2939", accent: "#477050", background: "#F5F5F5" } },
  914:  { short: "ITA", country: "Italy",           home: { primary: "#0066B1", secondary: "#FFFFFF", accent: "#0066B1", background: "#001A40" }, away: { primary: "#FFFFFF", secondary: "#0066B1", accent: "#0066B1", background: "#F5F5F5" } },
  941:  { short: "NED", country: "Netherlands",     home: { primary: "#FF6600", secondary: "#FFFFFF", accent: "#000000", background: "#2A1500" }, away: { primary: "#2C3E9E", secondary: "#FF6600", accent: "#FFFFFF", background: "#0A0A2A" } },
  789:  { short: "POL", country: "Poland",          home: { primary: "#FFFFFF", secondary: "#DC143C", accent: "#FFFFFF", background: "#F5F5F5" }, away: { primary: "#DC143C", secondary: "#FFFFFF", accent: "#000000", background: "#1A0A0A" } },
  780:  { short: "POR", country: "Portugal",        home: { primary: "#FF0000", secondary: "#006600", accent: "#FFD700", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#006600", accent: "#FF0000", background: "#F5F5F5" } },
  905:  { short: "ROU", country: "Romania",         home: { primary: "#FCD116", secondary: "#002B7F", accent: "#CE1126", background: "#2A2000" }, away: { primary: "#002B7F", secondary: "#FCD116", accent: "#CE1126", background: "#001030" } },
  942:  { short: "SCO", country: "Scotland",        home: { primary: "#003399", secondary: "#FFFFFF", accent: "#CF142B", background: "#001030" }, away: { primary: "#FFFFFF", secondary: "#003399", accent: "#CF142B", background: "#F5F5F5" } },
  786:  { short: "SRB", country: "Serbia",          home: { primary: "#C8102E", secondary: "#FFFFFF", accent: "#003DA5", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#C8102E", accent: "#003DA5", background: "#F5F5F5" } },
  908:  { short: "SVK", country: "Slovakia",        home: { primary: "#0B4EA2", secondary: "#FFFFFF", accent: "#EE1C25", background: "#001030" }, away: { primary: "#FFFFFF", secondary: "#0B4EA2", accent: "#EE1C25", background: "#F5F5F5" } },
  944:  { short: "SVN", country: "Slovenia",        home: { primary: "#FFFFFF", secondary: "#003DA5", accent: "#ED1C24", background: "#F5F5F5" }, away: { primary: "#003DA5", secondary: "#FFFFFF", accent: "#ED1C24", background: "#001030" } },
  772:  { short: "ESP", country: "Spain",           home: { primary: "#AA151B", secondary: "#F1BF00", accent: "#AA151B", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#AA151B", accent: "#F1BF00", background: "#F5F5F5" } },
  773:  { short: "SUI", country: "Switzerland",     home: { primary: "#FF0000", secondary: "#FFFFFF", accent: "#FF0000", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#FF0000", accent: "#000000", background: "#F5F5F5" } },
  909:  { short: "TUR", country: "Turkey",          home: { primary: "#E30A17", secondary: "#FFFFFF", accent: "#E30A17", background: "#1A0000" }, away: { primary: "#FFFFFF", secondary: "#E30A17", accent: "#000000", background: "#F5F5F5" } },
  911:  { short: "UKR", country: "Ukraine",         home: { primary: "#005BBB", secondary: "#FFD500", accent: "#005BBB", background: "#001030" }, away: { primary: "#FFD500", secondary: "#005BBB", accent: "#FFFFFF", background: "#2A2000" } },
};

interface Kit {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

// Euro 2024 groups
const GROUPS: Record<string, number[]> = {
  "Group A": [770, 942, 916, 773],      // Germany, Scotland, Hungary, Switzerland
  "Group B": [772, 785, 914, 906],      // Spain, Croatia, Italy, Albania
  "Group C": [944, 776, 786, 768],      // Slovenia, Denmark, Serbia, England
  "Group D": [789, 941, 915, 771],      // Poland, Netherlands, Austria, France
  "Group E": [782, 908, 905, 911],      // Belgium, Slovakia, Romania, Ukraine
  "Group F": [909, 2138, 780, 912],     // Turkey, Georgia, Portugal, Czech Republic
};

async function seed() {
  console.log("🌱 Seeding EmotivX Supabase...\n");

  // 1. Competition
  console.log("📋 Competition...");
  const { error: compErr } = await supabase.from("competitions").upsert({
    id: 55,
    name: "UEFA Euro",
    country: "Europe",
    type: "international",
  });
  if (compErr) throw new Error(`Competition: ${compErr.message}`);
  console.log("  ✅ UEFA Euro (id: 55)");

  // 2. Season
  console.log("📅 Season...");
  const { error: seasonErr } = await supabase.from("seasons").upsert({
    id: 282,
    competition_id: 55,
    name: "2024",
    start_date: "2024-06-14",
    end_date: "2024-07-14",
  });
  if (seasonErr) throw new Error(`Season: ${seasonErr.message}`);
  console.log("  ✅ 2024 (id: 282)");

  // 3. Teams + Kits
  console.log("🏴 Teams + Kits...");
  for (const [teamIdStr, kit] of Object.entries(EURO_2024_KITS)) {
    const teamId = Number(teamIdStr);

    // Load team name from StatsBomb
    const matchesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "data", "statsbomb", "matches", "55", "282.json"), "utf-8")
    );
    let teamName = kit.country;
    for (const m of matchesData) {
      if (m.home_team.home_team_id === teamId) { teamName = m.home_team.home_team_name; break; }
      if (m.away_team.away_team_id === teamId) { teamName = m.away_team.away_team_name; break; }
    }

    // Upsert team
    const { error: teamErr } = await supabase.from("teams").upsert({
      id: teamId,
      name: teamName,
      short_code: kit.short,
      type: "national",
      country: kit.country,
    });
    if (teamErr) throw new Error(`Team ${teamName}: ${teamErr.message}`);

    // Upsert home kit
    const { error: homeErr } = await supabase.from("team_kits").upsert(
      {
        team_id: teamId,
        season_id: 282,
        kit_type: "home",
        primary_color: kit.home.primary,
        secondary_color: kit.home.secondary,
        accent_color: kit.home.accent,
        background_color: kit.home.background,
        approved: true,
        approved_by: "seed-script",
      },
      { onConflict: "team_id,season_id,kit_type" }
    );
    if (homeErr) throw new Error(`Home kit ${teamName}: ${homeErr.message}`);

    // Upsert away kit
    const { error: awayErr } = await supabase.from("team_kits").upsert(
      {
        team_id: teamId,
        season_id: 282,
        kit_type: "away",
        primary_color: kit.away.primary,
        secondary_color: kit.away.secondary,
        accent_color: kit.away.accent,
        background_color: kit.away.background,
        approved: true,
        approved_by: "seed-script",
      },
      { onConflict: "team_id,season_id,kit_type" }
    );
    if (awayErr) throw new Error(`Away kit ${teamName}: ${awayErr.message}`);

    console.log(`  ✅ ${teamName} (${kit.short}) — home + away kits`);
  }

  // 4. Competition Teams (groups)
  console.log("🏆 Groups...");
  for (const [groupName, teamIds] of Object.entries(GROUPS)) {
    for (const teamId of teamIds) {
      const { error } = await supabase.from("competition_teams").upsert({
        competition_id: 55,
        season_id: 282,
        team_id: teamId,
        group_name: groupName,
      });
      if (error) throw new Error(`Group ${groupName}, team ${teamId}: ${error.message}`);
    }
    console.log(`  ✅ ${groupName}: ${teamIds.length} teams`);
  }

  // 5. Matches
  console.log("⚽ Matches...");
  const matchesRaw = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "data", "statsbomb", "matches", "55", "282.json"), "utf-8")
  );

  let matchCount = 0;
  for (const m of matchesRaw) {
    const { error } = await supabase.from("matches").upsert({
      id: m.match_id,
      competition_id: 55,
      season_id: 282,
      home_team_id: m.home_team.home_team_id,
      away_team_id: m.away_team.away_team_id,
      home_score: m.home_score,
      away_score: m.away_score,
      match_date: m.match_date,
      kick_off: m.kick_off,
      stage: m.competition_stage?.name || null,
      stadium_name: m.stadium?.name || null,
      stadium_country: m.stadium?.country?.name || null,
      referee_name: m.referee?.name || null,
      match_week: m.match_week || null,
    });
    if (error) throw new Error(`Match ${m.match_id}: ${error.message}`);
    matchCount++;
  }
  console.log(`  ✅ ${matchCount} matches loaded`);

  // Summary
  console.log("\n═══════════════════════════════════════");
  console.log("🎉 Seed complete!");
  console.log(`  • 1 competition (UEFA Euro)`);
  console.log(`  • 1 season (2024)`);
  console.log(`  • 24 teams with home + away kits`);
  console.log(`  • 6 groups`);
  console.log(`  • ${matchCount} matches`);
  console.log("═══════════════════════════════════════");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
