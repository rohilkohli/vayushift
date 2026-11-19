"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findVentilationWindow, pm25ToAqi } from "@/lib/airQuality";
import { DEFAULT_SCENARIO, PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { GRAP_INFO, grapStageFromAqi } from "@/lib/grapRules";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import type { AirScenario } from "@/lib/types";
import { useHousehold } from "@/hooks/useHousehold";
import { Choreographer } from "./Choreographer";
import { CommunityPlaybook } from "./CommunityPlaybook";
import { Header } from "./Header";
import { ImpactBar } from "./ImpactBar";
import { IndoorLab } from "./IndoorLab";
import { ReceiptDialog } from "./ReceiptDialog";
import { LiquidFilter } from "./LiquidFilter";
import { WindLayer } from "./WindLayer";
import { useLiquidGlass } from "@/hooks/useLiquidGlass";

type Tab = "choreographer" | "lab" | "community";
const TABS: Array<{ id: Tab; label: string; short: string; icon: string }> = [
  { id: "choreographer", label: "Living Sky", short: "Sky", icon: "cloud" },
  { id: "lab", label: "Room Sanctuary", short: "Sanctuary", icon: "meeting_room" },
  { id: "community", label: "Community", short: "Community", icon: "groups" },
];

const istHour = () =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(new Date()));

export function App() {
  useLiquidGlass();
  const { profile, interventions, patchProfile, patchInterventions } = useHousehold();
  const [scenario, setScenario] = useState<AirScenario>(DEFAULT_SCENARIO);
  const [tab, setTab] = useState<Tab>("choreographer");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [hour, setHour] = useState(8);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [night, setNight] = useState(false);

  useEffect(() => {
    const h = istHour();
    setHour(h);
    const forced = new URLSearchParams(globalThis.location.search).get("sky");
    setNight(forced ? forced === "night" : h >= 19 || h < 6);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.sky = night ? "night" : "day";
  }, [night]);

  // Tabs are deep-linkable (#lab, #community) and work with the browser Back button.
  useEffect(() => {
    const fromHash = () => {
      const id = globalThis.location.hash.slice(1);
      setTab(TABS.some((t) => t.id === id) ? (id as Tab) : "choreographer");
    };
    fromHash();
    globalThis.addEventListener("popstate", fromHash);
    return () => globalThis.removeEventListener("popstate", fromHash);
  }, []);

  const selectTab = useCallback((id: Tab) => {
    setTab(id);
    if (globalThis.location.hash.slice(1) !== id) {
      globalThis.history.pushState(null, "", `#${id}`);
    }
  }, []);

  const ventWindow = useMemo(() => findVentilationWindow(scenario.hourly), [scenario]);
  const receipt = useMemo(
    () => calculateHouseholdImpact(scenario.hourly, profile, interventions, ventWindow),
    [scenario, profile, interventions, ventWindow],
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

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <LiquidFilter />
      <div className="sky" aria-hidden="true">
        <div className="sun-orb" />
        <div className="dust" />
        <WindLayer />
      </div>

      <Header
        scenario={scenario}
        presets={PRESET_SCENARIOS}
        onSelect={(s) => {
          setScenario(s);
          setStatus(`Loaded ${s.name} scenario.`);
        }}
        onLocate={useMyLocation}
        loadingLive={loadingLive}
        tabs={TABS}
        tab={tab}
        onTab={(id) => selectTab(id as Tab)}
        tabRefs={tabRefs}
      />

      <main id="main" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-32 pt-32 lg:px-8 lg:pb-16 lg:pt-28">
        <div role="region" aria-label="Air quality status" tabIndex={0} className="no-scrollbar fade-x -mx-5 mb-6 flex items-center gap-2 overflow-x-auto px-5 pb-1 text-xs font-bold lg:mx-0 lg:flex-wrap lg:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap">
          {loadingLive ? (
            <span className="glass rounded-full px-4 py-2" aria-busy="true">
              <span className="skeleton inline-block w-40 align-middle" aria-hidden="true" />
              <span className="sr-only">Loading air quality for your location</span>
            </span>
          ) : (
            <span className="glass rounded-full px-4 py-2">Now · AQI {currentAqi} · PM2.5 {currentPm} µg/m³</span>
          )}
          <span className="glass rounded-full px-4 py-2">
            {stage === "NONE" ? "GRAP: not active" : `GRAP Stage ${GRAP_INFO[stage].roman} · ${GRAP_INFO[stage].category}`}
          </span>
          <span className="glass rounded-full px-4 py-2">{scenario.source === "live" ? "Live forecast" : "Demo telemetry"}</span>
          <p role="status" aria-live="polite" className="glass m-0 rounded-full px-4 py-2 empty:hidden">{status}</p>
        </div>

        {tab !== "choreographer" && (
          <div className="mb-6">
            <ImpactBar receipt={receipt} onOpen={() => setReceiptOpen(true)} />
          </div>
        )}

        <section id="panel-choreographer" role="tabpanel" aria-labelledby="tab-choreographer" hidden={tab !== "choreographer"}>
          <Choreographer
            scenario={scenario}
            window={ventWindow}
            hour={hour}
            profile={profile}
            interventions={interventions}
            receipt={receipt}
            onProfile={patchProfile}
            onInterventions={patchInterventions}
            onOpenReceipt={() => setReceiptOpen(true)}
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

      <footer className="relative z-10 mx-auto max-w-[1440px] px-5 pb-28 lg:px-8 lg:pb-8">
        <p className="glass m-0 max-w-3xl rounded-[2rem] px-5 py-3 text-xs">
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
