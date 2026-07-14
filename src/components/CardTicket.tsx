import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard, Collaborator, PresenceEntry } from "../types";
import { PresenceAvatar } from "./PresenceAvatar";
import { PriorityTag } from "./PriorityTag";

export function CardTicket({
  card,
  assignee,
  viewers,
  onOpen,
}: {
  card: BoardCard;
  assignee?: Collaborator;
  viewers: (Collaborator & { presence: PresenceEntry })[];
  onOpen?: (card: BoardCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen?.(card)}
      className={`group relative cursor-grab select-none rounded-md border border-ink-border bg-ink-surface pl-4 pr-3 py-3 shadow-sm transition-colors hover:border-ink-borderLight active:cursor-grabbing ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div
        className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-evenly"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className="h-1 w-1 rounded-full bg-ink-border" />
        ))}
      </div>

      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[11px] text-text-muted">
          {card.code}
        </span>
        <PriorityTag priority={card.priority} />
      </div>

      <p className="mt-1.5 font-display text-[15px] font-medium leading-snug text-text-primary">
        {card.title}
      </p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {viewers.map((v) => (
            <PresenceAvatar key={v.id} collaborator={v} isActive size="sm" />
          ))}
        </div>
        {assignee && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-text-muted">
              {assignee.initials}
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: assignee.color }}
            />
          </div>
        )}
      </div>
    </div>
  );
}