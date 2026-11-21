"use client";
import type { CSSProperties } from "react";
import { formatHour } from "@/lib/airQuality";
import { horizonGeometry } from "@/lib/horizonGeometry";
import { useT } from "@/hooks/useLang";
import type { HourlyAir, VentilationWindow } from "@/lib/types";
import { HorizonChart } from "./HorizonChart";
import { ChartLegend, HourlyTable, HourTicks } from "./HorizonParts";
import { Icon } from "./Icon";

interface Props {
  hourly: HourlyAir[];
  /** Modelled indoor PM2.5 for each hour, with the household's current sealing and filter choices. */
  indoor: number[];
  window: VentilationWindow;
  hour: number;
  phaseLabel: string;
  playing: boolean;
  onHour: (h: number) => void;
  onTogglePlay: () => void;
  onJump: () => void;
}

/**
 * "Scrub 24-hour atmospheric horizon". Dragging the slider (or pressing play) moves a cursor along the
 * outdoor and indoor curves, and the parent reacts: hero copy, readouts and the sky itself all follow
 * the selected hour. The low-smog window is hatched and dashed, so it never depends on colour alone.
 */
export function HorizonScrubber({ hourly, indoor, window: w, hour, phaseLabel, playing, onHour, onTogglePlay, onJump }: Props) {
  const t = useT();
  const geo = horizonGeometry(hourly, indoor, w, hour);
  const timeLabel = formatHour(hour);
  const description = t.chartDesc({
    start: formatHour(w.startHour),
    end: formatHour(w.endHour),
    mean: w.meanPm25,
    time: timeLabel,
    out: geo.outNow,
    inn: geo.inNow,
  });
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="ribbon-h" className="label m-0 flex items-center gap-2">
            <Icon name="waves" className="accent" /> {t.horizonTitle}
          </h3>
          <span className="chip num rounded-full px-3 py-1 text-xs font-semibold">
            {timeLabel} · {phaseLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onJump} className="pill !text-xs">
            {t.jumpTo(formatHour(w.startHour))}
          </button>
          <button type="button" onClick={onTogglePlay} className="btn-primary !px-4 !text-xs">
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span> {playing ? t.pause : t.play}
          </button>
        </div>
      </div>
      <HorizonChart geo={geo} window={w} description={description} />
      <HourTicks x={geo.x} />
      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={hour}
        onChange={(e) => onHour(Number(e.target.value))}
        aria-label={t.hourOfDay}
        aria-valuetext={t.valueText(timeLabel, geo.outNow, geo.inNow)}
        style={{ "--p": `${(hour / 23) * 100}%` } as CSSProperties}
        className="mt-2 block h-11 w-full"
      />
      <ChartLegend />
      <HourlyTable hourly={hourly} indoor={indoor} hour={hour} />
    </div>
  );
}
