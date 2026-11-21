"use client";
import type { useForecast } from "@/hooks/useForecast";
import type { useForecastAnalysis } from "@/hooks/useForecastAnalysis";
import type { useHousehold } from "@/hooks/useHousehold";
import type { useSkyClock } from "@/hooks/useSkyClock";
import type { Tab } from "@/hooks/useTabs";
import { ImpactBar } from "./ImpactBar";
import { StatusBar } from "./StatusBar";
import { TabPanels } from "./TabPanels";

interface Props {
  tab: Tab;
  forecast: ReturnType<typeof useForecast>;
  analysis: ReturnType<typeof useForecastAnalysis>;
  sky: ReturnType<typeof useSkyClock>;
  household: ReturnType<typeof useHousehold>;
  onOpenReceipt: () => void;
}

/** The page's main content: the status pills, the running impact (on the other tabs) and the three tab panels. */
export function MainArea({ tab, forecast, analysis, sky, household, onOpenReceipt }: Props) {
  const { scenario } = forecast;
  const { ventWindow, receipt, pm25, aqi, peakAqi, stage } = analysis;
  return (
    <main id="main" className="relative z-10 mx-auto max-w-[1440px] px-5 pb-32 pt-32 lg:px-8 lg:pb-16 lg:pt-28">
      <StatusBar scenario={scenario} loading={forecast.loading} aqi={aqi} pm25={pm25} stage={stage} status={forecast.status} />
      {tab !== "choreographer" && (
        <div className="mb-6">
          <ImpactBar receipt={receipt} onOpen={onOpenReceipt} />
        </div>
      )}
      <TabPanels
        tab={tab}
        scenario={scenario}
        ventWindow={ventWindow}
        receipt={receipt}
        sky={sky}
        household={household}
        now={{ aqi, peakAqi, stage }}
        onOpenReceipt={onOpenReceipt}
      />
    </main>
  );
}
