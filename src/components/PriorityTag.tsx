import { PRIORITY_META } from "../lib/priority";
import type { CardPriority } from "../types";

export function PriorityTag({ priority }: { priority: CardPriority }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.chip}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
      <span className="sr-only"> priority</span>
    </span>
  );
}
