"use client";
import { useCallback, useEffect, useState } from "react";

export const CONTRAST_STORAGE_KEY = "vayushift-contrast";

/**
 * High-contrast mode. Starts from the saved choice, otherwise from the device's "more contrast" setting, and
 * sets data-contrast on <html> (the styles live in globals.css). It starts off so the server and first client
 * render match; the real value is applied once after hydration. The choice is remembered in this browser only.
 */
export function useContrast() {
  const [high, setHigh] = useState(false);

  useEffect(() => {
    // ?contrast=high|normal (a shareable link) beats the saved choice, which beats the device setting.
    const asked = new URLSearchParams(globalThis.location.search).get("contrast");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(CONTRAST_STORAGE_KEY);
    } catch {
      // storage blocked: use the device setting
    }
    const choice = asked === "high" || asked === "normal" ? asked : saved;
    if (choice === "high" || choice === "normal") setHigh(choice === "high");
    else setHigh(window.matchMedia?.("(prefers-contrast: more)").matches ?? false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (high) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
  }, [high]);

  const toggle = useCallback(() => {
    setHigh((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(CONTRAST_STORAGE_KEY, next ? "high" : "normal");
      } catch {
        // not remembered; still applied for this visit
      }
      return next;
    });
  }, []);

  return { high, toggle };
}
