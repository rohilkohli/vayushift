/** Small numeric helpers shared by the engine modules. */

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Rounds to a fixed number of decimal places and returns a number (not a string). */
export const roundTo = (n: number, dp: number) => Number(n.toFixed(dp));
