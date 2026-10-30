/** Small hand-drawn-style inline SVGs for empty states. Decorative only. */

export function EmptyColumnArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 48"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* stacked note cards */}
      <rect x="14" y="10" width="34" height="26" rx="5" transform="rotate(-6 31 23)" fill="rgb(var(--surface))" stroke="rgb(var(--border-strong))" strokeWidth="1.5" />
      <rect x="16" y="12" width="34" height="26" rx="5" transform="rotate(4 33 25)" fill="rgb(var(--surface))" stroke="rgb(var(--border-strong))" strokeWidth="1.5" />
      <path d="M23 22h16M23 27h10" stroke="rgb(var(--text-muted) / 0.6)" strokeWidth="1.5" strokeLinecap="round" transform="rotate(4 33 25)" />
      {/* little sprout */}
      <path d="M50 40c0-5 0-8 0-10" stroke="rgb(var(--priority-low))" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 32c-3.5 0-5.5-2-5.5-5 3.5 0 5.5 2 5.5 5z" fill="rgb(var(--priority-low) / 0.55)" />
      <path d="M50 30c3 0 5-2 5-5-3 0-5 2-5 5z" fill="rgb(var(--priority-low) / 0.8)" />
      <path d="M44 41h12" stroke="rgb(var(--border-strong))" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyBoardArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 110" className={className} fill="none" aria-hidden="true">
      <ellipse cx="80" cy="100" rx="62" ry="6" fill="rgb(var(--shadow) / 0.08)" />
      {/* three columns */}
      {[18, 62, 106].map((x, i) => (
        <g key={x}>
          <rect x={x} y="14" width="36" height="78" rx="8" fill="rgb(var(--surface-2))" stroke="rgb(var(--border-strong))" strokeWidth="1.5" />
          <rect x={x + 6} y="22" width="18" height="4" rx="2" fill="rgb(var(--text-muted) / 0.5)" />
          {Array.from({ length: 3 - i }).map((_, j) => (
            <rect key={j} x={x + 5} y={32 + j * 18} width="26" height="13" rx="3.5" fill="rgb(var(--surface))" stroke="rgb(var(--border-strong))" strokeWidth="1.2" />
          ))}
        </g>
      ))}
      {/* sticky note with heart */}
      <rect x="118" y="2" width="30" height="28" rx="4" transform="rotate(10 133 16)" fill="rgb(var(--accent) / 0.2)" stroke="rgb(var(--accent) / 0.6)" strokeWidth="1.3" />
      <path d="M133 21c-5-3.5-7-6-7-8.2a3.4 3.4 0 0 1 7-1.3 3.4 3.4 0 0 1 7 1.3c0 2.2-2 4.7-7 8.2z" fill="rgb(var(--accent))" transform="rotate(10 133 16)" />
    </svg>
  );
}
