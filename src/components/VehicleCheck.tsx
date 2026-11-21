"use client";
import { useState } from "react";
import { VEHICLE_LABELS, vehicleRestricted, type VehicleClass } from "@/lib/grapRules";
import type { GrapStage } from "@/lib/types";
import { useT } from "@/hooks/useLang";

/** Whether the visitor's kind of vehicle is likely restricted at the current GRAP stage. Awareness only. */
export function VehicleCheck({ stage }: { stage: GrapStage }) {
  const t = useT();
  const [vehicle, setVehicle] = useState<VehicleClass>("petrol_bs3");
  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="veh-h">
      <h3 id="veh-h" className="label">
        {t.vehicleTitle}
      </h3>
      <label className="mt-2 block text-sm font-semibold">
        {t.yourVehicle}
        <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleClass)} className="field">
          {Object.keys(VEHICLE_LABELS).map((k) => (
            <option key={k} value={k}>
              {t.vehicleLabel[k] ?? VEHICLE_LABELS[k as VehicleClass]}
            </option>
          ))}
        </select>
      </label>
      <p role="status" className="mt-3 font-bold">
        {vehicleRestricted(stage, vehicle) ? t.vehicleRestricted : t.vehicleFree}
      </p>
    </section>
  );
}
