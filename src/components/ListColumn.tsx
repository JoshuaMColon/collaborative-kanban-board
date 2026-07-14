import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState } from "react";
import type {
  BoardCard,
  BoardList,
  Collaborator,
  PresenceEntry,
} from "../types";
import { CardTicket } from "./CardTicket";

export function ListColumn({
  list,
  cards,
  collaboratorsById,
  presenceByCard,
  onOpenCard,
  onAddCard,
  onDeleteList,
}: {
  list: BoardList;
  cards: BoardCard[];
  collaboratorsById: Map<string, Collaborator>;
  presenceByCard: Map<string, PresenceEntry[]>;
  onOpenCard: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: "list", listId: list.id },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitNewCard() {
    const trimmed = draftTitle.trim();
    if (!trimmed) {
      setIsAdding(false);
      setDraftTitle("");
      return;
    }
    setSubmitting(true);
    await onAddCard(list.id, trimmed);
    setSubmitting(false);
    setDraftTitle("");
    setIsAdding(false);
  }

  async function handleDeleteList() {
    const confirmMsg =
      cards.length > 0
        ? `Delete "${list.title}" and its ${cards.length} card(s)? This can't be undone.`
        : `Delete "${list.title}"? This can't be undone.`;
    if (!window.confirm(confirmMsg)) return;
    await onDeleteList(list.id);
  }

  return (
    <div className="flex w-full shrink-0 flex-col lg:w-72">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="font-display text-sm font-semibold text-text-secondary">
          {list.title}
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-ink-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            {cards.length}
          </span>
          <button
            type="button"
            onClick={handleDeleteList}
            className="rounded-sm px-1 font-mono text-[11px] text-text-muted opacity-0 transition hover:text-signal-amber group-hover:opacity-100 focus:opacity-100"
            aria-label={`Delete ${list.title} list`}
            title="Delete list"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`group flex min-h-[120px] flex-1 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver
            ? "border-signal-amber/60 bg-signal-amber/5 shadow-inner"
            : "border-ink-border/70 bg-ink-surface/70"
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
                  card.assigneeId
                    ? collaboratorsById.get(card.assigneeId)
                    : undefined
                }
                viewers={viewers}
                onOpen={onOpenCard}
              />
            );
          })}
        </SortableContext>

        {cards.length === 0 && !isAdding && (
          <p className="px-1 py-4 text-center font-mono text-[11px] text-text-muted">
            Nothing staged here.
          </p>
        )}

        {isAdding ? (
          <div className="rounded-md border border-ink-border bg-ink p-2">
            <textarea
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submitNewCard();
                }
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setDraftTitle("");
                }
              }}
              placeholder="Card title…"
              rows={2}
              className="w-full resize-none border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={submitNewCard}
                disabled={submitting || !draftTitle.trim()}
                className="rounded-sm bg-signal-amber px-2.5 py-1 font-mono text-[11px] font-semibold text-ink disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setDraftTitle("");
                }}
                className="rounded-sm px-2.5 py-1 font-mono text-[11px] text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="rounded-md border border-dashed border-ink-border/70 px-2 py-2 text-left font-mono text-[11px] text-text-muted transition hover:border-signal-amber/40 hover:text-signal-amber"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  );
}