/**
 * Time-of-day sky for the "scrub the horizon" feature. Palettes follow the supplied Living Sky
 * prototype (night, dawn, midday, golden afternoon, sunset) and are blended between hours so the
 * sky moves smoothly while you scrub or press play.
 *
 * The first three gradient stops sit behind the white hero copy, so every palette keeps them dark
 * (relative luminance <= 0.18, which gives white text 4.5:1). A unit test enforces this.
 */
type Rgb = [number, number, number];
type Rgba = [number, number, number, number];

export interface SkyState {
  /** Seven gradient stops, top to bottom (positions 0, 34, 66, 82, 90, 96, 100 %). */
  stops: [string, string, string, string, string, string, string];
  /** Sun or moon glow colour. */
  orb: string;
  /** Orb centre as percent of viewport width / height. */
  sunX: number;
  sunY: number;
  /** True from 21:00 to 04:59, when the UI switches to its night theme. */
  night: boolean;
  /** Multiplier for the drifting wind streaks (fastest in the afternoon mixing window). */
  windSpeed: number;
}

const hexToRgb = (h: string): Rgb => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
const toHex = (c: Rgb) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;

interface Band {
  top: Rgb;
  mid: Rgb;
  bot: Rgb;
  orb: Rgba;
}
const band = (top: string, mid: string, bot: string, orb: Rgba): Band => ({
  top: hexToRgb(top),
  mid: hexToRgb(mid),
  bot: hexToRgb(bot),
  orb,
});

// Orb alpha is lower than the prototype's so a bright sun never washes out the hero text.
const BANDS = {
  night: band("#11162B", "#31233E", "#5E3D50", [248, 250, 252, 0.5]),
  dawn: band("#3B2834", "#874F45", "#D99B72", [253, 224, 71, 0.5]),
  midday: band("#1E4E79", "#4C86A8", "#DFC9A6", [254, 249, 195, 0.44]),
  golden: band("#12456B", "#2A7B9B", "#F2C57C", [254, 240, 138, 0.52]),
  sunset: band("#201A3A", "#5C436A", "#C96E58", [251, 191, 36, 0.52]),
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
  };
}

export const isNightHour = (hour: number) => {
  const h = Math.round(normaliseHour(hour)) % 24;
  return h >= 21 || h <= 4;
};

export function skyForHour(hour: number): SkyState {
  const h = normaliseHour(hour);
  const { top, mid, bot, orb } = blend(h);
  const progress = h / 23;
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
    sunX: 12 + progress * 76,
    sunY: 62 - Math.sin(progress * Math.PI) * 44,
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
