/**
 * The living sky: stars, moon, sun, clouds and birds, all drawn here as inline SVG (no external
 * files, so no licences, requests or CSP changes). Everything is decorative (aria-hidden) and driven by
 * CSS variables that useLivingSky sets from the hour; see the "Fixed atmosphere" block in globals.css.
 * Layout is deterministic, so server and client render the same markup.
 */

/** Small seeded generator so the star field is stable across renders. */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rnd = seeded(2026);
  return Array.from({ length: 90 }, (_, i) => ({
    cx: Math.round(rnd() * 1000),
    cy: Math.round(rnd() * 430), // upper part of the sky only
    r: +(0.5 + rnd() * 1.4).toFixed(2),
    base: +(0.45 + rnd() * 0.55).toFixed(2),
    tw: +(2.8 + rnd() * 4).toFixed(1),
    td: +(-rnd() * 6).toFixed(1),
    twinkle: i % 3 !== 0, // a third stay steady so the field does not shimmer all at once
  }));
})();

/** Soft cumulus silhouette, drawn on a 220 x 90 canvas. */
const CLOUD =
  "M34 74 C8 74 2 46 28 40 C28 16 62 8 80 28 C92 4 132 4 142 30 C162 14 196 28 190 52 C214 54 218 74 192 74 Z";

// Seconds to cross the sky: slow (4 to 7 minutes) so the clouds drift rather than race.
const CLOUDS = [
  { top: 9, w: 300, dur: 380, delay: -50, o: 0.46, x0: 12 },
  { top: 19, w: 200, dur: 290, delay: -175, o: 0.36, x0: 58 },
  { top: 31, w: 360, dur: 470, delay: -275, o: 0.4, x0: 34 },
  { top: 43, w: 240, dur: 330, delay: -110, o: 0.32, x0: 76 },
  { top: 55, w: 320, dur: 430, delay: -350, o: 0.3, x0: 6 },
] as const;

/** Birds are two wings that flap about the body. */
function Bird({ flap, dir }: { flap: number; dir?: 1 }) {
  void dir;
  return (
    <svg viewBox="-20 -10 40 20" width="30" height="15" style={{ overflow: "visible" }}>
      <g fill="#1d2b3f">
        <g className="wing" style={{ "--dir": 1, "--flap": `${flap}s` } as React.CSSProperties}>
          <path d="M0 0 C-5 -7 -12 -7 -19 -1 C-12 -3.5 -6 -2.6 0 0 Z" />
        </g>
        <g className="wing" style={{ "--dir": -1, "--flap": `${flap}s` } as React.CSSProperties}>
          <path d="M0 0 C5 -7 12 -7 19 -1 C12 -3.5 6 -2.6 0 0 Z" />
        </g>
      </g>
    </svg>
  );
}

const FLOCKS = [
  { top: 14, dur: 70, delay: -12, rise: -6, birds: [[0, 0, 0.78], [-26, 12, 0.86], [-26, -12, 0.82], [-54, 24, 0.9], [-54, -24, 0.8]] },
  { top: 33, dur: 95, delay: -58, rise: 5, birds: [[0, 0, 0.84], [-22, 10, 0.78], [-44, 18, 0.88]] },
] as const;

export function SkyScene() {
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* Stars */}
      <svg className="stars absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        {STARS.map((s, i) => (
          <circle
            key={i}
            className={s.twinkle ? "star" : undefined}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="#fff8e8"
            opacity={s.base}
            style={s.twinkle ? ({ "--tw": `${s.tw}s`, "--td": `${s.td}s` } as React.CSSProperties) : undefined}
          />
        ))}
      </svg>

      {/* Moon: a crescent with a soft halo and a few craters */}
      <div className="body-track moon-track">
        <div className="glow moon-orb" />
        <svg className="moon-body" viewBox="-50 -50 100 100">
          <defs>
            <mask id="crescent">
              <rect x="-50" y="-50" width="100" height="100" fill="#fff" />
              <circle cx="15" cy="-7" r="23" fill="#000" />
            </mask>
            <radialGradient id="moonFace" cx="0.35" cy="0.3" r="0.85">
              <stop offset="0" stopColor="#fffdf6" />
              <stop offset="1" stopColor="#cfd3e6" />
            </radialGradient>
          </defs>
          <g mask="url(#crescent)">
            <circle r="26" fill="url(#moonFace)" />
            <circle cx="-12" cy="8" r="3.6" fill="#b9bdd2" opacity="0.55" />
            <circle cx="-4" cy="-12" r="2.4" fill="#b9bdd2" opacity="0.5" />
            <circle cx="-16" cy="-4" r="1.8" fill="#b9bdd2" opacity="0.45" />
          </g>
        </svg>
      </div>

      {/* Sun: a warm disc with slowly turning rays */}
      <div className="body-track sun-track">
        <div className="glow sun-orb" />
        <svg className="sun-body" viewBox="-60 -60 120 120">
          <defs>
            <radialGradient id="sunFace" cx="0.45" cy="0.4" r="0.75">
              <stop offset="0" stopColor="#fffbe8" />
              <stop offset="0.65" stopColor="#ffe28a" />
              <stop offset="1" stopColor="#ffc552" />
            </radialGradient>
          </defs>
          <g className="sun-rays" stroke="#ffe7a0" strokeWidth="2.6" strokeLinecap="round" opacity="0.75">
            {Array.from({ length: 16 }, (_, i) => (
              <line key={i} x1="0" y1="-38" x2="0" y2={i % 2 ? -45 : -52} transform={`rotate(${i * 22.5})`} />
            ))}
          </g>
          <circle r="27" fill="url(#sunFace)" />
        </svg>
      </div>

      {/* Clouds */}
      <div className="clouds absolute inset-0">
        {CLOUDS.map((c, i) => (
          <svg
            key={i}
            className="cloud"
            // The second puff is drawn above y=0, so the canvas starts higher: nothing is clipped at the top.
            viewBox="-10 -24 240 114"
            width={c.w}
            style={{ top: `${c.top}%`, "--dur": `${c.dur}s`, "--delay": `${c.delay}s`, "--x0": `${c.x0}vw` } as React.CSSProperties}
          >
            <path d={CLOUD} fill="currentColor" fillOpacity={c.o} />
            <path d={CLOUD} fill="currentColor" fillOpacity={c.o * 0.5} transform="translate(26 -10) scale(0.72)" />
          </svg>
        ))}
      </div>

      {/* Birds */}
      <div className="birds absolute inset-0">
        {FLOCKS.map((f, i) => (
          <div
            key={i}
            className="flock"
            style={{ top: `${f.top}%`, "--dur": `${f.dur}s`, "--delay": `${f.delay}s`, "--rise": `${f.rise}vh` } as React.CSSProperties}
          >
            {f.birds.map(([x, y, flap], j) => (
              <div key={j} style={{ position: "absolute", left: x, top: y }}>
                <Bird flap={flap} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
