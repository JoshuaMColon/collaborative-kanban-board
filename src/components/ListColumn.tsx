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
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyColumnArt } from "./Illustrations";

export function ListColumn({
  list,
  cards,
  collaboratorsById,
  presenceByCard,
  onOpenCard,
  onAddCard,
  onDeleteList,
  newCardIds,
  celebratingCardId,
}: {
  list: BoardList;
  cards: BoardCard[];
  collaboratorsById: Map<string, Collaborator>;
  presenceByCard: Map<string, PresenceEntry[]>;
  onOpenCard: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  newCardIds: ReadonlySet<string>;
  celebratingCardId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: list.id,
    data: { type: "list", listId: list.id },
  });

  const [isAdding, setIsAdding] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  const cardCountLabel = `${cards.length} card${cards.length === 1 ? "" : "s"}`;
  const deleteMessage =
    cards.length > 0
      ? `This will permanently delete "${list.title}" and its ${cardCountLabel}. This can't be undone.`
      : `This will permanently delete the empty list "${list.title}". This can't be undone.`;

  function handleConfirmDelete() {
    setConfirmingDelete(false);
    // Optimistic in the hook: the column disappears right away and comes
    // back (with a message) if the delete fails.
    void onDeleteList(list.id);
  }

  return (
    <section
      aria-label={list.title}
      className="group/list flex w-full shrink-0 flex-col rounded-2xl border border-line/70 bg-surface-2/80 p-2.5 shadow-soft backdrop-blur-sm lg:w-72"
    >
      <div className="mb-2 flex items-center justify-between gap-2 px-1.5 pt-0.5">
        <h2 className="min-w-0 truncate font-display text-[15px] font-bold text-text-primary">
          {list.title}
        </h2>
        <div className="flex items-center gap-1">
          <span
            className="min-w-[1.5rem] rounded-full bg-surface px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums text-text-secondary ring-1 ring-inset ring-line"
            aria-label={cardCountLabel}
          >
            {cards.length}
          </span>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-lg p-1.5 text-text-muted transition hover:bg-accent/10 hover:text-accent focus-visible:opacity-100 lg:opacity-0 lg:group-hover/list:opacity-100 lg:group-focus-within/list:opacity-100"
            aria-label={`Delete list "${list.title}"`}
            title="Delete list"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 4h11M6.5 4V2.75h3V4M4 4l.6 9.25h6.8L12 4M6.75 6.5v4.5M9.25 6.5v4.5" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2.5 rounded-xl p-1 transition-colors duration-200 ${
          isOver ? "bg-accent/[0.07] ring-2 ring-inset ring-accent/30" : ""
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
                isNew={newCardIds.has(card.id)}
                celebrate={celebratingCardId === card.id}
              />
            );
          })}
        </SortableContext>

        {cards.length === 0 && !isAdding && (
          <div className="flex flex-col items-center px-2 py-5 text-center">
            <EmptyColumnArt className="h-12 w-16" />
            <p className="mt-2 font-display text-sm font-semibold text-text-secondary">
              Nothing here yet
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              Drop a card here or add a new one.
            </p>
          </div>
        )}

        {isAdding ? (
          <div className="animate-fadeUp rounded-xl border border-line bg-surface p-2.5 shadow-soft focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/25">
            <label className="sr-only" htmlFor={`new-card-${list.id}`}>
              New card title
            </label>
            <textarea
              id={`new-card-${list.id}`}
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
              placeholder="What needs doing?"
              rows={2}
              className="w-full resize-none border-none bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={submitNewCard}
                disabled={submitting || !draftTitle.trim()}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 disabled:opacity-50"
              >
                Add card
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setDraftTitle("");
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-2 hover:text-text-primary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium text-text-secondary transition hover:bg-surface hover:text-accent hover:shadow-soft"
          >
            <span aria-hidden="true" className="text-base leading-none">+</span>
            Add a card
          </button>
        )}
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete "${list.title}"?`}
          message={deleteMessage}
          confirmLabel={
            cards.length > 0 ? `Delete list and ${cardCountLabel}` : "Delete list"
          }
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </section>
  );
}
