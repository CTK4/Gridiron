export type RNG = () => number;

export const mulberry32 = (seed: number): RNG => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

export const hashSeed = (...parts: Array<string | number>): number => {
  let h = 2166136261;
  for (const p of parts) {
    const v = String(p);
    for (let i = 0; i < v.length; i += 1) {
      h ^= v.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return h >>> 0;
};

export const makeRng = (seed: number): RNG => mulberry32(seed);
export const rF = (rng: RNG, lo = 0, hi = 1): number => lo + rng() * (hi - lo);
export const rI = (rng: RNG, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
export const rBool = (rng: RNG, p: number): boolean => rng() < p;
export const rPick = <T>(rng: RNG, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
export const rShuffle = <T>(rng: RNG, arr: readonly T[]): T[] => {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
