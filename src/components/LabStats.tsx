"use client";
import { meanBetween } from "@/lib/airQuality";
import { fieldCadrM3h } from "@/lib/impactEngine";
import type { AirScenario, DirectImpactReceipt, FiltrationMode } from "@/lib/types";
import { useT } from "@/hooks/useLang";

interface Props {
  scenario: AirScenario;
  receipt: DirectImpactReceipt;
  filtration: FiltrationMode;
}

/** Four headline figures under the filters: outdoor average, modelled indoor level, filter air changes, and the target. */
export function LabStats({ scenario, receipt, filtration }: Props) {
  const t = useT();
  const active = filtration !== "none";
  const outdoorAvg = Math.round(meanBetween(scenario.hourly, 0, 23));
  const ach = receipt.roomVolumeM3 > 0 ? Math.round(fieldCadrM3h(filtration)) / receipt.roomVolumeM3 : 0;
  const stats = [
    [t.statOutdoor, `${outdoorAvg}`, "µg/m³", t.statOutdoorNote],
    [t.statIndoor, `${receipt.managedIndoorPm25}`, "µg/m³", t.statIndoorNote],
    [t.statAch, ach.toFixed(1), t.statAchUnit, active ? t.statAchOn : t.statAchOff],
    [t.statTarget, `${receipt.requiredCadrM3h}`, "m³/h", t.statTargetNote],
  ];
  return (
    <dl className="stagger m-0 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map(([k, v, u, n]) => (
        <div key={k} className="glass liquid lift rounded-[2rem] p-5">
          <dt className="label">{k}</dt>
          <dd className="m-0 mt-2">
            <span className="serif num text-4xl">{v}</span> <span className="ink-soft text-xs">{u}</span>
            <span className="ink-soft mt-1 block text-xs font-medium">{n}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
