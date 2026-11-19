/**
 * Ambient wind: thin curling streaks drifting across the sky. Purely decorative (aria-hidden,
 * pointer-events none) and hidden under prefers-reduced-motion. Values are fixed, not random,
 * so server and client render identically.
 */
const STREAKS = [
  { top: 9, w: 260, dur: 38, delay: -4, o: 0.2, s: 1 },
  { top: 17, w: 180, dur: 29, delay: -17, o: 0.16, s: 0.8 },
  { top: 28, w: 340, dur: 46, delay: -9, o: 0.22, s: 1.2 },
  { top: 39, w: 210, dur: 33, delay: -26, o: 0.18, s: 0.9 },
  { top: 52, w: 300, dur: 42, delay: -2, o: 0.24, s: 1.1 },
  { top: 64, w: 190, dur: 31, delay: -21, o: 0.2, s: 0.85 },
  { top: 76, w: 280, dur: 40, delay: -13, o: 0.22, s: 1 },
  { top: 88, w: 220, dur: 35, delay: -30, o: 0.18, s: 0.9 },
] as const;

/** One gust: a long gentle wave ending in a small curl. */
const GUST = "M2 22 C 42 22 62 8 108 14 S 176 30 214 18 S 262 4 290 10 C 304 13 306 26 294 27 C 286 28 283 20 291 18";

export function WindLayer() {
  return (
    <div className="wind pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {STREAKS.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 310 36"
          className="wind-streak absolute left-0"
          style={
            {
              top: `${s.top}%`,
              width: s.w * s.s,
              height: s.w * s.s * (36 / 310),
              "--o": s.o,
              // Gusts speed up in the afternoon mixing window; --wind-speed is set by the sky.
              animationDuration: `calc(${s.dur}s / var(--wind-speed, 1))`,
              animationDelay: `${s.delay}s`,
            } as React.CSSProperties
          }
        >
          <path d={GUST} fill="none" stroke="var(--wind)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  );
}
