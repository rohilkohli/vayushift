"use client";
import { formatHour, pm25ToAqi } from "@/lib/airQuality";
import { TICKS, W, pct } from "@/lib/horizonGeometry";
import type { HourlyAir } from "@/lib/types";
import { useT } from "@/hooks/useLang";

/** The hour labels under the chart. Every other label is hidden on a phone so they never collide. */
export function HourTicks({ x }: { x: (hour: number) => number }) {
  return (
    <div className="relative mt-1 h-5 text-[11px] font-semibold ink-soft" aria-hidden="true">
      {TICKS.map((tick) => (
        <span
          key={tick}
          className={`num absolute -translate-x-1/2 ${[4, 12, 20].includes(tick) ? "hidden sm:block" : ""}`}
          style={{ left: pct(x(tick), W) }}
        >
          {formatHour(tick)}
        </span>
      ))}
    </div>
  );
}

/** What the solid line, the dashed line and the hatched box mean. */
export function ChartLegend() {
  const t = useT();
  return (
    <p className="m-0 mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[11px] font-semibold ink-soft">
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-0 w-6 border-t-[3px] border-current" aria-hidden="true" /> {t.legendOutdoor}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-0 w-6 border-t-[3px] border-dashed accent" aria-hidden="true" /> {t.legendIndoor}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded border-2 border-dashed border-[#8c4e35]" aria-hidden="true" /> {t.legendWindow}
      </span>
    </p>
  );
}

interface TableProps {
  hourly: HourlyAir[];
  indoor: number[];
  hour: number;
}

/** The same data as the chart, as a table, for anyone who cannot or would rather not read a chart. */
export function HourlyTable({ hourly, indoor, hour }: TableProps) {
  const t = useT();
  return (
    <details className="mt-2 text-sm">
      <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">{t.viewTable}</summary>
      <div className="max-h-64 overflow-auto">
        <table className="tbl">
          <caption className="sr-only">{t.tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.thHour}</th>
              <th scope="col">{t.thOutdoor}</th>
              <th scope="col">{t.thAqi}</th>
              <th scope="col">{t.thIndoor}</th>
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
  );
}
