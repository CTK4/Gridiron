import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// ============================================================
// SEEDED DETERMINISTIC RNG — Mulberry32
// ============================================================
function createRNG(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => Math.floor(next() * (max - min + 1)) + min;
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  const gauss = () => {
    let u = 0, v = 0;
    while (!u) u = next();
    while (!v) v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { next, int, pick, gauss };
}

// ============================================================
// CONSTANTS
// ============================================================
const POSITIONS = ["QB","RB","WR","TE","OT","OG","C","DE","DT","LB","CB","S","K"];
const POS_GROUPS = {
  QB:["Arm Strength","Accuracy","Mobility","Decision Making","Leadership"],
  RB:["Speed","Elusiveness","Power","Pass Protection","Hands"],
  WR:["Speed","Route Running","Hands","RAC","Release"],
  TE:["Blocking","Hands","Route Running","Speed","Size"],
  OT:["Pass Block","Run Block","Footwork","Strength","Awareness"],
  OG:["Pass Block","Run Block","Strength","Footwork","Awareness"],
  C:["Pass Block","Run Block","Intelligence","Strength","Stamina"],
  DE:["Pass Rush","Run Stop","Motor","Athleticism","Strength"],
  DT:["Run Stop","Pass Rush","Strength","Motor","Penetration"],
  LB:["Coverage","Run Stop","Pass Rush","Athleticism","Intelligence"],
  CB:["Coverage","Man Coverage","Zone","Speed","Tackling"],
  S:["Coverage","Run Support","Ball Skills","Speed","Intelligence"],
  K:["Leg Strength","Accuracy","Clutch","Kickoff","Consistency"],
};
const CAP_CEILING = 225_000_000;
const TEAM_DATA = [
  {city:"Chicago",name:"Bears",abbr:"CHI",conf:"NFC",div:"North",color:"#0B162A"},
  {city:"Green Bay",name:"Packers",abbr:"GB",conf:"NFC",div:"North",color:"#203731"},
  {city:"Minnesota",name:"Vikings",abbr:"MIN",conf:"NFC",div:"North",color:"#4F2683"},
  {city:"Detroit",name:"Lions",abbr:"DET",conf:"NFC",div:"North",color:"#0076B6"},
  {city:"Dallas",name:"Cowboys",abbr:"DAL",conf:"NFC",div:"East",color:"#003594"},
  {city:"Philadelphia",name:"Eagles",abbr:"PHI",conf:"NFC",div:"East",color:"#004C54"},
  {city:"New York",name:"Giants",abbr:"NYG",conf:"NFC",div:"East",color:"#0B2265"},
  {city:"Washington",name:"Commanders",abbr:"WAS",conf:"NFC",div:"East",color:"#5A1414"},
  {city:"Tampa Bay",name:"Buccaneers",abbr:"TB",conf:"NFC",div:"South",color:"#D50A0A"},
  {city:"New Orleans",name:"Saints",abbr:"NO",conf:"NFC",div:"South",color:"#D3BC8D"},
  {city:"Atlanta",name:"Falcons",abbr:"ATL",conf:"NFC",div:"South",color:"#A71930"},
  {city:"Carolina",name:"Panthers",abbr:"CAR",conf:"NFC",div:"South",color:"#0085CA"},
  {city:"Los Angeles",name:"Rams",abbr:"LAR",conf:"NFC",div:"West",color:"#003594"},
  {city:"San Francisco",name:"49ers",abbr:"SF",conf:"NFC",div:"West",color:"#AA0000"},
  {city:"Seattle",name:"Seahawks",abbr:"SEA",conf:"NFC",div:"West",color:"#002244"},
  {city:"Arizona",name:"Cardinals",abbr:"ARI",conf:"NFC",div:"West",color:"#97233F"},
  {city:"Kansas City",name:"Chiefs",abbr:"KC",conf:"AFC",div:"West",color:"#E31837"},
  {city:"Las Vegas",name:"Raiders",abbr:"LV",conf:"AFC",div:"West",color:"#000000"},
  {city:"Los Angeles",name:"Chargers",abbr:"LAC",conf:"AFC",div:"West",color:"#0080C6"},
  {city:"Denver",name:"Broncos",abbr:"DEN",conf:"AFC",div:"West",color:"#FB4F14"},
  {city:"Baltimore",name:"Ravens",abbr:"BAL",conf:"AFC",div:"North",color:"#241773"},
  {city:"Pittsburgh",name:"Steelers",abbr:"PIT",conf:"AFC",div:"North",color:"#FFB612"},
  {city:"Cleveland",name:"Browns",abbr:"CLE",conf:"AFC",div:"North",color:"#311D00"},
  {city:"Cincinnati",name:"Bengals",abbr:"CIN",conf:"AFC",div:"North",color:"#FB4F14"},
  {city:"New England",name:"Patriots",abbr:"NE",conf:"AFC",div:"East",color:"#002244"},
  {city:"Buffalo",name:"Bills",abbr:"BUF",conf:"AFC",div:"East",color:"#00338D"},
  {city:"New York",name:"Jets",abbr:"NYJ",conf:"AFC",div:"East",color:"#125740"},
  {city:"Miami",name:"Dolphins",abbr:"MIA",conf:"AFC",div:"East",color:"#008E97"},
  {city:"Houston",name:"Texans",abbr:"HOU",conf:"AFC",div:"South",color:"#03202F"},
  {city:"Indianapolis",name:"Colts",abbr:"IND",conf:"AFC",div:"South",color:"#002C5F"},
  {city:"Jacksonville",name:"Jaguars",abbr:"JAX",conf:"AFC",div:"South",color:"#006778"},
  {city:"Tennessee",name:"Titans",abbr:"TEN",conf:"AFC",div:"South",color:"#4B92DB"},
];
const FIRST_NAMES = ["Marcus","Darius","Justin","Trevon","Jaylen","DeAndre","Malik","Jamal","Caden","Jordan","Isaiah","Xavier","Damien","Andre","Tyler","Kevin","Elijah","Caleb","Micah","Zach","Aaron","James","Michael","David","Chris","Ryan","Alex","Brandon","Derrick","Terrell","Lavonte","Cameron","Kendall","DeShawn","Jaylon","Trey","Nate","Jalen","Kyler","Lamar","Patrick","Josh","Dak","Trevor","Zeke","Cooper","Travis","Davante"];
const LAST_NAMES = ["Williams","Johnson","Smith","Brown","Davis","Wilson","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Garcia","Martinez","Robinson","Clark","Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","King","Wright","Scott","Baker","Adams","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Morris","Morgan","Bell","Murphy","Rivera","Cooper","Cox","Richardson"];
const COLLEGE_NAMES = ["Alabama","Ohio State","Georgia","LSU","Michigan","Oklahoma","Clemson","Penn State","Texas","Florida","USC","Notre Dame","Oregon","Wisconsin","Auburn","Iowa","Tennessee","Kentucky","Washington","Stanford","TCU","Ole Miss","Mississippi State","Arkansas","Utah","Baylor","Colorado","Pittsburgh","Minnesota","Nebraska"];
const TRAITS = ["Leader","Hard Worker","Coachable","Film Rat","Competitor","Clutch","Injury Prone","Locker Room Issue","Ego-Driven","Team First","Culture Builder","Risk Taker","Consistent","Raw Talent","Late Bloomer","Off-Field Risk"];
const INJURY_TYPES = ["Hamstring strain","Ankle sprain","Shoulder contusion","Knee MCL","Concussion protocol","Quad strain","Back tightness","Rib contusion","Wrist injury","Hip flexor"];
const COACH_FIRST = ["Bill","Andy","Kyle","Mike","Sean","Doug","Nick","Matt","John","Tom","Pete","Ron","Dan","Joe","Bruce","Kevin","Dennis","Frank","Ray","Todd"];
const COACH_LAST = ["Harbaugh","Reid","Shanahan","Vrabel","McDermott","McVay","Staley","LaFleur","Saleh","Tomlin","Carroll","Rivera","Campbell","Taylor","Belichick","O'Connell","Allen","Reich","Turner","Bowles"];
const STAFF_ROLES = ["Offensive Coordinator","Defensive Coordinator","QB Coach","WR Coach","OL Coach","DL Coach","ST Coordinator","Strength Coach","Head Scout","Regional Scout","Team Physician","Performance Analyst"];

// ============================================================
// PLAYER GENERATION
// ============================================================
function genPlayerName(rng) {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

function genPlayerAttributes(rng, pos, trueOvr) {
  const keys = POS_GROUPS[pos] || POS_GROUPS["WR"];
  const attrs = {};
  keys.forEach(k => {
    const base = trueOvr + rng.gauss() * 8;
    attrs[k] = Math.max(30, Math.min(99, Math.round(base)));
  });
  return attrs;
}

function genPlayer(rng, pos, ageMin=21, ageMax=30, tier="mid") {
  const tierBands = { elite:[82,99], high:[72,84], mid:[60,74], low:[45,62] };
  const [lo,hi] = tierBands[tier] || tierBands.mid;
  const trueOvr = rng.int(lo,hi);
  const age = rng.int(ageMin, ageMax);
  const potential = Math.min(99, trueOvr + rng.int(0, Math.max(0, 30 - (age-21)*3)));
  const scoutErr = rng.int(4, 14);
  const scoutedLow = Math.max(40, trueOvr - scoutErr);
  const scoutedHigh = Math.min(99, trueOvr + scoutErr);
  const traitCount = rng.int(1,3);
  const playerTraits = [];
  for(let i=0;i<traitCount;i++){
    const t = rng.pick(TRAITS);
    if(!playerTraits.includes(t)) playerTraits.push(t);
  }
  const injuryRisk = playerTraits.includes("Injury Prone") ? rng.int(20,40) : rng.int(3,18);
  const characterRisk = playerTraits.includes("Locker Room Issue") || playerTraits.includes("Off-Field Risk") || playerTraits.includes("Ego-Driven");
  return {
    id: `p_${Date.now()}_${rng.int(1000,9999)}`,
    name: genPlayerName(rng),
    pos,
    age,
    college: rng.pick(COLLEGE_NAMES),
    trueOvr,
    potential,
    scoutedLow,
    scoutedHigh,
    scoutConfidence: 100 - scoutErr * 5,
    attributes: genPlayerAttributes(rng, pos, trueOvr),
    traits: playerTraits,
    injuryRisk,
    characterRisk,
    morale: rng.int(60,90),
    injured: false,
    injuryDetail: null,
    injuryWeeks: 0,
    yearsExperience: Math.max(0, age - 22),
    contract: null,
    stats: { games:0,yards:0,tds:0,tackles:0,sacks:0,ints:0,completions:0,attempts:0 },
    careerStats: { games:0,yards:0,tds:0,tackles:0,sacks:0,ints:0 },
  };
}

function marketValue(pos, ovr, age) {
  const posValue = { QB:1.5, OT:1.2, DE:1.1, WR:1.0, CB:1.0, LB:0.9, RB:0.85, S:0.9, TE:0.95, DT:1.0, OG:0.9, C:0.85, K:0.5 };
  const mult = posValue[pos] || 1;
  const ageDecay = Math.max(0.4, 1 - Math.max(0,(age-28))*0.06);
  const perfMult = ovr < 60 ? 0.4 : ovr < 70 ? 0.6 : ovr < 78 ? 0.85 : ovr < 85 ? 1.1 : ovr < 92 ? 1.4 : 1.8;
  return Math.round(mult * ageDecay * perfMult * 12_000_000);
}

function genContract(rng, player, teamFriendly=false) {
  const val = marketValue(player.pos, player.trueOvr, player.age);
  const years = player.trueOvr > 80 ? rng.int(3,5) : player.trueOvr > 70 ? rng.int(2,4) : rng.int(1,3);
  const avgAnnual = teamFriendly ? val * rng.next()*0.15 + val * 0.85 : val * (0.9 + rng.next()*0.2);
  const guaranteePct = player.trueOvr > 82 ? rng.int(55,75) : rng.int(30,55);
  const guaranteed = Math.round(avgAnnual * years * guaranteePct / 100);
  return {
    years,
    remaining: years,
    avgAnnual: Math.round(avgAnnual),
    guaranteed,
    totalValue: Math.round(avgAnnual * years),
    deadCap: Math.round(guaranteed * 0.5),
    signed: true,
  };
}

// ============================================================
// ROSTER GENERATION
// ============================================================
const ROSTER_TEMPLATE = [
  {pos:"QB",count:2},{pos:"RB",count:3},{pos:"WR",count:4},{pos:"TE",count:2},
  {pos:"OT",count:4},{pos:"OG",count:4},{pos:"C",count:2},
  {pos:"DE",count:4},{pos:"DT",count:4},{pos:"LB",count:5},
  {pos:"CB",count:5},{pos:"S",count:3},{pos:"K",count:1},
];

function genRoster(rng, isUserTeam=false) {
  const players = [];
  ROSTER_TEMPLATE.forEach(({pos, count}) => {
    for(let i=0;i<count;i++){
      const tier = i===0 ? (isUserTeam ? "high" : rng.pick(["elite","high","mid","mid"])) : i===1 ? "mid" : "low";
      const ageMin = i===0 ? 22 : 21;
      const ageMax = i===0 ? 31 : 28;
      const p = genPlayer(rng, pos, ageMin, ageMax, tier);
      p.contract = genContract(rng, p, true);
      players.push(p);
    }
  });
  return players;
}

function genStaff(rng) {
  const hcFirst = rng.pick(COACH_FIRST);
  const hcLast = rng.pick(COACH_LAST);
  const staffList = STAFF_ROLES.map((role,i) => ({
    id:`s_${i}`,
    role,
    name:`${rng.pick(COACH_FIRST)} ${rng.pick(COACH_LAST)}`,
    rating: rng.int(55,85),
    salary: role.includes("Coordinator") ? rng.int(1,4)*1_000_000 : rng.int(200_000,800_000),
    trait: rng.pick(["Tactician","Developer","Motivator","Analyst","Old School","Innovator"]),
    specialty: rng.pick(["Youth Development","Game Planning","Injury Prevention","Analytics","Scouting","Conditioning"]),
  }));
  return {
    hc: { name:`${hcFirst} ${hcLast}`, rating:rng.int(60,90), contract:{years:rng.int(2,5),salary:rng.int(3,8)*1_000_000}, traits:[rng.pick(["Offensive Guru","Defensive Mastermind","Player Developer","Disciplinarian","Players Coach"])] },
    staff: staffList,
    scoutBudget: rng.int(3,8)*1_000_000,
    scoutRating: rng.int(55,85),
  };
}

function genTeamFinances(rng, roster) {
  const capUsed = roster.reduce((s,p) => s + (p.contract?.avgAnnual||0), 0);
  const staffCost = rng.int(15,25)*1_000_000;
  return {
    capCeiling: CAP_CEILING,
    capUsed,
    staffCost,
    capSpace: CAP_CEILING - capUsed - staffCost,
    capRollover: rng.int(0,3)*1_000_000,
    deadCap: roster.reduce((s,p)=>s+(p.contract?.deadCap||0)*0.05,0),
    cashBudget: rng.int(200,280)*1_000_000,
    ownerSpendingTolerance: rng.int(60,95),
    revenue: rng.int(300,600)*1_000_000,
  };
}

// ============================================================
// DRAFT CLASS GENERATION
// ============================================================
function genDraftClass(rng, year) {
  const players = [];
  const picks = 7 * 32;
  const tierByPick = (pick) => pick < 10 ? "elite" : pick < 30 ? "high" : pick < 70 ? "mid" : pick < 140 ? "low" : "low";
  for(let i=0;i<picks;i++){
    const pos = rng.pick(POSITIONS.filter(p=>p!=="K"));
    const tier = tierByPick(i);
    const p = genPlayer(rng, pos, 21, 24, tier);
    p.draftGrade = tier === "elite" ? "A" : tier === "high" ? "B" : tier === "mid" ? "C" : "D";
    p.draftPos = i+1;
    p.contract = null;
    players.push(p);
  }
  return players;
}

// ============================================================
// FREE AGENT POOL GENERATION
// ============================================================
function genFreeAgents(rng, count=80) {
  const agents = [];
  for(let i=0;i<count;i++){
    const pos = rng.pick(POSITIONS);
    const tier = rng.pick(["high","mid","mid","low","low"]);
    const age = rng.int(23,35);
    const p = genPlayer(rng, pos, age, age, tier);
    p.contract = null;
    p.asking = marketValue(p.pos, p.trueOvr, p.age) * (0.9+rng.next()*0.3);
    p.agentSignals = rng.pick(["Seeking top market","Open to all offers","Wants to win now","Hometown discount possible","Length prioritized","AAV prioritized"]);
    agents.push(p);
  }
  return agents;
}

// ============================================================
// LEAGUE AI TEAMS GENERATION
// ============================================================
function genLeague(rng) {
  return TEAM_DATA.map((td,i) => {
    const roster = genRoster(rng, false);
    const staff = genStaff(rng);
    const finances = genTeamFinances(rng, roster);
    const ovr = Math.round(roster.reduce((s,p)=>s+p.trueOvr,0)/roster.length);
    const archetype = rng.pick(["Rebuild","Contender","Win-Now","Balanced","Defensive Identity","Aerial Attack"]);
    return {
      ...td,
      id: `team_${i}`,
      roster,
      staff,
      finances,
      ovr,
      archetype,
      wins:0, losses:0, ties:0,
      pointsFor:0, pointsAgainst:0,
      standing:0,
      championships:[],
      draftPicks: [1,2,3,4,5,6,7].map(r=>({round:r,fromTeam:td.abbr})),
    };
  });
}

// ============================================================
// GAME SIMULATION ENGINE
// ============================================================
function simGame(rng, homeTeam, awayTeam) {
  const homeOvr = Math.min(95, homeTeam.ovr || 70);
  const awayOvr = Math.min(95, awayTeam.ovr || 70);
  const homeAdv = 2.5;
  const homeScore = Math.round(rng.gauss() * 7 + (homeOvr/99*38) + homeAdv + rng.int(-3,3));
  const awayScore = Math.round(rng.gauss() * 7 + (awayOvr/99*35) + rng.int(-3,3));
  const hs = Math.max(0, homeScore);
  const as = Math.max(0, awayScore);
  const drives = [];
  const drivesCount = rng.int(10,16);
  for(let d=0;d<drivesCount;d++){
    const isHome = d%2===0;
    const result = rng.pick(["Touchdown","Field Goal","Punt","Turnover","Turnover on Downs","Missed FG"]);
    drives.push({ team: isHome ? homeTeam.abbr : awayTeam.abbr, result, yards: rng.int(0,80), plays: rng.int(3,12) });
  }
  return { homeScore:hs, awayScore:as, drives, overtime: hs===as };
}

// ============================================================
// INITIAL GAME STATE
// ============================================================
function initGame(seed, userTeamIdx=0) {
  const rng = createRNG(seed);
  const league = genLeague(rng);
  const userTeamBase = league[userTeamIdx];
  const userRoster = genRoster(rng, true);
  const userStaff = genStaff(rng);
  const userFinances = genTeamFinances(rng, userRoster);
  const ovr = Math.round(userRoster.reduce((s,p)=>s+p.trueOvr,0)/userRoster.length);
  const userTeam = {
    ...userTeamBase,
    roster: userRoster,
    staff: userStaff,
    finances: userFinances,
    ovr,
    draftPicks: [1,2,3,4,5,6,7].map(r=>({round:r,fromTeam:userTeamBase.abbr})),
  };
  const draftClass = genDraftClass(rng, 2025);
  const freeAgents = genFreeAgents(rng, 80);
  const schedule = genSchedule(rng, userTeamBase, league);
  return {
    seed,
    year: 2025,
    week: 1,
    phase: "offseason",
    subPhase: "coaching",
    userTeamIdx,
    userTeam,
    league,
    draftClass,
    freeAgents,
    schedule,
    scoutedPlayers: [],
    scoutingBudgetUsed: 0,
    inbox: [
      { id:1, from:"Owner", subject:"Welcome to the franchise!", body:`Welcome to ${userTeam.city}. The city is counting on you. We expect playoffs within 3 years.`, read:false, date:"2025-01-10" },
      { id:2, from:"GM Office", subject:"Offseason plan memo", body:"Phase 1: Coaching staff review. Phase 2: Roster retention decisions. Phase 3: Free Agency. Phase 4: Draft. Good luck.", read:false, date:"2025-01-11" },
    ],
    news: [],
    ownerRelation: 70,
    legacyStats: { wins:0, losses:0, playoffApps:0, championships:0, yearsAsMC:0, tradeMade:0, draftHits:0 },
    gameLog: [],
    notifications: [],
    rngState: seed,
  };
}

function genSchedule(rng, userTeam, league) {
  const weeks = [];
  const others = league.filter(t=>t.abbr!==userTeam.abbr);
  for(let w=1;w<=18;w++){
    const opp = rng.pick(others);
    const home = rng.next() > 0.5;
    weeks.push({ week:w, opponent:opp.abbr, opponentCity:opp.city, opponentName:opp.name, home, played:false, result:null, userScore:0, oppScore:0 });
  }
  return weeks;
}

// ============================================================
// FORMATTERS
// ============================================================
const fmt = {
  cap: (n) => {
    if(!n && n!==0) return "$0";
    if(Math.abs(n) >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`;
    if(Math.abs(n) >= 1_000) return `$${(n/1_000).toFixed(0)}K`;
    return `$${n}`;
  },
  pct: (n) => `${Math.round(n)}%`,
  ovr: (low,high) => low===high ? `${low}` : `${low}–${high}`,
};

const ovrColor = (ovr) => {
  if(ovr >= 90) return "#FFD700";
  if(ovr >= 80) return "#22c55e";
  if(ovr >= 70) return "#3b82f6";
  if(ovr >= 60) return "#f59e0b";
  return "#ef4444";
};

const phaseOrder = ["coaching","retention","scouting","freeagency","draft","preseason","season","playoffs","offseason_reset"];

// ============================================================
// MAIN APP COMPONENT
// ============================================================
export default function GridironDynasty() {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [setupMode, setSetupMode] = useState(false);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState(0);
  const [notification, setNotification] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedFaPlayer, setSelectedFaPlayer] = useState(null);
  const [draftModal, setDraftModal] = useState(null);
  const [gameSimModal, setGameSimModal] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const rngRef = useRef(null);

  // Load or init
  useEffect(() => {
    const load = async () => {
      try {
        const saved = await window.storage.get("gd_state");
        if(saved && saved.value) {
          setGameState(JSON.parse(saved.value));
          setLoading(false);
        } else {
          setSetupMode(true);
          setLoading(false);
        }
      } catch {
        setSetupMode(true);
        setLoading(false);
      }
    };
    load();
  },[]);

  const save = useCallback(async (state) => {
    try { await window.storage.set("gd_state", JSON.stringify(state)); } catch {}
  },[]);

  const notify = useCallback((msg, type="info") => {
    setNotification({msg, type});
    setTimeout(()=>setNotification(null), 3500);
  },[]);

  const updateState = useCallback((updater) => {
    setGameState(prev => {
      const next = typeof updater === "function" ? updater(prev) : {...prev,...updater};
      save(next);
      return next;
    });
  },[save]);

  const getRNG = useCallback((state) => {
    const s = state?.rngState || 12345;
    return createRNG(s + Date.now() % 9999);
  },[]);

  // ── START NEW GAME ──
  const startGame = (teamIdx) => {
    const seed = Math.floor(Date.now() / 1000);
    const state = initGame(seed, teamIdx);
    setGameState(state);
    save(state);
    setSetupMode(false);
    setActiveTab("dashboard");
    notify(`Welcome to ${state.userTeam.city}! Your franchise journey begins.`, "success");
  };

  // ── SIGN FREE AGENT ──
  const signFreeAgent = (player) => {
    if(!gameState) return;
    const rng = getRNG(gameState);
    const contract = {
      years: rng.int(1,4),
      remaining: rng.int(1,4),
      avgAnnual: Math.round(player.asking),
      guaranteed: Math.round(player.asking * rng.next() * 2),
      totalValue: Math.round(player.asking * 3),
      deadCap: Math.round(player.asking * 0.5),
      signed: true,
    };
    const newCap = gameState.userTeam.finances.capUsed + contract.avgAnnual;
    if(newCap > gameState.userTeam.finances.capCeiling - gameState.userTeam.finances.staffCost) {
      notify("Not enough cap space to sign this player!", "error");
      return;
    }
    const signed = {...player, contract};
    updateState(prev => {
      const newFa = prev.freeAgents.filter(p=>p.id!==player.id);
      const newRoster = [...prev.userTeam.roster, signed];
      const newFinances = {...prev.userTeam.finances, capUsed: prev.userTeam.finances.capUsed + contract.avgAnnual, capSpace: prev.userTeam.finances.capSpace - contract.avgAnnual};
      return {
        ...prev,
        freeAgents: newFa,
        userTeam: {...prev.userTeam, roster:newRoster, finances:newFinances},
        news: [{id:Date.now(),headline:`${prev.userTeam.abbr} sign ${player.name} (${player.pos})`,detail:`${fmt.cap(contract.avgAnnual)}/yr, ${contract.years} years`,date:`Week ${prev.week}`},...prev.news.slice(0,19)],
      };
    });
    setSelectedFaPlayer(null);
    notify(`Signed ${player.name}! ${fmt.cap(contract.avgAnnual)}/yr`, "success");
  };

  // ── CUT PLAYER ──
  const cutPlayer = (player) => {
    updateState(prev => {
      const newRoster = prev.userTeam.roster.filter(p=>p.id!==player.id);
      const deadCapHit = player.contract?.deadCap || 0;
      const capRelief = (player.contract?.avgAnnual || 0) - deadCapHit;
      return {
        ...prev,
        userTeam: {
          ...prev.userTeam,
          roster:newRoster,
          finances:{...prev.userTeam.finances, capUsed:Math.max(0,prev.userTeam.finances.capUsed-capRelief), capSpace:prev.userTeam.finances.capSpace+capRelief}
        },
        news:[{id:Date.now(),headline:`${prev.userTeam.abbr} release ${player.name}`,detail:`Dead cap: ${fmt.cap(deadCapHit)}`,date:`Week ${prev.week}`},...prev.news.slice(0,19)],
      };
    });
    setSelectedPlayer(null);
    notify(`Released ${player.name}. Dead cap: ${fmt.cap(player.contract?.deadCap || 0)}`, "warning");
  };

  // ── SCOUT PLAYER ──
  const scoutPlayer = (player) => {
    const cost = 250_000;
    if((gameState.scoutingBudgetUsed + cost) > (gameState.userTeam.staff.scoutBudget || 5_000_000)) {
      notify("Scouting budget exhausted!", "error"); return;
    }
    updateState(prev => {
      const rng = getRNG(prev);
      const newErr = Math.max(2, Math.floor((player.scoutedHigh - player.scoutedLow)/2 * 0.5));
      const refined = {
        ...player,
        scoutedLow: Math.max(40, player.trueOvr - newErr),
        scoutedHigh: Math.min(99, player.trueOvr + newErr),
        scoutConfidence: Math.min(95, player.scoutConfidence + 20),
      };
      const dcIdx = prev.draftClass.findIndex(p=>p.id===player.id);
      const newDraft = [...prev.draftClass];
      if(dcIdx>=0) newDraft[dcIdx] = refined;
      const scoutedSet = new Set(prev.scoutedPlayers);
      scoutedSet.add(player.id);
      return {...prev, draftClass:newDraft, scoutedPlayers:[...scoutedSet], scoutingBudgetUsed:prev.scoutingBudgetUsed+cost};
    });
    notify(`Scouting report on ${player.name} refined!`, "success");
  };

  // ── DRAFT PLAYER ──
  const draftPlayer = (player) => {
    const rng = getRNG(gameState);
    const rookieContract = { years:4, remaining:4, avgAnnual:rng.int(700_000,5_000_000), guaranteed:rng.int(500_000,3_000_000), totalValue:0, deadCap:0, signed:true };
    rookieContract.totalValue = rookieContract.avgAnnual * 4;
    const drafted = {...player, contract:rookieContract};
    updateState(prev => {
      const newDraft = prev.draftClass.filter(p=>p.id!==player.id);
      const newRoster = [...prev.userTeam.roster, drafted];
      return {
        ...prev,
        draftClass: newDraft,
        userTeam: {...prev.userTeam, roster:newRoster},
        legacyStats: {...prev.legacyStats, draftHits:prev.legacyStats.draftHits+1},
        news:[{id:Date.now(),headline:`${prev.userTeam.abbr} draft ${player.name} (${player.pos})`,detail:`Projected OVR: ${player.scoutedLow}–${player.scoutedHigh}`,date:`Draft ${prev.year}`},...prev.news.slice(0,19)],
      };
    });
    setDraftModal(null);
    notify(`Drafted ${player.name}! Welcome to ${gameState.userTeam.city}!`, "success");
  };

  // ── SIMULATE WEEK ──
  const simulateWeek = () => {
    if(simulating) return;
    setSimulating(true);
    setTimeout(()=>{
      updateState(prev => {
        const rng = getRNG(prev);
        const week = prev.week;
        const sched = [...prev.schedule];
        const gameIdx = sched.findIndex(g=>g.week===week && !g.played);
        if(gameIdx === -1) { setSimulating(false); return prev; }

        const oppTeam = prev.league.find(t=>t.abbr===sched[gameIdx].opponent) || {ovr:70,abbr:sched[gameIdx].opponent};
        const result = simGame(rng, sched[gameIdx].home ? prev.userTeam : oppTeam, sched[gameIdx].home ? oppTeam : prev.userTeam);
        const userScore = sched[gameIdx].home ? result.homeScore : result.awayScore;
        const oppScore = sched[gameIdx].home ? result.awayScore : result.homeScore;
        const won = userScore > oppScore;
        sched[gameIdx] = {...sched[gameIdx], played:true, result:won?"W":"L", userScore, oppScore};

        const newWins = prev.userTeam.wins + (won?1:0);
        const newLosses = prev.userTeam.losses + (won?0:1);
        const moraleChange = won ? rng.int(2,6) : rng.int(-6,-2);
        const ownerChange = won ? rng.int(1,4) : rng.int(-4,-1);

        // Random injury
        let newRoster = [...prev.userTeam.roster];
        const injChance = rng.next();
        let injuryMsg = null;
        if(injChance < 0.15 && newRoster.length > 0) {
          const injIdx = rng.int(0, newRoster.length-1);
          const injType = rng.pick(INJURY_TYPES);
          const weeks = rng.int(1,6);
          newRoster[injIdx] = {...newRoster[injIdx], injured:true, injuryDetail:injType, injuryWeeks:weeks};
          injuryMsg = `${newRoster[injIdx].name} (${newRoster[injIdx].pos}) — ${injType}, ${weeks}w`;
        }
        // Heal some
        newRoster = newRoster.map(p => p.injured && p.injuryWeeks > 0 ? {...p, injuryWeeks:p.injuryWeeks-1, injured:p.injuryWeeks>1} : p);

        const log = {
          week, result:won?"W":"L", score:`${userScore}–${oppScore}`,
          opponent:sched[gameIdx].opponent, injury:injuryMsg, drives:result.drives
        };
        const newPhase = week >= 18 ? "playoffs" : "season";
        const newWeek = week + 1;
        const headline = `Week ${week}: ${prev.userTeam.abbr} ${won?"defeat":"fall to"} ${sched[gameIdx].opponent} ${userScore}–${oppScore}`;

        setGameSimModal({ log, injuryMsg, won, userScore, oppScore, opponent:sched[gameIdx].opponent });
        setSimulating(false);

        return {
          ...prev,
          week: newWeek,
          phase: newPhase,
          schedule: sched,
          userTeam: {
            ...prev.userTeam,
            wins:newWins, losses:newLosses,
            roster:newRoster,
            finances:{...prev.userTeam.finances}
          },
          ownerRelation: Math.max(0,Math.min(100,prev.ownerRelation+ownerChange)),
          legacyStats: {...prev.legacyStats, wins:prev.legacyStats.wins+(won?1:0), losses:prev.legacyStats.losses+(won?0:1)},
          news:[{id:Date.now(),headline,detail:injuryMsg?`⚠️ Injury: ${injuryMsg}`:"",date:`Week ${week}`},...prev.news.slice(0,19)],
          gameLog:[log,...prev.gameLog],
        };
      });
    }, 1200);
  };

  const advancePhase = () => {
    updateState(prev => {
      const phases = ["coaching","retention","scouting","freeagency","draft","season","playoffs","offseason_reset"];
      const cur = prev.subPhase || "coaching";
      const idx = phases.indexOf(cur);
      const next = phases[Math.min(idx+1, phases.length-1)];
      let extra = {};
      if(next === "season") extra = { week:1, phase:"season" };
      if(next === "offseason_reset") {
        extra = { year:prev.year+1, week:1, phase:"offseason", subPhase:"coaching", schedule: genSchedule(getRNG(prev), prev.userTeam, prev.league) };
        const rng = getRNG(prev);
        extra.draftClass = genDraftClass(rng, prev.year+1);
        extra.freeAgents = genFreeAgents(rng, 80);
        extra.scoutedPlayers = [];
        extra.scoutingBudgetUsed = 0;
        notify(`Season ${prev.year} complete! New year begins.`, "success");
        return {...prev, ...extra, subPhase:"coaching", phase:"offseason" };
      }
      notify(`Advancing to: ${next.replace(/_/g," ").toUpperCase()}`, "info");
      return {...prev, subPhase:next, ...extra};
    });
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER GUARDS
  // ═══════════════════════════════════════════════════════════
  if(loading) return <div style={styles.loadScreen}><div style={styles.loadLogo}>🏈 GRIDIRON DYNASTY</div><div style={styles.loadSub}>Loading franchise data...</div></div>;

  if(setupMode) return <SetupScreen onStart={startGame} />;

  if(!gameState) return null;

  const { userTeam, freeAgents, draftClass, schedule, news, legacyStats, ownerRelation } = gameState;
  const capPct = (userTeam.finances.capUsed / userTeam.finances.capCeiling)*100;
  const phaseLabel = (gameState.subPhase||gameState.phase||"").replace(/_/g," ").toUpperCase();
  const playoffRecord = `${userTeam.wins}–${userTeam.losses}`;
  const nextGame = schedule.find(g=>!g.played);

  const tabs = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"roster",label:"👥 Roster"},
    {id:"finances",label:"💰 Cap Room"},
    {id:"scouting",label:"🔭 Draft Board"},
    {id:"freeagency",label:"✍️ Free Agency"},
    {id:"gamecenter",label:"🏈 Game Center"},
    {id:"staff",label:"🎓 Staff"},
    {id:"league",label:"🏆 League"},
    {id:"inbox",label:`📬 Inbox${gameState.inbox.filter(m=>!m.read).length>0?" •":""}` },
  ];

  return (
    <div style={styles.app}>
      {/* HEADER */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.teamBadge}>🏈</div>
          <div>
            <div style={styles.headerTeamName}>{userTeam.city} {userTeam.name}</div>
            <div style={styles.headerMeta}>{gameState.year} Season · Week {gameState.week} · {phaseLabel}</div>
          </div>
        </div>
        <div style={styles.headerStats}>
          <div style={styles.statPill}><span style={styles.statPillLabel}>RECORD</span><span style={styles.statPillVal}>{playoffRecord}</span></div>
          <div style={styles.statPill}><span style={styles.statPillLabel}>CAP</span><span style={{...styles.statPillVal,color:capPct>90?"#ef4444":capPct>75?"#f59e0b":"#22c55e"}}>{fmt.cap(userTeam.finances.capSpace)}</span></div>
          <div style={styles.statPill}><span style={styles.statPillLabel}>OWNER</span><span style={{...styles.statPillVal,color:ownerRelation>70?"#22c55e":ownerRelation>40?"#f59e0b":"#ef4444"}}>{ownerRelation}%</span></div>
          <div style={styles.statPill}><span style={styles.statPillLabel}>OVR</span><span style={{...styles.statPillVal,color:ovrColor(userTeam.ovr)}}>{userTeam.ovr}</span></div>
        </div>
      </div>

      {/* TABS */}
      <div style={styles.tabBar}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{...styles.tab, ...(activeTab===t.id?styles.tabActive:{})}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* NOTIFICATION */}
      {notification && <div style={{...styles.notification,...(notification.type==="error"?{background:"#7f1d1d"}:notification.type==="success"?{background:"#14532d"}:notification.type==="warning"?{background:"#78350f"}:{background:"#1e3a5f"})}}>{notification.msg}</div>}

      {/* CONTENT */}
      <div style={styles.content}>
        {activeTab==="dashboard" && <DashboardTab gs={gameState} nextGame={nextGame} onSimulate={simulateWeek} simulating={simulating} onAdvance={advancePhase} notify={notify} />}
        {activeTab==="roster" && <RosterTab roster={userTeam.roster} onSelect={setSelectedPlayer} scoutedIds={gameState.scoutedPlayers} />}
        {activeTab==="finances" && <FinancesTab finances={userTeam.finances} roster={userTeam.roster} />}
        {activeTab==="scouting" && <ScoutingTab draftClass={draftClass} scoutedIds={gameState.scoutedPlayers} onScout={scoutPlayer} onSelect={setDraftModal} budget={userTeam.staff.scoutBudget} budgetUsed={gameState.scoutingBudgetUsed} />}
        {activeTab==="freeagency" && <FreeAgencyTab agents={freeAgents} onSelect={setSelectedFaPlayer} gs={gameState} />}
        {activeTab==="gamecenter" && <GameCenterTab schedule={schedule} gameLog={gameState.gameLog} onSimulate={simulateWeek} simulating={simulating} team={userTeam} />}
        {activeTab==="staff" && <StaffTab staff={userTeam.staff} />}
        {activeTab==="league" && <LeagueTab league={gameState.league} userTeam={userTeam} news={news} legacyStats={legacyStats} />}
        {activeTab==="inbox" && <InboxTab inbox={gameState.inbox} onRead={(id)=>updateState(prev=>({...prev,inbox:prev.inbox.map(m=>m.id===id?{...m,read:true}:m)}))} />}
      </div>

      {/* PLAYER MODAL */}
      {selectedPlayer && <PlayerModal player={selectedPlayer} onCut={cutPlayer} onClose={()=>setSelectedPlayer(null)} />}

      {/* FA PLAYER MODAL */}
      {selectedFaPlayer && <FaModal player={selectedFaPlayer} onSign={signFreeAgent} onClose={()=>setSelectedFaPlayer(null)} gs={gameState} />}

      {/* DRAFT MODAL */}
      {draftModal && <DraftModal player={draftModal} onDraft={draftPlayer} onScout={scoutPlayer} scoutedIds={gameState.scoutedPlayers} onClose={()=>setDraftModal(null)} />}

      {/* GAME SIM MODAL */}
      {gameSimModal && <GameSimModal data={gameSimModal} team={userTeam} onClose={()=>setGameSimModal(null)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SETUP SCREEN
// ═══════════════════════════════════════════════════════════
function SetupScreen({ onStart }) {
  const [sel, setSel] = useState(0);
  const [conf, setConf] = useState("All");
  const teams = conf==="All" ? TEAM_DATA : TEAM_DATA.filter(t=>t.conf===conf);
  return (
    <div style={styles.setupScreen}>
      <div style={styles.setupLogo}>🏈 GRIDIRON DYNASTY</div>
      <div style={styles.setupSub}>Choose your franchise</div>
      <div style={styles.confFilter}>
        {["All","NFC","AFC"].map(c=><button key={c} onClick={()=>setConf(c)} style={{...styles.confBtn,...(conf===c?styles.confBtnActive:{})}}>{c}</button>)}
      </div>
      <div style={styles.teamGrid}>
        {TEAM_DATA.filter(t=>conf==="All"||t.conf===conf).map((t,i)=>{
          const idx = TEAM_DATA.indexOf(t);
          return (
            <div key={t.abbr} onClick={()=>setSel(idx)} style={{...styles.teamCard,...(sel===idx?styles.teamCardSel:{})}}>
              <div style={styles.teamCardAbbr}>{t.abbr}</div>
              <div style={styles.teamCardName}>{t.city}</div>
              <div style={styles.teamCardConf}>{t.conf} {t.div}</div>
            </div>
          );
        })}
      </div>
      <div style={styles.selectedTeam}>
        Selected: <strong>{TEAM_DATA[sel].city} {TEAM_DATA[sel].name}</strong>
      </div>
      <button onClick={()=>onStart(sel)} style={styles.startBtn}>BEGIN FRANCHISE →</button>
      <div style={styles.setupNote}>Seeded simulation — no reload exploits. Your decisions matter.</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════
function DashboardTab({ gs, nextGame, onSimulate, simulating, onAdvance, notify }) {
  const { userTeam, news, legacyStats, ownerRelation, subPhase, phase, week, year } = gs;
  const phaseInfo = {
    coaching: { icon:"🎓", title:"COACHING STAFF REVIEW", desc:"Evaluate and hire your coaching staff. Your HC's scheme shapes scheme fit for all personnel decisions.", action:"Advance to Roster Retention" },
    retention: { icon:"🤝", title:"ROSTER RETENTION", desc:"Decide which veterans to keep, release or restructure. Dead cap implications affect future flexibility.", action:"Advance to Scouting" },
    scouting: { icon:"🔭", title:"COMBINE & DRAFT PREP", desc:"Scout draft prospects. Spend your scouting budget wisely — information is a competitive advantage.", action:"Advance to Free Agency" },
    freeagency: { icon:"✍️", title:"FREE AGENCY", desc:"Sign free agents. Supply and demand pricing — act early on top targets before competitors.", action:"Advance to Draft" },
    draft: { icon:"📋", title:"NFL DRAFT", desc:"Select your future. Scouted players have tighter confidence bands. Unscouted = high risk.", action:"Advance to Training Camp" },
    season: { icon:"🏈", title:"REGULAR SEASON", desc:`Week ${week} of 18. Simulate games, manage injuries, adjust strategy.`, action:"" },
    playoffs: { icon:"🏆", title:"PLAYOFFS", desc:"Win or go home. Every decision carries weight.", action:"" },
    offseason_reset: { icon:"🔄", title:"OFFSEASON RESET", desc:"Season complete. Entering new year.", action:"Begin New Year" },
  };
  const pi = phaseInfo[subPhase||phase] || phaseInfo.season;
  const roster = userTeam.roster;
  const injured = roster.filter(p=>p.injured);
  const capSpace = userTeam.finances.capSpace;

  return (
    <div style={styles.dashGrid}>
      {/* Phase Banner */}
      <div style={styles.phaseBanner}>
        <div style={styles.phaseIcon}>{pi.icon}</div>
        <div style={styles.phaseInfo}>
          <div style={styles.phaseTitle}>{pi.title}</div>
          <div style={styles.phaseDesc}>{pi.desc}</div>
        </div>
        {pi.action && <button onClick={onAdvance} style={styles.phaseBtn}>{pi.action} →</button>}
        {(phase==="season"||phase==="playoffs") && nextGame && (
          <button onClick={onSimulate} disabled={simulating} style={{...styles.phaseBtn,...(simulating?{opacity:0.6}:{})}}>
            {simulating ? "⏳ Simulating..." : `▶ Sim vs ${nextGame.opponent}`}
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div style={styles.quickStats}>
        {[
          {label:"Season Record",val:`${userTeam.wins}–${userTeam.losses}`,sub:`${year} Season`},
          {label:"Cap Space",val:fmt.cap(capSpace),sub:`of ${fmt.cap(userTeam.finances.capCeiling)}`},
          {label:"Roster Size",val:roster.length,sub:`/${53} active`},
          {label:"Injuries",val:injured.length,sub:"players out"},
          {label:"Owner Approval",val:`${ownerRelation}%`,sub:ownerRelation>70?"Strong":"Needs wins"},
          {label:"Career Wins",val:legacyStats.wins,sub:`${legacyStats.championships} rings`},
        ].map(s=>(
          <div key={s.label} style={styles.quickStatCard}>
            <div style={styles.qsVal}>{s.val}</div>
            <div style={styles.qsLabel}>{s.label}</div>
            <div style={styles.qsSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Injuries */}
      {injured.length > 0 && (
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>🚨 Injury Report</div>
          {injured.slice(0,5).map(p=>(
            <div key={p.id} style={styles.injuryRow}>
              <span style={styles.injuryName}>{p.name} ({p.pos})</span>
              <span style={styles.injuryDetail}>{p.injuryDetail}</span>
              <span style={styles.injuryWeeks}>{p.injuryWeeks}w</span>
            </div>
          ))}
        </div>
      )}

      {/* Recent News */}
      <div style={styles.dashCard}>
        <div style={styles.cardTitle}>📰 League News</div>
        {(gs.news||[]).slice(0,6).map(n=>(
          <div key={n.id} style={styles.newsRow}>
            <div style={styles.newsHead}>{n.headline}</div>
            {n.detail && <div style={styles.newsDetail}>{n.detail}</div>}
          </div>
        ))}
        {!gs.news?.length && <div style={styles.emptyState}>No news yet. Start simulating games!</div>}
      </div>

      {/* Next Game */}
      {nextGame && (
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>🏟 Next Game — Week {nextGame.week}</div>
          <div style={styles.nextGameBox}>
            <div style={styles.ngTeam}>{nextGame.home ? `${userTeam.abbr} (HOME)` : userTeam.abbr}</div>
            <div style={styles.ngVs}>vs</div>
            <div style={styles.ngTeam}>{nextGame.home ? nextGame.opponent : `${nextGame.opponent} (AWAY)`}</div>
          </div>
          <div style={styles.ngDetail}>{nextGame.home ? "Home game" : `@ ${nextGame.opponentCity}`}</div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROSTER TAB
// ═══════════════════════════════════════════════════════════
function RosterTab({ roster, onSelect, scoutedIds }) {
  const [sortBy, setSortBy] = useState("pos");
  const [filterPos, setFilterPos] = useState("ALL");
  const sorted = [...roster]
    .filter(p=>filterPos==="ALL"||p.pos===filterPos)
    .sort((a,b)=> sortBy==="ovr" ? ((b.scoutedHigh+b.scoutedLow)/2)-((a.scoutedHigh+a.scoutedLow)/2) : sortBy==="age" ? a.age-b.age : sortBy==="cap" ? (b.contract?.avgAnnual||0)-(a.contract?.avgAnnual||0) : a.pos.localeCompare(b.pos));

  const capTotal = roster.reduce((s,p)=>s+(p.contract?.avgAnnual||0),0);

  return (
    <div style={styles.tabContent}>
      <div style={styles.rosterHeader}>
        <div style={styles.filterRow}>
          {["ALL",...POSITIONS].map(p=><button key={p} onClick={()=>setFilterPos(p)} style={{...styles.filterBtn,...(filterPos===p?styles.filterBtnActive:{})}}>{p}</button>)}
        </div>
        <div style={styles.sortRow}>
          Sort: {["pos","ovr","age","cap"].map(s=><button key={s} onClick={()=>setSortBy(s)} style={{...styles.sortBtn,...(sortBy===s?styles.sortBtnActive:{})}}>{s.toUpperCase()}</button>)}
        </div>
      </div>
      <div style={styles.rosterTableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {["POS","NAME","AGE","OVR RANGE","CONFIDENCE","CONTRACT","TRAITS","STATUS"].map(h=><th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.map(p=>{
              const midOvr = Math.round((p.scoutedLow+p.scoutedHigh)/2);
              return (
                <tr key={p.id} style={{...styles.tr,...(p.injured?{background:"#2d1010"}:{})}} onClick={()=>onSelect(p)}>
                  <td style={styles.td}><span style={{...styles.posBadge,background:posColor(p.pos)}}>{p.pos}</span></td>
                  <td style={{...styles.td,fontWeight:"600"}}>{p.name}{p.injured?<span style={styles.injBadge}>🩹</span>:""}</td>
                  <td style={styles.td}>{p.age}</td>
                  <td style={styles.td}>
                    <span style={{color:ovrColor(midOvr),fontWeight:"700"}}>{fmt.ovr(p.scoutedLow,p.scoutedHigh)}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.confBar}>
                      <div style={{...styles.confFill,width:`${p.scoutConfidence}%`,background:p.scoutConfidence>70?"#22c55e":p.scoutConfidence>40?"#f59e0b":"#ef4444"}} />
                    </div>
                    <span style={styles.confPct}>{Math.round(p.scoutConfidence)}%</span>
                  </td>
                  <td style={styles.td}>{p.contract ? `${fmt.cap(p.contract.avgAnnual)}/yr · ${p.contract.remaining}y` : <em style={{color:"#666"}}>No contract</em>}</td>
                  <td style={styles.td}>
                    {p.traits.slice(0,2).map(t=><span key={t} style={styles.trait}>{t}</span>)}
                  </td>
                  <td style={styles.td}>{p.injured ? <span style={{color:"#ef4444"}}>IR ({p.injuryWeeks}w)</span> : <span style={{color:"#22c55e"}}>Active</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={styles.rosterFooter}>Total Cap Usage: {fmt.cap(capTotal)} · {roster.length} players</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FINANCES TAB
// ═══════════════════════════════════════════════════════════
function FinancesTab({ finances, roster }) {
  const capPct = (finances.capUsed / finances.capCeiling)*100;
  const byPos = {};
  roster.forEach(p=>{ const v=p.contract?.avgAnnual||0; byPos[p.pos]=(byPos[p.pos]||0)+v; });
  const topPos = Object.entries(byPos).sort((a,b)=>b[1]-a[1]);
  const topContracts = [...roster].filter(p=>p.contract).sort((a,b)=>b.contract.avgAnnual-a.contract.avgAnnual).slice(0,10);

  return (
    <div style={styles.tabContent}>
      <div style={styles.capsummary}>
        <div style={styles.capHeader}>SALARY CAP DASHBOARD · {new Date().getFullYear()}</div>
        <div style={styles.capBarWrap}>
          <div style={styles.capBarOuter}>
            <div style={{...styles.capBarInner, width:`${Math.min(100,capPct)}%`, background:capPct>90?"#ef4444":capPct>75?"#f59e0b":"#3b82f6"}} />
          </div>
          <div style={styles.capBarLabels}>
            <span>{fmt.cap(finances.capUsed)} used</span>
            <span>{fmt.cap(finances.capSpace)} remaining</span>
            <span>Ceiling: {fmt.cap(finances.capCeiling)}</span>
          </div>
        </div>
        <div style={styles.capCards}>
          {[
            {l:"Dead Cap",v:fmt.cap(finances.deadCap),c:"#ef4444"},
            {l:"Cap Rollover",v:fmt.cap(finances.capRollover),c:"#22c55e"},
            {l:"Staff Cost",v:fmt.cap(finances.staffCost),c:"#f59e0b"},
            {l:"Cash Budget",v:fmt.cap(finances.cashBudget),c:"#3b82f6"},
            {l:"Revenue",v:fmt.cap(finances.revenue),c:"#8b5cf6"},
            {l:"Owner Tolerance",v:`${finances.ownerSpendingTolerance}%`,c:"#ec4899"},
          ].map(c=>(
            <div key={c.l} style={styles.capCard}>
              <div style={{...styles.capCardVal,color:c.c}}>{c.v}</div>
              <div style={styles.capCardLabel}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.twoCol}>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>Cap by Position</div>
          {topPos.map(([pos,amt])=>(
            <div key={pos} style={styles.posCap}>
              <span style={{...styles.posBadge,background:posColor(pos)}}>{pos}</span>
              <div style={styles.posCapBar}><div style={{...styles.posCapFill,width:`${(amt/finances.capUsed)*100}%`}} /></div>
              <span style={styles.posCapAmt}>{fmt.cap(amt)}</span>
            </div>
          ))}
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>Top Contracts</div>
          {topContracts.map(p=>(
            <div key={p.id} style={styles.contractRow}>
              <span style={{...styles.posBadge,background:posColor(p.pos)}}>{p.pos}</span>
              <span style={styles.contractName}>{p.name}</span>
              <span style={styles.contractVal}>{fmt.cap(p.contract.avgAnnual)}</span>
              <span style={styles.contractYr}>{p.contract.remaining}yr left</span>
              <span style={{color:"#ef4444",fontSize:"11px"}}>DC:{fmt.cap(p.contract.deadCap)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCOUTING / DRAFT BOARD TAB
// ═══════════════════════════════════════════════════════════
function ScoutingTab({ draftClass, scoutedIds, onScout, onSelect, budget, budgetUsed }) {
  const [filterPos, setFilterPos] = useState("ALL");
  const [sortBy, setSortBy] = useState("grade");
  const budgetPct = (budgetUsed/budget)*100;
  const filtered = draftClass.filter(p=>filterPos==="ALL"||p.pos===filterPos);
  const sorted = [...filtered].sort((a,b)=>{
    if(sortBy==="grade") return a.draftGrade.localeCompare(b.draftGrade);
    if(sortBy==="ovr") return (b.scoutedLow+b.scoutedHigh)-(a.scoutedLow+a.scoutedHigh);
    return a.pos.localeCompare(b.pos);
  });

  return (
    <div style={styles.tabContent}>
      <div style={styles.scoutHeader}>
        <div style={styles.budgetBar}>
          <div style={styles.budgetLabel}>Scouting Budget: {fmt.cap(budgetUsed)} / {fmt.cap(budget)}</div>
          <div style={styles.capBarOuter}><div style={{...styles.capBarInner,width:`${Math.min(100,budgetPct)}%`,background:budgetPct>80?"#ef4444":"#3b82f6"}} /></div>
        </div>
        <div style={styles.filterRow}>
          {["ALL",...POSITIONS].map(p=><button key={p} onClick={()=>setFilterPos(p)} style={{...styles.filterBtn,...(filterPos===p?styles.filterBtnActive:{})}}>{p}</button>)}
        </div>
      </div>
      <div style={styles.rosterTableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {["GRADE","POS","NAME","AGE","OVR BAND","CONFIDENCE","RISK","TRAITS","ACTION"].map(h=><th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0,80).map(p=>{
              const scouted = scoutedIds.includes(p.id);
              const risk = p.injuryRisk > 20 ? "🔴 High" : p.characterRisk ? "🟡 Char" : "🟢 Low";
              return (
                <tr key={p.id} style={{...styles.tr,...(scouted?{borderLeft:"2px solid #3b82f6"}:{})}} onClick={()=>onSelect(p)}>
                  <td style={styles.td}><span style={{...styles.gradeBadge, background:gradeColor(p.draftGrade)}}>{p.draftGrade}</span></td>
                  <td style={styles.td}><span style={{...styles.posBadge,background:posColor(p.pos)}}>{p.pos}</span></td>
                  <td style={{...styles.td,fontWeight:"600"}}>{p.name}</td>
                  <td style={styles.td}>{p.age}</td>
                  <td style={styles.td}>
                    {scouted
                      ? <span style={{color:ovrColor(Math.round((p.scoutedLow+p.scoutedHigh)/2)),fontWeight:"700"}}>{p.scoutedLow}–{p.scoutedHigh}</span>
                      : <span style={{color:"#888"}}>??–??</span>
                    }
                  </td>
                  <td style={styles.td}>
                    {scouted ? (
                      <span style={{color:p.scoutConfidence>70?"#22c55e":p.scoutConfidence>40?"#f59e0b":"#ef4444"}}>{Math.round(p.scoutConfidence)}%</span>
                    ) : <span style={{color:"#555"}}>Unscouted</span>}
                  </td>
                  <td style={styles.td}>{risk}</td>
                  <td style={styles.td}>{p.traits.slice(0,1).map(t=><span key={t} style={styles.trait}>{t}</span>)}</td>
                  <td style={styles.td}>
                    {!scouted && <button onClick={(e)=>{e.stopPropagation();onScout(p);}} style={styles.scoutBtn}>Scout ($250K)</button>}
                    {scouted && <span style={{color:"#3b82f6",fontSize:"12px"}}>✓ Scouted</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FREE AGENCY TAB
// ═══════════════════════════════════════════════════════════
function FreeAgencyTab({ agents, onSelect, gs }) {
  const [filterPos, setFilterPos] = useState("ALL");
  const filtered = agents.filter(p=>filterPos==="ALL"||p.pos===filterPos).sort((a,b)=>b.trueOvr-a.trueOvr);
  return (
    <div style={styles.tabContent}>
      <div style={styles.filterRow}>
        {["ALL",...POSITIONS].map(p=><button key={p} onClick={()=>setFilterPos(p)} style={{...styles.filterBtn,...(filterPos===p?styles.filterBtnActive:{})}}>{p}</button>)}
      </div>
      <div style={styles.rosterTableWrap}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              {["POS","NAME","AGE","OVR BAND","ASKING","AGENT SIGNAL","RISK","ACTION"].map(h=><th key={h} style={styles.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(p=>(
              <tr key={p.id} style={styles.tr} onClick={()=>onSelect(p)}>
                <td style={styles.td}><span style={{...styles.posBadge,background:posColor(p.pos)}}>{p.pos}</span></td>
                <td style={{...styles.td,fontWeight:"600"}}>{p.name}</td>
                <td style={styles.td}>{p.age}</td>
                <td style={styles.td}><span style={{color:ovrColor(p.trueOvr),fontWeight:"700"}}>{p.scoutedLow}–{p.scoutedHigh}</span></td>
                <td style={styles.td}>{fmt.cap(Math.round(p.asking))}/yr</td>
                <td style={{...styles.td,fontSize:"11px",color:"#aaa",maxWidth:"160px"}}>{p.agentSignals}</td>
                <td style={styles.td}>{p.injuryRisk>20?"🔴":p.characterRisk?"🟡":"🟢"}</td>
                <td style={styles.td}><button onClick={(e)=>{e.stopPropagation();onSelect(p);}} style={styles.signBtn}>View Deal</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GAME CENTER TAB
// ═══════════════════════════════════════════════════════════
function GameCenterTab({ schedule, gameLog, onSimulate, simulating, team }) {
  const record = schedule.filter(g=>g.played);
  const upcoming = schedule.filter(g=>!g.played);
  return (
    <div style={styles.tabContent}>
      <div style={styles.twoCol}>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>📅 Season Schedule</div>
          <div style={{maxHeight:"460px",overflowY:"auto"}}>
            {schedule.map(g=>(
              <div key={g.week} style={{...styles.schedRow,...(g.played?{opacity:0.7}:{})}}>
                <span style={styles.schedWeek}>WK{g.week}</span>
                <span style={styles.schedOpp}>{g.home?"vs":"@"} {g.opponentCity}</span>
                {g.played
                  ? <span style={{...styles.schedResult,color:g.result==="W"?"#22c55e":"#ef4444"}}>{g.result} {g.userScore}–{g.oppScore}</span>
                  : <span style={{color:"#555"}}>—</span>
                }
              </div>
            ))}
          </div>
        </div>
        <div style={styles.dashCard}>
          <div style={styles.cardTitle}>📊 Game Log</div>
          {upcoming[0] && (
            <div style={styles.nextGameBox}>
              <div style={{color:"#aaa",fontSize:"12px",marginBottom:"8px"}}>NEXT GAME — WEEK {upcoming[0].week}</div>
              <div style={styles.ngMatchup}>
                <div style={styles.ngTeamName}>{team.abbr}</div>
                <div style={styles.ngVs}>VS</div>
                <div style={styles.ngTeamName}>{upcoming[0].opponent}</div>
              </div>
              <button onClick={onSimulate} disabled={simulating} style={{...styles.simBigBtn,...(simulating?{opacity:0.6}:{})}}>
                {simulating ? "⏳ Simulating..." : "▶ SIMULATE GAME"}
              </button>
            </div>
          )}
          <div style={{maxHeight:"320px",overflowY:"auto",marginTop:"12px"}}>
            {gameLog.map((g,i)=>(
              <div key={i} style={styles.gameLogRow}>
                <span style={{color:g.result==="W"?"#22c55e":"#ef4444",fontWeight:"700",marginRight:"8px"}}>{g.result}</span>
                <span style={{color:"#ccc"}}>vs {g.opponent} · {g.score}</span>
                {g.injury && <div style={{color:"#f59e0b",fontSize:"11px"}}>⚠ {g.injury}</div>}
              </div>
            ))}
            {!gameLog.length && <div style={styles.emptyState}>Simulate your first game!</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// STAFF TAB
// ═══════════════════════════════════════════════════════════
function StaffTab({ staff }) {
  return (
    <div style={styles.tabContent}>
      <div style={styles.dashCard} style={{marginBottom:"16px"}}>
        <div style={styles.cardTitle}>🎓 Head Coach</div>
        <div style={styles.hcCard}>
          <div style={styles.hcName}>{staff.hc.name}</div>
          <div style={styles.hcMeta}>Rating: <span style={{color:ovrColor(staff.hc.rating)}}>{staff.hc.rating} OVR</span></div>
          <div style={styles.hcMeta}>Contract: {staff.hc.contract.years}yr · {fmt.cap(staff.hc.contract.salary)}/yr</div>
          {staff.hc.traits.map(t=><span key={t} style={styles.trait}>{t}</span>)}
        </div>
      </div>
      <div style={styles.staffGrid}>
        {staff.staff.map(s=>(
          <div key={s.id} style={styles.staffCard}>
            <div style={styles.staffRole}>{s.role}</div>
            <div style={styles.staffName}>{s.name}</div>
            <div style={styles.staffRating}>
              <div style={styles.confBar}><div style={{...styles.confFill,width:`${s.rating}%`,background:ovrColor(s.rating)}} /></div>
              <span style={{...styles.confPct,color:ovrColor(s.rating)}}>{s.rating}</span>
            </div>
            <div style={styles.staffTrait}><span style={styles.trait}>{s.trait}</span></div>
            <div style={{color:"#888",fontSize:"11px"}}>{fmt.cap(s.salary)}/yr</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LEAGUE TAB
// ═══════════════════════════════════════════════════════════
function LeagueTab({ league, userTeam, news, legacyStats }) {
  const [conf, setConf] = useState("All");
  const teams = league.filter(t=>conf==="All"||t.conf===conf).sort((a,b)=>b.ovr-a.ovr);
  return (
    <div style={styles.tabContent}>
      <div style={styles.twoCol}>
        <div style={{flex:2}}>
          <div style={styles.filterRow} style={{marginBottom:"12px"}}>
            {["All","NFC","AFC"].map(c=><button key={c} onClick={()=>setConf(c)} style={{...styles.confBtn,...(conf===c?styles.confBtnActive:{})}}>{c}</button>)}
          </div>
          <table style={styles.table}>
            <thead><tr style={styles.thead}>{["TEAM","CONF","DIV","W","L","OVR","ARCHETYPE"].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
            <tbody>
              {teams.map(t=>(
                <tr key={t.abbr} style={{...styles.tr,...(t.abbr===userTeam.abbr?{borderLeft:"3px solid #3b82f6"}:{})}}>
                  <td style={{...styles.td,fontWeight:"600"}}>{t.city} <span style={{color:"#888"}}>{t.abbr}</span></td>
                  <td style={styles.td}>{t.conf}</td>
                  <td style={styles.td}>{t.div}</td>
                  <td style={styles.td}>{t.wins}</td>
                  <td style={styles.td}>{t.losses}</td>
                  <td style={styles.td}><span style={{color:ovrColor(t.ovr),fontWeight:"700"}}>{t.ovr}</span></td>
                  <td style={styles.td}><span style={styles.trait}>{t.archetype}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{flex:1}}>
          <div style={styles.dashCard}>
            <div style={styles.cardTitle}>🏆 Your Legacy</div>
            {[
              ["Career Wins",legacyStats.wins],["Career Losses",legacyStats.losses],
              ["Championships",legacyStats.championships],["Playoff Appearances",legacyStats.playoffApps],
              ["Draft Hits",legacyStats.draftHits],["Trades Made",legacyStats.tradeMade],
            ].map(([l,v])=>(
              <div key={l} style={styles.legacyRow}><span style={styles.legacyLabel}>{l}</span><span style={styles.legacyVal}>{v}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// INBOX TAB
// ═══════════════════════════════════════════════════════════
function InboxTab({ inbox, onRead }) {
  const [open, setOpen] = useState(null);
  return (
    <div style={styles.tabContent}>
      <div style={styles.twoCol}>
        <div style={{flex:1}}>
          {inbox.map(m=>(
            <div key={m.id} onClick={()=>{setOpen(m);onRead(m.id);}} style={{...styles.inboxRow,...(!m.read?{borderLeft:"3px solid #3b82f6"}:{})}}>
              <div style={styles.inboxFrom}>{m.from}{!m.read&&<span style={styles.unreadDot}> ●</span>}</div>
              <div style={styles.inboxSubject}>{m.subject}</div>
              <div style={styles.inboxDate}>{m.date}</div>
            </div>
          ))}
          {!inbox.length && <div style={styles.emptyState}>Inbox empty</div>}
        </div>
        {open && (
          <div style={{flex:2,...styles.dashCard}}>
            <div style={styles.msgFrom}>From: {open.from}</div>
            <div style={styles.msgSubject}>{open.subject}</div>
            <div style={styles.msgDate}>{open.date}</div>
            <div style={styles.msgBody}>{open.body}</div>
            <button onClick={()=>setOpen(null)} style={styles.closeBtn}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════
function PlayerModal({ player, onCut, onClose }) {
  const midOvr = Math.round((player.scoutedLow+player.scoutedHigh)/2);
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalPlayerName}>{player.name}</div>
            <div style={styles.modalMeta}><span style={{...styles.posBadge,background:posColor(player.pos)}}>{player.pos}</span> · Age {player.age} · {player.college}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>RATING (Confidence Band)</div>
            <div style={styles.ovrDisplay}>
              <span style={{color:ovrColor(midOvr),fontSize:"36px",fontWeight:"900"}}>{player.scoutedLow}–{player.scoutedHigh}</span>
              <span style={{color:"#888",fontSize:"13px",marginLeft:"8px"}}>True: ??</span>
            </div>
            <div style={styles.confBar} style={{width:"100%",height:"6px",margin:"8px 0"}}>
              <div style={{...styles.confFill,width:`${player.scoutConfidence}%`,background:player.scoutConfidence>70?"#22c55e":"#f59e0b"}} />
            </div>
            <div style={{color:"#888",fontSize:"12px"}}>Scout confidence: {Math.round(player.scoutConfidence)}%</div>
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>ATTRIBUTES</div>
            <div style={styles.attrGrid}>
              {Object.entries(player.attributes).map(([k,v])=>(
                <div key={k} style={styles.attrItem}>
                  <span style={styles.attrLabel}>{k}</span>
                  <div style={styles.attrBarWrap}><div style={{...styles.attrBar,width:`${v}%`,background:ovrColor(v)}} /></div>
                  <span style={{color:ovrColor(v),fontWeight:"700",fontSize:"13px"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>CHARACTER PROFILE</div>
            <div style={styles.traitWrap}>{player.traits.map(t=><span key={t} style={{...styles.trait,...(["Locker Room Issue","Off-Field Risk","Ego-Driven"].includes(t)?{background:"#7f1d1d"}:{})}}>{t}</span>)}</div>
            <div style={{color:"#888",fontSize:"12px",marginTop:"8px"}}>
              Injury Risk: {player.injuryRisk>20?"🔴 High":player.injuryRisk>10?"🟡 Moderate":"🟢 Low"}
              · Morale: {player.morale}
            </div>
          </div>
          {player.contract && (
            <div style={styles.modalSection}>
              <div style={styles.sectionTitle}>CONTRACT</div>
              <div style={styles.contractDetails}>
                <div>{fmt.cap(player.contract.avgAnnual)}/yr · {player.contract.remaining} yr remaining</div>
                <div style={{color:"#888",fontSize:"12px"}}>Guaranteed: {fmt.cap(player.contract.guaranteed)} · Dead Cap: {fmt.cap(player.contract.deadCap)}</div>
              </div>
            </div>
          )}
          {player.contract && (
            <button onClick={()=>onCut(player)} style={styles.cutBtn}>
              ✂ Release Player (Dead Cap: {fmt.cap(player.contract.deadCap)})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FaModal({ player, onSign, onClose, gs }) {
  const capSpace = gs.userTeam.finances.capSpace;
  const canSign = player.asking <= capSpace;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalPlayerName}>{player.name}</div>
            <div style={styles.modalMeta}><span style={{...styles.posBadge,background:posColor(player.pos)}}>{player.pos}</span> · Age {player.age} · Free Agent</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>PLAYER RATING</div>
            <div style={styles.ovrDisplay}><span style={{color:ovrColor(Math.round((player.scoutedLow+player.scoutedHigh)/2)),fontSize:"36px",fontWeight:"900"}}>{player.scoutedLow}–{player.scoutedHigh}</span></div>
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>AGENT SIGNALS</div>
            <div style={{color:"#f59e0b",fontStyle:"italic"}}>{player.agentSignals}</div>
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>CONTRACT DEMANDS</div>
            <div style={styles.contractDetails}>
              <div style={{fontSize:"22px",color:"#22c55e",fontWeight:"700"}}>{fmt.cap(Math.round(player.asking))}/yr</div>
              <div style={{color:"#888",fontSize:"12px"}}>Market value estimate</div>
              <div style={{color:canSign?"#22c55e":"#ef4444",marginTop:"8px"}}>Your cap space: {fmt.cap(capSpace)} {canSign?"✓":"— INSUFFICIENT"}</div>
            </div>
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>CHARACTER & RISK</div>
            <div style={styles.traitWrap}>{player.traits.map(t=><span key={t} style={styles.trait}>{t}</span>)}</div>
            <div style={{color:"#888",fontSize:"12px",marginTop:"6px"}}>Injury Risk: {player.injuryRisk>20?"🔴 High":player.injuryRisk>10?"🟡 Moderate":"🟢 Low"}</div>
          </div>
          <button onClick={()=>canSign&&onSign(player)} style={{...styles.signBigBtn,...(!canSign?{opacity:0.4,cursor:"not-allowed"}:{})}}>
            {canSign ? `✍ Sign ${player.name}` : "❌ Insufficient Cap Space"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftModal({ player, onDraft, onScout, scoutedIds, onClose }) {
  const scouted = scoutedIds.includes(player.id);
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalPlayerName}>{player.name}</div>
            <div style={styles.modalMeta}><span style={{...styles.posBadge,background:posColor(player.pos)}}>{player.pos}</span> · Age {player.age} · {player.college}</div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>DRAFT GRADE & PROJECTION</div>
            <span style={{...styles.gradeBadge,background:gradeColor(player.draftGrade),fontSize:"28px",padding:"8px 16px"}}>{player.draftGrade}</span>
            <div style={styles.ovrDisplay}>
              {scouted
                ? <span style={{color:ovrColor(Math.round((player.scoutedLow+player.scoutedHigh)/2)),fontSize:"28px",fontWeight:"900"}}>{player.scoutedLow}–{player.scoutedHigh} OVR</span>
                : <span style={{color:"#888",fontSize:"22px"}}>UNSCOUTED — HIGH RISK</span>
              }
            </div>
            {!scouted && <div style={{color:"#f59e0b",fontSize:"13px",marginTop:"6px"}}>⚠ Drafting without scouting has a wide uncertainty range</div>}
          </div>
          <div style={styles.modalSection}>
            <div style={styles.sectionTitle}>CHARACTER FLAGS</div>
            <div style={styles.traitWrap}>{player.traits.map(t=><span key={t} style={{...styles.trait,...(["Locker Room Issue","Off-Field Risk"].includes(t)?{background:"#7f1d1d"}:{})}}>{t}</span>)}</div>
          </div>
          {player.attributes && (
            <div style={styles.modalSection}>
              <div style={styles.sectionTitle}>COMBINE ATTRIBUTES</div>
              <div style={styles.attrGrid}>
                {Object.entries(player.attributes).map(([k,v])=>(
                  <div key={k} style={styles.attrItem}>
                    <span style={styles.attrLabel}>{k}</span>
                    <div style={styles.attrBarWrap}><div style={{...styles.attrBar,width:`${v}%`,background:ovrColor(v)}} /></div>
                    <span style={{color:ovrColor(v),fontWeight:"700",fontSize:"13px"}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:"12px",marginTop:"16px"}}>
            {!scouted && <button onClick={()=>{onScout(player);onClose();}} style={styles.scoutBtn}>🔭 Scout First ($250K)</button>}
            <button onClick={()=>onDraft(player)} style={styles.signBigBtn}>📋 Draft {player.name}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GameSimModal({ data, team, onClose }) {
  const { won, userScore, oppScore, opponent, log, injuryMsg } = data;
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"520px"}} onClick={e=>e.stopPropagation()}>
        <div style={{...styles.modalHeader,background:won?"#052e16":"#450a0a"}}>
          <div>
            <div style={{fontSize:"22px",fontWeight:"900",color:won?"#22c55e":"#ef4444"}}>{won?"VICTORY":"DEFEAT"}</div>
            <div style={styles.modalMeta}>{team.abbr} vs {opponent}</div>
          </div>
          <div style={{fontSize:"36px",fontWeight:"900",color:won?"#22c55e":"#ef4444"}}>{userScore}–{oppScore}</div>
        </div>
        <div style={styles.modalBody}>
          {injuryMsg && (
            <div style={{background:"#451a03",border:"1px solid #92400e",borderRadius:"6px",padding:"10px",marginBottom:"12px",color:"#fcd34d"}}>
              ⚠️ Injury Report: {injuryMsg}
            </div>
          )}
          <div style={styles.sectionTitle}>DRIVE SUMMARY</div>
          {log.drives?.slice(0,8).map((d,i)=>(
            <div key={i} style={styles.driveRow}>
              <span style={{color:d.team===team.abbr?"#3b82f6":"#888",fontWeight:"600",width:"40px"}}>{d.team}</span>
              <span style={{color:"#ccc",flex:1}}>{d.yards} yds · {d.plays} plays</span>
              <span style={{color:d.result==="Touchdown"?"#22c55e":d.result.includes("Turn")?"#ef4444":"#f59e0b",fontWeight:"600"}}>{d.result}</span>
            </div>
          ))}
          <button onClick={onClose} style={{...styles.signBigBtn,marginTop:"16px",background:"#1e40af"}}>Continue →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const posColor = (pos) => {
  const map = {QB:"#7c3aed",RB:"#0891b2",WR:"#0284c7",TE:"#0d9488",OT:"#16a34a",OG:"#15803d",C:"#166534",DE:"#dc2626",DT:"#b91c1c",LB:"#9f1239",CB:"#c2410c",S:"#b45309",K:"#4b5563"};
  return map[pos]||"#374151";
};

const gradeColor = (grade) => ({A:"#15803d",B:"#1d4ed8",C:"#d97706",D:"#9f1239"}[grade]||"#374151");

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════
const styles = {
  app: { minHeight:"100vh", background:"#0a0c10", color:"#e2e8f0", fontFamily:"'IBM Plex Mono','Courier New',monospace", fontSize:"13px" },
  loadScreen: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0a0c10",color:"#e2e8f0" },
  loadLogo: { fontSize:"32px",fontWeight:"900",letterSpacing:"4px",color:"#3b82f6",marginBottom:"12px" },
  loadSub: { color:"#64748b",letterSpacing:"2px" },
  setupScreen: { minHeight:"100vh",background:"#0a0c10",color:"#e2e8f0",display:"flex",flexDirection:"column",alignItems:"center",padding:"32px 16px" },
  setupLogo: { fontSize:"28px",fontWeight:"900",letterSpacing:"4px",color:"#3b82f6",marginBottom:"6px" },
  setupSub: { color:"#64748b",letterSpacing:"2px",marginBottom:"20px" },
  confFilter: { display:"flex",gap:"8px",marginBottom:"16px" },
  confBtn: { background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:"4px",padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px" },
  confBtnActive: { background:"#1e40af",color:"#fff",border:"1px solid #3b82f6" },
  teamGrid: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:"8px",width:"100%",maxWidth:"900px",marginBottom:"20px" },
  teamCard: { background:"#111827",border:"1px solid #1e293b",borderRadius:"6px",padding:"10px",cursor:"pointer",textAlign:"center",transition:"all 0.15s" },
  teamCardSel: { border:"2px solid #3b82f6",background:"#1e3a5f" },
  teamCardAbbr: { fontSize:"18px",fontWeight:"900",color:"#3b82f6",letterSpacing:"2px" },
  teamCardName: { fontSize:"11px",color:"#94a3b8",marginTop:"2px" },
  teamCardConf: { fontSize:"10px",color:"#64748b",marginTop:"2px" },
  selectedTeam: { color:"#94a3b8",marginBottom:"16px" },
  startBtn: { background:"#1d4ed8",color:"#fff",border:"none",borderRadius:"6px",padding:"12px 32px",fontSize:"14px",fontWeight:"700",letterSpacing:"2px",cursor:"pointer",marginBottom:"12px",fontFamily:"inherit" },
  setupNote: { color:"#475569",fontSize:"11px" },
  header: { background:"#0f172a",borderBottom:"1px solid #1e293b",padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100 },
  headerLeft: { display:"flex",alignItems:"center",gap:"12px" },
  teamBadge: { fontSize:"24px" },
  headerTeamName: { fontWeight:"900",fontSize:"16px",letterSpacing:"1px" },
  headerMeta: { color:"#64748b",fontSize:"11px",marginTop:"2px" },
  headerStats: { display:"flex",gap:"12px",flexWrap:"wrap" },
  statPill: { background:"#1e293b",borderRadius:"4px",padding:"4px 10px",textAlign:"center" },
  statPillLabel: { display:"block",color:"#64748b",fontSize:"9px",letterSpacing:"1px",marginBottom:"2px" },
  statPillVal: { display:"block",fontWeight:"700",fontSize:"13px" },
  tabBar: { background:"#0f172a",borderBottom:"1px solid #1e293b",display:"flex",overflowX:"auto",padding:"0 8px" },
  tab: { background:"transparent",color:"#64748b",border:"none",borderBottom:"2px solid transparent",padding:"10px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",whiteSpace:"nowrap",fontWeight:"600" },
  tabActive: { color:"#3b82f6",borderBottom:"2px solid #3b82f6" },
  notification: { position:"fixed",top:"70px",right:"16px",zIndex:9999,padding:"10px 16px",borderRadius:"6px",color:"#fff",fontWeight:"600",fontSize:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.5)",maxWidth:"320px" },
  content: { padding:"16px",maxWidth:"1400px",margin:"0 auto" },
  dashGrid: { display:"flex",flexDirection:"column",gap:"16px" },
  phaseBanner: { background:"#111827",border:"1px solid #1e3a5f",borderRadius:"8px",padding:"16px 20px",display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap" },
  phaseIcon: { fontSize:"28px" },
  phaseInfo: { flex:1 },
  phaseTitle: { fontWeight:"900",fontSize:"14px",letterSpacing:"2px",color:"#3b82f6" },
  phaseDesc: { color:"#94a3b8",fontSize:"12px",marginTop:"4px" },
  phaseBtn: { background:"#1d4ed8",color:"#fff",border:"none",borderRadius:"5px",padding:"8px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:"700",whiteSpace:"nowrap" },
  quickStats: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px" },
  quickStatCard: { background:"#111827",border:"1px solid #1e293b",borderRadius:"6px",padding:"12px 14px",textAlign:"center" },
  qsVal: { fontSize:"20px",fontWeight:"900",color:"#e2e8f0",marginBottom:"2px" },
  qsLabel: { color:"#94a3b8",fontSize:"10px",letterSpacing:"1px" },
  qsSub: { color:"#64748b",fontSize:"10px",marginTop:"2px" },
  dashCard: { background:"#111827",border:"1px solid #1e293b",borderRadius:"8px",padding:"16px" },
  cardTitle: { fontWeight:"700",fontSize:"12px",letterSpacing:"1px",color:"#64748b",marginBottom:"12px",textTransform:"uppercase" },
  twoCol: { display:"flex",gap:"16px",flexWrap:"wrap" },
  injuryRow: { display:"flex",alignItems:"center",gap:"10px",padding:"6px 0",borderBottom:"1px solid #1e293b" },
  injuryName: { fontWeight:"600",flex:1 },
  injuryDetail: { color:"#f59e0b",fontSize:"11px" },
  injuryWeeks: { color:"#ef4444",fontWeight:"700",fontSize:"12px" },
  newsRow: { padding:"8px 0",borderBottom:"1px solid #1e293b" },
  newsHead: { color:"#e2e8f0",fontWeight:"600",fontSize:"12px" },
  newsDetail: { color:"#64748b",fontSize:"11px",marginTop:"2px" },
  nextGameBox: { background:"#0f172a",borderRadius:"6px",padding:"16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px" },
  ngTeam: { fontWeight:"900",fontSize:"16px",letterSpacing:"2px" },
  ngTeamName: { fontWeight:"900",fontSize:"20px",letterSpacing:"2px",color:"#3b82f6" },
  ngVs: { color:"#64748b",fontSize:"12px",letterSpacing:"2px" },
  ngMatchup: { display:"flex",alignItems:"center",gap:"20px" },
  ngDetail: { color:"#64748b",fontSize:"11px" },
  tabContent: { display:"flex",flexDirection:"column",gap:"14px" },
  rosterHeader: { display:"flex",flexDirection:"column",gap:"8px" },
  filterRow: { display:"flex",flexWrap:"wrap",gap:"4px" },
  filterBtn: { background:"#1e293b",color:"#94a3b8",border:"1px solid #334155",borderRadius:"3px",padding:"4px 8px",cursor:"pointer",fontFamily:"inherit",fontSize:"11px" },
  filterBtnActive: { background:"#1d4ed8",color:"#fff",border:"1px solid #3b82f6" },
  sortRow: { display:"flex",gap:"6px",alignItems:"center",color:"#64748b",fontSize:"11px" },
  sortBtn: { background:"transparent",color:"#64748b",border:"1px solid #334155",borderRadius:"3px",padding:"3px 7px",cursor:"pointer",fontFamily:"inherit",fontSize:"10px" },
  sortBtnActive: { background:"#334155",color:"#e2e8f0" },
  rosterTableWrap: { overflowX:"auto",borderRadius:"6px",border:"1px solid #1e293b" },
  table: { width:"100%",borderCollapse:"collapse",background:"#0f172a" },
  thead: { background:"#111827" },
  th: { padding:"8px 10px",textAlign:"left",color:"#475569",fontSize:"10px",letterSpacing:"1px",fontWeight:"700",borderBottom:"1px solid #1e293b",whiteSpace:"nowrap" },
  tr: { borderBottom:"1px solid #111827",cursor:"pointer",transition:"background 0.1s" },
  td: { padding:"8px 10px",verticalAlign:"middle",whiteSpace:"nowrap" },
  posBadge: { display:"inline-block",padding:"2px 6px",borderRadius:"3px",fontSize:"10px",fontWeight:"700",color:"#fff",letterSpacing:"0.5px" },
  injBadge: { marginLeft:"5px",fontSize:"12px" },
  confBar: { display:"inline-block",width:"60px",height:"4px",background:"#1e293b",borderRadius:"2px",verticalAlign:"middle",overflow:"hidden" },
  confFill: { height:"100%",borderRadius:"2px",transition:"width 0.3s" },
  confPct: { marginLeft:"6px",color:"#94a3b8",fontSize:"11px" },
  trait: { display:"inline-block",background:"#1e293b",color:"#94a3b8",padding:"2px 6px",borderRadius:"3px",fontSize:"10px",marginRight:"3px",marginBottom:"3px" },
  rosterFooter: { color:"#64748b",fontSize:"11px",padding:"8px 0" },
  capsummary: { background:"#111827",border:"1px solid #1e293b",borderRadius:"8px",padding:"20px" },
  capHeader: { fontWeight:"700",letterSpacing:"2px",color:"#64748b",fontSize:"11px",marginBottom:"16px" },
  capBarWrap: { marginBottom:"20px" },
  capBarOuter: { height:"12px",background:"#1e293b",borderRadius:"6px",overflow:"hidden",margin:"8px 0" },
  capBarInner: { height:"100%",borderRadius:"6px",transition:"width 0.3s" },
  capBarLabels: { display:"flex",justifyContent:"space-between",color:"#64748b",fontSize:"11px" },
  capCards: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"10px",marginTop:"16px" },
  capCard: { background:"#0f172a",border:"1px solid #1e293b",borderRadius:"6px",padding:"12px",textAlign:"center" },
  capCardVal: { fontSize:"18px",fontWeight:"900",marginBottom:"4px" },
  capCardLabel: { color:"#64748b",fontSize:"10px",letterSpacing:"1px" },
  posCap: { display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px" },
  posCapBar: { flex:1,height:"6px",background:"#1e293b",borderRadius:"3px",overflow:"hidden" },
  posCapFill: { height:"100%",background:"#3b82f6",borderRadius:"3px" },
  posCapAmt: { color:"#94a3b8",fontSize:"12px",width:"60px",textAlign:"right" },
  contractRow: { display:"flex",alignItems:"center",gap:"8px",padding:"6px 0",borderBottom:"1px solid #1e293b" },
  contractName: { flex:1,fontWeight:"600" },
  contractVal: { color:"#22c55e",fontWeight:"700" },
  contractYr: { color:"#64748b",fontSize:"11px" },
  scoutHeader: { display:"flex",flexDirection:"column",gap:"10px" },
  budgetBar: { background:"#111827",border:"1px solid #1e293b",borderRadius:"6px",padding:"12px" },
  budgetLabel: { color:"#94a3b8",fontSize:"12px",marginBottom:"6px" },
  gradeBadge: { display:"inline-block",padding:"2px 8px",borderRadius:"3px",fontSize:"12px",fontWeight:"900",color:"#fff" },
  scoutBtn: { background:"#1e3a5f",color:"#93c5fd",border:"1px solid #1d4ed8",borderRadius:"4px",padding:"4px 8px",cursor:"pointer",fontFamily:"inherit",fontSize:"11px" },
  signBtn: { background:"#14532d",color:"#86efac",border:"1px solid #16a34a",borderRadius:"4px",padding:"4px 8px",cursor:"pointer",fontFamily:"inherit",fontSize:"11px" },
  schedRow: { display:"flex",alignItems:"center",gap:"10px",padding:"6px 0",borderBottom:"1px solid #111827" },
  schedWeek: { color:"#475569",fontSize:"10px",width:"30px",fontWeight:"700" },
  schedOpp: { flex:1,fontWeight:"600" },
  schedResult: { fontWeight:"700" },
  gameLogRow: { padding:"6px 0",borderBottom:"1px solid #111827" },
  simBigBtn: { background:"#1d4ed8",color:"#fff",border:"none",borderRadius:"6px",padding:"12px 24px",fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit",width:"100%",letterSpacing:"1px",marginTop:"8px" },
  staffGrid: { display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"10px" },
  staffCard: { background:"#111827",border:"1px solid #1e293b",borderRadius:"6px",padding:"14px" },
  staffRole: { color:"#64748b",fontSize:"10px",letterSpacing:"1px",marginBottom:"4px" },
  staffName: { fontWeight:"700",marginBottom:"8px" },
  staffRating: { display:"flex",alignItems:"center",gap:"8px",marginBottom:"8px" },
  staffTrait: { marginBottom:"4px" },
  hcCard: { background:"#0f172a",borderRadius:"6px",padding:"16px" },
  hcName: { fontSize:"20px",fontWeight:"900",letterSpacing:"1px",marginBottom:"6px" },
  hcMeta: { color:"#94a3b8",fontSize:"12px",marginBottom:"4px" },
  legacyRow: { display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #1e293b" },
  legacyLabel: { color:"#94a3b8" },
  legacyVal: { fontWeight:"700",color:"#e2e8f0" },
  inboxRow: { background:"#111827",border:"1px solid #1e293b",borderRadius:"6px",padding:"12px 14px",marginBottom:"6px",cursor:"pointer" },
  inboxFrom: { fontWeight:"700",fontSize:"12px",marginBottom:"2px" },
  inboxSubject: { color:"#94a3b8",fontSize:"12px" },
  inboxDate: { color:"#475569",fontSize:"10px",marginTop:"4px" },
  unreadDot: { color:"#3b82f6" },
  msgFrom: { color:"#64748b",fontSize:"11px",marginBottom:"4px" },
  msgSubject: { fontWeight:"900",fontSize:"16px",marginBottom:"4px" },
  msgDate: { color:"#475569",fontSize:"11px",marginBottom:"16px" },
  msgBody: { color:"#cbd5e1",lineHeight:"1.7",fontSize:"13px",marginBottom:"20px" },
  emptyState: { color:"#475569",fontStyle:"italic",padding:"16px 0",textAlign:"center" },
  modalOverlay: { position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" },
  modal: { background:"#0f172a",border:"1px solid #1e293b",borderRadius:"10px",width:"100%",maxWidth:"680px",maxHeight:"90vh",overflowY:"auto" },
  modalHeader: { padding:"20px",borderBottom:"1px solid #1e293b",display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:"#111827",borderRadius:"10px 10px 0 0" },
  modalPlayerName: { fontSize:"20px",fontWeight:"900",letterSpacing:"1px",marginBottom:"4px" },
  modalMeta: { display:"flex",alignItems:"center",gap:"8px",color:"#94a3b8",fontSize:"12px" },
  modalBody: { padding:"20px" },
  modalSection: { marginBottom:"20px" },
  sectionTitle: { color:"#475569",fontSize:"10px",letterSpacing:"2px",fontWeight:"700",marginBottom:"8px" },
  ovrDisplay: { display:"flex",alignItems:"baseline",gap:"6px",marginBottom:"8px" },
  attrGrid: { display:"flex",flexDirection:"column",gap:"6px" },
  attrItem: { display:"flex",alignItems:"center",gap:"8px" },
  attrLabel: { color:"#64748b",fontSize:"11px",width:"130px",flexShrink:0 },
  attrBarWrap: { flex:1,height:"5px",background:"#1e293b",borderRadius:"3px",overflow:"hidden" },
  attrBar: { height:"100%",borderRadius:"3px" },
  traitWrap: { display:"flex",flexWrap:"wrap",gap:"4px" },
  contractDetails: { background:"#0a0c10",borderRadius:"6px",padding:"12px" },
  cutBtn: { background:"#7f1d1d",color:"#fca5a5",border:"1px solid #991b1b",borderRadius:"5px",padding:"8px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px",fontWeight:"700",width:"100%",marginTop:"8px" },
  signBigBtn: { background:"#14532d",color:"#86efac",border:"1px solid #16a34a",borderRadius:"5px",padding:"10px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:"13px",fontWeight:"700",width:"100%",letterSpacing:"1px" },
  closeBtn: { background:"#1e293b",color:"#94a3b8",border:"none",borderRadius:"4px",padding:"6px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:"12px" },
  driveRow: { display:"flex",alignItems:"center",gap:"10px",padding:"5px 0",borderBottom:"1px solid #111827" },
};
