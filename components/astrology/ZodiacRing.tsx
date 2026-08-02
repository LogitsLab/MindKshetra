/**
 * The astrology mark — three concentric hairline circles, twelve rāśi ticks
 * (cardinal points heavier), and an upward pointer at the ascendant.
 *
 * DESIGN.md lists this under Components with the instruction "reuse it; do not
 * rebuild it from pseudo-elements". It was a private function inside
 * `app/astrology/page.tsx`, so the instruction was unfollowable — the only way
 * to get the mark on a second surface was to redraw it. It lives here now.
 *
 * `currentColor` throughout: the caller sets the colour and the opacity, and
 * pairs it with `.astro-zodiac-ring` when it should drift.
 */
export default function ZodiacRing({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden fill="none">
      <circle
        cx="120"
        cy="120"
        r="108"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="3 8"
        opacity="0.5"
      />
      <circle
        cx="120"
        cy="120"
        r="86"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.28"
      />
      <circle
        cx="120"
        cy="120"
        r="58"
        stroke="currentColor"
        strokeWidth="0.35"
        opacity="0.18"
      />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = 120 + Math.cos(rad) * 108;
        const y = 120 + Math.sin(rad) * 108;
        return (
          <circle
            key={deg}
            cx={x}
            cy={y}
            r={deg % 90 === 0 ? 2 : 1.2}
            fill="currentColor"
            opacity={deg % 90 === 0 ? 0.75 : 0.4}
          />
        );
      })}
      <path
        d="M120 22 L128 42 L120 36 L112 42 Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  );
}
