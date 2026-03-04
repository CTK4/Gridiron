export interface LeagueDBTeam {
  id: string;
  abbr: string;
  name: string;
  conf: string;
  div: string;
}

export interface LeagueDBPlayer {
  id: string;
  name: string;
  pos: "QB" | "HB" | "WR" | "TE" | "OL" | "DE" | "DT" | "LB" | "CB" | "S" | "K";
  age: number;
  teamId: string | null;
  ovr: number;
  pot: number;
}

export interface LeagueDB {
  teams: LeagueDBTeam[];
  players: LeagueDBPlayer[];
  fa: LeagueDBPlayer[];
  dc: Array<LeagueDBPlayer & { rank: number; round: number; grade: string }>;
}

// Fixture lives in its own module so app state code has a clean integration seam.
export const HCD_DATA: LeagueDB = {
  teams: [
    { id: "ATLANTA_APEX", abbr: "ATL", name: "Atlanta Apex", conf: "CC", div: "CC_EAST" },
    { id: "BOSTON_HARBORMEN", abbr: "BOS", name: "Boston Harbormen", conf: "FC", div: "FC_EAST" },
    { id: "SEATTLE_EVERGREENS", abbr: "SEA", name: "Seattle Evergreens", conf: "CC", div: "CC_WEST" },
    { id: "PHOENIX_SCORCH", abbr: "PHX", name: "Phoenix Scorch", conf: "FC", div: "FC_WEST" },
  ],
  players: [
    { id: "PLY_1", name: "Mason Hale", pos: "QB", age: 27, teamId: "ATLANTA_APEX", ovr: 83, pot: 86 },
    { id: "PLY_2", name: "Rico Vaughn", pos: "WR", age: 25, teamId: "ATLANTA_APEX", ovr: 79, pot: 84 },
    { id: "PLY_3", name: "Trey Monroe", pos: "DE", age: 28, teamId: "BOSTON_HARBORMEN", ovr: 81, pot: 82 },
    { id: "PLY_4", name: "Nate Quill", pos: "CB", age: 24, teamId: "SEATTLE_EVERGREENS", ovr: 78, pot: 85 },
  ],
  fa: [{ id: "PLY_5", name: "Jalen Pope", pos: "HB", age: 26, teamId: null, ovr: 76, pot: 79 }],
  dc: [{ id: "DC_1", name: "Kian Ortiz", pos: "OL", age: 22, teamId: null, ovr: 72, pot: 86, rank: 1, round: 1, grade: "A" }],
};
