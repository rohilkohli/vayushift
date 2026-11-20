import { findVentilationWindow, pm25ToAqi } from "./airQuality";
import type { HouseholdProfile, HourlyAir, VentilationWindow } from "./types";

/**
 * Who-is-at-home guidance. Two households in one city must not get the same advice: a family with a toddler and a
 * grandparent needs tighter limits than a healthy adult. Everything here is deterministic arithmetic on the
 * forecast; the interface only turns the result into a sentence (with the numbers passed in as parameters).
 *
 * Thresholds are on the CPCB AQI scale. For healthy adults they follow the CPCB bands (Satisfactory 51-100,
 * Moderate 101-200, Poor 201-300): outdoor activity is fine up to 200, to be limited up to 300, and avoided above.
 * For children, older adults and people with lung or heart conditions the app is deliberately more cautious, because
 * CPCB lists breathing discomfort for sensitive people from the Satisfactory band onward: fine up to 100, limited up
 * to 150, avoided above. These are general precautions, not medical advice.
 */
export type PersonGroup = "children" | "seniors" | "respiratory" | "adults";
export type ActivityLevel = "ok" | "limit" | "indoors";

export const GROUP_ORDER: readonly PersonGroup[] = ["children", "seniors", "respiratory", "adults"];

/** AQI up to which outdoor activity is fine, and up to which it should be limited. */
export const ACTIVITY_LIMITS: Record<"sensitive" | "adults", { okUpTo: number; limitUpTo: number }> = {
  sensitive: { okUpTo: 100, limitUpTo: 150 },
  adults: { okUpTo: 200, limitUpTo: 300 },
};

/** When activity is limited, keep it to this many minutes of light activity. */
export const LIMITED_ACTIVITY_MINUTES = 30;

/** Hours considered for going outside (06:00 to 20:00 inclusive). */
export const OUTING_FIRST_HOUR = 6;
export const OUTING_LAST_HOUR = 20;

/** An airing session is cut to this many minutes when a sensitive person is at home and the window is still smoggy. */
export const SENSITIVE_AIRING_MINUTES = 10;
/** The AQI of the window's mean PM2.5 above which a household with a sensitive member should air only briefly. */
export const SENSITIVE_AIRING_ABOVE_AQI = 100;

export interface GroupAdvice {
  group: PersonGroup;
  /** Guidance for the hour the visitor is looking at. */
  nowLevel: ActivityLevel;
  nowAqi: number;
  /** The best hour to go out (lowest AQI between 06:00 and 20:00) and how it rates for this group. */
  bestHour: number;
  bestAqi: number;
  bestLevel: ActivityLevel;
  /** True when an N95 is advised for going out at the best hour. */
  mask: boolean;
}

export interface PersonalAdvice {
  groups: GroupAdvice[];
  /** Minutes to air the home for, when a sensitive person lives here and the window is still polluted; otherwise null. */
  shortenAiringTo: number | null;
  /** AQI of the low-smog window's average, for the sentence that explains the shortened airing. */
  windowAqi: number;
}

export const isSensitive = (g: PersonGroup): boolean => g !== "adults";

export function levelFor(aqi: number, group: PersonGroup): ActivityLevel {
  const lim = ACTIVITY_LIMITS[isSensitive(group) ? "sensitive" : "adults"];
  if (aqi <= lim.okUpTo) return "ok";
  return aqi <= lim.limitUpTo ? "limit" : "indoors";
}

/** The groups that apply to this household: every selected sensitive group, and always healthy adults. */
export function groupsFor(profile: Pick<HouseholdProfile, "hasChildren" | "hasSeniors" | "hasRespiratoryCondition">): PersonGroup[] {
  return GROUP_ORDER.filter(
    (g) =>
      g === "adults" ||
      (g === "children" && profile.hasChildren) ||
      (g === "seniors" && profile.hasSeniors) ||
      (g === "respiratory" && profile.hasRespiratoryCondition),
  );
}

/** The lowest-AQI hour between 06:00 and 20:00 (the earliest wins a tie). */
export function bestOutingHour(hourly: readonly HourlyAir[]): { hour: number; aqi: number } {
  let best = { hour: OUTING_FIRST_HOUR, aqi: Infinity };
  for (let h = OUTING_FIRST_HOUR; h <= OUTING_LAST_HOUR; h++) {
    const aqi = pm25ToAqi(hourly[h].pm25);
    if (aqi < best.aqi) best = { hour: h, aqi };
  }
  return best;
}

export function personalAdvice(
  hourly: readonly HourlyAir[],
  hour: number,
  profile: Pick<HouseholdProfile, "hasChildren" | "hasSeniors" | "hasRespiratoryCondition">,
  window: VentilationWindow = findVentilationWindow(hourly),
): PersonalAdvice {
  const h = Math.min(23, Math.max(0, Math.round(hour)));
  const nowAqi = pm25ToAqi(hourly[h].pm25);
  const best = bestOutingHour(hourly);
  const groups = groupsFor(profile).map((group): GroupAdvice => {
    const bestLevel = levelFor(best.aqi, group);
    return {
      group,
      nowLevel: levelFor(nowAqi, group),
      nowAqi,
      bestHour: best.hour,
      bestAqi: best.aqi,
      bestLevel,
      // A mask only matters if the household still goes out: advised whenever even the best hour is not "ok".
      mask: bestLevel !== "ok",
    };
  });
  const windowAqi = pm25ToAqi(window.meanPm25);
  const anySensitive = groups.some((g) => isSensitive(g.group));
  const shorten = anySensitive && window.advice.mode === "normal" && windowAqi > SENSITIVE_AIRING_ABOVE_AQI;
  return { groups, shortenAiringTo: shorten ? SENSITIVE_AIRING_MINUTES : null, windowAqi };
}
