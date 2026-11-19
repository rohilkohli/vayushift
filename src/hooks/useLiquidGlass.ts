"use client";
import { useEffect } from "react";

/**
 * Liquid glass behaviour for any element with the `.liquid` class:
 *  1. turns on SVG refraction (`html[data-liquid]`) only where backdrop-filter accepts url() filters
 *     (Chromium); other browsers keep the plain frosted look;
 *  2. moves a specular highlight under the pointer by updating --mx / --my (one rAF per frame).
 */
export function useLiquidGlass() {
  useEffect(() => {
    const root = document.documentElement;
    const nav = navigator as Navigator & { userAgentData?: { brands: Array<{ brand: string }> } };
    const isChromium = nav.userAgentData?.brands.some((b) => /Chromium/i.test(b.brand)) ?? false;
    if (isChromium && CSS.supports("backdrop-filter", "url(#liquid) blur(1px)")) root.dataset.liquid = "on";

    if (matchMedia("(pointer: coarse)").matches) return; // no hover highlight on touch
    let frame = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const apply = () => {
      frame = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${x - r.left}px`);
      el.style.setProperty("--my", `${y - r.top}px`);
      pending = null;
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.<HTMLElement>(".liquid");
      if (!el) return;
      pending = { el, x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
      delete root.dataset.liquid;
    };
  }, []);
}
