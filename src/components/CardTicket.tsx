import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard, Collaborator, PresenceEntry } from "../types";
import { Celebration } from "./Celebration";
import { PresenceAvatar } from "./PresenceAvatar";
import { Avatar } from "./Avatar";
import { useCardDecorations } from "../lib/boardContext";
import { describeDue, dueStatus, formatDue } from "../lib/dates";
import { labelChipClass } from "../lib/labels";
import { PRIORITY_META } from "../lib/priority";
import { PriorityTag } from "./PriorityTag";
import { CardSpotlightLayers } from "./reactbits/CardSpotlight";
import { useCardSpotlight } from "./reactbits/useCardSpotlight";

const MAX_CHIPS = 3;

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
  const { labelsById, labelIdsByCard, commentCountByCard, doneListIds } =
    useCardDecorations();
  const cardLabels = (labelIdsByCard.get(card.id) ?? [])
    .map((id) => labelsById.get(id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));
  const commentCount = commentCountByCard.get(card.id) ?? 0;
  const due = card.dueDate
    ? dueStatus(card.dueDate, doneListIds.has(card.listId))
    : null;
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

      {cardLabels.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1" aria-label="Labels">
          {cardLabels.slice(0, MAX_CHIPS).map((label) => (
            <li
              key={label.id}
              className={`${labelChipClass(label.color)} max-w-[9rem] truncate rounded-full px-2 py-0.5 text-[11px] font-semibold`}
            >
              {label.name}
            </li>
          ))}
          {cardLabels.length > MAX_CHIPS && (
            <li className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-text-muted">
              +{cardLabels.length - MAX_CHIPS}
              <span className="sr-only"> more labels</span>
            </li>
          )}
        </ul>
      )}

      {(viewers.length > 0 || assignee || card.dueDate || commentCount > 0) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {card.dueDate && due && (
              <span
                className={`due-chip due-${due} inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums`}
                title={describeDue(card.dueDate, due)}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="3.5" width="11" height="10" rx="2" />
                  <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
                </svg>
                <span aria-hidden="true">{formatDue(card.dueDate)}</span>
                <span className="sr-only">{describeDue(card.dueDate, due)}</span>
              </span>
            )}
            {commentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-muted">
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" />
                </svg>
                {commentCount}
                <span className="sr-only"> comment{commentCount === 1 ? "" : "s"}</span>
              </span>
            )}
            {viewers.length > 0 && (
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
            )}
          </div>
          {assignee && (
            <span className="inline-flex" title={`Assigned to ${assignee.name}`}>
              <Avatar
                collaborator={assignee}
                size="card"
                decorative
                className="ring-2 ring-surface"
              />
              <span className="sr-only">Assigned to {assignee.name}</span>
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
  const { dragDisabled } = useCardDecorations();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", card },
    disabled: dragDisabled,
  });
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
      className={`card-spotlight group relative isolate select-none ${dragDisabled ? "cursor-pointer" : "cursor-grab"} rounded-xl border bg-surface py-3 pl-4 pr-3 active:cursor-grabbing ${
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
