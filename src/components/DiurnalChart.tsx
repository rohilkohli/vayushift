import { formatHour, pm25ToAqi } from "@/lib/airQuality";
import type { HourlyAir, VentilationWindow } from "@/lib/types";

const W = 1200;
const H = 150;
const PAD = { l: 8, r: 8, t: 26, b: 10 };

/** Smooth Catmull-Rom to Bezier path through the hourly points. */
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

/**
 * Horizon ribbon. Dependency-free SVG. The low-smog window is a labelled, dashed and
 * hatched band, so it never relies on colour alone.
 */
export function DiurnalChart({ hourly, window }: { hourly: HourlyAir[]; window: VentilationWindow }) {
  const max = Math.max(...hourly.map((h) => h.pm25)) * 1.05;
  const min = Math.min(...hourly.map((h) => h.pm25)) * 0.9;
  const x = (hr: number) => PAD.l + (hr / 23) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * (H - PAD.t - PAD.b);
  const pts = hourly.map((h) => [x(h.hour), y(h.pm25)] as [number, number]);
  const line = smoothPath(pts);
  const area = `${line} L${x(23)},${H} L${x(0)},${H} Z`;
  const bandX = x(window.startHour);
  const bandW = x(window.endHour) - bandX;
  const best = Math.round(window.startHour);
  const summary = `Outdoor PM2.5 by hour. Morning peak ${window.morningPeakMeanPm25} micrograms per cubic metre; lowest 90-minute window ${formatHour(window.startHour)} to ${formatHour(window.endHour)} at ${window.meanPm25}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="chart-title chart-desc" className="chart-reveal h-28 w-full overflow-visible" preserveAspectRatio="none">
        <title id="chart-title">24-hour outdoor PM2.5 forecast</title>
        <desc id="chart-desc">{summary}</desc>
        <defs>
          <linearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffb59a" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffdf96" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#436182" />
            <stop offset="45%" stopColor="#b9603c" />
            <stop offset="65%" stopColor="#c98a12" />
            <stop offset="100%" stopColor="#2a4968" />
          </linearGradient>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#8c4e35" strokeWidth="2" strokeOpacity="0.45" />
          </pattern>
        </defs>
        <rect x={bandX} y={4} width={bandW} height={H - 8} rx="18" fill="url(#horizonGlow)" />
        <rect x={bandX} y={4} width={bandW} height={H - 8} rx="18" fill="url(#hatch)" />
        <rect x={bandX} y={4} width={bandW} height={H - 8} rx="18" fill="none" stroke="#8c4e35" strokeWidth="2" strokeDasharray="8 6" vectorEffect="non-scaling-stroke" />
        <path d={area} fill="url(#horizonGlow)" opacity="0.5" />
        <path d={line} fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {[6, 12, best, 19, 23].map((h) => (
          <circle key={h} cx={x(h)} cy={y(hourly[h].pm25)} r={h === best ? 7 : 4.5} fill={h === best ? "#fff" : "#2a4968"} stroke={h === best ? "#c25a32" : "none"} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        ))}
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
