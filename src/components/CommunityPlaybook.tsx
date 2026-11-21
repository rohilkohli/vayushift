"use client";
import { useState } from "react";
import type { AirScenario, GrapStage } from "@/lib/types";
import { AdvisoryCard } from "./AdvisoryCard";
import { CommunityHeadline, GrapMatrix, GrapMeasures } from "./GrapPanels";
import { HeaterCalculator } from "./HeaterCalculator";
import { VehicleCheck } from "./VehicleCheck";

interface Props {
  scenario: AirScenario;
  aqi: number;
  peakAqi: number;
  stage: GrapStage;
}

/** The "Community" tab: today's GRAP stage and what applies, plus tools for an apartment society. */
export function CommunityPlaybook({ scenario, aqi, peakAqi, stage }: Props) {
  const [flats, setFlats] = useState(100);
  const [guards, setGuards] = useState(4);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <CommunityHeadline scenario={scenario} stage={stage} aqi={aqi} peakAqi={peakAqi} />
        <GrapMeasures stage={stage} />
        <GrapMatrix stage={stage} />
        <VehicleCheck stage={stage} />
      </div>
      <div className="space-y-6">
        <HeaterCalculator flats={flats} guards={guards} onFlats={setFlats} onGuards={setGuards} />
        <AdvisoryCard stage={stage} aqi={aqi} locationName={scenario.name} flats={flats} guards={guards} />
      </div>
    </div>
  );
}
