"use client";
import { useMemo } from "react";
import { cigaretteEquivalent, formatHour, meanBetween, pm25ToAqi } from "@/lib/airQuality";
import { COOKING_INCREMENT_UG_M3 } from "@/lib/constants";
import { NO_INTERVENTIONS, calculateHouseholdImpact, clampMembers } from "@/lib/impactEngine";
import type {
  ActiveInterventions,
  AirScenario,
  CommuteMode,
  CookingFuel,
  DirectImpactReceipt,
  HouseholdProfile,
  VentilationWindow,
} from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { DiurnalChart } from "./DiurnalChart";
import { Icon } from "./Icon";
import { RoutineToggle } from "./RoutineToggle";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  hour: number;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
  onOpenReceipt: () => void;
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

export function Choreographer({ scenario, window: w, hour, profile, interventions, receipt, onProfile, onInterventions, onOpenReceipt }: Props) {
  const advice = w.advice;
  const span = `${formatHour(w.startHour)} – ${formatHour(w.endHour)}`;
  const inWindow = hour >= Math.floor(w.startHour) && hour < w.endHour;
  const mean24 = Math.round(meanBetween(scenario.hourly, 0, 23));
  const morningCigs = cigaretteEquivalent(w.morningPeakMeanPm25, 24).toFixed(1);

  const headline =
    advice.mode === "normal"
      ? `Open your windows for ${advice.minutes} minutes of afternoon light.`
      : advice.mode === "brief"
        ? `Keep windows shut. If you must, open for ${advice.minutes} minutes.`
        : "Keep windows shut today. Let filtration do the work.";

  // What each action would avoid on its own, shown whether the switch is on or off.
  const solo = useMemo(() => {
    const one = (patch: Partial<ActiveInterventions>) =>
      calculateHouseholdImpact(scenario.hourly, profile, { ...NO_INTERVENTIONS, ...patch }, w).avoidedCigarettesHouseholdDay;
    return {
      walk: one({ shiftWalkToTrough: true }),
      purge: one({ purgeAtTrough: true }),
      cook: one({ switchToInduction: true }),
      commute: one({ switchCommuteToMetroN95: true }),
    };
  }, [scenario, profile, w]);

  const steps = [
    { h: 6, label: "Early morning" },
    { h: 12, label: "Boundary rising" },
    { h: Math.round(w.startHour), label: "Optimal window", best: true },
    { h: 19, label: "Evening build-up" },
    { h: 23, label: "Night haze trapped" },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
        <div className="max-w-2xl flex-1">
          <p className="scrim inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full ping-soft rounded-full bg-[#ffdbce] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ffad8f]" />
            </span>
            {inWindow ? `${formatHour(hour)} · Low-smog window open` : `Next low-smog window ${span}`}
          </p>
          <h2 className="serif hero-ink mt-5 text-[2.6rem] font-normal leading-[1.08] tracking-tight sm:text-6xl">{headline}</h2>
          <p className="scrim mt-4 max-w-xl rounded-3xl px-5 py-3 text-[15px] leading-6">
            {advice.headline} Outdoor PM2.5 in that window averages {w.meanPm25} µg/m³, about {w.reductionVsMorningPct}% lower than the
            07:00 to 10:00 peak ({w.morningPeakMeanPm25} µg/m³, AQI {pm25ToAqi(w.morningPeakMeanPm25)}, roughly {morningCigs} cigarettes a day).
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <p className="glass m-0 flex items-center gap-3 rounded-full px-5 py-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#8c4e35]" aria-hidden="true" />
              <span className="label">Outside basin, 24 h avg</span>
              <span className="serif text-lg font-medium">{mean24} <span className="text-[11px] font-normal ink-soft">µg/m³</span></span>
            </p>
            <p className="glass m-0 flex flex-wrap items-center gap-3 rounded-full px-5 py-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#436182]" aria-hidden="true" />
              <span className="label">Sanctuary room, modelled</span>
              <span className="serif text-lg font-semibold">{receipt.managedIndoorPm25} <span className="text-[11px] font-normal ink-soft">µg/m³</span></span>
              {receipt.indoorReductionPct > 0 && (
                <span className="chip rounded-full px-2 py-0.5 text-[10px] font-bold accent">−{Math.round(receipt.indoorReductionPct)}% haze</span>
              )}
            </p>
          </div>
        </div>

        <aside className="glass relative w-full max-w-[390px] overflow-hidden rounded-[44px] p-8" aria-labelledby="delta-h">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ffdbce] opacity-50 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <h3 id="delta-h" className="label m-0 flex items-center gap-2"><Icon name="wb_twilight" className="accent" /> Daily Sanctuary Delta</h3>
          </div>
          <div className="relative mt-6" aria-live="polite" aria-atomic="true">
            <p className="m-0 flex items-baseline gap-2">
              <span className="serif text-[54px] italic leading-none">−<AnimatedNumber value={receipt.avoidedCigarettesHouseholdDay} decimals={2} /></span>
              <span className="accent text-[13px] font-semibold">cig equivalent</span>
            </p>
            <p className="ink-soft m-0 mt-1 text-[13px]">never inhaled by your household today</p>
            <hr className="my-5 border-0 border-t border-current opacity-15" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="m-0 flex items-baseline gap-2">
                  <span className="serif text-4xl italic leading-none">−<AnimatedNumber value={receipt.savedCo2GramsDay} /> g</span>
                  <span className="label">CO₂</span>
                </p>
                <p className="ink-soft m-0 mt-1 text-[13px]">
                  {receipt.savedCo2GramsDay > 0 ? "shielded via Delhi Metro vs. your usual commute" : "switch the commute to metro to see this"}
                </p>
              </div>
              <span className="chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full"><Icon name="directions_subway" /></span>
            </div>
          </div>
          <button type="button" onClick={onOpenReceipt} className="btn-primary relative mt-6 w-full" aria-label="View full receipt">
            Full receipt
          </button>
        </aside>
      </section>

      <section className="glass rounded-[32px] p-6" aria-labelledby="ribbon-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 id="ribbon-h" className="label m-0 flex items-center gap-2"><Icon name="waves" className="accent" /> {scenario.name} diurnal dispersion forecast</h3>
          <p className="label m-0 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-dashed border-[#8c4e35]" aria-hidden="true" />
            Low-smog window ({span})
          </p>
        </div>
        <DiurnalChart key={scenario.id} hourly={scenario.hourly} window={w} />
        <ol className="m-0 mt-2 grid list-none grid-cols-2 gap-2 p-0 text-center sm:grid-cols-5">
          {steps.map((s) => (
            <li key={s.label} className={`flex flex-col items-center rounded-2xl p-1.5 ${s.best ? "chip" : ""}`}>
              <span className={`label ${s.best ? "accent" : ""}`} style={{ color: s.best ? undefined : "var(--ink)" }}>{formatHour(s.h)}</span>
              <span className="text-[11px] font-medium">{s.label}</span>
              <span className={`text-[11px] ${s.best ? "font-bold" : "accent"}`}>{scenario.hourly[s.h].pm25} µg/m³</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="shifts-h">
        <h3 id="shifts-h" className="label page-ink mb-3 px-2">Routine shifts · switch on to see the effect</h3>
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RoutineToggle
            icon="wb_sunny"
            title="Afternoon air shift"
            subtitle={interventions.purgeAtTrough ? `Active window ${formatHour(w.startHour)}` : `Air the home at ${formatHour(w.startHour)}`}
            cig={solo.purge}
            checked={interventions.purgeAtTrough}
            onChange={(v) => onInterventions({ purgeAtTrough: v })}
            describedBy="t-purge"
          />
          <RoutineToggle
            icon="directions_walk"
            title="Walk at the low point"
            subtitle={`45 min at ${formatHour(w.startHour)} with an N95`}
            cig={solo.walk}
            checked={interventions.shiftWalkToTrough}
            onChange={(v) => onInterventions({ shiftWalkToTrough: v })}
            describedBy="t-walk"
          />
          <RoutineToggle
            icon="skillet"
            title="Induction cooking"
            subtitle={`Cuts the ${COOKING_INCREMENT_UG_M3[profile.baselineCookingFuel]} µg/m³ cooking bump`}
            cig={solo.cook}
            checked={interventions.switchToInduction}
            onChange={(v) => onInterventions({ switchToInduction: v })}
            describedBy="t-cook"
          />
          <RoutineToggle
            icon="masks"
            title="Metro + N95 corridor"
            subtitle={`${profile.commuteKmRoundTrip} km vs ${COMMUTE_LABELS[profile.baselineCommuteMode].toLowerCase()}`}
            cig={solo.commute}
            checked={interventions.switchCommuteToMetroN95}
            onChange={(v) => onInterventions({ switchCommuteToMetroN95: v })}
            describedBy="t-commute"
          />
        </div>
      </section>

      <details className="glass rounded-[32px] p-5" open>
        <summary className="label min-h-11 cursor-pointer py-2">Your household</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold">
            People at home
            <input
              type="number" min={1} max={15} value={profile.memberCount} className="field"
              onChange={(e) => {
                const n = clampMembers(Number(e.target.value));
                onProfile({ memberCount: n, commuterCount: Math.min(profile.commuterCount, n), walkerCount: Math.min(profile.walkerCount, n) });
              }}
            />
          </label>
          <label className="block text-sm font-semibold">
            Commute, km round trip
            <input
              type="number" min={0} max={200} value={profile.commuteKmRoundTrip} className="field"
              onChange={(e) => onProfile({ commuteKmRoundTrip: Math.min(200, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </label>
          <label className="block text-sm font-semibold">
            Usual commute
            <select value={profile.baselineCommuteMode} onChange={(e) => onProfile({ baselineCommuteMode: e.target.value as CommuteMode })} className="field">
              {Object.entries(COMMUTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Cooking
            <select value={profile.baselineCookingFuel} onChange={(e) => onProfile({ baselineCookingFuel: e.target.value as CookingFuel })} className="field">
              {Object.entries(FUEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={profile.hasVulnerableMembers} onChange={(e) => onProfile({ hasVulnerableMembers: e.target.checked })} className="h-5 w-5" />
          A child, older adult or someone with asthma lives here
        </label>
        {profile.hasVulnerableMembers && (
          <p className="ink-soft m-0 text-sm">Sensitive groups should take extra care. This app does not replace advice from your doctor.</p>
        )}
      </details>
    </div>
  );
}
