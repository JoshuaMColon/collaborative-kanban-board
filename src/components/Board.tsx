import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { collaborators, presence } from "../data/mockData";
import type { BoardCard, Board as BoardType } from "../types";
import { CardTicket } from "./CardTicket";
import { ListColumn } from "./ListColumn";
import { PresenceBar } from "./PresenceBar";

export function Board({
  initialBoard,
  theme,
  onToggleTheme,
}: {
  initialBoard: BoardType;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const [board, setBoard] = useState(initialBoard);
  const [activeCard, setActiveCard] = useState<BoardCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const collaboratorsById = useMemo(
    () => new Map(collaborators.map((c) => [c.id, c])),
    [],
  );

  const presenceByCard = useMemo(() => {
    const map = new Map<string, typeof presence>();
    for (const p of presence) {
      if (!p.viewingCardId) continue;
      const list = map.get(p.viewingCardId) ?? [];
      list.push(p);
      map.set(p.viewingCardId, list);
    }
    return map;
  }, []);

  const cardsByList = useMemo(() => {
    const map = new Map<string, BoardCard[]>();
    for (const list of board.lists) map.set(list.id, []);
    for (const card of [...board.cards].sort((a, b) => a.order - b.order)) {
      map.get(card.listId)?.push(card);
    }
    return map;
  }, [board]);

  function findCard(id: string) {
    return board.cards.find((c) => c.id === id) ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCard(findCard(String(event.active.id)));
  }

  // Handles moving a card into a different list while dragging (before drop),
  // so the UI reflows live instead of only snapping into place on release.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const activeCardData = findCard(activeId);
    if (!activeCardData) return;

    const overIsList = board.lists.some((l) => l.id === overId);
    const overCard = findCard(overId);
    const targetListId = overIsList ? overId : overCard?.listId;
    if (!targetListId || targetListId === activeCardData.listId) return;

    setBoard((prev) => ({
      ...prev,
      cards: prev.cards.map((c) =>
        c.id === activeId ? { ...c, listId: targetListId } : c,
      ),
    }));
  }

  // Finalizes ordering within the destination list once the card is dropped.
  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setBoard((prev) => {
      const activeCardData = prev.cards.find((c) => c.id === activeId);
      if (!activeCardData) return prev;

      const overCard = prev.cards.find((c) => c.id === overId);
      const targetListId = overCard?.listId ?? activeCardData.listId;

      const listCards = prev.cards
        .filter((c) => c.listId === targetListId && c.id !== activeId)
        .sort((a, b) => a.order - b.order);

      const overIndex = overCard
        ? listCards.findIndex((c) => c.id === overCard.id)
        : listCards.length;

      const reordered = [
        ...listCards.slice(0, overIndex),
        { ...activeCardData, listId: targetListId },
        ...listCards.slice(overIndex),
      ].map((c, i) => ({ ...c, order: i }));

      const otherCards = prev.cards.filter((c) => c.listId !== targetListId);

      return { ...prev, cards: [...otherCards, ...reordered] };
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink text-text-primary transition-colors">
      <PresenceBar
        boardTitle={board.title}
        collaborators={collaborators}
        presence={presence}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 flex-col gap-4 overflow-x-auto overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-start">
          {board.lists
            .sort((a, b) => a.order - b.order)
            .map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                cards={cardsByList.get(list.id) ?? []}
                collaboratorsById={collaboratorsById}
                presenceByCard={presenceByCard}
              />
            ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div className="w-full max-w-[18rem] sm:w-72">
              <CardTicket card={activeCard} viewers={[]} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
