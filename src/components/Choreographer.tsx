"use client";
import { useMemo } from "react";
import { formatHour } from "@/lib/airQuality";
import { modelIndoor, roomVolumeM3 } from "@/lib/impactEngine";
import { phaseForHour } from "@/lib/skyPhase";
import { useT } from "@/hooks/useLang";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile, VentilationWindow } from "@/lib/types";
import { DeltaCard } from "./DeltaCard";
import { HeroSection } from "./HeroSection";
import { HorizonScrubber } from "./HorizonScrubber";
import { HouseholdForm } from "./HouseholdForm";
import { PersonalGuidance } from "./PersonalGuidance";
import { RoutineShifts } from "./RoutineShifts";

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

/** Modelled indoor PM2.5 for every hour, using the household's current sealing and filter choices. */
function useIndoorSeries(scenario: AirScenario, profile: HouseholdProfile, interventions: ActiveInterventions): number[] {
  const { sealWindowsWithEpdm: sealed, filtrationMode: filtration } = interventions;
  return useMemo(() => {
    const volumeM3 = roomVolumeM3(profile.roomAreaSqFt, profile.ceilingHeightFt);
    return scenario.hourly.map((h) => modelIndoor({ outdoorPm25: h.pm25, volumeM3, profile, sealed, filtration }).pm25);
  }, [scenario, profile, sealed, filtration]);
}

/** The "Living Sky" tab: the advice for the hour, the 24-hour horizon, the routine switches and the household. */
export function Choreographer(props: Props) {
  const t = useT();
  const { scenario, window: w, hour, profile, interventions, receipt, onInterventions, onProfile } = props;
  const phase = phaseForHour(hour, w);
  const indoor = useIndoorSeries(scenario, profile, interventions);
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
        <HeroSection
          scenario={scenario}
          window={w}
          hour={hour}
          phase={phase}
          outNow={scenario.hourly[hour].pm25}
          inNow={Math.round(indoor[hour])}
        />
        <DeltaCard receipt={receipt} onOpenReceipt={props.onOpenReceipt} />
      </section>

      <section className="glass liquid rounded-[32px] p-6" aria-labelledby="ribbon-h">
        <HorizonScrubber
          key={scenario.id}
          hourly={scenario.hourly}
          indoor={indoor}
          window={w}
          hour={hour}
          phaseLabel={t.phase[phase]}
          playing={props.playing}
          onHour={props.onHour}
          onTogglePlay={props.onTogglePlay}
          onJump={props.onJump}
        />
        <ol className="m-0 mt-2 grid list-none grid-cols-2 gap-2 p-0 text-center sm:grid-cols-5">
          {steps.map((s) => (
            <li key={s.label} className={`flex flex-col items-center rounded-2xl p-1.5 ${s.best ? "chip" : ""}`}>
              <span className={`label ${s.best ? "accent" : ""}`} style={{ color: s.best ? undefined : "var(--ink)" }}>
                {formatHour(s.h)}
              </span>
              <span className="text-[11px] font-medium">{s.label}</span>
              <span className={`text-[11px] ${s.best ? "font-bold" : "accent"}`}>{scenario.hourly[s.h].pm25} µg/m³</span>
            </li>
          ))}
        </ol>
      </section>

      <RoutineShifts scenario={scenario} window={w} profile={profile} interventions={interventions} onInterventions={onInterventions} />
      <PersonalGuidance scenario={scenario} window={w} profile={profile} hour={hour} />
      <HouseholdForm profile={profile} onProfile={onProfile} />
    </div>
  );
}
