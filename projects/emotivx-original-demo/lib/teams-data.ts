/* ------------------------------------------------------------------ */
/*  Hardcoded Euro 2024 team & player data (placeholder until DB)     */
/* ------------------------------------------------------------------ */

export interface TeamData {
  id: string;
  name: string;
  code: string;
  primaryColor: string;
  secondaryColor: string;
  players: PlayerData[];
  legends: LegendData[];
  matches: MatchData[];
}

export interface PlayerData {
  id: string;
  name: string;
  number: number;
  position: string;
}

export interface LegendData {
  id: string;
  name: string;
  number: number;
  apps: number;
  goals: number;
  era: string;
}

export interface MatchData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  competition: string;
}

export const TEAMS_DATA: Record<string, TeamData> = {
  germany: {
    id: "germany",
    name: "Germany",
    code: "GER",
    primaryColor: "#FFCC00",
    secondaryColor: "#000000",
    players: [
      { id: "ger-1", name: "Manuel Neuer", number: 1, position: "GK" },
      { id: "ger-2", name: "Antonio Rüdiger", number: 2, position: "CB" },
      { id: "ger-6", name: "Joshua Kimmich", number: 6, position: "RB" },
      { id: "ger-8", name: "Toni Kroos", number: 8, position: "CM" },
      { id: "ger-10", name: "Jamal Musiala", number: 10, position: "AM" },
      { id: "ger-17", name: "Florian Wirtz", number: 17, position: "AM" },
    ],
    legends: [
      { id: "ger-l1", name: "Franz Beckenbauer", number: 5, apps: 103, goals: 14, era: "1965–1977" },
      { id: "ger-l2", name: "Gerd Müller", number: 13, apps: 62, goals: 68, era: "1966–1974" },
      { id: "ger-l3", name: "Lothar Matthäus", number: 10, apps: 150, goals: 23, era: "1980–2000" },
      { id: "ger-l4", name: "Miroslav Klose", number: 11, apps: 137, goals: 71, era: "2001–2014" },
      { id: "ger-l5", name: "Philipp Lahm", number: 16, apps: 113, goals: 5, era: "2004–2014" },
    ],
    matches: [
      { id: "ger-m1", homeTeam: "Germany", awayTeam: "Scotland", homeScore: 5, awayScore: 1, date: "2024-06-14", competition: "Euro 2024 Group A" },
      { id: "ger-m2", homeTeam: "Germany", awayTeam: "Hungary", homeScore: 2, awayScore: 0, date: "2024-06-19", competition: "Euro 2024 Group A" },
      { id: "ger-m3", homeTeam: "Switzerland", awayTeam: "Germany", homeScore: 1, awayScore: 1, date: "2024-06-23", competition: "Euro 2024 Group A" },
    ],
  },
  france: {
    id: "france",
    name: "France",
    code: "FRA",
    primaryColor: "#002395",
    secondaryColor: "#FFFFFF",
    players: [
      { id: "fra-1", name: "Mike Maignan", number: 16, position: "GK" },
      { id: "fra-2", name: "Jules Koundé", number: 5, position: "RB" },
      { id: "fra-3", name: "William Saliba", number: 17, position: "CB" },
      { id: "fra-4", name: "N'Golo Kanté", number: 13, position: "CM" },
      { id: "fra-5", name: "Kylian Mbappé", number: 10, position: "FW" },
      { id: "fra-6", name: "Antoine Griezmann", number: 7, position: "FW" },
    ],
    legends: [
      { id: "fra-l1", name: "Zinédine Zidane", number: 10, apps: 108, goals: 31, era: "1994–2006" },
      { id: "fra-l2", name: "Michel Platini", number: 10, apps: 72, goals: 41, era: "1976–1987" },
      { id: "fra-l3", name: "Thierry Henry", number: 12, apps: 123, goals: 51, era: "1997–2010" },
      { id: "fra-l4", name: "Marcel Desailly", number: 8, apps: 116, goals: 3, era: "1993–2004" },
      { id: "fra-l5", name: "Lilian Thuram", number: 15, apps: 142, goals: 2, era: "1994–2008" },
    ],
    matches: [
      { id: "fra-m1", homeTeam: "France", awayTeam: "Austria", homeScore: 1, awayScore: 0, date: "2024-06-17", competition: "Euro 2024 Group D" },
      { id: "fra-m2", homeTeam: "Netherlands", awayTeam: "France", homeScore: 0, awayScore: 0, date: "2024-06-21", competition: "Euro 2024 Group D" },
      { id: "fra-m3", homeTeam: "France", awayTeam: "Poland", homeScore: 1, awayScore: 1, date: "2024-06-25", competition: "Euro 2024 Group D" },
    ],
  },
  spain: {
    id: "spain",
    name: "Spain",
    code: "ESP",
    primaryColor: "#AA151B",
    secondaryColor: "#F1BF00",
    players: [
      { id: "esp-1", name: "Unai Simón", number: 23, position: "GK" },
      { id: "esp-2", name: "Dani Carvajal", number: 2, position: "RB" },
      { id: "esp-3", name: "Rodri", number: 16, position: "CM" },
      { id: "esp-4", name: "Pedri", number: 8, position: "CM" },
      { id: "esp-5", name: "Lamine Yamal", number: 19, position: "RW" },
      { id: "esp-6", name: "Nico Williams", number: 17, position: "LW" },
    ],
    legends: [
      { id: "esp-l1", name: "Andrés Iniesta", number: 6, apps: 131, goals: 13, era: "2006–2018" },
      { id: "esp-l2", name: "Xavi Hernández", number: 8, apps: 133, goals: 13, era: "2000–2014" },
      { id: "esp-l3", name: "Iker Casillas", number: 1, apps: 167, goals: 0, era: "2000–2016" },
      { id: "esp-l4", name: "Raúl González", number: 7, apps: 102, goals: 44, era: "1996–2006" },
      { id: "esp-l5", name: "Fernando Torres", number: 9, apps: 110, goals: 38, era: "2003–2014" },
    ],
    matches: [
      { id: "esp-m1", homeTeam: "Spain", awayTeam: "Croatia", homeScore: 3, awayScore: 0, date: "2024-06-15", competition: "Euro 2024 Group B" },
      { id: "esp-m2", homeTeam: "Spain", awayTeam: "Italy", homeScore: 1, awayScore: 0, date: "2024-06-20", competition: "Euro 2024 Group B" },
      { id: "esp-m3", homeTeam: "Albania", awayTeam: "Spain", homeScore: 0, awayScore: 1, date: "2024-06-24", competition: "Euro 2024 Group B" },
    ],
  },
  england: {
    id: "england",
    name: "England",
    code: "ENG",
    primaryColor: "#1D3461",
    secondaryColor: "#FFFFFF",
    players: [
      { id: "eng-1", name: "Jordan Pickford", number: 1, position: "GK" },
      { id: "eng-2", name: "Kyle Walker", number: 2, position: "RB" },
      { id: "eng-3", name: "Declan Rice", number: 4, position: "CM" },
      { id: "eng-4", name: "Jude Bellingham", number: 10, position: "AM" },
      { id: "eng-5", name: "Harry Kane", number: 9, position: "FW" },
      { id: "eng-6", name: "Bukayo Saka", number: 7, position: "RW" },
    ],
    legends: [
      { id: "eng-l1", name: "Bobby Moore", number: 6, apps: 108, goals: 2, era: "1962–1973" },
      { id: "eng-l2", name: "Bobby Charlton", number: 9, apps: 106, goals: 49, era: "1958–1970" },
      { id: "eng-l3", name: "Gary Lineker", number: 10, apps: 80, goals: 48, era: "1984–1992" },
      { id: "eng-l4", name: "Wayne Rooney", number: 10, apps: 120, goals: 53, era: "2003–2018" },
      { id: "eng-l5", name: "David Beckham", number: 7, apps: 115, goals: 17, era: "1996–2009" },
    ],
    matches: [
      { id: "eng-m1", homeTeam: "England", awayTeam: "Serbia", homeScore: 1, awayScore: 0, date: "2024-06-16", competition: "Euro 2024 Group C" },
      { id: "eng-m2", homeTeam: "Denmark", awayTeam: "England", homeScore: 1, awayScore: 1, date: "2024-06-20", competition: "Euro 2024 Group C" },
      { id: "eng-m3", homeTeam: "England", awayTeam: "Slovenia", homeScore: 0, awayScore: 0, date: "2024-06-25", competition: "Euro 2024 Group C" },
    ],
  },
  portugal: {
    id: "portugal",
    name: "Portugal",
    code: "POR",
    primaryColor: "#006847",
    secondaryColor: "#FF0000",
    players: [
      { id: "por-1", name: "Diogo Costa", number: 22, position: "GK" },
      { id: "por-2", name: "Pepe", number: 3, position: "CB" },
      { id: "por-3", name: "Rúben Dias", number: 4, position: "CB" },
      { id: "por-4", name: "Bruno Fernandes", number: 8, position: "AM" },
      { id: "por-5", name: "Bernardo Silva", number: 10, position: "RW" },
      { id: "por-6", name: "Cristiano Ronaldo", number: 7, position: "FW" },
    ],
    legends: [
      { id: "por-l1", name: "Eusébio", number: 13, apps: 64, goals: 41, era: "1961–1973" },
      { id: "por-l2", name: "Luís Figo", number: 7, apps: 127, goals: 32, era: "1991–2006" },
      { id: "por-l3", name: "Rui Costa", number: 10, apps: 94, goals: 26, era: "1993–2004" },
      { id: "por-l4", name: "Fernando Couto", number: 4, apps: 110, goals: 8, era: "1990–2004" },
      { id: "por-l5", name: "Vítor Baía", number: 1, apps: 80, goals: 0, era: "1990–2002" },
    ],
    matches: [
      { id: "por-m1", homeTeam: "Portugal", awayTeam: "Czech Republic", homeScore: 2, awayScore: 1, date: "2024-06-18", competition: "Euro 2024 Group F" },
      { id: "por-m2", homeTeam: "Turkey", awayTeam: "Portugal", homeScore: 0, awayScore: 3, date: "2024-06-22", competition: "Euro 2024 Group F" },
      { id: "por-m3", homeTeam: "Georgia", awayTeam: "Portugal", homeScore: 2, awayScore: 0, date: "2024-06-26", competition: "Euro 2024 Group F" },
    ],
  },
  italy: {
    id: "italy",
    name: "Italy",
    code: "ITA",
    primaryColor: "#0066B3",
    secondaryColor: "#FFFFFF",
    players: [
      { id: "ita-1", name: "Gianluigi Donnarumma", number: 1, position: "GK" },
      { id: "ita-2", name: "Giovanni Di Lorenzo", number: 2, position: "RB" },
      { id: "ita-3", name: "Nicolò Barella", number: 18, position: "CM" },
      { id: "ita-4", name: "Jorginho", number: 8, position: "CM" },
      { id: "ita-5", name: "Federico Chiesa", number: 14, position: "RW" },
      { id: "ita-6", name: "Gianluca Scamacca", number: 9, position: "FW" },
    ],
    legends: [
      { id: "ita-l1", name: "Paolo Maldini", number: 3, apps: 126, goals: 7, era: "1988–2002" },
      { id: "ita-l2", name: "Roberto Baggio", number: 10, apps: 56, goals: 27, era: "1988–2004" },
      { id: "ita-l3", name: "Gianluigi Buffon", number: 1, apps: 176, goals: 0, era: "1997–2018" },
      { id: "ita-l4", name: "Alessandro Del Piero", number: 7, apps: 91, goals: 27, era: "1995–2008" },
      { id: "ita-l5", name: "Franco Baresi", number: 6, apps: 81, goals: 1, era: "1982–1994" },
    ],
    matches: [
      { id: "ita-m1", homeTeam: "Italy", awayTeam: "Albania", homeScore: 2, awayScore: 1, date: "2024-06-15", competition: "Euro 2024 Group B" },
      { id: "ita-m2", homeTeam: "Spain", awayTeam: "Italy", homeScore: 1, awayScore: 0, date: "2024-06-20", competition: "Euro 2024 Group B" },
      { id: "ita-m3", homeTeam: "Croatia", awayTeam: "Italy", homeScore: 1, awayScore: 1, date: "2024-06-24", competition: "Euro 2024 Group B" },
    ],
  },
};

/** Lookup helper — accepts slug like "germany" or "france" */
export function getTeamData(teamId: string): TeamData | undefined {
  return TEAMS_DATA[teamId.toLowerCase()];
}
