export const CAP_LIMIT = 255_000_000;

export const SALARY_SCALE: Record<string, number> = {
  QB: 35,
  HB: 15,
  WR: 22,
  TE: 14,
  OL: 18,
  DE: 22,
  DT: 14,
  LB: 16,
  CB: 20,
  S: 16,
  K: 5,
};

export const OFF_SCHEMES = [
  { id: "AIR_RAID", name: "Air Raid", fits: ["QB", "WR", "HB"] },
  { id: "SHANAHAN_WIDE_ZONE", name: "Wide Zone", fits: ["HB", "OL", "TE"] },
  { id: "WEST_COAST", name: "West Coast", fits: ["QB", "WR", "TE"] },
] as const;

export const DEF_SCHEMES = [
  { id: "FOUR_THREE_UNDER", name: "4-3 Under", fits: ["DE", "LB", "S"] },
  { id: "THREE_FOUR_TWO_GAP", name: "3-4 Two-Gap", fits: ["DT", "LB", "CB"] },
  { id: "NICKEL_MATCH", name: "Nickel Match", fits: ["CB", "S", "DE"] },
] as const;
