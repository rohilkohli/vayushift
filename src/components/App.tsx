"use client";
import { useMemo, useRef, useState } from "react";
import { PRESET_SCENARIOS } from "@/lib/airQualityPresets";
import { useContrast } from "@/hooks/useContrast";
import { useForecast } from "@/hooks/useForecast";
import { useForecastAnalysis } from "@/hooks/useForecastAnalysis";
import { useHousehold } from "@/hooks/useHousehold";
import { LangProvider, useLang } from "@/hooks/useLang";
import { useLiquidGlass } from "@/hooks/useLiquidGlass";
import { useSkyClock } from "@/hooks/useSkyClock";
import { useTabs } from "@/hooks/useTabs";
import { Header, type TabDef } from "./Header";
import { MainArea } from "./MainArea";
import { Backdrop, DisclaimerFooter } from "./PageChrome";
import { ReceiptDialog } from "./ReceiptDialog";

/** The whole interface, with the language (English or Hindi) available to every component. */
export function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}

/** The three tabs, labelled in the current language. */
function useTabDefs(): TabDef[] {
  const { t } = useLang();
  return useMemo(
    () => [
      { id: "choreographer", label: t.tabSky, short: t.tabSkyShort, icon: "cloud" },
      { id: "lab", label: t.tabLab, short: t.tabLabShort, icon: "meeting_room" },
      { id: "community", label: t.tabCommunity, short: t.tabCommunityShort, icon: "groups" },
    ],
    [t],
  );
}

function AppInner() {
  useLiquidGlass();
  const contrast = useContrast();
  const forecast = useForecast();
  const sky = useSkyClock();
  const household = useHousehold();
  const { tab, selectTab } = useTabs();
  const tabs = useTabDefs();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const { scenario } = forecast;
  const analysis = useForecastAnalysis(scenario, household.profile, household.interventions, sky.realHour);
  const openReceipt = () => setReceiptOpen(true);

  return (
    <>
      <Backdrop />
      <Header
        scenario={scenario}
        presets={PRESET_SCENARIOS}
        onSelect={forecast.selectPreset}
        onLocate={forecast.locate}
        cityId={forecast.cityId}
        onCity={forecast.pickCity}
        loadingLive={forecast.loading}
        tabs={tabs}
        tab={tab}
        onTab={selectTab}
        tabRefs={tabRefs}
        highContrast={contrast.high}
        onToggleContrast={contrast.toggle}
      />
      <MainArea tab={tab} forecast={forecast} analysis={analysis} sky={sky} household={household} onOpenReceipt={openReceipt} />
      <DisclaimerFooter />
      <ReceiptDialog
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        receipt={analysis.receipt}
        scenario={scenario}
        profile={household.profile}
        interventions={household.interventions}
      />
    </>
  );
}
