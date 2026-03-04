import { DEF_SCHEMES, OFF_SCHEMES } from "./constants";
import { ID, Player, SaveState } from "../types";

const ALL_SCHEMES = [...OFF_SCHEMES, ...DEF_SCHEMES];

export const computeSchemeFit = (player: Player, schemeId: string): number => {
  const scheme = ALL_SCHEMES.find((s) => s.id === schemeId);
  if (!scheme) return 50;
  const baseline = (scheme.fits as readonly string[]).includes(player.position) ? 78 : 52;
  const talentAdj = Math.round((player.overall - 70) * 0.7);
  return Math.max(0, Math.min(100, baseline + talentAdj));
};

export const computeTeamSchemeFit = (state: SaveState, teamId: ID): number => {
  const team = state.league.teams[teamId];
  if (!team) return 0;
  const roster = state.derived.rostersByTeam[teamId] ?? [];
  if (!roster.length) return 0;

  const fits = roster.map((id) => {
    const p = state.roster.playersById[id];
    const offenseFit = computeSchemeFit(p, team.offScheme);
    const defenseFit = computeSchemeFit(p, team.defScheme);
    return Math.max(offenseFit, defenseFit);
  });

  return Math.round(fits.reduce((sum, value) => sum + value, 0) / fits.length);
};
