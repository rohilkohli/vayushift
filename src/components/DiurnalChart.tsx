import { formatHour, pm25ToAqi } from "@/lib/airQuality";
import type { HourlyAir, VentilationWindow } from "@/lib/types";

const W = 480;
const H = 260;
const PAD = { l: 48, r: 12, t: 16, b: 34 };

/** Dependency-free SVG. Window band is labelled and hatched so it is not colour-only. */
export function DiurnalChart({ hourly, window }: { hourly: HourlyAir[]; window: VentilationWindow }) {
  const max = Math.max(...hourly.map((h) => h.pm25)) * 1.1;
  const x = (hr: number) => PAD.l + (hr / 23) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const path = hourly.map((h, i) => `${i ? "L" : "M"}${x(h.hour).toFixed(1)},${y(h.pm25).toFixed(1)}`).join(" ");
  const bandX = x(window.startHour);
  const bandW = x(window.endHour) - bandX;
  const ticks = [0, 6, 12, 18, 23];
  const summary = `Outdoor PM2.5 by hour. Morning peak ${window.morningPeakMeanPm25} micrograms per cubic metre; lowest 90-minute window ${formatHour(window.startHour)} to ${formatHour(window.endHour)} at ${window.meanPm25}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="chart-title chart-desc" className="h-auto w-full">
        <title id="chart-title">24-hour outdoor PM2.5 forecast</title>
        <desc id="chart-desc">{summary}</desc>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#0a6b63" strokeWidth="2" />
          </pattern>
        </defs>
        <rect x={bandX} y={PAD.t} width={bandW} height={H - PAD.t - PAD.b} fill="url(#hatch)" opacity="0.35" />
        <rect x={bandX} y={PAD.t} width={bandW} height={H - PAD.t - PAD.b} fill="none" stroke="#0a6b63" strokeWidth="2" strokeDasharray="6 4" />
        <text x={bandX + bandW / 2} y={PAD.t + 14} textAnchor="middle" fontSize="13" fontWeight="700" fill="#064e47">
          Low-smog window
        </text>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(max * f * 0.909)} y2={y(max * f * 0.909)} stroke="#0f2a44" strokeOpacity="0.15" />
            <text x={PAD.l - 6} y={y(max * f * 0.909) + 4} textAnchor="end" fontSize="13" fill="#3b4f66">
              {Math.round(max * f * 0.909)}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#0f2a44" strokeWidth="3" strokeLinejoin="round" />
        {hourly.map((h) => (
          <circle key={h.hour} cx={x(h.hour)} cy={y(h.pm25)} r={h.hour >= Math.floor(window.startHour) && h.hour <= window.endHour ? 4 : 2} fill="#0f2a44" />
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 10} textAnchor="middle" fontSize="13" fill="#3b4f66">
            {String(t).padStart(2, "0")}:00
          </text>
        ))}
        <text x={12} y={H / 2} fontSize="13" fill="#3b4f66" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">
          PM2.5 µg/m³
        </text>
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold underline">View hourly values as a table</summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Hourly outdoor PM2.5 and AQI</caption>
            <thead>
              <tr>
                <th scope="col" className="p-1">Hour</th>
                <th scope="col" className="p-1">PM2.5 µg/m³</th>
                <th scope="col" className="p-1">AQI</th>
              </tr>
            </thead>
            <tbody>
              {hourly.map((h) => (
                <tr key={h.hour}>
                  <th scope="row" className="p-1 font-normal">{formatHour(h.hour)}</th>
                  <td className="p-1">{h.pm25}</td>
                  <td className="p-1">{pm25ToAqi(h.pm25)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
