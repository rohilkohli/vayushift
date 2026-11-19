/**
 * Time-of-day sky for the "scrub the horizon" feature. Palettes follow the supplied Living Sky
 * prototype (night, dawn, midday, golden afternoon, sunset) and are blended between hours so the
 * sky moves smoothly while you scrub or press play.
 *
 * Everything here is a continuous function of the hour (no hard switches), so the CSS transitions
 * that follow it can glide: the sun rises, crosses and sets; the moon takes over; stars fade in after
 * dusk; clouds and birds belong to the day and take the colour of the light.
 *
 * The first three gradient stops sit behind the white hero copy, so every palette keeps them dark
 * (relative luminance <= 0.18, which gives white text 4.5:1). A unit test enforces this.
 */
type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

/** A sun or moon: centre as percent of viewport width / height, and its opacity (0 below the horizon). */
export interface Body {
  x: number;
  y: number;
  opacity: number;
}

export interface SkyState {
  /** Seven gradient stops, top to bottom (positions 0, 34, 66, 82, 90, 96, 100 %). */
  stops: [string, string, string, string, string, string, string];
  /** Sun glow colour. */
  orb: string;
  /** Cloud colour: white at noon, peach at sunset, a dim blue-grey at night. */
  cloud: string;
  sun: Body;
  moon: Body;
  /** 0-1: how visible the stars are (night only). */
  stars: number;
  /** 0-1: how much daytime life (clouds, birds) is out. */
  day: number;
  /** True from 21:00 to 04:59, when the UI switches to its night theme. */
  night: boolean;
  /** Multiplier for drifting wind and clouds (fastest in the afternoon mixing window). */
  windSpeed: number;
}

const hexToRgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

interface Band {
  top: Rgb;
  mid: Rgb;
  bot: Rgb;
  orb: Rgba;
  cloud: Rgb;
}
const band = (top: string, mid: string, bot: string, orb: Rgba, cloud: Rgb): Band => ({
  top: hexToRgb(top),
  mid: hexToRgb(mid),
  bot: hexToRgb(bot),
  orb,
  cloud,
});

// Orb alpha is lower than the prototype's so a bright sun never washes out the hero text.
const BANDS = {
  night: band("#11162B", "#31233E", "#5E3D50", [248, 250, 252, 0.5], [104, 118, 158]),
  dawn: band("#3B2834", "#874F45", "#D99B72", [253, 224, 71, 0.5], [255, 200, 172]),
  midday: band("#1E4E79", "#4C86A8", "#DFC9A6", [254, 249, 195, 0.44], [255, 255, 255]),
  golden: band("#12456B", "#2A7B9B", "#F2C57C", [254, 240, 138, 0.52], [255, 240, 212]),
  sunset: band("#201A3A", "#5C436A", "#C96E58", [251, 191, 36, 0.52], [255, 166, 136]),
} as const;

const KNOTS: ReadonlyArray<{ h: number; b: Band }> = [
  { h: 0, b: BANDS.night },
  { h: 4, b: BANDS.night },
  { h: 6, b: BANDS.dawn },
  { h: 8, b: BANDS.dawn },
  { h: 11, b: BANDS.midday },
  { h: 13, b: BANDS.midday },
  { h: 15, b: BANDS.golden },
  { h: 16, b: BANDS.golden },
  { h: 18, b: BANDS.sunset },
  { h: 20, b: BANDS.sunset },
  { h: 22, b: BANDS.night },
  { h: 24, b: BANDS.night },
];

const normaliseHour = (h: number) => ((h % 24) + 24) % 24;

function blend(hour: number): Band {
  const h = normaliseHour(hour);
  const i = Math.max(1, KNOTS.findIndex((k) => k.h >= h));
  const a = KNOTS[i - 1];
  const b = KNOTS[i];
  const t = b.h === a.h ? 0 : (h - a.h) / (b.h - a.h);
  return {
    top: mix(a.b.top, b.b.top, t),
    mid: mix(a.b.mid, b.b.mid, t),
    bot: mix(a.b.bot, b.b.bot, t),
    orb: [0, 1, 2, 3].map((k) => a.b.orb[k] + (b.b.orb[k] - a.b.orb[k]) * t) as Rgba,
    cloud: mix(a.b.cloud, b.b.cloud, t),
  };
}

export const isNightHour = (hour: number) => {
  const h = Math.round(normaliseHour(hour)) % 24;
  return h >= 21 || h <= 4;
};

/** Position on a half-circle arc: low at the ends of `progress` 0 and 1, highest in the middle. */
function arc(progress: number): { x: number; y: number } {
  const p = clamp01(progress);
  return { x: 8 + p * 84, y: 72 - Math.sin(p * Math.PI) * 56 };
}

/** The sun rises at about 06:00 and sets at about 18:00, fading as it meets the horizon. */
function sunBody(h: number): Body {
  const { x, y } = arc((h - 6) / 12);
  return { x, y, opacity: smoothstep(5.2, 6.8, h) * (1 - smoothstep(17.2, 18.8, h)) };
}

/** The moon takes the night: it rises about 18:00 and sets about 06:00. */
function moonBody(h: number): Body {
  const progress = ((h - 18 + 24) % 24) / 12;
  const { x, y } = arc(progress);
  const opacity = h >= 12 ? smoothstep(17.5, 19.2, h) : 1 - smoothstep(4.8, 6.5, h);
  return { x, y, opacity };
}

const starsAt = (h: number) => (h >= 12 ? smoothstep(18.8, 21, h) : 1 - smoothstep(4.5, 6.2, h));
const dayAt = (h: number) => smoothstep(5.5, 7.5, h) * (1 - smoothstep(17.3, 19.3, h));

export function skyForHour(hour: number): SkyState {
  const h = normaliseHour(hour);
  const { top, mid, bot, orb, cloud } = blend(h);
  const cream: Rgb = [255, 242, 225];
  return {
    stops: [
      toHex(top),
      toHex(mix(top, mid, 0.3)),
      toHex(mix(top, mid, 0.65)),
      toHex(mid),
      toHex(mix(mid, bot, 0.5)),
      toHex(bot),
      toHex(mix(bot, cream, 0.45)),
    ],
    orb: `rgba(${Math.round(orb[0])}, ${Math.round(orb[1])}, ${Math.round(orb[2])}, ${orb[3].toFixed(2)})`,
    cloud: toHex(cloud),
    sun: sunBody(h),
    moon: moonBody(h),
    stars: starsAt(h),
    day: dayAt(h),
    night: isNightHour(h),
    windSpeed: h >= 14 && h <= 16 ? 2.4 : 0.8,
  };
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
