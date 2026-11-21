"use client";
import { useMemo } from "react";
import { formatHour } from "@/lib/airQuality";
import { COOKING_INCREMENT_UG_M3 } from "@/lib/constants";
import { NO_INTERVENTIONS, calculateHouseholdImpact } from "@/lib/impactEngine";
import type { ActiveInterventions, AirScenario, HouseholdProfile, VentilationWindow } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { RoutineToggle } from "./RoutineToggle";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

/** What each action would avoid on its own (cigarette-equivalents per household per day), switched on or not. */
function useSoloSavings({ scenario, window: w, profile }: Pick<Props, "scenario" | "window" | "profile">) {
  return useMemo(() => {
    const one = (patch: Partial<ActiveInterventions>) =>
      calculateHouseholdImpact(scenario.hourly, profile, { ...NO_INTERVENTIONS, ...patch }, w).avoidedCigarettesHouseholdDay;
    return {
      walk: one({ shiftWalkToTrough: true }),
      purge: one({ purgeAtTrough: true }),
      cook: one({ switchToInduction: true }),
      commute: one({ switchCommuteToMetroN95: true }),
    };
  }, [scenario, profile, w]);
}

/** The four routine switches, each showing what it saves by itself. */
export function RoutineShifts(props: Props) {
  const t = useT();
  const { window: w, profile, interventions, onInterventions } = props;
  const solo = useSoloSavings(props);
  const best = formatHour(w.startHour);
  return (
    <section aria-labelledby="shifts-h">
      <h3 id="shifts-h" className="label page-ink mb-3 px-2">
        {t.shiftsTitle}
      </h3>
      <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RoutineToggle
          icon="wb_sunny"
          title={t.purgeTitle}
          subtitle={interventions.purgeAtTrough ? t.purgeActive(best) : t.purgeIdle(best)}
          cig={solo.purge}
          checked={interventions.purgeAtTrough}
          onChange={(v) => onInterventions({ purgeAtTrough: v })}
          describedBy="t-purge"
        />
        <RoutineToggle
          icon="directions_walk"
          title={t.walkTitle}
          subtitle={t.walkSub(best)}
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
  );
}
