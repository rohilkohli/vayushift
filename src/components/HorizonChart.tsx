"use client";
import type { CSSProperties } from "react";
import { formatHour } from "@/lib/airQuality";
import { BOTTOM, H, W, pct, type HorizonGeometry } from "@/lib/horizonGeometry";
import type { VentilationWindow } from "@/lib/types";
import { useT } from "@/hooks/useLang";

interface Props {
  geo: HorizonGeometry;
  window: VentilationWindow;
  /** Plain-language description of the chart for screen readers. */
  description: string;
}

/** A round marker positioned over the chart at (x, y), in chart coordinates. */
const marker = (px: number, py: number, size: number, bg: string): CSSProperties => ({
  left: pct(px, W),
  top: pct(py, H),
  width: size,
  height: size,
  background: bg,
  transition: "left 220ms var(--ease-out), top 220ms var(--ease-out)",
});

const MARKER_CLASS = "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md";

/** The gradients and hatch pattern the chart paints with. The hatch keeps the low-smog band from depending on colour alone. */
function ChartDefs() {
  return (
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
  );
}

/** The low-smog window as a box: tinted, hatched and dashed, so it never depends on colour alone. */
function WindowBand({ x, width }: { x: number; width: number }) {
  const box = { x, y: 8, width, height: 106, rx: "14" };
  return (
    <>
      <rect {...box} fill="url(#bandGrad)" />
      <rect {...box} fill="url(#bandHatch)" />
      <rect {...box} fill="none" stroke="#8c4e35" strokeWidth="2" strokeDasharray="7 5" vectorEffect="non-scaling-stroke" />
    </>
  );
}

/** The outdoor curve (solid, with a soft fill), the indoor curve (dashed) and the cursor line at the selected hour. */
function Curves({ geo }: { geo: HorizonGeometry }) {
  const stroke = { fill: "none", strokeWidth: "2.6", strokeLinecap: "round", vectorEffect: "non-scaling-stroke" } as const;
  return (
    <>
      <path d={geo.area} fill="url(#outGrad)" />
      <path d={geo.outLine} style={{ stroke: "var(--ink)" }} {...stroke} />
      <path d={geo.inLine} style={{ stroke: "var(--accent)" }} strokeDasharray="6 5" {...stroke} />
      <line
        x1={geo.cursorX}
        x2={geo.cursorX}
        y1={12}
        y2={BOTTOM + 2}
        style={{ stroke: "var(--ink)" }}
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
    </>
  );
}

/** Outdoor and modelled indoor PM2.5 over the day, the hatched low-smog band, and a cursor at the selected hour. */
export function HorizonChart({ geo, window: w, description }: Props) {
  const t = useT();
  const { bandX, bandW, cursorX } = geo;
  return (
    <div className="relative h-32 w-full sm:h-36">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-labelledby="scrub-title scrub-desc"
        className="chart-reveal absolute inset-0 h-full w-full overflow-visible"
      >
        <title id="scrub-title">{t.chartTitle}</title>
        <desc id="scrub-desc">{description}</desc>
        <ChartDefs />
        <WindowBand x={bandX} width={bandW} />
        <Curves geo={geo} />
      </svg>
      <span
        className="num pointer-events-none absolute top-1 -translate-x-1/2 rounded-full bg-[#fff3d6]/90 px-2 py-0.5 text-[10px] font-bold text-[#6b2d14]"
        style={{ left: pct(bandX + bandW / 2, W) }}
        aria-hidden="true"
      >
        {formatHour(w.startHour)}–{formatHour(w.endHour)}
      </span>
      <span aria-hidden="true" className={MARKER_CLASS} style={marker(cursorX, geo.outY, 16, "var(--ink)")} />
      <span aria-hidden="true" className={MARKER_CLASS} style={marker(cursorX, geo.inY, 14, "var(--accent)")} />
    </div>
  );
}
