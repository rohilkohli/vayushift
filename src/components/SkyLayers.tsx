import type { CSSProperties } from "react";
import { CLOUD, CLOUDS, FLOCKS, STARS } from "./skyData";

/** The stars. A third stay steady so the field does not shimmer all at once. */
export function StarField() {
  return (
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
          style={s.twinkle ? ({ "--tw": `${s.tw}s`, "--td": `${s.td}s` } as CSSProperties) : undefined}
        />
      ))}
    </svg>
  );
}

/** Slow drifting clouds, each two overlapping puffs of the same silhouette. */
export function CloudLayer() {
  return (
    <div className="clouds absolute inset-0">
      {CLOUDS.map((c, i) => (
        <svg
          key={i}
          className="cloud"
          // The second puff is drawn above y=0, so the canvas starts higher: nothing is clipped at the top.
          viewBox="-10 -24 240 114"
          width={c.w}
          style={{ top: `${c.top}%`, "--dur": `${c.dur}s`, "--delay": `${c.delay}s`, "--x0": `${c.x0}vw` } as CSSProperties}
        >
          <path d={CLOUD} fill="currentColor" fillOpacity={c.o} />
          <path d={CLOUD} fill="currentColor" fillOpacity={c.o * 0.5} transform="translate(26 -10) scale(0.72)" />
        </svg>
      ))}
    </div>
  );
}

/** A bird is two wings that flap about the body. */
function Bird({ flap }: { flap: number }) {
  return (
    <svg viewBox="-20 -10 40 20" width="30" height="15" style={{ overflow: "visible" }}>
      <g fill="#1d2b3f">
        <g className="wing" style={{ "--dir": 1, "--flap": `${flap}s` } as CSSProperties}>
          <path d="M0 0 C-5 -7 -12 -7 -19 -1 C-12 -3.5 -6 -2.6 0 0 Z" />
        </g>
        <g className="wing" style={{ "--dir": -1, "--flap": `${flap}s` } as CSSProperties}>
          <path d="M0 0 C5 -7 12 -7 19 -1 C12 -3.5 6 -2.6 0 0 Z" />
        </g>
      </g>
    </svg>
  );
}

/** Two flocks crossing at different heights and speeds. */
export function BirdLayer() {
  return (
    <div className="birds absolute inset-0">
      {FLOCKS.map((f, i) => (
        <div
          key={i}
          className="flock"
          style={{ top: `${f.top}%`, "--dur": `${f.dur}s`, "--delay": `${f.delay}s`, "--rise": `${f.rise}vh` } as CSSProperties}
        >
          {f.birds.map(([x, y, flap], j) => (
            <div key={j} style={{ position: "absolute", left: x, top: y }}>
              <Bird flap={flap} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
