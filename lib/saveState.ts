import { HCD_DATA } from "../data/leagueDB";
import { CAP_LIMIT, DEF_SCHEMES, OFF_SCHEMES, SALARY_SCALE } from "./constants";
import { hashSeed, makeRng, rI, rPick, rShuffle } from "./rng";
import { Coach, Contract, ID, Phase, Player, SaveState, ScheduleGame, Team, TxEvent } from "../types";

const CURRENT_SAVE_VERSION = 1;

const PHASE_ORDER: Phase[] = [
  "FRONT_OFFICE_HUB",
  "STAFF",
  "ROSTER_AUDIT",
  "FREE_AGENCY",
  "DRAFT_PREP",
  "DRAFT",
  "PRESEASON",
  "REGULAR_SEASON_WEEK",
  "PLAYOFFS",
  "ROLLOVER",
];

const getBaseSalary = (position: Player["position"], overall: number): number => {
  const scale = SALARY_SCALE[position] ?? 10;
  return Math.round(((scale * 1_000_000) * Math.max(60, overall)) / 100);
};

const genCoach = (seed: number, teamId: ID | null, role: Coach["role"], index: number): Coach => {
  const rng = makeRng(hashSeed(seed, teamId ?? "FA", role, index));
  const side = role === "DC" ? "DEF" : "OFF";
  return {
    id: `${teamId ?? "FA"}_${role}_${index}`,
    name: `Coach-${rI(rng, 1000, 9999)}`,
    role,
    side,
    schemePrefs: [role === "DC" ? rPick(rng, DEF_SCHEMES).id : rPick(rng, OFF_SCHEMES).id],
    ratings: {
      development: rI(rng, 55, 95),
      playcalling: rI(rng, 55, 95),
      discipline: rI(rng, 50, 95),
    },
    traits: [rPick(rng, ["aggressive", "teacher", "adaptive", "player-first"])],
    cost: rI(rng, 2_000_000, 9_000_000),
    teamId,
  };
};

const genSchedule = (seed: number, teamIds: ID[]): ScheduleGame[] => {
  const rng = makeRng(hashSeed(seed, "schedule"));
  const games: ScheduleGame[] = [];
  for (let week = 1; week <= 18; week += 1) {
    const shuffled = rShuffle(rng, teamIds);
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      games.push({
        id: `WK${week}_${shuffled[i]}_${shuffled[i + 1]}`,
        week,
        homeTeamId: shuffled[i],
        awayTeamId: shuffled[i + 1],
        played: false,
        homeScore: null,
        awayScore: null,
      });
    }
  }
  return games;
};

export const createNewSave = ({ seed, userTeamId }: { seed: number; userTeamId: ID }): SaveState => {
  const teams: Record<ID, Team> = {};
  const standings: SaveState["league"]["standings"] = {};

  HCD_DATA.teams.forEach((t, index) => {
    const rng = makeRng(hashSeed(seed, t.id, "scheme"));
    teams[t.id] = {
      id: t.id,
      abbr: t.abbr,
      name: t.name,
      conf: t.conf,
      div: t.div,
      offScheme: OFF_SCHEMES[index % OFF_SCHEMES.length].id,
      defScheme: DEF_SCHEMES[index % DEF_SCHEMES.length].id,
      staff: { hcId: null, ocId: null, dcId: null },
    };
    standings[t.id] = { teamId: t.id, wins: 0, losses: 0, ties: 0 };
    void rng;
  });

  const playersById: Record<ID, Player> = {};
  const teamAssignments: Record<ID, ID[]> = {};
  const contracts: Record<ID, Contract> = {};

  for (const p of HCD_DATA.players) {
    const contractId = `CTR_${p.id}`;
    const contract = {
      playerId: p.id,
      teamId: p.teamId,
      years: 2,
      apy: getBaseSalary(p.pos, p.ovr),
      guaranteed: Math.round(getBaseSalary(p.pos, p.ovr) * 0.45),
      startSeason: 1,
    };
    contracts[contractId] = contract;
    playersById[p.id] = {
      id: p.id,
      name: p.name,
      position: p.pos,
      age: p.age,
      overall: p.ovr,
      potential: p.pot,
      teamId: p.teamId,
      ratings: {},
      contractId,
    };
    if (p.teamId) {
      teamAssignments[p.teamId] ||= [];
      teamAssignments[p.teamId].push(p.id);
    }
  }

  for (const p of HCD_DATA.fa) {
    playersById[p.id] = {
      id: p.id,
      name: p.name,
      position: p.pos,
      age: p.age,
      overall: p.ovr,
      potential: p.pot,
      teamId: null,
      ratings: {},
      contractId: null,
    };
  }

  const staffByTeam: SaveState["coaches"]["staffByTeam"] = {};
  const coachById: SaveState["coaches"]["byId"] = {};
  const coachMarket: SaveState["coaches"]["market"] = {};

  Object.keys(teams).forEach((teamId, idx) => {
    const hc = genCoach(seed, teamId, "HC", idx);
    const oc = genCoach(seed, teamId, "OC", idx);
    const dc = genCoach(seed, teamId, "DC", idx);
    coachById[hc.id] = hc;
    coachById[oc.id] = oc;
    coachById[dc.id] = dc;
    staffByTeam[teamId] = { hcId: hc.id, ocId: oc.id, dcId: dc.id };
    teams[teamId].staff = { ...staffByTeam[teamId] };
  });

  for (let i = 0; i < 12; i += 1) {
    const role: Coach["role"] = (i % 3 === 0 ? "HC" : i % 3 === 1 ? "OC" : "DC");
    const coach = genCoach(seed, null, role, i);
    coachMarket[coach.id] = coach;
    coachById[coach.id] = coach;
  }

  const state: SaveState = {
    meta: {
      saveVersion: CURRENT_SAVE_VERSION,
      createdAt: `seed:${seed}`,
      seed,
      userTeamId,
    },
    league: {
      season: 1,
      week: 1,
      phase: "FRONT_OFFICE_HUB",
      teams,
      schedule: genSchedule(seed, Object.keys(teams)),
      standings,
    },
    roster: {
      playersById,
      freeAgentIds: HCD_DATA.fa.map((p) => p.id),
      teamAssignments,
    },
    contracts: {
      records: contracts,
    },
    coaches: {
      staffByTeam,
      market: coachMarket,
      byId: coachById,
    },
    scouting: {
      knowledge: {},
      points: 0,
    },
    transactions: [],
    derived: {
      rostersByTeam: {},
      capByTeam: {},
      contractByPlayer: {},
    },
    ui: {
      lastRoute: "/front-office",
      filters: {},
      sort: { key: "overall", dir: "desc" },
      pinnedPlayers: [],
    },
  };

  return rebuildIndices(state);
};

export const applyTx = (state: SaveState, tx: TxEvent): SaveState => {
  const next: SaveState = {
    ...state,
    transactions: [...state.transactions, tx],
    roster: {
      ...state.roster,
      playersById: { ...state.roster.playersById },
    },
    contracts: { records: { ...state.contracts.records } },
    coaches: {
      ...state.coaches,
      byId: { ...state.coaches.byId },
      market: { ...state.coaches.market },
      staffByTeam: { ...state.coaches.staffByTeam },
    },
  };

  if (tx.kind === "SIGN_FA" || tx.kind === "RE_SIGN" || tx.kind === "FRANCHISE_TAG") {
    const player = next.roster.playersById[tx.playerId];
    if (!player) return next;
    const contractId = `CTR_${tx.playerId}_${tx.atTick}`;
    next.contracts.records[contractId] = tx.contract;
    player.contractId = contractId;
    player.teamId = tx.teamId;
    next.roster.freeAgentIds = next.roster.freeAgentIds.filter((id) => id !== tx.playerId);
  }

  if (tx.kind === "RELEASE_PLAYER") {
    const player = next.roster.playersById[tx.playerId];
    if (!player) return next;
    player.teamId = null;
    player.contractId = null;
    if (!next.roster.freeAgentIds.includes(tx.playerId)) next.roster.freeAgentIds.push(tx.playerId);
  }

  if (tx.kind === "HIRE_COACH") {
    const coach = next.coaches.byId[tx.coachId];
    if (!coach) return next;
    coach.teamId = tx.teamId;
    delete next.coaches.market[tx.coachId];
    const current = next.coaches.staffByTeam[tx.teamId] ?? { hcId: null, ocId: null, dcId: null };
    if (tx.role === "HC") current.hcId = tx.coachId;
    if (tx.role === "OC") current.ocId = tx.coachId;
    if (tx.role === "DC") current.dcId = tx.coachId;
    next.coaches.staffByTeam[tx.teamId] = current;
  }

  return rebuildIndices(next);
};

export const rebuildIndices = (state: SaveState): SaveState => {
  const rostersByTeam: Record<ID, ID[]> = {};
  const contractByPlayer: Record<ID, ID | null> = {};
  const capByTeam: SaveState["derived"]["capByTeam"] = {};

  for (const teamId of Object.keys(state.league.teams)) {
    rostersByTeam[teamId] = [];
    capByTeam[teamId] = { committed: 0, space: CAP_LIMIT };
  }

  for (const [playerId, player] of Object.entries(state.roster.playersById)) {
    if (player.teamId) rostersByTeam[player.teamId].push(playerId);
    contractByPlayer[playerId] = player.contractId;
    if (player.teamId && player.contractId) {
      const contract = state.contracts.records[player.contractId];
      if (contract) {
        capByTeam[player.teamId].committed += contract.apy;
      }
    }
  }

  for (const teamId of Object.keys(capByTeam)) {
    capByTeam[teamId].space = CAP_LIMIT - capByTeam[teamId].committed;
  }

  return {
    ...state,
    roster: {
      ...state.roster,
      teamAssignments: rostersByTeam,
      freeAgentIds: Object.values(state.roster.playersById)
        .filter((p) => !p.teamId)
        .map((p) => p.id),
    },
    derived: {
      rostersByTeam,
      capByTeam,
      contractByPlayer,
    },
  };
};

export const getEffectiveRoster = (state: SaveState, teamId: ID): Player[] =>
  (state.derived.rostersByTeam[teamId] ?? []).map((id) => state.roster.playersById[id]);

export const canEnterPhase = (state: SaveState, phase: Phase): boolean => {
  if (phase === "FREE_AGENCY") return state.roster.freeAgentIds.length > 0;
  if (phase === "DRAFT") return state.league.week >= 18;
  return true;
};

export const canAdvancePhase = (state: SaveState): boolean => {
  if (state.league.phase === "REGULAR_SEASON_WEEK") return state.league.week <= 18;
  return true;
};

export const advancePhase = (state: SaveState): SaveState => {
  if (!canAdvancePhase(state)) return state;
  const idx = PHASE_ORDER.indexOf(state.league.phase);
  const nextPhase = PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
  if (!canEnterPhase(state, nextPhase)) return state;

  const nextWeek = state.league.phase === "REGULAR_SEASON_WEEK" ? state.league.week + 1 : state.league.week;
  const nextSeason = nextPhase === "ROLLOVER" ? state.league.season + 1 : state.league.season;

  return {
    ...state,
    league: {
      ...state.league,
      phase: nextPhase,
      week: nextWeek,
      season: nextSeason,
    },
  };
};
