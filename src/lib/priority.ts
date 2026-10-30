import type { CardPriority } from "../types";

/** Label + Tailwind classes for each priority (chip, card strip, dot). */
export const PRIORITY_META: Record<
  CardPriority,
  { label: string; chip: string; strip: string; dot: string }
> = {
  urgent: {
    label: "Urgent",
    chip: "bg-priority-urgent/10 text-priority-urgent ring-priority-urgent/25",
    strip: "bg-priority-urgent",
    dot: "bg-priority-urgent",
  },
  standard: {
    label: "Standard",
    chip: "bg-priority-standard/10 text-priority-standard ring-priority-standard/25",
    strip: "bg-priority-standard/70",
    dot: "bg-priority-standard",
  },
  low: {
    label: "Low",
    chip: "bg-priority-low/10 text-priority-low ring-priority-low/25",
    strip: "bg-priority-low/70",
    dot: "bg-priority-low",
  },
};
