"use client";
import { cigaretteEquivalent, formatHour, pm25ToAqi } from "@/lib/airQuality";
import type { Messages } from "@/lib/i18n";
import type { Phase } from "@/lib/skyPhase";
import type { AirScenario, VentilationWindow } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { AnimatedNumber } from "./AnimatedNumber";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  hour: number;
  phase: Phase;
  /** Outdoor PM2.5 and modelled indoor PM2.5 at the selected hour. */
  outNow: number;
  inNow: number;
}

/** The headline and supporting sentence for the current phase of the day. Every figure comes from the engine. */
function heroText(t: Messages, { scenario, window: w, phase, outNow, inNow }: Props) {
  const advice = w.advice;
  const where = scenario.name === "Your location" ? t.yourLocation : scenario.name;
  const morningCigs = cigaretteEquivalent(w.morningPeakMeanPm25, 24).toFixed(1);
  const headline = {
    window: t.heroWindow(advice.mode, advice.minutes),
    morning: t.heroMorning,
    night: t.heroNight,
    transition: t.heroTransition,
  }[phase];
  const subline = {
    window: t.subWindow({
      advice: t.adviceSentence(advice.mode, advice.minutes, advice.headline),
      mean: w.meanPm25,
      pct: w.reductionVsMorningPct,
      peak: w.morningPeakMeanPm25,
      aqi: pm25ToAqi(w.morningPeakMeanPm25),
      cigs: morningCigs,
    }),
    morning: t.subMorning(outNow, formatHour(w.startHour), inNow),
    night: t.subNight(outNow, inNow),
    transition: t.subTransition(outNow, where, inNow, `${formatHour(w.startHour)} – ${formatHour(w.endHour)}`),
  }[phase];
  return { headline, subline };
}

/** The left half of the first screen: the hour and phase, the advice, and the outdoor and indoor readings. */
export function HeroSection(props: Props) {
  const t = useT();
  const { hour, phase, outNow, inNow } = props;
  const { headline, subline } = heroText(t, props);
  const hazePct = outNow > 0 ? Math.max(0, Math.round(((outNow - inNow) / outNow) * 100)) : 0;
  return (
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
          <span className="serif num text-lg font-medium">
            <AnimatedNumber value={outNow} /> <span className="text-[11px] font-normal ink-soft">µg/m³ · AQI {pm25ToAqi(outNow)}</span>
          </span>
        </p>
        <p className="glass m-0 flex flex-wrap items-center gap-3 rounded-full px-5 py-2.5 text-sm">
          <span className="h-2 w-2 rounded-full bg-[#436182]" aria-hidden="true" />
          <span className="label">{t.sanctuaryModelled}</span>
          <span className="serif num text-lg font-semibold">
            <AnimatedNumber value={inNow} /> <span className="text-[11px] font-normal ink-soft">µg/m³</span>
          </span>
          {hazePct > 0 && <span className="chip rounded-full px-2 py-0.5 text-[10px] font-bold accent">{t.hazeBadge(hazePct)}</span>}
        </p>
      </div>
    </div>
  );
}
