"use client";
import { GRAP_DISCLAIMER, GRAP_INFO, isDelhiNcr } from "@/lib/grapRules";
import type { AirScenario, GrapStage } from "@/lib/types";
import { useLang } from "@/hooks/useLang";

export const STAGES: GrapStage[] = ["STAGE_1", "STAGE_2", "STAGE_3", "STAGE_4"];

interface HeadlineProps {
  scenario: AirScenario;
  stage: GrapStage;
  aqi: number;
  peakAqi: number;
}

/** The tab's headline: today's GRAP stage, the AQI now and at its peak, and a note outside Delhi-NCR. */
export function CommunityHeadline({ scenario, stage, aqi, peakAqi }: HeadlineProps) {
  const { t } = useLang();
  const info = GRAP_INFO[stage];
  return (
    <div>
      <p className="label scrim inline-block rounded-full px-4 py-1.5">{t.communityBadge}</p>
      <h2 className="serif hero-ink halo mt-2 text-[2.4rem] font-medium leading-[1.1] tracking-tight sm:text-5xl">
        {stage === "NONE" ? t.grapNone : t.grapHeadline(info.roman, t.grapCategory[info.category] ?? info.category)}
      </h2>
      <p className="scrim mt-3 inline-block rounded-3xl px-5 py-3 text-lg">{t.aqiLine(aqi, peakAqi, peakAqi > aqi)}</p>
      {!isDelhiNcr(scenario.lat, scenario.lng) && (
        <p className="scrim mt-3 block max-w-xl rounded-3xl px-5 py-3 text-sm">{t.grapOutsideNcr}</p>
      )}
    </div>
  );
}

/** What typically applies at this stage, and what a household can do. The text is the rules table's own, so it stays English. */
export function GrapMeasures({ stage }: { stage: GrapStage }) {
  const { t, englishAttrs } = useLang();
  const info = GRAP_INFO[stage];
  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="measures-h">
      <h3 id="measures-h" className="label">
        {t.measuresTitle}
      </h3>
      <ul className="mt-2 list-disc pl-5">
        {info.measures.map((m) => (
          <li key={m} {...englishAttrs}>
            {m}
          </li>
        ))}
      </ul>
      <h3 className="label mt-4">{t.householdActions}</h3>
      <ul className="mt-2 list-disc pl-5">
        {info.householdActions.map((m) => (
          <li key={m} {...englishAttrs}>
            {m}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm ink-soft" {...englishAttrs}>
        {GRAP_DISCLAIMER}
      </p>
    </section>
  );
}

/** All four stages as a meter (where today's air sits) and as a table. */
export function GrapMatrix({ stage }: { stage: GrapStage }) {
  const { t } = useLang();
  const cat = (c: string) => t.grapCategory[c] ?? c;
  const currentIdx = STAGES.indexOf(stage);
  const stateText = { current: t.stateCurrent, reached: t.statePassed, ahead: t.stateAhead };
  return (
    <section className="glass liquid rounded-[2rem] p-6" aria-labelledby="matrix-h">
      <h3 id="matrix-h" className="label">
        {t.allStages}
      </h3>
      <ol className="grap-meter mt-3" aria-label={t.meterAria}>
        {STAGES.map((s, i) => {
          const state = i < currentIdx ? "reached" : i === currentIdx ? "current" : "ahead";
          return (
            <li key={s} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <strong className="serif">{GRAP_INFO[s].roman}</strong>
              <span>{cat(GRAP_INFO[s].category)}</span>
              <span className="sr-only">{stateText[state]}</span>
            </li>
          );
        })}
      </ol>
      <table className="tbl mt-3">
        <caption className="sr-only">{t.grapTableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{t.thStage}</th>
            <th scope="col">{t.thBand}</th>
            <th scope="col">{t.thCategory}</th>
          </tr>
        </thead>
        <tbody>
          {STAGES.map((s) => (
            <tr key={s} aria-current={s === stage ? "true" : undefined}>
              <th scope="row">
                {GRAP_INFO[s].roman}
                {s === stage ? t.currentMark : ""}
              </th>
              <td>{GRAP_INFO[s].band}</td>
              <td>{cat(GRAP_INFO[s].category)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
