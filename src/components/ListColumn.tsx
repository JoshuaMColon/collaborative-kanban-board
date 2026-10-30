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

export function ListColumn({
  list,
  cards,
  collaboratorsById,
  presenceByCard,
  onOpenCard,
  onAddCard,
  onDeleteList,
  electricCardIds,
  theme,
}: {
  list: BoardList;
  cards: BoardCard[];
  collaboratorsById: Map<string, Collaborator>;
  presenceByCard: Map<string, PresenceEntry[]>;
  onOpenCard: (card: BoardCard) => void;
  onAddCard: (listId: string, title: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  electricCardIds: ReadonlySet<string>;
  theme: "light" | "dark";
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
    <div className="group/list flex w-full shrink-0 flex-col lg:w-72">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="min-w-0 truncate font-display text-sm font-semibold text-text-secondary">
          {list.title}
        </h2>
        <div className="flex items-center gap-1.5">
          <span className="rounded-sm bg-ink-surface px-1.5 py-0.5 font-mono text-[10px] text-text-muted">
            {cards.length}
          </span>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="rounded-sm p-1 text-text-muted transition hover:bg-signal-amber/10 hover:text-signal-amber focus-visible:opacity-100 lg:opacity-0 lg:group-hover/list:opacity-100 lg:group-focus-within/list:opacity-100"
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
                isNew={electricCardIds.has(card.id)}
                electricColor={theme === "dark" ? "#ff3030" : "#7df9ff"}
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
    </div>
  );
}
