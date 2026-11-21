"use client";
import { useEffect, useRef } from "react";
import { skyForHour } from "@/lib/skyPalette";

const VARS = [
  "--s0",
  "--s1",
  "--s2",
  "--s3",
  "--s4",
  "--s5",
  "--s6",
  "--orb",
  "--cloud",
  "--sun-x",
  "--sun-y",
  "--sun-o",
  "--moon-x",
  "--moon-y",
  "--moon-o",
  "--stars-o",
  "--day-o",
  "--wind-speed",
];

/** Smoothing time constants (ms): how quickly the displayed hour catches up with the selected one. */
const TAU_SCRUB = 170;
const TAU_PLAY = 260;
const EPSILON = 0.002;

/** Signed shortest distance from a to b on the 24-hour circle, so 23 -> 0 glides forward instead of rewinding. */
const circularDelta = (a: number, b: number) => ((((b - a) % 24) + 36) % 24) - 12;

function apply(root: HTMLElement, hour: number, forcedTheme: "day" | "night" | null) {
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
  const theme = forcedTheme ?? (sky.night ? "night" : "day");
  if (root.dataset.sky !== theme) root.dataset.sky = theme;
}

/**
 * Drives the living sky. The sky is a continuous function of the hour, so instead of asking CSS to ease
 * between jumps (which restarts a slow-in/slow-out curve on every change and stutters while scrubbing or
 * playing), this animates the *hour itself*: each frame the displayed hour moves a fraction of the way to
 * the selected one (exponential smoothing, frame-rate independent) and the whole scene is recomputed from it.
 * Colours, sun, moon, stars and clouds therefore move together, with no restarts and no stalls.
 *
 * The day/night UI theme (text, glass, chips) flips once and crossfades over its own, slower duration.
 * Reduced-motion users get instant changes.
 */
export function useLivingSky(hour: number | null, forcedTheme: "day" | "night" | null, playing = false) {
  const shown = useRef<number | null>(null);
  const target = useRef<number | null>(null);
  const theme = useRef(forcedTheme);
  const tau = useRef(TAU_SCRUB);
  const frame = useRef(0);
  const last = useRef(0);

  theme.current = forcedTheme;
  tau.current = playing ? TAU_PLAY : TAU_SCRUB;

  useEffect(() => {
    if (hour === null) return;
    const root = document.documentElement;
    target.current = hour;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (shown.current === null || reduced) {
      // First paint (and reduced motion): no animation.
      if (shown.current === null) root.dataset.boot = "true";
      shown.current = hour;
      apply(root, hour, theme.current);
      if (root.dataset.boot) requestAnimationFrame(() => requestAnimationFrame(() => delete root.dataset.boot));
      return;
    }

    root.dataset.raf = "true"; // CSS eases are off for scene values while this loop owns them
    if (frame.current) return; // a loop is already running; it will pick up the new target
    last.current = performance.now();
    const step = (now: number) => {
      const dt = Math.min(now - last.current, 64); // a background-tab gap must not teleport the sky
      last.current = now;
      const from = shown.current ?? 0;
      const delta = circularDelta(from, target.current ?? from);
      if (Math.abs(delta) < EPSILON) {
        shown.current = target.current;
        apply(root, shown.current ?? 0, theme.current);
        frame.current = 0;
        return;
      }
      shown.current = from + delta * (1 - Math.exp(-dt / tau.current));
      apply(root, shown.current, theme.current);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, [hour, forcedTheme]);

  // A forced theme (?sky=) applies immediately.
  useEffect(() => {
    if (forcedTheme && shown.current !== null) document.documentElement.dataset.sky = forcedTheme;
  }, [forcedTheme]);

  // Leave nothing behind if the app unmounts (hot reload, tests).
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      shown.current = null;
      const root = document.documentElement;
      VARS.forEach((p) => root.style.removeProperty(p));
      delete root.dataset.raf;
    },
    [],
  );
}
