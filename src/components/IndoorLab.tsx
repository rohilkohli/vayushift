"use client";
import { useMemo } from "react";
import { compareFilters } from "@/lib/impactEngine";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, HouseholdProfile } from "@/lib/types";
import { useRoomScan } from "@/hooks/useRoomScan";
import { useT } from "@/hooks/useLang";
import { CadrDial } from "./CadrDial";
import { FilterOptions } from "./FilterOptions";
import { LabStats } from "./LabStats";
import { RoomEnvelope } from "./RoomEnvelope";

interface Props {
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

/** The "Room Sanctuary" tab: describe the room, see the air delivery it needs, and compare filters for it. */
export function IndoorLab({ scenario, profile, interventions, receipt, onProfile, onInterventions }: Props) {
  const t = useT();
  const scanner = useRoomScan(onProfile);
  const options = useMemo(
    () => compareFilters(scenario.hourly, profile, interventions.sealWindowsWithEpdm),
    [scenario, profile, interventions.sealWindowsWithEpdm],
  );
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-6">
          <div>
            <p className="label scrim inline-block rounded-full px-4 py-1.5">{t.labBadge}</p>
            <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">{t.labHeadline}</h2>
          </div>
          <CadrDial receipt={receipt} filtration={interventions.filtrationMode} />
          <RoomEnvelope profile={profile} onProfile={onProfile} scanner={scanner} />
        </div>
        <FilterOptions
          options={options}
          receipt={receipt}
          profile={profile}
          interventions={interventions}
          onInterventions={onInterventions}
        />
      </div>
      <LabStats scenario={scenario} receipt={receipt} filtration={interventions.filtrationMode} />
    </div>
  );
}
