"use client";
import { useMemo, useState } from "react";
import { track } from "@/lib/clientApi";
import { GRAP_DISCLAIMER, GRAP_INFO, VEHICLE_LABELS, vehicleRestricted, type VehicleClass } from "@/lib/grapRules";
import { HEATER_UNIT_COST_INR, buildAdvisory, heaterPlan } from "@/lib/rwa";
import type { AirScenario, GrapStage } from "@/lib/types";
import { useLang } from "@/hooks/useLang";

interface Props {
  scenario: AirScenario;
  aqi: number;
  peakAqi: number;
  stage: GrapStage;
}

const STAGES: GrapStage[] = ["STAGE_1", "STAGE_2", "STAGE_3", "STAGE_4"];

import { isDelhiNcr } from "@/lib/grapRules";

export function CommunityPlaybook({ scenario, aqi, peakAqi, stage }: Props) {
  const { t, englishAttrs } = useLang();
  const cat = (c: string) => t.grapCategory[c] ?? c;
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
      setToast(t.advisoryCopied);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      track({ event: "impact_receipt_shared", props: { share_type: "rwa_whatsapp" } });
    } catch {
      setToast(t.advisoryCopyFailed);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <p className="label scrim inline-block rounded-full px-4 py-1.5">{t.communityBadge}</p>
          <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">
            {stage === "NONE" ? t.grapNone : t.grapHeadline(info.roman, cat(info.category))}
          </h2>
          <p className="scrim mt-3 inline-block rounded-3xl px-5 py-3 text-lg">{t.aqiLine(aqi, peakAqi, peakAqi > aqi)}</p>
          {!isDelhiNcr(scenario.lat, scenario.lng) && (
            <p className="scrim mt-3 block max-w-xl rounded-3xl px-5 py-3 text-sm">{t.grapOutsideNcr}</p>
          )}
        </div>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="measures-h">
          <h3 id="measures-h" className="label">{t.measuresTitle}</h3>
          <ul className="mt-2 list-disc pl-5">
            {info.measures.map((m) => <li key={m} {...englishAttrs}>{m}</li>)}
          </ul>
          <h3 className="label mt-4">{t.householdActions}</h3>
          <ul className="mt-2 list-disc pl-5">
            {info.householdActions.map((m) => <li key={m} {...englishAttrs}>{m}</li>)}
          </ul>
          <p className="mt-3 text-sm ink-soft" {...englishAttrs}>{GRAP_DISCLAIMER}</p>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="matrix-h">
          <h3 id="matrix-h" className="label">{t.allStages}</h3>
          <ol className="grap-meter mt-3" aria-label={t.meterAria}>
            {STAGES.map((s, i) => {
              const state = i < currentIdx ? "reached" : i === currentIdx ? "current" : "ahead";
              return (
                <li key={s} data-state={state} aria-current={state === "current" ? "step" : undefined}>
                  <strong className="serif">{GRAP_INFO[s].roman}</strong>
                  <span>{cat(GRAP_INFO[s].category)}</span>
                  <span className="sr-only">{state === "current" ? t.stateCurrent : state === "reached" ? t.statePassed : t.stateAhead}</span>
                </li>
              );
            })}
          </ol>
          <table className="tbl mt-3">
            <caption className="sr-only">{t.grapTableCaption}</caption>
            <thead><tr><th scope="col">{t.thStage}</th><th scope="col">{t.thBand}</th><th scope="col">{t.thCategory}</th></tr></thead>
            <tbody>
              {STAGES.map((s) => (
                <tr key={s} aria-current={s === stage ? "true" : undefined}>
                  <th scope="row">{GRAP_INFO[s].roman}{s === stage ? t.currentMark : ""}</th>
                  <td>{GRAP_INFO[s].band}</td>
                  <td>{cat(GRAP_INFO[s].category)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="veh-h">
          <h3 id="veh-h" className="label">{t.vehicleTitle}</h3>
          <label className="mt-2 block text-sm font-semibold">
            {t.yourVehicle}
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value as VehicleClass)}
              className="field">
              {Object.keys(VEHICLE_LABELS).map((k) => <option key={k} value={k}>{t.vehicleLabel[k] ?? VEHICLE_LABELS[k as VehicleClass]}</option>)}
            </select>
          </label>
          <p role="status" className="mt-3 font-bold">{restricted ? t.vehicleRestricted : t.vehicleFree}</p>
        </section>
      </div>

      <div className="space-y-6">
        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="rwa-h">
          <h3 id="rwa-h" className="label">{t.heaterTitle}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              {t.flats}
              <input type="number" min={1} max={500} value={flats}
                onChange={(e) => setFlats(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
                className="field" />
            </label>
            <label className="block text-sm font-semibold">
              {t.guards}
              <input type="number" min={0} max={50} value={guards}
                onChange={(e) => setGuards(Math.min(50, Math.max(0, Number(e.target.value) || 0)))}
                className="field" />
            </label>
          </div>
          <p className="mt-3" aria-live="polite">
            {t.heaterSum(guards, HEATER_UNIT_COST_INR.toLocaleString("en-IN"))}<strong>₹{plan.totalCostInr.toLocaleString("en-IN")}</strong>, {t.heaterAbout}{" "}
            <strong>{t.heaterPerFlat(plan.perFlatInr)}</strong> {t.heaterTail}
          </p>
        </section>

        <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="adv-h">
          <h3 id="adv-h" className="label">{t.advisoryTitle}</h3>
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
              <span key={String(copied)} className={copied ? "pop" : ""}>{copied ? t.copied : t.copyAdvisory}</span>
            </button>
            <a
              onClick={() => track({ event: "impact_receipt_shared", props: { share_type: "rwa_whatsapp" } })}
              href={`https://wa.me/?text=${encodeURIComponent(advisory.combined)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pill no-underline"
            >
              {t.shareWhatsApp}
            </a>
          </div>
          <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold">{toast}</p>
        </section>
      </div>
    </div>
  );
}
