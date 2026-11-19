"use client";
import { useMemo, useState } from "react";
import { track } from "@/lib/clientApi";
import { GRAP_DISCLAIMER, GRAP_INFO, VEHICLE_LABELS, vehicleRestricted, type VehicleClass } from "@/lib/grapRules";
import { HEATER_UNIT_COST_INR, buildAdvisory, heaterPlan } from "@/lib/rwa";
import type { AirScenario, GrapStage } from "@/lib/types";

interface Props {
  scenario: AirScenario;
  aqi: number;
  peakAqi: number;
  stage: GrapStage;
}

const STAGES: GrapStage[] = ["STAGE_1", "STAGE_2", "STAGE_3", "STAGE_4"];

export function CommunityPlaybook({ scenario, aqi, peakAqi, stage }: Props) {
  const [flats, setFlats] = useState(100);
  const [guards, setGuards] = useState(4);
  const [vehicle, setVehicle] = useState<VehicleClass>("petrol_bs3");
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);
  const currentIdx = STAGES.indexOf(stage);

  const info = GRAP_INFO[stage];
  const plan = useMemo(() => heaterPlan(flats, guards), [flats, guards]);
  const advisory = useMemo(
    () => buildAdvisory({ stage, aqi, locationName: scenario.name, flats, guards }),
    [stage, aqi, scenario.name, flats, guards],
  );
  const restricted = vehicleRestricted(stage, vehicle);

  async function copy() {
    try {
      await navigator.clipboard.writeText(advisory.combined);
      setToast("Advisory copied. Paste it into your WhatsApp group.");
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track({ event: "impact_receipt_shared", props: { share_type: "rwa_whatsapp" } });
    } catch {
      setToast("Copy failed. Select the text above and copy it manually.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <p className="label scrim inline-block rounded-full px-4 py-1.5">Community and GRAP playbook</p>
          <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">
            {stage === "NONE" ? "No GRAP stage is active right now." : `GRAP Stage ${info.roman}: ${info.category}.`}
          </h2>
          <p className="scrim mt-3 inline-block rounded-3xl px-5 py-3 text-lg">
            Current AQI {aqi}; today's peak AQI {peakAqi}. {peakAqi > aqi ? "Conditions can worsen later today." : ""}
          </p>
        </div>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="measures-h">
          <h3 id="measures-h" className="label">What typically applies</h3>
          <ul className="mt-2 list-disc pl-5">
            {info.measures.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <h3 className="label mt-4">What households can do</h3>
          <ul className="mt-2 list-disc pl-5">
            {info.householdActions.map((m) => <li key={m}>{m}</li>)}
          </ul>
          <p className="mt-3 text-sm ink-soft">{GRAP_DISCLAIMER}</p>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="matrix-h">
          <h3 id="matrix-h" className="label">All stages</h3>
          <ol className="grap-meter mt-3" aria-label="Where today's air sits across GRAP stages">
            {STAGES.map((s, i) => {
              const state = i < currentIdx ? "reached" : i === currentIdx ? "current" : "ahead";
              return (
                <li key={s} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                  <strong className="serif">{GRAP_INFO[s].roman}</strong>
                  <span>{GRAP_INFO[s].category}</span>
                  <span className="sr-only">{state === "current" ? "current stage" : state === "reached" ? "already passed" : "not reached"}</span>
                </li>
              );
            })}
          </ol>
          <table className="tbl mt-3">
            <caption className="sr-only">GRAP stages and AQI bands</caption>
            <thead><tr><th scope="col">Stage</th><th scope="col">AQI band</th><th scope="col">Category</th></tr></thead>
            <tbody>
              {STAGES.map((s) => (
                <tr key={s} aria-current={s === stage ? "true" : undefined}>
                  <th scope="row">{GRAP_INFO[s].roman}{s === stage ? " (current)" : ""}</th>
                  <td>{GRAP_INFO[s].band}</td>
                  <td>{GRAP_INFO[s].category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="veh-h">
          <h3 id="veh-h" className="label">Vehicle check</h3>
          <label className="mt-2 block text-sm font-semibold">
            Your vehicle
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleClass)}
              className="field">
              {Object.entries(VEHICLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <p role="status" className="mt-3 font-bold">
            {restricted
              ? "Likely restricted at this stage in Delhi-NCR. Plan another way to travel."
              : "Not restricted by the Stage III rule for light vehicles at the current stage."}
          </p>
        </section>
      </div>

      <div className="space-y-6">
        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="rwa-h">
          <h3 id="rwa-h" className="label">Night-guard heater calculator</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Flats in society
              <input type="number" min={1} max={500} value={flats}
                onChange={(e) => setFlats(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
                className="field" />
            </label>
            <label className="block text-sm font-semibold">
              Night guards
              <input type="number" min={0} max={50} value={guards}
                onChange={(e) => setGuards(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                className="field" />
            </label>
          </div>
          <p className="mt-3" aria-live="polite">
            {guards} × ₹{HEATER_UNIT_COST_INR.toLocaleString("en-IN")} = <strong>₹{plan.totalCostInr.toLocaleString("en-IN")}</strong>, about{" "}
            <strong>₹{plan.perFlatInr} per flat</strong> one time. Replaces open biomass fires at the gate. Heater price is an assumption.
          </p>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="adv-h">
          <h3 id="adv-h" className="label">WhatsApp advisory (English + हिन्दी)</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="label">English</p>
              <pre lang="en" className="bubble m-0 whitespace-pre-wrap chip p-4 font-sans text-sm">{advisory.en}</pre>
            </div>
            <div>
              <p className="label">हिन्दी</p>
              <pre lang="hi" className="bubble m-0 whitespace-pre-wrap chip p-4 font-sans text-sm">{advisory.hi}</pre>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn-primary">
              <span key={String(copied)} className={copied ? "pop" : ""}>{copied ? "✓ Copied" : "Copy advisory"}</span>
            </button>
            <a
              onClick={() => track({ event: "impact_receipt_shared", props: { share_type: "rwa_whatsapp" } })}
              href={`https://wa.me/?text=${encodeURIComponent(advisory.combined)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pill no-underline"
            >
              Share on WhatsApp
            </a>
          </div>
          <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold">{toast}</p>
        </section>
      </div>
    </div>
  );
}
