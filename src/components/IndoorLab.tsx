"use client";
import { useMemo, useRef, useState } from "react";
import { meanBetween } from "@/lib/airQuality";
import { EPDM_COST_INR, FILTERS } from "@/lib/constants";
import { compareFilters, fieldCadrM3h } from "@/lib/impactEngine";
import { apiErrorMessage, track } from "@/lib/clientApi";
import { downscaleToJpegBase64 } from "@/lib/imageResize";
import { SAMPLE_ROOMS, type RoomScan } from "@/lib/roomScan";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, FiltrationMode, HouseholdProfile, WindowType } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { AnimatedNumber } from "./AnimatedNumber";
import { Icon } from "./Icon";
import { RoutineToggle } from "./RoutineToggle";

interface Props {
  scenario: AirScenario;
  profile: HouseholdProfile;
  interventions: ActiveInterventions;
  receipt: DirectImpactReceipt;
  onProfile: (p: Partial<HouseholdProfile>) => void;
  onInterventions: (p: Partial<ActiveInterventions>) => void;
}

const WINDOW_TYPES: WindowType[] = ["sliding_aluminum_unsealed", "casement_wood_unsealed", "upvc_sealed"];

export function IndoorLab({ scenario, profile, interventions, receipt, onProfile, onInterventions }: Props) {
  const { t, englishAttrs } = useLang();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scan, setScan] = useState<RoomScan | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const options = useMemo(
    () => compareFilters(scenario.hourly, profile, interventions.sealWindowsWithEpdm),
    [scenario, profile, interventions.sealWindowsWithEpdm],
  );

  function applyScan(s: RoomScan, note: string, source: "upload" | "preset") {
    track({ event: "room_scan_completed", props: { source } });
    setScan(s);
    onProfile({
      roomAreaSqFt: s.estimatedAreaSqFt,
      ceilingHeightFt: s.estimatedCeilingHeightFt,
      ...(s.windowType !== "none_visible" ? { windowType: s.windowType } : {}),
      ...(s.cookingApplianceDetected === "lpg_unvented" || s.cookingApplianceDetected === "both"
        ? { baselineCookingFuel: s.exhaustTypeDetected === "ducted_chimney" ? ("lpg_chimney" as const) : ("lpg_unvented" as const) }
        : {}),
    });
    setMessage(note);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage(t.msgBadType);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage(t.msgTooLarge);
      return;
    }
    setBusy(true);
    setMessage(t.msgInspecting);
    try {
      const data = await downscaleToJpegBase64(file);
      const res = await fetch("/api/analyze-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: "image/jpeg", data }),
      });
      if (!res.ok) {
        setMessage(await apiErrorMessage(res, t.msgGeneric));
        return;
      }
      const body = (await res.json()) as { scan?: RoomScan; fallback?: boolean; reason?: string };
      if (body.scan) applyScan(body.scan, t.msgAnalysed, "upload");
      else if (body.reason === "not_a_room") setMessage(t.msgNotRoom);
      else if (body.reason === "budget_exhausted") setMessage(t.msgBudget);
      else setMessage(t.msgUnavailable);
    } catch {
      setMessage(t.msgUnreadable);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const noiseTip =
    profile.sleepNoiseSensitivity === "high" ? t.tipHigh : profile.sleepNoiseSensitivity === "medium" ? t.tipMedium : t.tipLow;

  const outdoorAvg = Math.round(meanBetween(scenario.hourly, 0, 23));
  const fieldCadr = Math.round(fieldCadrM3h(interventions.filtrationMode));
  const ach = receipt.roomVolumeM3 > 0 ? fieldCadr / receipt.roomVolumeM3 : 0;
  const progress = Math.min(1, fieldCadr / Math.max(1, receipt.requiredCadrM3h));
  const R = 118;
  const C = 2 * Math.PI * R;
  const active = interventions.filtrationMode !== "none";

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.25fr]">
        <div className="space-y-6">
          <div>
            <p className="label scrim inline-block rounded-full px-4 py-1.5">{t.labBadge}</p>
            <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">
              {t.labHeadline}
            </h2>
          </div>

          <div className="glass relative mx-auto flex aspect-square w-full max-w-[400px] flex-col items-center justify-center rounded-full p-10 text-center" role="group" aria-label={t.dialAria}>
            <svg viewBox="0 0 260 260" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e9a23b" />
                  <stop offset="100%" stopColor="#c25a32" />
                </linearGradient>
              </defs>
              <circle cx="130" cy="130" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="6" />
              <circle cx="130" cy="130" r={R} fill="none" className="ring-progress" strokeOpacity={progress > 0 ? 1 : 0} stroke="url(#ringGrad)" style={{ filter: "drop-shadow(0 0 6px rgba(226, 120, 80, 0.55))" }} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${C * progress} ${C}`} />
              <circle cx="130" cy="130" r={R - 14} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 6" />
            </svg>
            <p className="chip relative m-0 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              <span className="h-2 w-2 rounded-full bg-[#c25a32]" aria-hidden="true" />
              {active ? t.dialActive : t.dialNone}
            </p>
            <p className="serif relative m-0 mt-3 text-7xl leading-none" aria-live="polite">
              <AnimatedNumber value={active ? fieldCadr : receipt.requiredCadrM3h} />
              <span className="ink-soft ml-1 text-2xl">m³/h</span>
            </p>
            <p className="label relative m-0 mt-2">{active ? t.dialCadr : t.dialTarget}</p>
            <p className="chip relative m-0 mt-4 rounded-full px-4 py-1.5 text-xs font-semibold">
              PM2.5 {receipt.baselineIndoorPm25} → {receipt.managedIndoorPm25} µg/m³
              {receipt.indoorReductionPct > 0 && <span className="accent ml-2 font-bold">−{Math.round(receipt.indoorReductionPct)}%</span>}
            </p>
            <p className="ink-soft relative m-0 mt-3 flex items-center gap-1 text-xs font-medium">
              <Icon name="autorenew" />
              {active && ach > 0 ? t.turnover(Math.round(60 / ach), ach.toFixed(1)) : t.roomVolume(receipt.roomVolumeM3)}
            </p>
          </div>

          <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="env-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="env-h" className="serif m-0 flex items-center gap-2 text-xl font-medium"><Icon name="crop_square" /> {t.envelope}</h3>
              <p className="chip m-0 rounded-full px-3 py-1 text-xs font-bold">{t.envelopeChip(profile.roomAreaSqFt, profile.ceilingHeightFt)}</p>
            </div>
            <label className="mt-4 block text-sm font-semibold">
              {t.floorArea(profile.roomAreaSqFt)}
              <input type="range" min={60} max={500} step={10} value={profile.roomAreaSqFt}
                style={{ "--p": `${((profile.roomAreaSqFt - 60) / (500 - 60)) * 100}%` } as React.CSSProperties}
                onChange={(e) => onProfile({ roomAreaSqFt: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              {t.ceilingHeight(profile.ceilingHeightFt)}
              <input type="range" min={8} max={12} step={0.5} value={profile.ceilingHeightFt}
                style={{ "--p": `${((profile.ceilingHeightFt - 8) / (12 - 8)) * 100}%` } as React.CSSProperties}
                onChange={(e) => onProfile({ ceilingHeightFt: Number(e.target.value) })} className="block h-11 w-full" />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_ROOMS.map((r) => (
                <button key={r.id} type="button" className="pill" aria-pressed={scan === r.scan} onClick={() => applyScan(r.scan, t.sampleLoaded(r.label), "preset")}>
                  <span {...englishAttrs}>{r.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                {t.windows}
                <select value={profile.windowType} onChange={(e) => onProfile({ windowType: e.target.value as WindowType })} className="field">
                  {WINDOW_TYPES.map((k) => <option key={k} value={k}>{t.windowType[k]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                {t.noiseLabel}
                <select value={profile.sleepNoiseSensitivity}
                  onChange={(e) => onProfile({ sleepNoiseSensitivity: e.target.value as HouseholdProfile["sleepNoiseSensitivity"] })} className="field">
                  <option value="low">{t.noiseLow}</option>
                  <option value="medium">{t.noiseMedium}</option>
                  <option value="high">{t.noiseHigh}</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <label htmlFor="room-photo" className="block text-sm font-semibold">{t.scanLabel}</label>
              <input id="room-photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
                onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block min-h-11 w-full text-sm" />
              <p className="ink-soft m-0 text-xs">{t.scanPrivacy}</p>
            </div>
            <p role="status" aria-live="polite" className="m-0 mt-2 min-h-6 text-sm font-semibold">{message}</p>
            {scan && (
              <ul className="ink-soft m-0 list-disc pl-5 text-sm">
                {scan.infiltrationRiskNotes.map((n) => <li key={n} {...englishAttrs}>{n}</li>)}
                {scan.recommendedPlacementSpot && <li {...englishAttrs}>{t.placement(scan.recommendedPlacementSpot)}</li>}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <p className="label scrim inline-flex items-center gap-2 rounded-full px-4 py-1.5"><span className="h-2 w-2 rounded-full bg-[#ffad8f]" aria-hidden="true" /> {t.filtersBadge(receipt.requiredCadrM3h)}</p>
          <ul className="stagger m-0 list-none space-y-4 p-0">
            {options.map((o, idx) => {
              const f = FILTERS[o.id];
              const selected = interventions.filtrationMode === o.id;
              return (
                <li key={o.id} className={`glass liquid lift rounded-[2.2rem] p-6 ${selected ? "ring-2 ring-[#c25a32]" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 flex flex-wrap items-center gap-2">
                        {idx === 0 && <span className="rounded-full bg-[#ffdbce] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6f3720]">{t.bestValue}</span>}
                        <span className="label">{o.meetsTargetAch ? t.meetsTarget : t.belowTarget}</span>
                      </p>
                      <h4 className="serif m-0 mt-1 text-2xl font-medium" {...englishAttrs}>{f.name}</h4>
                    </div>
                    <p className="serif m-0 text-2xl">₹{f.costInr.toLocaleString("en-IN")}</p>
                  </div>
                  <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-xs font-semibold">
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="blur_on" /> {t.modelled(o.modelledReductionPct)}</li>
                    <li className="chip rounded-full px-3 py-1">{t.published(f.literatureReductionPct)}</li>
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="air" /> {t.cadrApprox(o.cadrFieldM3h)}</li>
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="volume_up" /> {f.noiseDeltaDbDay ? t.noiseDb(f.noiseDeltaDbDay, f.noiseDeltaDbNight) : t.quiet}</li>
                  </ul>
                  <p className="ink-soft m-0 mt-3 text-sm" {...englishAttrs}>{f.note}</p>
                  <div className="mt-4 flex justify-end">
                    <button type="button" aria-pressed={selected} onClick={() => onInterventions({ filtrationMode: (selected ? "none" : o.id) as FiltrationMode })} className="pill">
                      {selected ? t.configured : t.selectConfig}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <RoutineToggle
            icon="door_front"
            title={t.epdmTitle(EPDM_COST_INR)}
            subtitle={t.epdmSub}
            checked={interventions.sealWindowsWithEpdm}
            onChange={(v) => onInterventions({ sealWindowsWithEpdm: v })}
            describedBy="t-epdm"
          />

          <aside className="glass liquid rounded-[2rem] p-5 text-sm" aria-labelledby="tips-h">
            <h4 id="tips-h" className="label m-0">{t.tipsTitle}</h4>
            <p className="mt-2">{noiseTip}</p>
            <ul className="m-0 list-disc pl-5">
              <li>{t.safety1}</li>
              <li>{t.safety2}</li>
              <li>{t.safety3}</li>
            </ul>
          </aside>
        </div>
      </div>

      <dl className="stagger m-0 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          [t.statOutdoor, `${outdoorAvg}`, "µg/m³", t.statOutdoorNote],
          [t.statIndoor, `${receipt.managedIndoorPm25}`, "µg/m³", t.statIndoorNote],
          [t.statAch, ach.toFixed(1), t.statAchUnit, active ? t.statAchOn : t.statAchOff],
          [t.statTarget, `${receipt.requiredCadrM3h}`, "m³/h", t.statTargetNote],
        ].map(([k, v, u, n]) => (
          <div key={k} className="glass liquid lift rounded-[2rem] p-5">
            <dt className="label">{k}</dt>
            <dd className="m-0 mt-2">
              <span className="serif num text-4xl">{v}</span> <span className="ink-soft text-xs">{u}</span>
              <span className="ink-soft mt-1 block text-xs font-medium">{n}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
