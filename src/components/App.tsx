"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findVentilationWindow, pm25ToAqi } from "@/lib/airQuality";
import { DEFAULT_SCENARIO, PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { grapStageFromAqi } from "@/lib/grapRules";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import type { AirScenario } from "@/lib/types";
import { useHousehold } from "@/hooks/useHousehold";
import { Choreographer } from "./Choreographer";
import { CommunityPlaybook } from "./CommunityPlaybook";
import { Header } from "./Header";
import { ImpactBar } from "./ImpactBar";
import { IndoorLab } from "./IndoorLab";
import { ReceiptDialog } from "./ReceiptDialog";

type Tab = "choreographer" | "lab" | "community";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "choreographer", label: "Living Sky" },
  { id: "lab", label: "Indoor Air Lab" },
  { id: "community", label: "Community" },
];

const istHour = () =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));

export function App() {
  const { profile, interventions, patchProfile, patchInterventions } = useHousehold();
  const [scenario, setScenario] = useState<AirScenario>(DEFAULT_SCENARIO);
  const [tab, setTab] = useState<Tab>("choreographer");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [hour, setHour] = useState(8);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => setHour(istHour()), []);

  const window = useMemo(() => findVentilationWindow(scenario.hourly), [scenario]);
  const receipt = useMemo(
    () => calculateHouseholdImpact(scenario.hourly, profile, interventions, window),
    [scenario, profile, interventions, window],
  );
  const currentPm = scenario.hourly[hour].pm25;
  const currentAqi = pm25ToAqi(currentPm);
  const peakAqi = pm25ToAqi(Math.max(...scenario.hourly.map((h) => h.pm25)));
  const stage = grapStageFromAqi(currentAqi);

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("Location is not available in this browser. Showing demo data.");
      return;
    }
    setLoadingLive(true);
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const q = new URLSearchParams({ lat: String(pos.coords.latitude), lng: String(pos.coords.longitude) });
          const res = await fetch(`/api/air-quality?${q}`);
          if (!res.ok) throw new Error("bad response");
          const data = (await res.json()) as { scenario: AirScenario; mode: "live" | "demo" };
          setScenario(data.scenario);
          setStatus(
            data.mode === "live"
              ? "Showing the live forecast for your location."
              : "Live data is unavailable, so a demo smog pattern is shown for your location.",
          );
        } catch {
          setStatus("Could not load air data. Showing the previous scenario.");
        } finally {
          setLoadingLive(false);
        }
      },
      () => {
        setLoadingLive(false);
        setStatus("Location permission was denied. Pick a preset instead.");
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  }, []);

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (i + dir + TABS.length) % TABS.length;
    setTab(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header
        scenario={scenario}
        presets={PRESET_SCENARIOS}
        onSelect={(s) => {
          setScenario(s);
          setStatus(`Loaded ${s.name} scenario.`);
        }}
        onLocate={useMyLocation}
        loadingLive={loadingLive}
        aqi={currentAqi}
        pm25={currentPm}
        stage={stage}
      />
      <p role="status" aria-live="polite" className="mx-auto max-w-6xl px-5 text-sm font-semibold empty:hidden">{status}</p>

      <div className="sticky top-0 z-20 mx-auto max-w-6xl px-5 pt-3">
        <ImpactBar receipt={receipt} onOpen={() => setReceiptOpen(true)} />
      </div>

      <main id="main" className="mx-auto max-w-6xl px-5 pb-28 pt-6">
        <div role="tablist" aria-label="Sections" className="glass mb-6 inline-flex max-w-full overflow-x-auto rounded-full p-1">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              onClick={() => setTab(t.id)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`min-h-11 whitespace-nowrap rounded-full px-5 text-sm font-bold ${
                tab === t.id ? "bg-[#0f2a44] text-white" : "text-[#0f2a44]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <section id="panel-choreographer" role="tabpanel" aria-labelledby="tab-choreographer" hidden={tab !== "choreographer"}>
          <Choreographer
            scenario={scenario}
            window={window}
            profile={profile}
            interventions={interventions}
            receipt={receipt}
            onProfile={patchProfile}
            onInterventions={patchInterventions}
          />
        </section>
        <section id="panel-lab" role="tabpanel" aria-labelledby="tab-lab" hidden={tab !== "lab"}>
          <IndoorLab
            scenario={scenario}
            profile={profile}
            interventions={interventions}
            receipt={receipt}
            onProfile={patchProfile}
            onInterventions={patchInterventions}
          />
        </section>
        <section id="panel-community" role="tabpanel" aria-labelledby="tab-community" hidden={tab !== "community"}>
          <CommunityPlaybook scenario={scenario} aqi={currentAqi} peakAqi={peakAqi} stage={stage} />
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-5 pb-10 text-sm text-[#3b4f66]">
        <p>
          VayuShift gives general guidance, not medical advice. Indoor figures are modelled estimates, not sensor readings.
          Demo scenarios are illustrative, not recorded station data.
        </p>
      </footer>

      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={receipt}
        scenario={scenario}
        profile={profile}
        interventions={interventions}
      />
    </>
  );
}
