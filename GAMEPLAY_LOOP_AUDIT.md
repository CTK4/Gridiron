# Gameplay Loop Audit — User-Controlled Playcalling vs Full Sim

## Section 1 — Gameplay Loop Truth Table

| Capability | Status | Evidence |
|---|---|---|
| A. Navigate from hub/schedule to a specific game vs opponent | **No** | Typed state only stores season schedule entries (`ScheduleGame`) and no selected-game/in-game pointer in `SaveState`. `ScheduleGame` has ids/scores only, and `SaveState.league` has `week`/`schedule` but no `currentGameId` or `gameSession`. (`types.ts`)【F:types.ts†L59-L67】【F:types.ts†L145-L152】. Legacy UI in `PGMHCD` marks "YOUR GAME" but has no click handler to enter game; the only regular-season CTA is "SIM WEEK" dispatching `ADVANCE_WEEK`.【F:PGMHCD†L1538-L1551】【F:PGMHCD†L1232-L1235】 |
| B. Pre-game screen exists and transitions to in-game | **No** | No route/component tree for pre-game or in-game in active TS include set (`tsconfig.json` includes only `lib`, `data`, `types`).【F:tsconfig.json†L13】 Legacy app screen switch only covers home/roster/market/season/staff/history with no pregame/live game screen.【F:PGMHCD†L1844-L1852】 |
| C. One snap at a time mode (`Next Play`) | **No** | Legacy engine exposes `simulateGame(homeId, awayId, state, seed)` returning final scores in one call; no `stepPlay` API.【F:PGMHCD†L290-L315】 Weekly flow loops all games and marks each played after full result.【F:PGMHCD†L323-L331】 |
| D. Offensive playcall selection when user has possession | **No** | No offensive playcall action/type in transaction or state unions (`TxEvent` is only sign/release/re-sign/tag/hire).【F:types.ts†L94-L129】 No possession/offense-side state exists in `SaveState`.【F:types.ts†L138-L182】 |
| E. Defensive call/focus selection when opponent has possession | **No** | Same structural gap as D: no defensive-call model/actions, no possession state fields in `SaveState` types.【F:types.ts†L138-L182】 |
| F. Possession state persisted in GameState (down/distance/field/clock/score) | **No** | `SaveState` has league/week/schedule/standings and roster/staff/transactions; it lacks any in-game snapshot fields (down, distance, ball spot, clock, possession, quarter).【F:types.ts†L138-L182】 |
| G. Explicit current drive state updated after each play | **No** | No `drive` object in state schema and no play-step reducer in active TS modules. Phase advancement is coarse-grained only (`advancePhase`).【F:types.ts†L138-L182】【F:lib/saveState.ts†L309-L327】 |
| H. Pause/resume mid-game (leave route and return) | **No** | Persistence is full JSON save/load, but there is no in-progress game model to serialize/restore; only front-office state exists. Save/load simply JSON serializes current `SaveState`.【F:lib/persistence.ts†L7-L9】【F:types.ts†L138-L182】 |
| I. Simulate rest of game option (fast-forward) | **Partial** | There is full-game/full-week simulation in legacy path (`simulateGame`, `advanceWeek`), but no interactive game context where "simulate rest" is an alternate branch. The sim is the only path today in legacy UI (`SIM WEEK`).【F:PGMHCD†L290-L315】【F:PGMHCD†L317-L331】【F:PGMHCD†L1232-L1235】 |
| J. End-of-game finalize writes box score, standings, injuries, advances week | **Partial** | Legacy weekly sim updates schedule scores, `played`, standings, and week progression, but no player-level box score or injuries in finalize path shown. It appends a `WEEK_SIMMED` transaction only.【F:PGMHCD†L334-L385】 |
| K. Determinism (same save + same playcalls -> same outcomes) | **Partial** | RNG is seeded and deterministic utilities exist (`mulberry32`, `hashSeed`).【F:lib/rng.ts†L3-L23】 Legacy full-game path threads seed forward and stores `rngSeed`, so repeatability is plausible for full-sim, but there is no playcall input path to validate playcall determinism specifically.【F:PGMHCD†L290-L315】【F:PGMHCD†L317-L331】 |

### Minimum code changes for every No/Partial

- **A/B (entry + pregame/in-game transition)**
  - Add route/screens in canonical app (new UI layer; currently absent in included TS build).
  - Add `SaveState.league.currentGameId` + `SaveState.gameSession` and actions like `ENTER_GAME`, `START_GAME` in reducer module (new file likely `lib/gameReducer.ts` or new `src/context/GameContext.tsx`).
  - Wire schedule rows to dispatch/select a specific `ScheduleGame.id`.

- **C (one-snap stepping)**
  - Introduce engine APIs: `initGameSim`, `stepPlay`, `isGameOver`, each pure and seed-threaded.
  - Add reducer actions `STEP_PLAY` and UI "Next Play" button that dispatches once per snap.

- **D/E (off/def playcalling)**
  - Define playcall domain types (`OffensiveCall`, `DefensiveCall`) in `types.ts`.
  - Store pending selections in `gameSession` and pass to `stepPlay(state, offCall, defCall)`.
  - Add offense/defense playcall UI panes keyed by possession.

- **F/G (possession + drive state)**
  - Extend `SaveState` with serialized `gameSession`: quarter, clock, possessionTeamId, down, distance, yardLine, scoreByTeam, `currentDrive` (start spot, plays, yards, result).
  - Reducer updates these fields on every `STEP_PLAY`.

- **H (pause/resume)**
  - Persist `gameSession` inside existing JSON save path (already generic).
  - Route restore logic checks `gameSession.status === "IN_PROGRESS"` and returns to live-game screen.

- **I (simulate rest option)**
  - Add action `SIM_REST_OF_GAME` that loops `stepPlay` until terminal state from current `gameSession`.
  - Keep existing full-week sim for CPU games only.

- **J (finalization completeness)**
  - Add `finalizeGame` writing: per-team box score, player stats, injuries, standings update, and week advance.
  - Persist into `league.schedule` + new stats/injury stores.

- **K (determinism with playcalls)**
  - Seed game with `hashSeed(save.meta.seed, season, week, gameId)` and only consume RNG through engine.
  - Ensure reducer never uses `Date.now()` in gameplay path (legacy uses `Date.now()` in transactions).

## Section 2 — Route & UI Entry Points

- **Canonical compiled code**: there are no `src/*` routes/components in repository; `tsconfig` includes only non-UI TS modules (`lib`, `data`, `types`).【F:tsconfig.json†L13】
- **Legacy monolith (`PGMHCD`)**:
  - Main tabbed UI chooses screens via `state.ui.screen` (`home`, `roster`, `market`, `season`, `staff`, `history`).【F:PGMHCD†L1823-L1829】【F:PGMHCD†L1844-L1852】
  - Season screen renders schedule and labels user matchup as "YOUR GAME" only; no handler to enter matchup detail/live mode.【F:PGMHCD†L1541-L1551】
  - Dashboard CTA for regular season dispatches `ADVANCE_WEEK` (full sim).【F:PGMHCD†L1232-L1235】

## Section 3 — Reducer Action Map (gameplay-relevant)

- **Active typed model (`types.ts` + `lib/saveState.ts`)**:
  - Transaction kinds are front-office only: `SIGN_FA`, `RELEASE_PLAYER`, `RE_SIGN`, `FRANCHISE_TAG`, `HIRE_COACH`; no game-step actions.【F:types.ts†L94-L129】
  - `applyTx` mutates roster/contracts/coaches only; no in-game state mutation path.【F:lib/saveState.ts†L203-L251】
  - `advancePhase` only transitions macro phases and increments week on `REGULAR_SEASON_WEEK`; no per-play reducer branch.【F:lib/saveState.ts†L309-L327】
- **Legacy reducer (`PGMHCD`)**:
  - `ADVANCE_WEEK` calls `advanceWeek(state)` and simulates entire week; no `STEP_PLAY`/`RESOLVE_PLAY`.【F:PGMHCD†L720-L723】【F:PGMHCD†L317-L331】

## Section 4 — Engine Call Graph (current behavior)

### Canonical included TS modules
No gameplay engine call graph exists (no game init/step/finalize functions in included modules).【F:tsconfig.json†L13】

### Legacy path call graph (non-canonical, monolithic)
`DashboardScreen` button (`SIM WEEK N`) → `dispatch({type:"ADVANCE_WEEK"})` → `gameReducer` case `ADVANCE_WEEK` → `advanceWeek(state)` → for each game call `simulateGame(home,away,state,seed)` (full game result) → update schedule+standings+week+transactions → UI re-renders schedule/record screens from updated state.【F:PGMHCD†L1232-L1235】【F:PGMHCD†L720-L723】【F:PGMHCD†L317-L385】【F:PGMHCD†L1517-L1523】

## Section 5 — Full Sim vs Interactive Comparison

- **Full sim exists**: legacy `simulateGame` resolves complete game scores in one call, and `advanceWeek` executes this across all unplayed games in week.【F:PGMHCD†L290-L315】【F:PGMHCD†L323-L331】
- **Interactive path missing**: no play-step engine, no playcall UI, no possession/drive state in persisted typed state schema.【F:types.ts†L138-L182】
- **Canonical recommendation**: treat `lib/* + types.ts` as canonical because they are the only included TS sources in build config; treat `PGMHCD` as legacy/prototype reference and avoid extending it unless reintroduced into build intentionally.【F:tsconfig.json†L13】

## Section 6 — Blocking Issues (ranked)

1. **No serialized in-game domain model** — cannot represent or resume live game. Evidence: `SaveState` lacks game session/possession fields.【F:types.ts†L138-L182】
2. **No gameplay reducer actions** — no `ENTER_GAME`, `STEP_PLAY`, `SIM_REST_OF_GAME`, `FINALIZE_GAME`. Evidence: tx union and `applyTx` only cover roster/staff ops.【F:types.ts†L94-L129】【F:lib/saveState.ts†L203-L251】
3. **No stepwise engine API** — only full-game sim exists (legacy).【F:PGMHCD†L290-L315】
4. **No UI entry into specific scheduled game** — schedule labels user game but cannot open it.【F:PGMHCD†L1541-L1551】
5. **No pregame/live screens in compiled app scope** — build includes no UI source tree (`src` absent from tsconfig include).【F:tsconfig.json†L13】
6. **No playcall data model (offense/defense)** — impossible to pass user choices into simulation.【F:types.ts†L138-L182】
7. **Finalize path incomplete for football sim requirements** — no injuries/box score persist in legacy finalize path. 【F:PGMHCD†L334-L385】
8. **Determinism contract incomplete for interactive mode** — seeded RNG exists but no playcall-driven engine to validate invariant. 【F:lib/rng.ts†L3-L23】

## Section 7 — Acceptance Tests (manual) for top fixes

1. **Enter Scheduled Game**
   - Steps: Go to Season/Schedule, click user matchup row, verify transition to pregame with opponent and kickoff button.
   - Pass: URL/screen state stores selected `gameId`; reload returns to same pregame if not started.

2. **Start + Step Plays**
   - Steps: From pregame click Start; press Next Play 5 times.
   - Pass: down/distance/yardline/clock update each press; exactly one play event appended per press.

3. **Offensive Playcall**
   - Steps: On user possession, choose Run/Pass concept then Next Play.
   - Pass: selected call displayed in last play card and consumed by engine resolution.

4. **Defensive Call**
   - Steps: On opponent possession, choose defensive focus then Next Play.
   - Pass: defensive selection impacts play result metadata.

5. **Pause/Resume**
   - Steps: Mid-drive exit to hub, hard refresh, reopen save.
   - Pass: returns to in-progress game with same clock/down/ball spot.

6. **Sim Rest of Game**
   - Steps: Mid-game choose Sim Rest.
   - Pass: game jumps to final, writes final score + standings, marks schedule game played.

7. **Finalize Outputs**
   - Steps: Complete game normally.
   - Pass: box score persists, injuries persist, standings/week advance exactly once.

8. **Determinism**
   - Steps: Load identical save seed; apply identical sequence of playcalls.
   - Pass: identical play-by-play and final score across runs.
