import { SaveState } from "../types";
import { rebuildIndices } from "./saveState";

const STORAGE_KEY = "gridiron.save";
const CURRENT_VERSION = 1;

export const saveToStorage = (state: SaveState, storage: Pick<Storage, "setItem"> = localStorage): void => {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const migrateSave = (unknownState: SaveState): SaveState => {
  if (unknownState.meta.saveVersion === CURRENT_VERSION) return rebuildIndices(unknownState);

  const migrated: SaveState = {
    ...unknownState,
    meta: {
      ...unknownState.meta,
      saveVersion: CURRENT_VERSION,
    },
  };

  return rebuildIndices(migrated);
};

export const loadFromStorage = (storage: Pick<Storage, "getItem"> = localStorage): SaveState | null => {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return migrateSave(JSON.parse(raw) as SaveState);
};

export const validatePostTx = (state: SaveState): string[] => {
  const errors: string[] = [];
  for (const [teamId, roster] of Object.entries(state.derived.rostersByTeam)) {
    const calculated = roster.reduce((sum, playerId) => {
      const contractId = state.derived.contractByPlayer[playerId];
      if (!contractId) return sum;
      return sum + (state.contracts.records[contractId]?.apy ?? 0);
    }, 0);

    if (calculated !== state.derived.capByTeam[teamId].committed) {
      errors.push(`Cap divergence for ${teamId}: derived=${state.derived.capByTeam[teamId].committed} calc=${calculated}`);
    }
  }
  return errors;
};
