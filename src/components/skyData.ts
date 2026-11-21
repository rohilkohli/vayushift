/**
 * The fixed layout of the living sky: where each star, cloud and flock sits. Everything is deterministic (the star
 * field comes from a seeded generator), so the server and the browser render identical markup.
 */

/** Small seeded generator so the star field is stable across renders. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const STARS = (() => {
  const rnd = seeded(2026);
  return Array.from({ length: 90 }, (_, i) => ({
    cx: Math.round(rnd() * 1000),
    cy: Math.round(rnd() * 430), // upper part of the sky only
    r: +(0.5 + rnd() * 1.4).toFixed(2),
    base: +(0.45 + rnd() * 0.55).toFixed(2),
    tw: +(2.8 + rnd() * 4).toFixed(1),
    td: +(-rnd() * 6).toFixed(1),
    twinkle: i % 3 !== 0, // a third stay steady so the field does not shimmer all at once
  }));
})();

/** Soft cumulus silhouette, drawn on a 220 x 90 canvas. */
export const CLOUD = "M34 74 C8 74 2 46 28 40 C28 16 62 8 80 28 C92 4 132 4 142 30 C162 14 196 28 190 52 C214 54 218 74 192 74 Z";

// Seconds to cross the sky: slow (4 to 7 minutes) so the clouds drift rather than race.
export const CLOUDS = [
  { top: 9, w: 300, dur: 380, delay: -50, o: 0.46, x0: 12 },
  { top: 19, w: 200, dur: 290, delay: -175, o: 0.36, x0: 58 },
  { top: 31, w: 360, dur: 470, delay: -275, o: 0.4, x0: 34 },
  { top: 43, w: 240, dur: 330, delay: -110, o: 0.32, x0: 76 },
  { top: 55, w: 320, dur: 430, delay: -350, o: 0.3, x0: 6 },
] as const;

/** Each bird is [x, y, flap seconds] relative to the flock's lead. */
export const FLOCKS = [
  {
    top: 14,
    dur: 70,
    delay: -12,
    rise: -6,
    birds: [
      [0, 0, 0.78],
      [-26, 12, 0.86],
      [-26, -12, 0.82],
      [-54, 24, 0.9],
      [-54, -24, 0.8],
    ],
  },
  {
    top: 33,
    dur: 95,
    delay: -58,
    rise: 5,
    birds: [
      [0, 0, 0.84],
      [-22, 10, 0.78],
      [-44, 18, 0.88],
    ],
  },
] as const;
