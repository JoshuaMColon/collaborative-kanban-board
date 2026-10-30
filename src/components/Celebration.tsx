import type { CSSProperties } from "react";

const COLORS = [
  "rgb(var(--accent))",
  "rgb(var(--priority-low))",
  "rgb(var(--priority-standard))",
  "rgb(var(--blob-1))",
  "rgb(var(--blob-3))",
];

// Precomputed so every burst looks the same and render stays pure.
const PIECES = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1);
  const distance = 38 + (i % 3) * 14;
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance - 10)}px`,
    rot: `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
    delay: `${(i % 4) * 25}ms`,
    color: COLORS[i % COLORS.length],
  };
});

/**
 * A small check badge plus a light, CSS-only confetti burst, shown briefly
 * when a card lands in a "Done"-style list. The confetti is hidden under
 * prefers-reduced-motion; the check stays as a calm confirmation.
 */
export function Celebration() {
  return (
    <span
      className="pointer-events-none absolute -right-1.5 -top-1.5 z-10"
      aria-hidden="true"
    >
      <span className="confetti">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti__piece"
            style={
              {
                "--dx": p.dx,
                "--dy": p.dy,
                "--rot": p.rot,
                "--delay": p.delay,
                backgroundColor: p.color,
              } as CSSProperties
            }
          />
        ))}
      </span>
      <span className="celebrate-check flex h-6 w-6 items-center justify-center rounded-full bg-success text-surface shadow-soft">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
      </span>
    </span>
  );
}
