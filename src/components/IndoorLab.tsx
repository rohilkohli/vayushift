"use client";
import { useMemo, useRef, useState } from "react";
import { meanBetween } from "@/lib/airQuality";
import { EPDM_COST_INR, FILTERS } from "@/lib/constants";
import { compareFilters, fieldCadrM3h } from "@/lib/impactEngine";
import { apiErrorMessage, track } from "@/lib/clientApi";
import { downscaleToJpegBase64 } from "@/lib/imageResize";
import { SAMPLE_ROOMS, type RoomScan } from "@/lib/roomScan";
import type { ActiveInterventions, AirScenario, DirectImpactReceipt, FiltrationMode, HouseholdProfile, WindowType } from "@/lib/types";
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

const WINDOW_LABELS: Record<WindowType, string> = {
  sliding_aluminum_unsealed: "Aluminium sliding, unsealed",
  casement_wood_unsealed: "Wooden casement, unsealed",
  upvc_sealed: "uPVC, sealed",
};

export function IndoorLab({ scenario, profile, interventions, receipt, onProfile, onInterventions }: Props) {
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
      setMessage("Please choose a JPEG, PNG or WebP photo.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("That photo is too large. Try a smaller one.");
      return;
    }
    setBusy(true);
    setMessage("Inspecting window seals, stove type and room size…");
    try {
      const data = await downscaleToJpegBase64(file);
      const res = await fetch("/api/analyze-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mimeType: "image/jpeg", data }),
      });
      if (!res.ok) {
        setMessage(await apiErrorMessage(res, "Something went wrong. Use the manual sliders instead."));
        return;
      }
      const body = (await res.json()) as { scan?: RoomScan; fallback?: boolean; reason?: string };
      if (body.scan) applyScan(body.scan, "Room analysed. You can fine-tune the values below.", "upload");
      else if (body.reason === "not_a_room")
        setMessage("We couldn't detect an indoor room, so the manual sliders are in use. Pick a sample room or adjust the values.");
      else if (body.reason === "budget_exhausted")
        setMessage("Photo analysis has reached today's limit. Use a sample room or the manual sliders.");
      else setMessage("Photo analysis is unavailable right now. Use a sample room or the manual sliders.");
    } catch {
      setMessage("Could not read that photo. Use a sample room or the manual sliders.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const noiseTip =
    profile.sleepNoiseSensitivity === "high"
      ? "You are a light sleeper: run a DIY box on high from 18:00 to 22:00, then switch it off at bedtime, or choose the HEPA unit."
      : profile.sleepNoiseSensitivity === "medium"
        ? "Run DIY boxes on high in the evening and on low overnight."
        : "DIY boxes can run on a low setting overnight.";

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
            <p className="label scrim inline-block rounded-full px-4 py-1.5">Indoor purity dynamics · Room sanctuary</p>
            <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">
              Sculpting an island of pure alpine breath indoors.
            </h2>
          </div>

          <div className="glass relative mx-auto flex aspect-square w-full max-w-[400px] flex-col items-center justify-center rounded-full p-10 text-center" role="group" aria-label="Clean air delivery dial">
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
              {active ? "Active sanctuary" : "No filter selected"}
            </p>
            <p className="serif relative m-0 mt-3 text-7xl leading-none" aria-live="polite">
              <AnimatedNumber value={active ? fieldCadr : receipt.requiredCadrM3h} />
              <span className="ink-soft ml-1 text-2xl">m³/h</span>
            </p>
            <p className="label relative m-0 mt-2">{active ? "Clean air delivery (CADR)" : "Target CADR for 5 ACH"}</p>
            <p className="chip relative m-0 mt-4 rounded-full px-4 py-1.5 text-xs font-semibold">
              PM2.5 {receipt.baselineIndoorPm25} → {receipt.managedIndoorPm25} µg/m³
              {receipt.indoorReductionPct > 0 && <span className="accent ml-2 font-bold">−{Math.round(receipt.indoorReductionPct)}%</span>}
            </p>
            <p className="ink-soft relative m-0 mt-3 flex items-center gap-1 text-xs font-medium">
              <Icon name="autorenew" />
              {active && ach > 0 ? `Air turnover: ${Math.round(60 / ach)} min · ${ach.toFixed(1)} ACH` : `Room volume ${receipt.roomVolumeM3} m³`}
            </p>
          </div>

          <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="env-h">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="env-h" className="serif m-0 flex items-center gap-2 text-xl font-medium"><Icon name="crop_square" /> Room envelope</h3>
              <p className="chip m-0 rounded-full px-3 py-1 text-xs font-bold">{profile.roomAreaSqFt} sq ft · {profile.ceilingHeightFt} ft ceiling</p>
            </div>
            <label className="mt-4 block text-sm font-semibold">
              Floor area: {profile.roomAreaSqFt} sq ft
              <input type="range" min={60} max={500} step={10} value={profile.roomAreaSqFt}
                style={{ "--p": `${((profile.roomAreaSqFt - 60) / (500 - 60)) * 100}%` } as React.CSSProperties}
                onChange={(e) => onProfile({ roomAreaSqFt: Number(e.target.value) })} className="mt-1 block h-11 w-full" />
            </label>
            <label className="block text-sm font-semibold">
              Ceiling height: {profile.ceilingHeightFt} ft
              <input type="range" min={8} max={12} step={0.5} value={profile.ceilingHeightFt}
                style={{ "--p": `${((profile.ceilingHeightFt - 8) / (12 - 8)) * 100}%` } as React.CSSProperties}
                onChange={(e) => onProfile({ ceilingHeightFt: Number(e.target.value) })} className="block h-11 w-full" />
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SAMPLE_ROOMS.map((r) => (
                <button key={r.id} type="button" className="pill" aria-pressed={scan === r.scan} onClick={() => applyScan(r.scan, `Loaded sample: ${r.label}.`, "preset")}>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Windows
                <select value={profile.windowType} onChange={(e) => onProfile({ windowType: e.target.value as WindowType })} className="field">
                  {Object.entries(WINDOW_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold">
                Night-time noise sensitivity
                <select value={profile.sleepNoiseSensitivity}
                  onChange={(e) => onProfile({ sleepNoiseSensitivity: e.target.value as HouseholdProfile["sleepNoiseSensitivity"] })} className="field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (light sleeper)</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <label htmlFor="room-photo" className="block text-sm font-semibold">Or scan your own room (JPEG, PNG or WebP)</label>
              <input id="room-photo" ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy}
                onChange={(e) => onFile(e.target.files?.[0])} className="mt-1 block min-h-11 w-full text-sm" />
              <p className="ink-soft m-0 text-xs">Resized on your device, stripped of location data, analysed once, never stored.</p>
            </div>
            <p role="status" aria-live="polite" className="m-0 mt-2 min-h-6 text-sm font-semibold">{message}</p>
            {scan && (
              <ul className="ink-soft m-0 list-disc pl-5 text-sm">
                {scan.infiltrationRiskNotes.map((n) => <li key={n}>{n}</li>)}
                {scan.recommendedPlacementSpot && <li>Placement: {scan.recommendedPlacementSpot}</li>}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <p className="label scrim inline-flex items-center gap-2 rounded-full px-4 py-1.5"><span className="h-2 w-2 rounded-full bg-[#ffad8f]" aria-hidden="true" /> Deployable filter arrays · Needs {receipt.requiredCadrM3h} m³/h for your room</p>
          <ul className="stagger m-0 list-none space-y-4 p-0">
            {options.map((o, idx) => {
              const f = FILTERS[o.id];
              const selected = interventions.filtrationMode === o.id;
              return (
                <li key={o.id} className={`glass liquid lift rounded-[2.2rem] p-6 ${selected ? "ring-2 ring-[#c25a32]" : ""}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 flex flex-wrap items-center gap-2">
                        {idx === 0 && <span className="rounded-full bg-[#ffdbce] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#6f3720]">Best value</span>}
                        <span className="label">{o.meetsTargetAch ? "Meets 5-ACH target" : "Below 5-ACH target alone"}</span>
                      </p>
                      <h4 className="serif m-0 mt-1 text-2xl font-medium">{f.name}</h4>
                    </div>
                    <p className="serif m-0 text-2xl">₹{f.costInr.toLocaleString("en-IN")}</p>
                  </div>
                  <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-xs font-semibold">
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="blur_on" /> Modelled: {o.modelledReductionPct}% lower PM2.5</li>
                    <li className="chip rounded-full px-3 py-1">Published: ~{f.literatureReductionPct}%</li>
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="air" /> CADR ≈ {o.cadrFieldM3h} m³/h</li>
                    <li className="chip flex items-center gap-1.5 rounded-full px-3 py-1"><Icon name="volume_up" /> {f.noiseDeltaDbDay ? `+${f.noiseDeltaDbDay} dB day, +${f.noiseDeltaDbNight} dB night` : "Quiet"}</li>
                  </ul>
                  <p className="ink-soft m-0 mt-3 text-sm">{f.note}</p>
                  <div className="mt-4 flex justify-end">
                    <button type="button" aria-pressed={selected} onClick={() => onInterventions({ filtrationMode: (selected ? "none" : o.id) as FiltrationMode })} className="pill">
                      {selected ? "✓ Configured & active" : "Select configuration"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <RoutineToggle
            icon="door_front"
            title={`+ ₹${EPDM_COST_INR} EPDM window track seal`}
            subtitle="Blocks about 30% of exterior seepage"
            checked={interventions.sealWindowsWithEpdm}
            onChange={(v) => onInterventions({ sealWindowsWithEpdm: v })}
            describedBy="t-epdm"
          />

          <aside className="glass liquid rounded-[2rem] p-5 text-sm" aria-labelledby="tips-h">
            <h4 id="tips-h" className="label m-0">Sleep and safety</h4>
            <p className="mt-2">{noiseTip}</p>
            <ul className="m-0 list-disc pl-5">
              <li>Use only a certified box fan with thermal protection. Never leave a damaged fan running.</li>
              <li>Use pleated filters rated MERV-13 or better; swap them when visibly dirty.</li>
              <li>Avoid purifiers that make ozone.</li>
            </ul>
          </aside>
        </div>
      </div>

      <dl className="stagger m-0 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Exterior PM2.5, 24 h avg", `${outdoorAvg}`, "µg/m³", "Outdoor average for this scenario"],
          ["Modelled sanctuary PM2.5", `${receipt.managedIndoorPm25}`, "µg/m³", "A model, not a sensor reading"],
          ["Filter air changes", ach.toFixed(1), "per hour", active ? "From the selected option" : "Select an option above"],
          ["Target CADR", `${receipt.requiredCadrM3h}`, "m³/h", "5 air changes per hour"],
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
