import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { BoardCard, BoardList, Collaborator, PresenceEntry } from "../types";
import { CardTicket } from "./CardTicket";

export function ListColumn({
  list,
  cards,
  collaboratorsById,
  presenceByCard,
}: {
  list: BoardList;
  cards: BoardCard[];
  collaboratorsById: Map<string, Collaborator>;
  presenceByCard: Map<string, PresenceEntry[]>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: "list", listId: list.id },
  });

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold text-text-secondary">
          {list.title}
        </h2>
        <span className="rounded-sm bg-ink-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
          {cards.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-md border border-dashed p-2 transition-colors ${
          isOver ? "border-signal-amber/60 bg-signal-amber/5" : "border-ink-border/60"
        }`}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => {
            const viewers = (presenceByCard.get(card.id) ?? [])
              .map((p) => {
                const collaborator = collaboratorsById.get(p.collaboratorId);
                return collaborator ? { ...collaborator, presence: p } : null;
              })
              .filter((v): v is NonNullable<typeof v> => v !== null);

            return (
              <CardTicket
                key={card.id}
                card={card}
                assignee={
                  card.assigneeId ? collaboratorsById.get(card.assigneeId) : undefined
                }
                viewers={viewers}
              />
            );
          })}
        </SortableContext>

        {cards.length === 0 && (
          <p className="px-1 py-4 text-center font-mono text-[11px] text-text-muted">
            Nothing staged here.
          </p>
        )}
      </div>
    </div>
  );
}
