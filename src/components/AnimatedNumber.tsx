"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  decimals?: number;
  /** Tween length in ms. */
  duration?: number;
}

const prefersReducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Counts from the previous value to the new one. The moving digits are aria-hidden and the final
 * value is exposed once in an sr-only span, so assistive tech never announces every frame.
 */
export function AnimatedNumber({ value, decimals = 0, duration = 450 }: Props) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || from.current === value) {
      from.current = value;
      setShown(value);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);

  const settled = shown === value;
  return (
    <>
      <span aria-hidden="true">{settled ? String(value) : shown.toFixed(decimals)}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
