/** The moon and the sun. Both are positioned by CSS variables that useLivingSky sets from the hour. */

/** A crescent moon with a soft halo and a few craters. */
export function Moon() {
  return (
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
  );
}

/** A warm disc with slowly turning rays. */
export function Sun() {
  return (
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
  );
}
