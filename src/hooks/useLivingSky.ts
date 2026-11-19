"use client";
import { useEffect } from "react";
import { skyForHour } from "@/lib/skyPalette";

const VARS = [
  "--s0", "--s1", "--s2", "--s3", "--s4", "--s5", "--s6", "--orb", "--cloud",
  "--sun-x", "--sun-y", "--sun-o", "--moon-x", "--moon-y", "--moon-o", "--stars-o", "--day-o", "--wind-speed",
];

/**
 * Applies the sky for the selected hour to <html>: gradient stops, sun and moon arcs, star, cloud and
 * bird visibility, wind speed, and (unless a theme is forced with ?sky=) the day or night UI theme.
 * Every value eases through CSS transitions in globals.css, so changes glide rather than snap.
 * While `playing`, the easing becomes linear over one step (see html[data-playing]).
 */
export function useLivingSky(hour: number | null, forcedTheme: "day" | "night" | null, playing = false) {
  useEffect(() => {
    if (hour === null) return;
    const root = document.documentElement;
    // The first paint applies instantly (no day-to-night animation on load); later changes glide.
    const firstPaint = !root.dataset.skyReady;
    if (firstPaint) root.dataset.boot = "true";
    const sky = skyForHour(hour);
    const set = (name: string, value: string | number) => root.style.setProperty(name, String(value));
    sky.stops.forEach((c, i) => set(`--s${i}`, c));
    set("--orb", sky.orb);
    set("--cloud", sky.cloud);
    set("--sun-x", sky.sun.x.toFixed(2));
    set("--sun-y", sky.sun.y.toFixed(2));
    set("--sun-o", sky.sun.opacity.toFixed(3));
    set("--moon-x", sky.moon.x.toFixed(2));
    set("--moon-y", sky.moon.y.toFixed(2));
    set("--moon-o", sky.moon.opacity.toFixed(3));
    set("--stars-o", sky.stars.toFixed(3));
    set("--day-o", sky.day.toFixed(3));
    set("--wind-speed", sky.windSpeed);
    root.dataset.sky = forcedTheme ?? (sky.night ? "night" : "day");
    if (firstPaint) {
      root.dataset.skyReady = "true";
      requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.boot));
    }
  }, [hour, forcedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (playing) root.dataset.playing = "true";
    else delete root.dataset.playing;
    return () => {
      delete root.dataset.playing;
    };
  }, [playing]);

  // Leave no inline overrides behind if the app unmounts (hot reload, tests).
  useEffect(
    () => () => {
      VARS.forEach((p) => document.documentElement.style.removeProperty(p));
      delete document.documentElement.dataset.skyReady;
    },
    [],
  );
}
