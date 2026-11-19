"use client";
import { useEffect } from "react";
import { skyForHour } from "@/lib/skyPalette";

/**
 * Applies the sky for the selected hour to <html>: gradient stops, sun or moon position and glow,
 * wind speed, and (unless a theme is forced with ?sky=) the day or night UI theme.
 * Colour changes crossfade through the registered custom properties in globals.css.
 */
export function useLivingSky(hour: number | null, forcedTheme: "day" | "night" | null) {
  useEffect(() => {
    if (hour === null) return;
    const root = document.documentElement;
    const sky = skyForHour(hour);
    sky.stops.forEach((c, i) => root.style.setProperty(`--s${i}`, c));
    root.style.setProperty("--orb", sky.orb);
    root.style.setProperty("--sun-x", sky.sunX.toFixed(2));
    root.style.setProperty("--sun-y", sky.sunY.toFixed(2));
    root.style.setProperty("--wind-speed", String(sky.windSpeed));
    root.dataset.sky = forcedTheme ?? (sky.night ? "night" : "day");
  }, [hour, forcedTheme]);

  // Leave no inline overrides behind if the app unmounts (hot reload, tests).
  useEffect(
    () => () => {
      const root = document.documentElement;
      ["--s0", "--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--orb", "--sun-x", "--sun-y", "--wind-speed"].forEach((p) =>
        root.style.removeProperty(p),
      );
    },
    [],
  );
}
