"use client";
import { useMemo } from "react";
import { formatHour } from "@/lib/airQuality";
import { LIMITED_ACTIVITY_MINUTES, personalAdvice } from "@/lib/personalAdvice";
import type { AirScenario, HouseholdProfile, VentilationWindow } from "@/lib/types";
import { useT } from "@/hooks/useLang";
import { Icon } from "./Icon";

interface Props {
  scenario: AirScenario;
  window: VentilationWindow;
  profile: HouseholdProfile;
  /** The hour selected on the scrubber (0-23). */
  hour: number;
}

/** Outdoor guidance per group that lives at home: children, older adults, lung or heart conditions, healthy adults. */
export function PersonalGuidance({ scenario, window: w, profile, hour }: Props) {
  const t = useT();
  const personal = useMemo(() => personalAdvice(scenario.hourly, hour, profile, w), [scenario, hour, profile, w]);
  return (
    <section className="glass liquid rounded-[32px] p-6" aria-labelledby="personal-h">
      <h3 id="personal-h" className="label m-0 flex items-center gap-2">
        <Icon name="family_restroom" className="accent" /> {t.personalTitle}
      </h3>
      <p className="ink-soft m-0 mt-1 text-sm">{t.personalIntro(formatHour(hour))}</p>
      <ul className="m-0 mt-4 grid list-none gap-3 p-0 md:grid-cols-2">
        {personal.groups.map((g) => (
          <li key={g.group} className={`chip rounded-3xl p-4 ${g.nowLevel === "indoors" ? "ring-2 ring-current" : ""}`}>
            <p className="m-0 text-sm font-bold">{t.groupName[g.group]}</p>
            <p className="m-0 mt-1 text-[15px] leading-6">
              {t.personalLine({
                nowLevel: g.nowLevel,
                bestLevel: g.bestLevel,
                nowAqi: g.nowAqi,
                best: formatHour(g.bestHour),
                bestAqi: g.bestAqi,
                minutes: LIMITED_ACTIVITY_MINUTES,
              })}
              {g.mask && g.nowLevel !== "ok" && <> {t.personalMask}</>}
            </p>
          </li>
        ))}
      </ul>
      {personal.shortenAiringTo !== null && (
        <p className="scrim m-0 mt-4 rounded-3xl px-5 py-3 text-sm leading-6">
          {t.airingShort(personal.shortenAiringTo, personal.windowAqi)}
        </p>
      )}
    </section>
  );
}
