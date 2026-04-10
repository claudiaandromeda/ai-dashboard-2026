/* ------------------------------------------------------------------ */
/*  Extended player detail data (stats, bio, moments)                  */
/*  Hardcoded until DB layer exists                                    */
/* ------------------------------------------------------------------ */

export interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
}

export interface PlayerBio {
  nationality: string;
  dateOfBirth: string;
  height: string;
  weight: string;
  preferredFoot: string;
  joined: string;
}

export interface PlayerMoment {
  id: string;
  type: "goal" | "assist";
  opponent: string;
  date: string;
  minute: number;
  description: string;
}

export interface PlayerDetail {
  id: string;
  name: string;
  number: number;
  position: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  stats: PlayerStats;
  bio: PlayerBio;
  moments: PlayerMoment[];
  signatureDescription: string;
}

export const PLAYER_DETAILS: Record<string, PlayerDetail> = {
  /* ---- Wrexham ---- */
  "wrx-9": {
    id: "wrx-9",
    name: "Paul Mullin",
    number: 9,
    position: "FW",
    teamId: "wrexham",
    teamName: "Wrexham AFC",
    teamColor: "#E4002B",
    stats: {
      appearances: 142,
      goals: 47,
      assists: 23,
      minutesPlayed: 11340,
      yellowCards: 12,
      redCards: 1,
    },
    bio: {
      nationality: "England",
      dateOfBirth: "1994-11-06",
      height: "180 cm",
      weight: "76 kg",
      preferredFoot: "Right",
      joined: "2021-07-01",
    },
    moments: [
      {
        id: "wrx-m1",
        type: "goal",
        opponent: "Notts County",
        date: "2023-04-22",
        minute: 34,
        description: "Thunderous strike from 25 yards to open the scoring in the title decider.",
      },
      {
        id: "wrx-m2",
        type: "goal",
        opponent: "Boreham Wood",
        date: "2023-03-11",
        minute: 67,
        description: "Curling finish into the top corner from the edge of the box.",
      },
      {
        id: "wrx-m3",
        type: "assist",
        opponent: "Maidenhead",
        date: "2023-01-14",
        minute: 52,
        description: "Delicate through-ball to set up the winning goal.",
      },
    ],
    signatureDescription: "Paul Mullin's thunderous title-clinching strike against Notts County — the goal that sealed Wrexham's promotion.",
  },
  "wrx-10": {
    id: "wrx-10",
    name: "Elliot Lee",
    number: 10,
    position: "AM",
    teamId: "wrexham",
    teamName: "Wrexham AFC",
    teamColor: "#E4002B",
    stats: {
      appearances: 98,
      goals: 22,
      assists: 31,
      minutesPlayed: 7640,
      yellowCards: 8,
      redCards: 0,
    },
    bio: {
      nationality: "England",
      dateOfBirth: "1994-12-16",
      height: "175 cm",
      weight: "72 kg",
      preferredFoot: "Left",
      joined: "2022-06-15",
    },
    moments: [
      {
        id: "wrx-m4",
        type: "goal",
        opponent: "Yeovil Town",
        date: "2023-02-18",
        minute: 71,
        description: "Clever free-kick curled over the wall and into the bottom corner.",
      },
      {
        id: "wrx-m5",
        type: "assist",
        opponent: "Torquay United",
        date: "2023-04-01",
        minute: 15,
        description: "Quick one-two on the edge of the box before laying off for the tap-in.",
      },
    ],
    signatureDescription: "Elliot Lee's mesmerising free-kick against Yeovil — pure technique, top bins.",
  },

  /* ---- Euro 2024 — Spain ---- */
  "esp-5": {
    id: "esp-5",
    name: "Lamine Yamal",
    number: 19,
    position: "RW",
    teamId: "spain",
    teamName: "Spain",
    teamColor: "#AA151B",
    stats: {
      appearances: 18,
      goals: 5,
      assists: 9,
      minutesPlayed: 1260,
      yellowCards: 1,
      redCards: 0,
    },
    bio: {
      nationality: "Spain",
      dateOfBirth: "2007-07-13",
      height: "180 cm",
      weight: "68 kg",
      preferredFoot: "Left",
      joined: "2023-09-08",
    },
    moments: [
      {
        id: "esp-ym1",
        type: "goal",
        opponent: "France",
        date: "2024-07-09",
        minute: 21,
        description: "Stunning curler from outside the box into the top corner in the Euro 2024 semi-final — youngest ever scorer in the tournament.",
      },
      {
        id: "esp-ym2",
        type: "assist",
        opponent: "Georgia",
        date: "2024-06-30",
        minute: 18,
        description: "Dribbled past two defenders and squared for Rodri to tap in.",
      },
      {
        id: "esp-ym3",
        type: "assist",
        opponent: "England",
        date: "2024-07-14",
        minute: 47,
        description: "Driving run on the right before delivering the cross for Nico Williams' opening goal in the final.",
      },
    ],
    signatureDescription: "Lamine Yamal's jaw-dropping curler against France — the goal that made history in the Euro 2024 semi-final.",
  },

  /* ---- Euro 2024 — England ---- */
  "eng-4": {
    id: "eng-4",
    name: "Jude Bellingham",
    number: 10,
    position: "AM",
    teamId: "england",
    teamName: "England",
    teamColor: "#1D3461",
    stats: {
      appearances: 42,
      goals: 8,
      assists: 5,
      minutesPlayed: 3320,
      yellowCards: 6,
      redCards: 0,
    },
    bio: {
      nationality: "England",
      dateOfBirth: "2003-06-29",
      height: "186 cm",
      weight: "75 kg",
      preferredFoot: "Right",
      joined: "2020-11-12",
    },
    moments: [
      {
        id: "eng-bm1",
        type: "goal",
        opponent: "Serbia",
        date: "2024-06-16",
        minute: 13,
        description: "Towering header from Trippier's cross to open England's Euro 2024 campaign.",
      },
      {
        id: "eng-bm2",
        type: "goal",
        opponent: "Slovakia",
        date: "2024-06-30",
        minute: 95,
        description: "Incredible overhead bicycle kick in the 95th minute to send the match to extra time — one of the goals of the tournament.",
      },
      {
        id: "eng-bm3",
        type: "assist",
        opponent: "Switzerland",
        date: "2024-07-06",
        minute: 80,
        description: "Threaded a perfect pass through the Swiss defence for Saka's equaliser.",
      },
    ],
    signatureDescription: "Jude Bellingham's last-gasp bicycle kick against Slovakia — the 95th-minute miracle that kept England's Euro 2024 dream alive.",
  },

  /* ---- Euro 2024 — Germany ---- */
  "ger-10": {
    id: "ger-10",
    name: "Jamal Musiala",
    number: 10,
    position: "AM",
    teamId: "germany",
    teamName: "Germany",
    teamColor: "#FFCC00",
    stats: {
      appearances: 36,
      goals: 6,
      assists: 7,
      minutesPlayed: 2710,
      yellowCards: 3,
      redCards: 0,
    },
    bio: {
      nationality: "Germany",
      dateOfBirth: "2003-02-26",
      height: "183 cm",
      weight: "72 kg",
      preferredFoot: "Right",
      joined: "2021-03-25",
    },
    moments: [
      {
        id: "ger-mm1",
        type: "goal",
        opponent: "Scotland",
        date: "2024-06-14",
        minute: 19,
        description: "Silky dribble through three defenders before slotting home in the opening match.",
      },
      {
        id: "ger-mm2",
        type: "goal",
        opponent: "Hungary",
        date: "2024-06-19",
        minute: 67,
        description: "Quick turn and low drive from the edge of the area to seal the victory.",
      },
    ],
    signatureDescription: "Jamal Musiala's mazy dribble goal against Scotland — the moment that electrified Euro 2024's opening night.",
  },
};

/** Look up a player's full detail by their ID */
export function getPlayerDetail(playerId: string): PlayerDetail | undefined {
  return PLAYER_DETAILS[playerId];
}

/** Get all player IDs that have detail data */
export function getAllPlayerIds(): string[] {
  return Object.keys(PLAYER_DETAILS);
}
