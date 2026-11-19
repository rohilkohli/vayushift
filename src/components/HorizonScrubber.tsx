"use client";
import type { CSSProperties } from "react";
import { formatHour, pm25ToAqi } from "@/lib/airQuality";
import type { HourlyAir, VentilationWindow } from "@/lib/types";
import { Icon } from "./Icon";

const W = 900;
const H = 140;
const LEFT = 20;
const RIGHT = 880;
const TOP = 18;
const BOTTOM = 112;
const TICKS = [0, 4, 8, 12, 16, 20, 23];

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

/** Smooth Catmull-Rom curve through the hourly points. */
function smoothPath(pts: Array<[number, number]>): string {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/**
 * "Scrub 24-hour atmospheric horizon". Dragging the slider (or pressing play) moves a cursor along the
 * outdoor and indoor curves, and the parent reacts: hero copy, readouts and the sky itself all follow
 * the selected hour. The low-smog window is hatched and dashed, so it never depends on colour alone.
 */
export function HorizonScrubber({ hourly, indoor, window: w, hour, phaseLabel, playing, onHour, onTogglePlay, onJump }: Props) {
  const maxPm = Math.max(360, Math.max(...hourly.map((h) => h.pm25)) * 1.05);
  const x = (i: number) => LEFT + (i / 23) * (RIGHT - LEFT);
  const y = (pm: number) => BOTTOM - (Math.min(maxPm, pm) / maxPm) * (BOTTOM - TOP);

  const outPts = hourly.map((h, i) => [x(i), y(h.pm25)] as [number, number]);
  const inPts = indoor.map((v, i) => [x(i), y(v)] as [number, number]);
  const outLine = smoothPath(outPts);
  const inLine = smoothPath(inPts);
  const area = `${outLine} L${RIGHT},${BOTTOM} L${LEFT},${BOTTOM} Z`;

  const bandX = LEFT + (w.startHour / 23) * (RIGHT - LEFT);
  const bandW = ((w.endHour - w.startHour) / 23) * (RIGHT - LEFT);
  const cursorX = x(hour);
  const outNow = hourly[hour].pm25;
  const inNow = indoor[hour];
  const timeLabel = formatHour(hour);

  const marker = (px: number, py: number, size: number, bg: string): CSSProperties => ({
    left: pct(px, W),
    top: pct(py, H),
    width: size,
    height: size,
    background: bg,
    transition: "left 220ms var(--ease-out), top 220ms var(--ease-out)",
  });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 id="ribbon-h" className="label m-0 flex items-center gap-2">
            <Icon name="waves" className="accent" /> Scrub 24-hour atmospheric horizon
          </h3>
          <span className="chip num rounded-full px-3 py-1 text-xs font-semibold">
            {timeLabel} · {phaseLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onJump} className="pill !text-xs">
            Jump to {formatHour(w.startHour)} safe window
          </button>
          <button type="button" onClick={onTogglePlay} className="btn-primary !px-4 !text-xs">
            <span aria-hidden="true">{playing ? "⏸" : "▶"}</span> {playing ? "Pause sky" : "Play 24h sky"}
          </button>
        </div>
      </div>

      <div className="relative h-32 w-full sm:h-36">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-labelledby="scrub-title scrub-desc"
          className="chart-reveal absolute inset-0 h-full w-full overflow-visible"
        >
          <title id="scrub-title">24-hour outdoor and indoor PM2.5</title>
          <desc id="scrub-desc">
            Solid line: outdoor PM2.5. Dashed line: modelled indoor PM2.5. Lowest 90-minute window {formatHour(w.startHour)} to{" "}
            {formatHour(w.endHour)} at {w.meanPm25} micrograms per cubic metre. Selected hour {timeLabel}: outdoor {outNow}, indoor {inNow}.
          </desc>
          <defs>
            <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--ink)", stopOpacity: 0.22 }} />
              <stop offset="100%" style={{ stopColor: "var(--ink)", stopOpacity: 0 }} />
            </linearGradient>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2b560" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffdf96" stopOpacity="0.05" />
            </linearGradient>
            <pattern id="bandHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#8c4e35" strokeWidth="2" strokeOpacity="0.4" />
            </pattern>
          </defs>

          <rect x={bandX} y={8} width={bandW} height={106} rx="14" fill="url(#bandGrad)" />
          <rect x={bandX} y={8} width={bandW} height={106} rx="14" fill="url(#bandHatch)" />
          <rect x={bandX} y={8} width={bandW} height={106} rx="14" fill="none" stroke="#8c4e35" strokeWidth="2" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />

          <path d={area} fill="url(#outGrad)" />
          <path d={outLine} fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="2.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={inLine} fill="none" style={{ stroke: "var(--accent)" }} strokeWidth="2.6" strokeDasharray="6 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <line x1={cursorX} x2={cursorX} y1={12} y2={BOTTOM + 2} style={{ stroke: "var(--ink)" }} strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>

        <span
          className="num pointer-events-none absolute top-1 -translate-x-1/2 rounded-full bg-[#fff3d6]/90 px-2 py-0.5 text-[10px] font-bold text-[#6b2d14]"
          style={{ left: pct(bandX + bandW / 2, W) }}
          aria-hidden="true"
        >
          {formatHour(w.startHour)}–{formatHour(w.endHour)}
        </span>

        <span aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md" style={marker(cursorX, y(outNow), 16, "var(--ink)")} />
        <span aria-hidden="true" className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md" style={marker(cursorX, y(inNow), 14, "var(--accent)")} />
      </div>

      <div className="relative mt-1 h-5 text-[11px] font-semibold ink-soft" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} className={`num absolute -translate-x-1/2 ${[4, 12, 20].includes(t) ? "hidden sm:block" : ""}`} style={{ left: pct(x(t), W) }}>
            {formatHour(t)}
          </span>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={23}
        step={1}
        value={hour}
        onChange={(e) => onHour(Number(e.target.value))}
        aria-label="Hour of day"
        aria-valuetext={`${timeLabel}, outdoor PM2.5 ${outNow} micrograms per cubic metre, indoor ${inNow}`}
        style={{ "--p": `${(hour / 23) * 100}%` } as CSSProperties}
        className="mt-2 block h-11 w-full"
      />

      <p className="m-0 mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold ink-soft">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-6 border-t-[3px] border-current" aria-hidden="true" /> Outdoor PM2.5
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-0 w-6 border-t-[3px] border-dashed accent" aria-hidden="true" /> Sanctuary room, modelled
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-[#8c4e35]" aria-hidden="true" /> Low-smog window
        </span>
      </p>

      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">View hourly values as a table</summary>
        <div className="max-h-64 overflow-auto">
          <table className="tbl">
            <caption className="sr-only">Hourly outdoor PM2.5, AQI and modelled indoor PM2.5</caption>
            <thead>
              <tr>
                <th scope="col">Hour</th>
                <th scope="col">Outdoor µg/m³</th>
                <th scope="col">AQI</th>
                <th scope="col">Indoor µg/m³</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((h, i) => (
                <tr key={h.hour} aria-current={i === hour ? "true" : undefined}>
                  <th scope="row">{formatHour(h.hour)}</th>
                  <td>{h.pm25}</td>
                  <td>{pm25ToAqi(h.pm25)}</td>
                  <td>{Math.round(indoor[i])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
