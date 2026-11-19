/**
 * Refraction map for liquid-glass cards. A soft noise field displaces whatever is behind a card by a
 * few pixels, which reads as light bending through thick glass. Referenced from CSS as url(#liquid).
 */
export function LiquidFilter() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute", pointerEvents: "none" }}>
      <filter id="liquid" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="7" result="noise" />
        <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
        <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="22" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
