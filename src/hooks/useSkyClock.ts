"use client";
import { useCallback, useEffect, useState } from "react";
import { istHour } from "@/lib/ist";
import { useLivingSky } from "./useLivingSky";

/** One hour every 650 ms: a full day in about 16 seconds. */
const PLAY_STEP_MS = 650;

/** Reads `?hour=` (0-23) and `?sky=day|night` from the address, for deep links and demos. */
function readUrlOverrides(realHour: number): { theme: "day" | "night" | null; hour: number } {
  const params = new URLSearchParams(globalThis.location.search);
  const forced = params.get("sky");
  const asked = Number(params.get("hour"));
  const valid = params.has("hour") && Number.isInteger(asked) && asked >= 0 && asked <= 23;
  return { theme: forced === "night" || forced === "day" ? forced : null, hour: valid ? asked : realHour };
}

/**
 * The hour the visitor is looking at, and the play-through of the day. `realHour` is the actual hour in India;
 * `hour` is the one on the scrubber. The sky, sun or moon, wind speed and day/night theme all follow `hour`.
 */
export function useSkyClock() {
  const [realHour, setRealHour] = useState(8);
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [forcedTheme, setForcedTheme] = useState<"day" | "night" | null>(null);

  useEffect(() => {
    const h = istHour();
    const url = readUrlOverrides(h);
    setRealHour(h);
    setForcedTheme(url.theme);
    setSelected(url.hour);
  }, []);

  useLivingSky(selected, forcedTheme, playing);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => setSelected((h) => ((h ?? 0) + 1) % 24), PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const scrubTo = useCallback((h: number) => {
    setPlaying(false);
    setSelected(h);
  }, []);
  const togglePlay = useCallback(() => setPlaying((p) => !p), []);

  return { realHour, hour: selected ?? realHour, playing, scrubTo, togglePlay };
}
