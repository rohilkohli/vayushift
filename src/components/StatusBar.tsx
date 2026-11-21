"use client";
import { GRAP_INFO } from "@/lib/grapRules";
import { istClock } from "@/lib/ist";
import type { Messages } from "@/lib/i18n";
import type { AirScenario, GrapStage } from "@/lib/types";
import type { StatusMessage } from "@/hooks/useForecast";
import { useT } from "@/hooks/useLang";

interface Props {
  scenario: AirScenario;
  loading: boolean;
  aqi: number;
  pm25: number;
  stage: GrapStage;
  status: StatusMessage | null;
}

const PILL = "glass rounded-full px-4 py-2";

function statusText(status: StatusMessage | null, t: Messages): string {
  if (!status) return "";
  switch (status.key) {
    case "loaded":
      return t.scenarioLoaded(status.name);
    case "cityLive":
      return t.cityLive(status.name);
    case "cityDemo":
      return t.cityDemo(status.name);
    default:
      return t[status.key];
  }
}

/** The row of pills under the header: current air, GRAP stage, where the data came from, and the latest message. */
export function StatusBar({ scenario, loading, aqi, pm25, stage, status }: Props) {
  const t = useT();
  const category = stage === "NONE" ? "" : (t.grapCategory[GRAP_INFO[stage].category] ?? GRAP_INFO[stage].category);
  const live = scenario.source === "live";
  return (
    // A scrollable region must be reachable from the keyboard, so it takes focus (tabIndex 0).
    <div
      role="region"
      aria-label={t.statusRegion}
      tabIndex={0}
      className="no-scrollbar fade-x -mx-5 mb-6 flex items-center gap-2 overflow-x-auto px-5 pb-1 text-xs font-bold lg:mx-0 lg:flex-wrap lg:px-0 [&>*]:shrink-0 [&>*]:whitespace-nowrap"
    >
      {loading ? (
        <span className={PILL} aria-busy="true">
          <span className="skeleton inline-block w-40 align-middle" aria-hidden="true" />
          <span className="sr-only">{t.loadingAir}</span>
        </span>
      ) : (
        <span className={PILL}>{t.nowLine(aqi, pm25)}</span>
      )}
      <span className={PILL}>{stage === "NONE" ? t.grapOff : t.grapStage(GRAP_INFO[stage].roman, category)}</span>
      <span className={PILL}>
        {live ? t.sourceLive : t.sourceDemo}
        {live && scenario.fetchedAt && scenario.provider && (
          <span className="ink-soft font-semibold"> · {t.sourceLine(scenario.provider, istClock(scenario.fetchedAt))}</span>
        )}
      </span>
      <p role="status" aria-live="polite" className={`${PILL} m-0 empty:hidden`}>
        {statusText(status, t)}
      </p>
    </div>
  );
}
