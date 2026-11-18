/** Material Symbols glyph. Decorative only: never the sole carrier of meaning. */
export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`msym ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}
