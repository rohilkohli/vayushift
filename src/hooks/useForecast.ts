"use client";
import { useCallback, useState } from "react";
import { DEFAULT_SCENARIO } from "@/lib/airQualityPresets";
import { cityById } from "@/lib/cities";
import { track } from "@/lib/clientApi";
import type { AirScenario } from "@/lib/types";
import { useT } from "./useLang";

/** What the status line says. Kept as a key, not finished text, so it is re-rendered in the current language on a switch. */
export type StatusMessage =
  | { key: "locUnavailable" | "locFinding" | "locLive" | "locDemo" | "locFailed" | "locDenied" }
  | { key: "loaded" | "cityLive" | "cityDemo"; name: string };

type NamedCity = { id: string; name: string };

/**
 * The forecast being shown and the ways to change it: a demo scenario, a picked city, or the visitor's own location.
 * Live data comes from /api/air-quality; any failure leaves the previous scenario on screen and says so.
 */
export function useForecast() {
  const t = useT();
  const [scenario, setScenario] = useState<AirScenario>(DEFAULT_SCENARIO);
  const [cityId, setCityId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState(false);

  /** Fetches the forecast for a point. `city` names the scenario after the picked city instead of "Your location". */
  const loadForecast = useCallback(async (lat: number, lng: number, city?: NamedCity) => {
    try {
      const res = await fetch(`/api/air-quality?${new URLSearchParams({ lat: String(lat), lng: String(lng) })}`);
      if (!res.ok) throw new Error("bad response");
      const data = (await res.json()) as { scenario: AirScenario; mode: "live" | "demo" };
      setScenario(city ? { ...data.scenario, name: city.name } : data.scenario);
      setCityId(city?.id ?? null);
      track({ event: "scenario_loaded", props: { preset_id: data.scenario.id } });
      const live = data.mode === "live";
      setStatus(city ? { key: live ? "cityLive" : "cityDemo", name: city.name } : { key: live ? "locLive" : "locDemo" });
    } catch {
      setStatus({ key: "locFailed" });
    } finally {
      setLoading(false);
    }
  }, []);

  const pickCity = useCallback(
    (id: string) => {
      const city = cityById(id);
      if (!city) return;
      setLoading(true);
      void loadForecast(city.lat, city.lng, { id: city.id, name: t.cityName[city.id] ?? city.name });
    },
    [loadForecast, t],
  );

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus({ key: "locUnavailable" });
      return;
    }
    setLoading(true);
    setStatus({ key: "locFinding" });
    navigator.geolocation.getCurrentPosition(
      (pos) => void loadForecast(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLoading(false);
        setStatus({ key: "locDenied" });
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  }, [loadForecast]);

  const selectPreset = useCallback((s: AirScenario) => {
    setScenario(s);
    setCityId(null);
    track({ event: "scenario_loaded", props: { preset_id: s.id } });
    setStatus({ key: "loaded", name: s.name });
  }, []);

  return { scenario, cityId, status, loading, pickCity, locate, selectPreset };
}
