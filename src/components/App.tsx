"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { findVentilationWindow, pm25ToAqi } from "@/lib/airQuality";
import { DEFAULT_SCENARIO, PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { GRAP_INFO, grapStageFromAqi } from "@/lib/grapRules";
import { calculateHouseholdImpact } from "@/lib/impactEngine";
import { track } from "@/lib/clientApi";
import type { ActiveInterventions, AirScenario } from "@/lib/types";
import { useHousehold } from "@/hooks/useHousehold";
import { Choreographer } from "./Choreographer";
import { CommunityPlaybook } from "./CommunityPlaybook";
import { Header } from "./Header";
import { ImpactBar } from "./ImpactBar";
import { IndoorLab } from "./IndoorLab";
import { ReceiptDialog } from "./ReceiptDialog";
import { LiquidFilter } from "./LiquidFilter";
import { SkyScene } from "./SkyScene";
import { WindLayer } from "./WindLayer";
import { useLiquidGlass } from "@/hooks/useLiquidGlass";
import { useLivingSky } from "@/hooks/useLivingSky";

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

  /** Applies a change and records it (anonymously, and only if the visitor has not opted out). */
  const changeInterventions = useCallback(
    (p: Partial<ActiveInterventions>) => {
      patchInterventions(p);
      for (const [key, value] of Object.entries(p)) {
        if (typeof value === "boolean") track({ event: "routine_shift_toggled", props: { intervention_key: key, enabled: value } });
        else if (key === "filtrationMode" && value !== "none") track({ event: "filtration_option_selected", props: { option_id: String(value) } });
      }
    },
    [patchInterventions],
  );
  const [scenario, setScenario] = useState<AirScenario>(DEFAULT_SCENARIO);
  const [tab, setTab] = useState<Tab>("choreographer");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [loadingLive, setLoadingLive] = useState(false);
  const [hour, setHour] = useState(8); // the real hour in IST
  const [selHour, setSelHour] = useState<number | null>(null); // the hour on the scrubber
  const [playing, setPlaying] = useState(false);
  const [forcedTheme, setForcedTheme] = useState<"day" | "night" | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const h = istHour();
    setHour(h);
    const params = new URLSearchParams(globalThis.location.search);
    const forced = params.get("sky");
    setForcedTheme(forced === "night" || forced === "day" ? forced : null);
    const asked = Number(params.get("hour"));
    setSelHour(params.has("hour") && Number.isInteger(asked) && asked >= 0 && asked <= 23 ? asked : h);
  }, []);

  // The sky, sun or moon, wind speed and day/night theme all follow the scrubbed hour.
  useLivingSky(selHour, forcedTheme, playing);

  // "Play 24h sky": advance one hour every 650 ms and loop.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setSelHour((h) => ((h ?? 0) + 1) % 24), 650);
    return () => clearInterval(timer);
  }, [playing]);

  const scrubTo = useCallback((h: number) => {
    setPlaying(false);
    setSelHour(h);
  }, []);

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
          track({ event: "scenario_loaded", props: { preset_id: data.scenario.id } });
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
        <SkyScene />
        <div className="dust" />
        <WindLayer />
      </div>

      <Header
        scenario={scenario}
        presets={PRESET_SCENARIOS}
        onSelect={(s) => {
          setScenario(s);
          track({ event: "scenario_loaded", props: { preset_id: s.id } });
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
            hour={selHour ?? hour}
            playing={playing}
            onHour={scrubTo}
            onTogglePlay={() => setPlaying((p) => !p)}
            onJump={() => scrubTo(Math.round(ventWindow.startHour))}
            profile={profile}
            interventions={interventions}
            receipt={receipt}
            onProfile={patchProfile}
            onInterventions={changeInterventions}
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
            onInterventions={changeInterventions}
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
