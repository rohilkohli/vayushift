"use client";
import type { Tab } from "@/hooks/useTabs";
import type { useHousehold } from "@/hooks/useHousehold";
import type { useSkyClock } from "@/hooks/useSkyClock";
import type { AirScenario, DirectImpactReceipt, GrapStage, VentilationWindow } from "@/lib/types";
import { Choreographer } from "./Choreographer";
import { CommunityPlaybook } from "./CommunityPlaybook";
import { IndoorLab } from "./IndoorLab";

interface Props {
  tab: Tab;
  scenario: AirScenario;
  ventWindow: VentilationWindow;
  receipt: DirectImpactReceipt;
  sky: ReturnType<typeof useSkyClock>;
  household: ReturnType<typeof useHousehold>;
  /** The air right now, for the Community tab. */
  now: { aqi: number; peakAqi: number; stage: GrapStage };
  onOpenReceipt: () => void;
}

/** The three tab panels. All stay mounted (only hidden), so state such as the scrubber position survives a tab change. */
export function TabPanels({ tab, scenario, ventWindow, receipt, sky, household, now, onOpenReceipt }: Props) {
  const { profile, interventions, patchProfile, changeInterventions } = household;
  return (
    <>
      <section id="panel-choreographer" role="tabpanel" aria-labelledby="tab-choreographer" hidden={tab !== "choreographer"}>
        <Choreographer
          scenario={scenario}
          window={ventWindow}
          hour={sky.hour}
          playing={sky.playing}
          onHour={sky.scrubTo}
          onTogglePlay={sky.togglePlay}
          onJump={() => sky.scrubTo(Math.round(ventWindow.startHour))}
          profile={profile}
          interventions={interventions}
          receipt={receipt}
          onProfile={patchProfile}
          onInterventions={changeInterventions}
          onOpenReceipt={onOpenReceipt}
        />
      </section>
      <section id="panel-lab" role="tabpanel" aria-labelledby="tab-lab" hidden={tab !== "lab"}>
        <IndoorLab
          scenario={scenario}
          profile={profile}
          interventions={interventions}
          receipt={receipt}
          onProfile={patchProfile}
          onInterventions={changeInterventions}
        />
      </section>
      <section id="panel-community" role="tabpanel" aria-labelledby="tab-community" hidden={tab !== "community"}>
        <CommunityPlaybook scenario={scenario} aqi={now.aqi} peakAqi={now.peakAqi} stage={now.stage} />
      </section>
    </>
  );
}
