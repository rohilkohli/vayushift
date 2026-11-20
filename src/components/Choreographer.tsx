"use client";
import { useMemo } from "react";
import { cigaretteEquivalent, formatHour, pm25ToAqi } from "@/lib/airQuality";
import { COOKING_INCREMENT_UG_M3 } from "@/lib/constants";
import { NO_INTERVENTIONS, calculateHouseholdImpact, clampMembers, modelIndoor, roomVolumeM3 } from "@/lib/impactEngine";
import { phaseForHour } from "@/lib/skyPhase";
import { useT } from "@/hooks/useLang";
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
import { HorizonScrubber } from "./HorizonScrubber";
import { Icon } from "./Icon";
import { RoutineToggle } from "./RoutineToggle";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  /** Hour selected on the scrubber (0-23). */
  hour: number;
  playing: boolean;
  onHour: (h: number) => void;
  onTogglePlay: () => void;
  onJump: () => void;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
  onOpenReceipt: () => void;
}

const COMMUTE_MODES: CommuteMode[] = ["private_petrol_car", "private_diesel_car", "auto_rickshaw", "two_wheeler"];
const COOKING_FUELS: CookingFuel[] = ["lpg_unvented", "lpg_chimney", "electric_induction"];

export function Choreographer({
  scenario, window: w, hour, playing, onHour, onTogglePlay, onJump, profile, interventions, receipt, onProfile, onInterventions, onOpenReceipt,
}: Props) {
  const t = useT();
  const advice = w.advice;
  const span = `${formatHour(w.startHour)} – ${formatHour(w.endHour)}`;
  const phase = phaseForHour(hour, w);
  const morningCigs = cigaretteEquivalent(w.morningPeakMeanPm25, 24).toFixed(1);

  // Modelled indoor PM2.5 for every hour, using the household's current sealing and filter choices.
  const indoor = useMemo(() => {
    const volumeM3 = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
    return scenario.hourly.map((h) =>
      modelIndoor({
        outdoorPm25: h.pm25,
        volumeM3,
        profile,
        sealed: interventions.sealWindowsWithEpdm,
        filtration: interventions.filtrationMode,
      }).pm25,
    );
  }, [scenario, profile, interventions.sealWindowsWithEpdm, interventions.filtrationMode]);

  const outNow = scenario.hourly[hour].pm25;
  const inNow = Math.round(indoor[hour]);
  const hazePct = outNow > 0 ? Math.max(0, Math.round(((outNow - inNow) / outNow) * 100)) : 0;

  // In the low-smog window the headline follows the safety-aware advice (normal, brief or sealed).
  const headline = {
    window: t.heroWindow(advice.mode, advice.minutes),
    morning: t.heroMorning,
    night: t.heroNight,
    transition: t.heroTransition,
  }[phase];
  // Every figure below comes from the forecast and the indoor model, never from free text.
  const subline = {
    window: t.subWindow(
      t.adviceSentence(advice.mode, advice.minutes, advice.headline),
      w.meanPm25, w.reductionVsMorningPct, w.morningPeakMeanPm25, pm25ToAqi(w.morningPeakMeanPm25), morningCigs,
    ),
    morning: t.subMorning(outNow, formatHour(w.startHour), inNow),
    night: t.subNight(outNow, inNow),
    transition: t.subTransition(outNow, scenario.name === "Your location" ? t.yourLocation : scenario.name, inNow, span),
  }[phase];

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
    { h: 6, label: t.stepEarly },
    { h: 12, label: t.stepBoundary },
    { h: Math.round(w.startHour), label: t.stepOptimal, best: true },
    { h: 19, label: t.stepEvening },
    { h: 23, label: t.stepNight },
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
            {formatHour(hour)} · {t.phase[phase]}
          </p>
          <h2 className="serif hero-ink halo mt-5 text-[2.6rem] font-normal leading-[1.08] tracking-tight sm:text-6xl">{headline}</h2>
          <p className="scrim mt-4 max-w-xl rounded-3xl px-5 py-3 text-[15px] leading-6">{subline}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <p className="glass m-0 flex items-center gap-3 rounded-full px-5 py-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#8c4e35]" aria-hidden="true" />
              <span className="label">{t.outsideBasin(formatHour(hour))}</span>
              <span className="serif num text-lg font-medium"><AnimatedNumber value={outNow} /> <span className="text-[11px] font-normal ink-soft">µg/m³ · AQI {pm25ToAqi(outNow)}</span></span>
            </p>
            <p className="glass m-0 flex flex-wrap items-center gap-3 rounded-full px-5 py-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-[#436182]" aria-hidden="true" />
              <span className="label">{t.sanctuaryModelled}</span>
              <span className="serif num text-lg font-semibold"><AnimatedNumber value={inNow} /> <span className="text-[11px] font-normal ink-soft">µg/m³</span></span>
              {hazePct > 0 && <span className="chip rounded-full px-2 py-0.5 text-[10px] font-bold accent">{t.hazeBadge(hazePct)}</span>}
            </p>
          </div>
        </div>

        <aside className="glass liquid lift relative w-full max-w-[390px] overflow-hidden rounded-[44px] p-8" aria-labelledby="delta-h">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#ffdbce] opacity-50 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-center justify-between">
            <h3 id="delta-h" className="label m-0 flex items-center gap-2"><Icon name="wb_twilight" className="accent" /> {t.deltaTitle}</h3>
          </div>
          <div className="relative mt-6" aria-live="polite" aria-atomic="true">
            <p className="m-0 flex items-baseline gap-2">
              <span className="serif text-[54px] italic leading-none">{receipt.avoidedCigarettesHouseholdDay > 0 && "−"}<AnimatedNumber value={receipt.avoidedCigarettesHouseholdDay} decimals={2} /></span>
              <span className="accent text-[13px] font-semibold">{t.cigEquivalent}</span>
            </p>
            <p className="ink-soft m-0 mt-1 text-[13px]">{t.neverInhaled}</p>
            <hr className="my-5 border-0 border-t border-current opacity-15" />
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="m-0 flex items-baseline gap-2">
                  <span className="serif text-4xl italic leading-none">{receipt.savedCo2GramsDay > 0 && "−"}<AnimatedNumber value={receipt.savedCo2GramsDay} /> g</span>
                  <span className="label">CO₂</span>
                </p>
                <p className="ink-soft m-0 mt-1 text-[13px]">
                  {receipt.savedCo2GramsDay > 0 ? t.co2Shielded : t.co2Hint}
                </p>
              </div>
              <span className="chip flex h-10 w-10 shrink-0 items-center justify-center rounded-full"><Icon name="directions_subway" /></span>
            </div>
          </div>
          <button type="button" onClick={onOpenReceipt} className="btn-primary relative mt-6 w-full" aria-label={t.viewReceipt}>
            {t.fullReceipt}
          </button>
        </aside>
      </section>

      <section className="glass liquid rounded-[32px] p-6" aria-labelledby="ribbon-h">
        <HorizonScrubber
          key={scenario.id}
          hourly={scenario.hourly}
          indoor={indoor}
          window={w}
          hour={hour}
          phaseLabel={t.phase[phase]}
          playing={playing}
          onHour={onHour}
          onTogglePlay={onTogglePlay}
          onJump={onJump}
        />
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
        <h3 id="shifts-h" className="label page-ink mb-3 px-2">{t.shiftsTitle}</h3>
        <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RoutineToggle
            icon="wb_sunny"
            title={t.purgeTitle}
            subtitle={interventions.purgeAtTrough ? t.purgeActive(formatHour(w.startHour)) : t.purgeIdle(formatHour(w.startHour))}
            cig={solo.purge}
            checked={interventions.purgeAtTrough}
            onChange={(v) => onInterventions({ purgeAtTrough: v })}
            describedBy="t-purge"
          />
          <RoutineToggle
            icon="directions_walk"
            title={t.walkTitle}
            subtitle={t.walkSub(formatHour(w.startHour))}
            cig={solo.walk}
            checked={interventions.shiftWalkToTrough}
            onChange={(v) => onInterventions({ shiftWalkToTrough: v })}
            describedBy="t-walk"
          />
          <RoutineToggle
            icon="skillet"
            title={t.cookTitle}
            subtitle={t.cookSub(COOKING_INCREMENT_UG_M3[profile.baselineCookingFuel])}
            cig={solo.cook}
            checked={interventions.switchToInduction}
            onChange={(v) => onInterventions({ switchToInduction: v })}
            describedBy="t-cook"
          />
          <RoutineToggle
            icon="masks"
            title={t.commuteTitle}
            subtitle={t.commuteSub(profile.commuteKmRoundTrip, t.commuteMode[profile.baselineCommuteMode].toLowerCase())}
            cig={solo.commute}
            checked={interventions.switchCommuteToMetroN95}
            onChange={(v) => onInterventions({ switchCommuteToMetroN95: v })}
            describedBy="t-commute"
          />
        </div>
      </section>

      <details className="glass liquid rounded-[32px] p-5" open>
        <summary className="label min-h-11 cursor-pointer py-2">{t.household}</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm font-semibold">
            {t.people}
            <input
              type="number" min={1} max={15} value={profile.memberCount} className="field"
              onChange={(e) => {
                const n = clampMembers(Number(e.target.value));
                onProfile({ memberCount: n, commuterCount: Math.min(profile.commuterCount, n), walkerCount: Math.min(profile.walkerCount, n) });
              }}
            />
          </label>
          <label className="block text-sm font-semibold">
            {t.commuteKm}
            <input
              type="number" min={0} max={200} value={profile.commuteKmRoundTrip} className="field"
              onChange={(e) => onProfile({ commuteKmRoundTrip: Math.min(200, Math.max(0, Number(e.target.value) || 0)) })}
            />
          </label>
          <label className="block text-sm font-semibold">
            {t.usualCommute}
            <select value={profile.baselineCommuteMode} onChange={(e) => onProfile({ baselineCommuteMode: e.target.value as CommuteMode })} className="field">
              {COMMUTE_MODES.map((k) => <option key={k} value={k}>{t.commuteMode[k]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            {t.cooking}
            <select value={profile.baselineCookingFuel} onChange={(e) => onProfile({ baselineCookingFuel: e.target.value as CookingFuel })} className="field">
              {COOKING_FUELS.map((k) => <option key={k} value={k}>{t.fuel[k]}</option>)}
            </select>
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={profile.hasVulnerableMembers} onChange={(e) => onProfile({ hasVulnerableMembers: e.target.checked })} className="h-5 w-5" />
          {t.vulnerable}
        </label>
        {profile.hasVulnerableMembers && (
          <p className="ink-soft m-0 text-sm">{t.vulnerableNote}</p>
        )}
      </details>
    </div>
  );
}
