/**
 * EmotivX Team Registry
 * Maps team names → logo URLs + brand colours.
 * TheSportsDB is the default source for logos (free, no key).
 * Clubs can override with their own uploaded logo via Supabase (team admin page).
 */

export interface KitPalette {
  primary: string;          // dominant kit colour
  secondary: string;        // secondary / trim
  accent: string;           // highlight / badge / edition accent
  background: string;       // art canvas background
}

export interface TeamConfig {
  name: string;
  shortName: string;
  primaryColour: string;    // home kit primary (legacy, kept for compatibility)
  secondaryColour: string;  // home kit secondary
  logoUrl: string;          // TheSportsDB CDN or Supabase upload
  tsdbId?: number;          // TheSportsDB team ID for future lookups
  statsbombId?: number;     // StatsBomb team ID
  kits?: {
    home: KitPalette;
    away?: KitPalette;
    third?: KitPalette;
  };
}

/** Build the full art generation palette for a team + kit variant */
export function getKitPalette(team: TeamConfig, variant: "home" | "away" | "third" = "home"): KitPalette {
  if (team.kits?.[variant]) return team.kits[variant]!;
  if (team.kits?.home) return team.kits.home;
  // Fallback from legacy fields
  return {
    primary:    team.primaryColour,
    secondary:  team.secondaryColour,
    accent:     "#C9A84C",   // default gold
    background: "#080810",
  };
}

// Hardcoded for teams in our current dataset.
// Logo URLs from TheSportsDB (free CDN, no auth required).
export const TEAM_REGISTRY: Record<string, TeamConfig> = {
  "Wrexham": {
    name: "Wrexham",
    shortName: "WRE",
    primaryColour: "#BA0C2F",
    secondaryColour: "#FFFFFF",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/ezpymt1675092551.png",
    tsdbId: 134775,
    statsbombId: 1557,
    kits: {
      home: {
        primary:    "#BA0C2F",   // Wrexham red (official)
        secondary:  "#FFFFFF",   // white
        accent:     "#C9A84C",   // antique gold — edition numbers, badge highlights
        background: "#080810",   // near-black canvas
      },
      away: {
        primary:    "#FFD100",   // Welsh gold (2025-26 Macron away)
        secondary:  "#1A5C2A",   // dark forest green trim
        accent:     "#BA0C2F",   // red accent (club identity carried through)
        background: "#0D1A0F",   // very dark green-black canvas
      },
    },
  },
  "Coventry City": {
    name: "Coventry City",
    shortName: "COV",
    primaryColour: "#77BBFF",
    secondaryColour: "#FFFFFF",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/uxyqys1424033798.png",
    statsbombId: 548,
    kits: {
      home: {
        primary:    "#77BBFF",   // sky blue
        secondary:  "#FFFFFF",
        accent:     "#C9A84C",
        background: "#060E1A",
      },
    },
  },
  "Sheffield United": {
    name: "Sheffield United",
    shortName: "SHU",
    primaryColour: "#EE2737",
    secondaryColour: "#000000",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/w7f8pj1672950689.png",
    kits: {
      home: {
        primary:    "#EE2737",   // Blades red
        secondary:  "#000000",   // black stripe
        accent:     "#C9A84C",
        background: "#080810",
      },
    },
  },
  "Ipswich Town": {
    name: "Ipswich Town",
    shortName: "IPS",
    primaryColour: "#3A64A3",
    secondaryColour: "#FFFFFF",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/mdj1ey1634670785.png",
    kits: {
      home: {
        primary:    "#3A64A3",   // Ipswich blue
        secondary:  "#FFFFFF",
        accent:     "#C9A84C",
        background: "#050A14",
      },
    },
  },
  // National teams from StatsBomb open data
  "Spain": {
    name: "Spain",
    shortName: "ESP",
    primaryColour: "#8AE234",
    secondaryColour: "#FFE500",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/wsqnwp1515392494.png",
  },
  "France": {
    name: "France",
    shortName: "FRA",
    primaryColour: "#002395",
    secondaryColour: "#FFFFFF",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/qntixy1515392528.png",
  },
  "England": {
    name: "England",
    shortName: "ENG",
    primaryColour: "#FFFFFF",
    secondaryColour: "#CE1124",
    logoUrl: "https://r2.thesportsdb.com/images/media/team/badge/bkqtpu1515392494.png",
  },
};

/** Look up a team by name (case-insensitive, partial match). */
export function getTeam(name: string): TeamConfig | null {
  const key = Object.keys(TEAM_REGISTRY).find(
    k => k.toLowerCase() === name.toLowerCase() ||
         k.toLowerCase().includes(name.toLowerCase())
  );
  return key ? TEAM_REGISTRY[key] : null;
}

/** Fetch a logo URL from TheSportsDB for any team not in the registry. */
export async function fetchTeamLogoFromTSDB(teamName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(teamName);
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`,
      { next: { revalidate: 86400 } } // cache 24h
    );
    const data = await res.json();
    return data?.teams?.[0]?.strBadge ?? null;
  } catch {
    return null;
  }
}
