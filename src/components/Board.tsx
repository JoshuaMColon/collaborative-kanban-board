import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState } from "react";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useBoardData } from "../hooks/useBoardData";
import { usePresence } from "../hooks/usePresence";
import { identityFor } from "../lib/identity";
import type { BoardCard, Collaborator } from "../types";
import { CardModal } from "./CardModal";
import { CardTicket } from "./CardTicket";
import { ListColumn } from "./ListColumn";
import { PresenceBar } from "./PresenceBar";

const ORDER_GAP = 1024; // spacing between fractional order values

// Prefers whatever the pointer is literally inside; if the pointer is
// momentarily between droppables (e.g. crossing a gap), holds onto the last
// known valid target instead of flickering to the wrong container.
function useStableCollisionDetection() {
  const lastOverId = useRef<string | null>(null);

  const strategy: CollisionDetection = useCallback((args) => {
    const pointerIntersections = pointerWithin(args);
    const intersections =
      pointerIntersections.length > 0
        ? pointerIntersections
        : rectIntersection(args);

    const overId = getFirstCollision(intersections, "id");

    if (overId != null) {
      lastOverId.current = String(overId);
      return [{ id: overId }];
    }

    return lastOverId.current ? [{ id: lastOverId.current }] : [];
  }, []);

  return strategy;
}

export function Board({
  boardId,
  theme,
  onToggleTheme,
}: {
  boardId: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const {
    session,
    loading: authLoading,
    error: authError,
  } = useAuthBootstrap();
  const ready = !!session;

  const collisionDetectionStrategy = useStableCollisionDetection();

  const {
    boardTitle,
    lists,
    cards,
    loading,
    error,
    moveCard,
    updateBoardTitle,
    createCard,
    updateCard,
    deleteCard,
    createList,
    deleteList,
  } = useBoardData(boardId, ready);
  const { presence } = usePresence(boardId, session?.user.id ?? null, ready);

  // Transient override applied only during an active drag, so a card can
  // visually jump to another list before the drop is committed to Supabase.
  const [dragOverride, setDragOverride] = useState<{
    cardId: string;
    listId: string;
  } | null>(null);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);
  const [editingCard, setEditingCard] = useState<BoardCard | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // We don't have a profiles table yet, so display identity (initials/color)
  // is derived deterministically from the user id for anyone we see via
  // Presence. Swap this for real profile data once that table exists.
  const collaboratorsById = useMemo(() => {
    const map = new Map<string, Collaborator>();
    for (const p of presence) {
      if (!map.has(p.collaboratorId)) {
        map.set(p.collaboratorId, identityFor(p.collaboratorId));
      }
    }
    return map;
  }, [presence]);

  const presenceByCard = useMemo(() => {
    const map = new Map<string, typeof presence>();
    for (const p of presence) {
      if (!p.viewingCardId) continue;
      const list = map.get(p.viewingCardId) ?? [];
      list.push(p);
      map.set(p.viewingCardId, list);
    }
    return map;
  }, [presence]);

  const displayCards = useMemo(() => {
    if (!dragOverride) return cards;
    return cards.map((c) =>
      c.id === dragOverride.cardId ? { ...c, listId: dragOverride.listId } : c,
    );
  }, [cards, dragOverride]);

  const cardsByList = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const list of lists) map.set(list.id, []);
    for (const card of [...displayCards].sort((a, b) => a.order - b.order)) {
      map.get(card.listId)?.push(card);
    }
    return map;
  }, [lists, displayCards]);

  function findCard(id: string) {
    return cards.find((c) => c.id === id) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCard(findCard(String(event.active.id)));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeCardData = findCard(activeId);
    if (!activeCardData) return;

    const overIsList = lists.some((l) => l.id === overId);
    const overCard = findCard(overId);

    const targetListId =
      dragOverride?.cardId === activeId
        ? dragOverride.listId
        : overIsList
          ? overId
          : (overCard?.listId ?? activeCardData.listId);
    if (!targetListId) return;

    const currentListId =
      dragOverride?.cardId === activeId
        ? dragOverride.listId
        : activeCardData.listId;
    if (targetListId === currentListId) return;

    setDragOverride({ cardId: activeId, listId: targetListId });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);
    setDragOverride(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const activeCardData = findCard(activeId);
    if (!activeCardData) return;

    const overIsList = lists.some((l) => l.id === overId);
    const overCard = findCard(overId);

    const targetListId =
      dragOverride?.cardId === activeId
        ? dragOverride.listId
        : overIsList
          ? overId
          : (overCard?.listId ?? activeCardData.listId);

    const siblings = cards
      .filter((c) => c.listId === targetListId && c.id !== activeId)
      .sort((a, b) => a.order - b.order);

    const overIndex =
      overCard && overCard.id !== activeId && overCard.listId === targetListId
        ? siblings.findIndex((c) => c.id === overCard.id)
        : siblings.length;

    const before = overIndex > 0 ? siblings[overIndex - 1] : null;
    const after = overIndex < siblings.length ? siblings[overIndex] : null;

    let newOrder: number;
    if (before && after) newOrder = (before.order + after.order) / 2;
    else if (before) newOrder = before.order + ORDER_GAP;
    else if (after) newOrder = after.order - ORDER_GAP;
    else newOrder = 0;

    await moveCard(activeId, targetListId, newOrder);
  }

  async function submitNewList() {
    const trimmed = newListTitle.trim();
    if (!trimmed) {
      setIsAddingList(false);
      setNewListTitle("");
      return;
    }
    await createList(trimmed);
    setNewListTitle("");
    setIsAddingList(false);
  }

  if (authLoading || (ready && loading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink">
        <p className="font-mono text-sm text-text-muted">
          Connecting to board…
        </p>
      </div>
    );
  }

  if (authError || error) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink px-6">
        <p className="max-w-md text-center font-mono text-sm text-signal-amber">
          {authError ?? error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink">
      <PresenceBar
        boardTitle={boardTitle ?? "Untitled Board"}
        collaborators={Array.from(collaboratorsById.values())}
        presence={presence}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onRenameBoard={updateBoardTitle}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 items-start gap-4 overflow-x-auto px-6 py-5">
          {[...lists]
            .sort((a, b) => a.order - b.order)
            .map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                cards={cardsByList.get(list.id) ?? []}
                collaboratorsById={collaboratorsById}
                presenceByCard={presenceByCard}
                onOpenCard={setEditingCard}
                onAddCard={createCard}
                onDeleteList={deleteList}
              />
            ))}

          <div className="w-full shrink-0 lg:w-72">
            {isAddingList ? (
              <div className="rounded-lg border border-ink-border bg-ink-surface p-2">
                <input
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitNewList();
                    }
                    if (e.key === "Escape") {
                      setIsAddingList(false);
                      setNewListTitle("");
                    }
                  }}
                  placeholder="List title…"
                  className="w-full border-none bg-transparent font-display text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={submitNewList}
                    disabled={!newListTitle.trim()}
                    className="rounded-sm bg-signal-amber px-2.5 py-1 font-mono text-[11px] font-semibold text-ink disabled:opacity-50"
                  >
                    Add list
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingList(false);
                      setNewListTitle("");
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
                onClick={() => setIsAddingList(true)}
                className="w-full rounded-lg border border-dashed border-ink-border/70 px-3 py-3 text-left font-mono text-[11px] text-text-muted transition hover:border-signal-amber/40 hover:text-signal-amber"
              >
                + Add list
              </button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-72">
              <CardTicket card={activeCard} viewers={[]} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editingCard && (
        <CardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(updates) => updateCard(editingCard.id, updates)}
          onDelete={() => deleteCard(editingCard.id)}
        />
      )}
    </div>
  );
}