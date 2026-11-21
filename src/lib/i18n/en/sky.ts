/** Sky phases, the hero copy, the daily delta card and the routine switches. */
import type { Phase } from "../../skyPhase";

type Mode = "normal" | "brief" | "sealed";

export const sky = {
  // ---- phases and hero copy
  phase: {
    window: "Solar mixing window open",
    morning: "Morning inversion peak",
    night: "Nocturnal smog lock",
    transition: "Atmospheric transition",
  } as Record<Phase, string>,
  adviceSentence: (mode: Mode, minutes: number, original: string) => {
    void mode;
    void minutes;
    return original;
  },
  heroWindow: (mode: Mode, minutes: number) =>
    mode === "normal"
      ? `Open your windows for ${minutes} minutes of afternoon light.`
      : mode === "brief"
        ? `Keep windows shut. If you must, open for ${minutes} minutes.`
        : "Keep windows shut today. Let filtration do the work.",
  heroMorning: "Keep windows sealed through the morning inversion.",
  heroNight: "Let your bedroom sanctuary filter the night air.",
  heroTransition: "Steady indoor filtration as the sky shifts.",
  subWindow: ({
    advice,
    mean,
    pct,
    peak,
    aqi,
    cigs,
  }: {
    advice: string;
    mean: number;
    pct: number;
    peak: number;
    aqi: number;
    cigs: string;
  }) =>
    `${advice} Outdoor PM2.5 in that window averages ${mean} µg/m³, about ${pct}% lower than the 07:00 to 10:00 peak (${peak} µg/m³, AQI ${aqi}, roughly ${cigs} cigarettes a day).`,
  subMorning: (out: number, start: string, inn: number) =>
    `Cold surface air traps exhaust at ${out} µg/m³ outdoors. Hold ventilation until ${start} and keep filtration running; the room is modelled at ${inn} µg/m³.`,
  subNight: (out: number, inn: number) =>
    `Overnight the air holds at ${out} µg/m³ outdoors, while your sealed room is modelled at ${inn} µg/m³.`,
  subTransition: (out: number, name: string, inn: number, span: string) =>
    `Outdoor PM2.5 is ${out} µg/m³ in ${name}. Your routines hold indoor exposure near ${inn} µg/m³. The next low-smog window is ${span}.`,
  outsideBasin: (hour: string) => `Outside basin, ${hour}`,
  sanctuaryModelled: "Sanctuary room, modelled",
  hazeBadge: (pct: number) => `−${pct}% haze`,

  // ---- delta card
  deltaTitle: "Daily Sanctuary Delta",
  cigEquivalent: "cig equivalent",
  neverInhaled: "never inhaled by your household today",
  co2Shielded: "shielded via Delhi Metro vs. your usual commute",
  co2Hint: "switch the commute to metro to see this",
  viewReceipt: "View full receipt",
  fullReceipt: "Full receipt",
  stepEarly: "Early morning",
  stepBoundary: "Boundary rising",
  stepOptimal: "Optimal window",
  stepEvening: "Evening build-up",
  stepNight: "Night haze trapped",

  // ---- routine switches
  shiftsTitle: "Routine shifts · switch on to see the effect",
  purgeTitle: "Afternoon air shift",
  purgeActive: (h: string) => `Active window ${h}`,
  purgeIdle: (h: string) => `Air the home at ${h}`,
  walkTitle: "Walk at the low point",
  walkSub: (h: string) => `45 min at ${h} with an N95`,
  cookTitle: "Induction cooking",
  cookSub: (ug: number) => `Cuts the ${ug} µg/m³ cooking bump`,
  commuteTitle: "Metro + N95 corridor",
  commuteSub: (km: number, mode: string) => `${km} km vs ${mode}`,
  switchOn: "✓ On",
  switchOff: "Off",
  cigShort: "cig",
};
