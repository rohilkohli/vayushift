"use client";
import { cigaretteEquivalent, formatHour, pm25ToAqi } from "@/lib/airQuality";
import { COOKING_INCREMENT_UG_M3 } from "@/lib/constants";
import type {
  ActiveInterventions,
  AirScenario,
  CommuteMode,
  CookingFuel,
  DirectImpactReceipt,
  HouseholdProfile,
  VentilationWindow,
} from "@/lib/types";
import { clampMembers } from "@/lib/impactEngine";
import { DiurnalChart } from "./DiurnalChart";
import { Switch } from "./Switch";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

const COMMUTE_LABELS: Record<CommuteMode, string> = {
  private_petrol_car: "Petrol car",
  private_diesel_car: "Diesel car",
  auto_rickshaw: "Auto-rickshaw",
  two_wheeler: "Two-wheeler",
};
const FUEL_LABELS: Record<CookingFuel, string> = {
  lpg_unvented: "LPG, no exhaust",
  lpg_chimney: "LPG with chimney",
  electric_induction: "Induction",
};

export function Choreographer({ scenario, window: w, profile, interventions, receipt, onProfile, onInterventions }: Props) {
  const byKey = Object.fromEntries(receipt.components.map((c) => [c.key, c.avoidedCigarettes]));
  const morningCigs = cigaretteEquivalent(w.morningPeakMeanPm25, 24).toFixed(1);
  const span = `${formatHour(w.startHour)} to ${formatHour(w.endHour)}`;

  const advice = w.advice;
  const headline =
    advice.mode === "normal"
      ? `Open your windows for ${advice.minutes} minutes between ${span}.`
      : advice.mode === "brief"
        ? `Keep windows shut. If you must, open them for ${advice.minutes} minutes at ${formatHour(w.startHour)}.`
        : "Keep windows shut today. Filtration does the work.";

  const cards: Array<{
    key: keyof ActiveInterventions;
    id: string;
    title: string;
    detail: string;
    cig: number | undefined;
    checked: boolean;
    set: (v: boolean) => void;
  }> = [
    {
      key: "shiftWalkToTrough",
      id: "walk",
      title: "Shift the walk to the afternoon",
      detail: `Move a 45-minute walk from the morning peak to ${formatHour(w.startHour)}, wearing a fitted N95.`,
      cig: byKey.walk,
      checked: interventions.shiftWalkToTrough,
      set: (v) => onInterventions({ shiftWalkToTrough: v }),
    },
    {
      key: "purgeAtTrough",
      id: "purge",
      title: "Air the home at the low point",
      detail: `Do your ${advice.minutes}-minute airing at ${formatHour(w.startHour)} instead of the morning.`,
      cig: byKey.purge,
      checked: interventions.purgeAtTrough,
      set: (v) => onInterventions({ purgeAtTrough: v }),
    },
    {
      key: "switchToInduction",
      id: "cook",
      title: "Cook on induction with the exhaust on",
      detail: `Cuts the cooking PM2.5 bump (${COOKING_INCREMENT_UG_M3[profile.baselineCookingFuel]} µg/m³ with your current setup: ${FUEL_LABELS[profile.baselineCookingFuel]}).`,
      cig: byKey.cooking,
      checked: interventions.switchToInduction,
      set: (v) => onInterventions({ switchToInduction: v }),
    },
    {
      key: "switchCommuteToMetroN95",
      id: "commute",
      title: "Metro plus N95 for the commute",
      detail: `${profile.commuteKmRoundTrip} km round trip by metro instead of a ${COMMUTE_LABELS[profile.baselineCommuteMode].toLowerCase()}.`,
      cig: byKey.commute,
      checked: interventions.switchCommuteToMetroN95,
      set: (v) => onInterventions({ switchCommuteToMetroN95: v }),
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <div>
          <p className="label">{scenario.name} · {scenario.area}</p>
          <h2 className="serif mt-2 text-4xl font-medium leading-tight md:text-5xl">{headline}</h2>
          <p className="mt-3 max-w-prose text-lg text-[#3b4f66]">
            {advice.headline} Outdoor PM2.5 in that window averages {w.meanPm25} µg/m³, about {w.reductionVsMorningPct}% lower than the
            07:00 to 10:00 peak ({w.morningPeakMeanPm25} µg/m³, AQI {pm25ToAqi(w.morningPeakMeanPm25)}, roughly {morningCigs} cigarettes a day).
          </p>
        </div>

        <section className="glass rounded-[2rem] p-5" aria-labelledby="curve-h">
          <h3 id="curve-h" className="label">Outdoor PM2.5 across the day</h3>
          <DiurnalChart hourly={scenario.hourly} window={w} />
        </section>
      </div>

      <div className="space-y-6">
        <section className="glass rounded-[2rem] p-5" aria-labelledby="home-h">
          <h3 id="home-h" className="label">Your household</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              People at home
              <input
                type="number"
                min={1}
                max={15}
                value={profile.memberCount}
                onChange={(e) => {
                  const n = clampMembers(Number(e.target.value));
                  onProfile({ memberCount: n, commuterCount: Math.min(profile.commuterCount, n), walkerCount: Math.min(profile.walkerCount, n) });
                }}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3"
              />
            </label>
            <label className="block text-sm font-semibold">
              Commute, km round trip
              <input
                type="number"
                min={0}
                max={200}
                value={profile.commuteKmRoundTrip}
                onChange={(e) => onProfile({ commuteKmRoundTrip: Math.min(200, Math.max(0, Number(e.target.value) || 0)) })}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3"
              />
            </label>
            <label className="block text-sm font-semibold">
              Usual commute
              <select
                value={profile.baselineCommuteMode}
                onChange={(e) => onProfile({ baselineCommuteMode: e.target.value as CommuteMode })}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3"
              >
                {Object.entries(COMMUTE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Cooking
              <select
                value={profile.baselineCookingFuel}
                onChange={(e) => onProfile({ baselineCookingFuel: e.target.value as CookingFuel })}
                className="mt-1 min-h-11 w-full rounded-xl border-2 border-[#0f2a44] bg-white px-3"
              >
                {Object.entries(FUEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={profile.hasVulnerableMembers}
              onChange={(e) => onProfile({ hasVulnerableMembers: e.target.checked })}
              className="h-5 w-5"
            />
            A child, older adult or someone with asthma lives here
          </label>
          {profile.hasVulnerableMembers && (
            <p className="mt-1 text-sm text-[#3b4f66]">
              Sensitive groups should take extra care. This app does not replace advice from your doctor.
            </p>
          )}
        </section>
      </div>

      <section className="lg:col-span-2" aria-labelledby="shifts-h">
        <h3 id="shifts-h" className="label mb-3">Routine shifts · switch on to see the effect</h3>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
          {cards.map((c) => (
            <li key={c.key} className="glass flex items-center gap-4 rounded-[2rem] p-5">
              <div className="flex-1">
                <p id={`${c.id}-t`} className="m-0 font-bold">{c.title}</p>
                <p id={`${c.id}-d`} className="m-0 mt-1 text-sm text-[#3b4f66]">{c.detail}</p>
                <p className="m-0 mt-2 text-sm font-bold text-[#0a6b63]">
                  {c.checked ? `Avoids ${c.cig ?? 0} cigarette-equivalents/day` : "Currently off"}
                </p>
              </div>
              <Switch checked={c.checked} onChange={c.set} label={c.title} describedBy={`${c.id}-d`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
