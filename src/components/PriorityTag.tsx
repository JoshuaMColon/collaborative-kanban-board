import type { CardPriority } from "../types";

const STYLES: Record<CardPriority, { label: string; className: string }> = {
  urgent: {
    label: "URGENT",
    className: "bg-signal-amber/15 text-signal-amber border-signal-amber/40",
  },
  standard: {
    label: "STANDARD",
    className: "bg-text-secondary/10 text-text-secondary border-text-secondary/30",
  },
  low: {
    label: "LOW",
    className: "bg-live-green/10 text-live-green border-live-green/30",
  },
};

export function PriorityTag({ priority }: { priority: CardPriority }) {
  const style = STYLES[priority];
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-wider ${style.className}`}
    >
      {style.label}
    </span>
  );
}
