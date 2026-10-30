import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard, Collaborator, PresenceEntry } from "../types";
import { Celebration } from "./Celebration";
import { PresenceAvatar } from "./PresenceAvatar";
import { PRIORITY_META } from "../lib/priority";
import { PriorityTag } from "./PriorityTag";
import { CardSpotlightLayers } from "./reactbits/CardSpotlight";
import { useCardSpotlight } from "./reactbits/useCardSpotlight";

/** Pure visual card, shared by the sortable card and the drag overlay. */
export function CardFace({
  card,
  assignee,
  viewers,
  lifted = false,
}: {
  card: BoardCard;
  assignee?: Collaborator;
  viewers: (Collaborator & { presence: PresenceEntry })[];
  lifted?: boolean;
}) {
  const meta = PRIORITY_META[card.priority];
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${meta.strip}`}
      />

      <div className="flex items-start justify-between gap-2">
        <PriorityTag priority={card.priority} />
        <span className="pt-0.5 font-mono text-[10.5px] tabular-nums tracking-tight text-text-muted">
          {card.code}
        </span>
      </div>

      <p className="mt-2 break-words font-display text-[15px] font-semibold leading-snug text-text-primary">
        {card.title}
      </p>

      {card.description && (
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
          {card.description}
        </p>
      )}

      {(viewers.length > 0 || assignee) && (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            {viewers.map((v) => (
              <PresenceAvatar
                key={v.id}
                collaborator={v}
                isActive={!lifted}
                size="sm"
              />
            ))}
          </div>
          {assignee && (
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-[#1c1917] ring-2 ring-surface"
              style={{ backgroundColor: assignee.color }}
              title={`Assigned to ${assignee.name}`}
            >
              {assignee.initials}
              <span className="sr-only">, assigned to {assignee.name}</span>
            </span>
          )}
        </div>
      )}
    </>
  );
}

export function CardTicket({
  card,
  assignee,
  viewers,
  onOpen,
  isNew = false,
  celebrate = false,
}: {
  card: BoardCard;
  assignee?: Collaborator;
  viewers: (Collaborator & { presence: PresenceEntry })[];
  onOpen?: (card: BoardCard) => void;
  /** Briefly highlights a card that was just added. */
  isNew?: boolean;
  /** Shows a small check + confetti after the card lands in a "Done" list. */
  celebrate?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } });
  // Cursor-following warm glow; off while this card is the drag placeholder.
  const spotlight = useCardSpotlight(isDragging);

  const style = {
    transform: CSS.Transform.toString(transform),
    // Keep dnd-kit's transform transition and add our own soft hover easing.
    transition: [
      transition,
      "box-shadow 200ms ease",
      "border-color 200ms ease",
      "opacity 200ms ease",
    ]
      .filter(Boolean)
      .join(", "),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onPointerMove={spotlight.onPointerMove}
      onClick={() => onOpen?.(card)}
      onKeyDown={(e) => {
        // dnd-kit's attributes make the card focusable; let Enter open it.
        if (e.key === "Enter") onOpen?.(card);
      }}
      aria-label={`${card.title}, ${PRIORITY_META[card.priority].label} priority, ${card.code}`}
      className={`card-spotlight group relative isolate cursor-grab select-none rounded-xl border bg-surface py-3 pl-4 pr-3 active:cursor-grabbing ${
        isDragging
          ? "border-dashed border-line-strong bg-surface-2 opacity-60 shadow-none [&>*]:opacity-30"
          : "border-line/80 shadow-soft hover:border-line-strong hover:shadow-soft-hover"
      } ${isNew && !isDragging ? "animate-newCard" : ""} ${
        // The card is its own stacking context (for the spotlight), so lift it
        // above its neighbours while confetti spills past its edges.
        celebrate && !isDragging ? "z-[1]" : ""
      }`}
    >
      {!isDragging && <CardSpotlightLayers />}
      <CardFace card={card} assignee={assignee} viewers={viewers} />
      {celebrate && !isDragging && <Celebration />}
    </div>
  );
}

/** What follows the pointer while dragging. */
export function CardDragPreview({
  card,
  assignee,
}: {
  card: BoardCard;
  assignee?: Collaborator;
}) {
  return (
    <div className="card-lifted relative cursor-grabbing rounded-xl border border-line-strong bg-surface py-3 pl-4 pr-3 shadow-lift">
      <CardFace card={card} assignee={assignee} viewers={[]} lifted />
    </div>
  );
}
