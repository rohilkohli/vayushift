"use client";
import { useMemo } from "react";
import { HEATER_UNIT_COST_INR, heaterPlan } from "@/lib/rwa";
import { useT } from "@/hooks/useLang";

interface Props {
  flats: number;
  guards: number;
  onFlats: (n: number) => void;
  onGuards: (n: number) => void;
}

const clampInt = (raw: string, min: number, max: number, fallback: number) => Math.min(max, Math.max(min, Number(raw) || fallback));

/** The cost of a heater for each night guard, shared across the society's flats, in place of open fires at the gate. */
export function HeaterCalculator({ flats, guards, onFlats, onGuards }: Props) {
  const t = useT();
  const plan = useMemo(() => heaterPlan(flats, guards), [flats, guards]);
  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="rwa-h">
      <h3 id="rwa-h" className="label">
        {t.heaterTitle}
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          {t.flats}
          <input
            type="number"
            min={1}
            max={500}
            value={flats}
            onChange={(e) => onFlats(clampInt(e.target.value, 1, 500, 1))}
            className="field"
          />
        </label>
        <label className="block text-sm font-semibold">
          {t.guards}
          <input
            type="number"
            min={0}
            max={50}
            value={guards}
            onChange={(e) => onGuards(clampInt(e.target.value, 0, 50, 0))}
            className="field"
          />
        </label>
      </div>
      <p className="mt-3" aria-live="polite">
        {t.heaterSum(guards, HEATER_UNIT_COST_INR.toLocaleString("en-IN"))}
        <strong>₹{plan.totalCostInr.toLocaleString("en-IN")}</strong>, {t.heaterAbout} <strong>{t.heaterPerFlat(plan.perFlatInr)}</strong>{" "}
        {t.heaterTail}
      </p>
    </section>
  );
}
