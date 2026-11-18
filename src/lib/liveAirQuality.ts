import type { AirScenario, HourlyAir } from "./types";
import { buildDiurnalCurve } from "./airQualityPresets";

const ENDPOINT = "https://airquality.googleapis.com/v1/forecast:lookup";
const TIMEOUT_MS = 6000;
const IST = "Asia/Kolkata";

interface ForecastResponse {
  hourlyForecasts?: Array<{
    dateTime?: string;
    pollutants?: Array<{ code?: string; concentration?: { value?: number } }>;
  }>;
}

const hourFormatter = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: IST });
const localHour = (iso: string) => Number(hourFormatter.format(new Date(iso)));

/**
 * Converts a Google Air Quality `forecast:lookup` response to a 24-slot local-hour
 * series. Returns null when fewer than 12 usable PM2.5 readings are present;
 * missing hours are filled from the nearest known hour.
 */
export function parseForecast(body: unknown): HourlyAir[] | null {
  const list = (body as ForecastResponse)?.hourlyForecasts;
  if (!Array.isArray(list)) return null;
  const byHour = new Map<number, number>();
  for (const f of list) {
    const pm = f.pollutants?.find((p) => p.code === "pm25")?.concentration?.value;
    if (typeof f.dateTime !== "string" || typeof pm !== "number" || !Number.isFinite(pm) || pm < 0) continue;
    const h = localHour(f.dateTime);
    if (Number.isInteger(h) && !byHour.has(h)) byHour.set(h, pm);
  }
  if (byHour.size < 12) return null;
  const known = [...byHour.keys()];
  return Array.from({ length: 24 }, (_, hour) => {
    const nearest = known.reduce((best, k) => {
      const d = (a: number) => Math.min(Math.abs(a - hour), 24 - Math.abs(a - hour));
      return d(k) < d(best) ? k : best;
    }, known[0]);
    return { hour, pm25: Math.round(byHour.get(hour) ?? byHour.get(nearest)!) };
  });
}

/** Fetches live hourly PM2.5. Throws on any failure so callers can fall back. */
export async function fetchLiveScenario(lat: number, lng: number, apiKey: string): Promise<AirScenario> {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({
      location: { latitude: lat, longitude: lng },
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      extraComputations: ["POLLUTANT_CONCENTRATION"],
      pageSize: 24,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Air Quality API responded ${res.status}`);
  const hourly = parseForecast(await res.json());
  if (!hourly) throw new Error("Air Quality API returned too little PM2.5 data");
  return { id: "live", name: "Your location", area: "Live forecast", lat, lng, hourly, source: "live" };
}

/** Preset-shaped stand-in used when live data is unavailable. */
export function demoFallbackFor(lat: number, lng: number, morningPeak = 190): AirScenario {
  return { id: "fallback", name: "Your location", area: "Demo data", lat, lng, hourly: buildDiurnalCurve(morningPeak), source: "preset" };
}
