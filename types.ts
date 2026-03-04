export type ID = string;

export type Position = "QB" | "HB" | "WR" | "TE" | "OL" | "DE" | "DT" | "LB" | "CB" | "S" | "K";

export interface Contract {
  playerId: ID;
  teamId: ID | null;
  years: number;
  apy: number;
  guaranteed: number;
  startSeason: number;
  tag?: boolean;
}

export interface Player {
  id: ID;
  name: string;
  position: Position;
  age: number;
  overall: number;
  potential: number;
  teamId: ID | null;
  ratings: Record<string, number>;
  contractId: ID | null;
  isProspect?: boolean;
}

export interface Coach {
  id: ID;
  name: string;
  role: "HC" | "OC" | "DC";
  side: "OFF" | "DEF" | "ST";
  schemePrefs: string[];
  ratings: {
    development: number;
    playcalling: number;
    discipline: number;
  };
  traits: string[];
  cost: number;
  teamId: ID | null;
}

export interface Team {
  id: ID;
  abbr: string;
  name: string;
  conf: string;
  div: string;
  offScheme: string;
  defScheme: string;
  staff: {
    hcId: ID | null;
    ocId: ID | null;
    dcId: ID | null;
  };
}

export interface ScheduleGame {
  id: ID;
  week: number;
  homeTeamId: ID;
  awayTeamId: ID;
  played: boolean;
  homeScore: number | null;
  awayScore: number | null;
}

export interface StandingRow {
  teamId: ID;
  wins: number;
  losses: number;
  ties: number;
}

export type Phase =
  | "FRONT_OFFICE_HUB"
  | "STAFF"
  | "ROSTER_AUDIT"
  | "FREE_AGENCY"
  | "DRAFT_PREP"
  | "DRAFT"
  | "PRESEASON"
  | "REGULAR_SEASON_WEEK"
  | "PLAYOFFS"
  | "ROLLOVER";

export interface TxBase {
  id: ID;
  atTick: number;
  season: number;
}

export interface SignFATx extends TxBase {
  kind: "SIGN_FA";
  playerId: ID;
  teamId: ID;
  contract: Contract;
}

export interface ReleasePlayerTx extends TxBase {
  kind: "RELEASE_PLAYER";
  playerId: ID;
  teamId: ID;
  deadCap: number;
}

export interface ReSignTx extends TxBase {
  kind: "RE_SIGN";
  playerId: ID;
  teamId: ID;
  contract: Contract;
}

export interface FranchiseTagTx extends TxBase {
  kind: "FRANCHISE_TAG";
  playerId: ID;
  teamId: ID;
  contract: Contract;
}

export interface HireCoachTx extends TxBase {
  kind: "HIRE_COACH";
  coachId: ID;
  teamId: ID;
  role: "HC" | "OC" | "DC";
}

export type TxEvent = SignFATx | ReleasePlayerTx | ReSignTx | FranchiseTagTx | HireCoachTx;

export interface ScoutingKnowledgeEntry {
  playerId: ID;
  confidence: number;
  revealed: string[];
  notes: string[];
}

export interface SaveState {
  meta: {
    saveVersion: number;
    createdAt: string;
    seed: number;
    userTeamId: ID;
  };
  league: {
    season: number;
    week: number;
    phase: Phase;
    teams: Record<ID, Team>;
    schedule: ScheduleGame[];
    standings: Record<ID, StandingRow>;
  };
  roster: {
    playersById: Record<ID, Player>;
    freeAgentIds: ID[];
    teamAssignments: Record<ID, ID[]>;
  };
  contracts: {
    records: Record<ID, Contract>;
  };
  coaches: {
    staffByTeam: Record<ID, { hcId: ID | null; ocId: ID | null; dcId: ID | null }>;
    market: Record<ID, Coach>;
    byId: Record<ID, Coach>;
  };
  scouting: {
    knowledge: Record<ID, ScoutingKnowledgeEntry>;
    points: number;
  };
  transactions: TxEvent[];
  derived: {
    rostersByTeam: Record<ID, ID[]>;
    capByTeam: Record<ID, { committed: number; space: number }>;
    contractByPlayer: Record<ID, ID | null>;
  };
  ui: {
    lastRoute: string;
    filters: Record<string, string | number | boolean>;
    sort: { key: string; dir: "asc" | "desc" };
    pinnedPlayers: ID[];
  };
}
