import {
  DndContext,
  DragOverlay,
  defaultDropAnimationSideEffects,
  getFirstCollision,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useBoardData } from "../hooks/useBoardData";
import { useBoardMeta } from "../hooks/useBoardMeta";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { usePresence } from "../hooks/usePresence";
import { markDragEnd, markDragStart } from "../lib/dragState";
import { CardDecorationsContext, type CardDecorations } from "../lib/boardContext";
import { identityFor, identityFromProfile, TEAM_IDENTITY } from "../lib/identity";
import { EMPTY_FILTER, isFilterActive, matchesFilter, type BoardFilter } from "../lib/filters";
import type { BoardCard, Collaborator } from "../types";
import { ProfileDialog } from "./ProfileDialog";
import { CardModal } from "./CardModal";
import { CalmBackground } from "./CalmBackground";
import { CardDragPreview } from "./CardTicket";
import { EmptyBoardArt } from "./Illustrations";
import { LatticeLoader } from "./LatticeLoader";
import { ListColumn } from "./ListColumn";
import { PresenceBar } from "./PresenceBar";

const ORDER_GAP = 1024; // spacing between integer order values
// When two neighbours are this close (no whole number fits between them),
// renumber the whole list instead of inserting another midpoint.
const MIN_ORDER_GAP = 2;
const ACTION_ERROR_TIMEOUT_MS = 7000;
// How long a freshly added card keeps its soft highlight.
const NEW_CARD_HIGHLIGHT_MS = 2000;
// How long the little "done" check + confetti stays on a card.
const CELEBRATE_MS = 1400;
// Lists whose title looks like a finish line get a tiny celebration.
const DONE_LIST_PATTERN = /\b(done|complete(d)?|finished|shipped)\b/i;

// The dragged card glides into its slot and the lifted tilt eases away.
const DROP_ANIMATION: DropAnimation = {
  duration: 220,
  easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  keyframes: ({ transform }) => [
    { transform: `translate3d(${transform.initial.x}px, ${transform.initial.y}px, 0)` },
    { transform: `translate3d(${transform.final.x}px, ${transform.final.y}px, 0)` },
  ],
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.6" } },
    className: { dragOverlay: "is-settling" },
  }),
};

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
  userId,
  userEmail,
  isDemo,
  onSignOut,
  onCreateAccount,
}: {
  boardId: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  userId: string;
  userEmail: string | null;
  /** Anonymous demo session on the shared demo board. */
  isDemo: boolean;
  onSignOut: () => Promise<void>;
  onCreateAccount: () => void;
}) {
  // App only ever renders <Board> once a real session exists (see App.tsx),
  // so board data / presence can always fetch right away.
  const ready = true;

  const collisionDetectionStrategy = useStableCollisionDetection();

  const {
    boardTitle,
    lists,
    cards,
    loading,
    error,
    actionError,
    dismissActionError,
    retry,
    moveCard,
    reorderList,
    updateBoardTitle,
    createCard,
    updateCard,
    deleteCard,
    createList,
    deleteList,
  } = useBoardData(boardId, ready);
  const [metaError, setMetaError] = useState<string | null>(null);
  const assigneeIds = useMemo(
    () =>
      Array.from(
        new Set(cards.map((c) => c.assigneeId).filter((id): id is string => Boolean(id))),
      ),
    [cards],
  );
  const meta = useBoardMeta({
    boardId,
    userId,
    ready,
    extraUserIds: assigneeIds,
    onError: setMetaError,
  });
  const myProfile = meta.profiles.get(userId);
  const { presence } = usePresence(
    boardId,
    userId,
    myProfile?.displayName ?? (isDemo ? null : userEmail),
    ready,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [filter, setFilter] = useState<BoardFilter>(EMPTY_FILTER);
  const filterActive = isFilterActive(filter);

  useEffect(() => {
    if (!metaError) return;
    const timer = window.setTimeout(() => setMetaError(null), ACTION_ERROR_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [metaError]);

  // Failed writes show a dismissible toast instead of replacing the board.
  useEffect(() => {
    if (!actionError) return;
    const timer = window.setTimeout(dismissActionError, ACTION_ERROR_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [actionError, dismissActionError]);

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
  const [newCardIds, setNewCardIds] = useState<Set<string>>(() => new Set());
  const [celebratingCardId, setCelebratingCardId] = useState<string | null>(
    null,
  );
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = usePrefersReducedMotion();

  // Clear highlight timers if the board unmounts mid-animation.
  const highlightTimers = useRef<number[]>([]);
  useEffect(() => {
    const timers = highlightTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    if (!celebratingCardId) return;
    const timer = window.setTimeout(
      () => setCelebratingCardId(null),
      CELEBRATE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [celebratingCardId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Names and avatars come from profiles; presence (or the id itself) is
  // only a fallback while a profile is loading or hidden by RLS.
  const collaboratorsById = useMemo(() => {
    const map = new Map<string, Collaborator>();
    for (const profile of meta.profiles.values()) {
      map.set(profile.id, identityFromProfile(profile));
    }
    for (const p of presence) {
      if (!map.has(p.collaboratorId)) {
        map.set(p.collaboratorId, identityFor(p.collaboratorId, p.email));
      }
    }
    return map;
  }, [presence, meta.profiles]);

  const collaboratorFor = useCallback(
    (id: string | null): Collaborator =>
      id ? (collaboratorsById.get(id) ?? identityFor(id)) : TEAM_IDENTITY,
    [collaboratorsById],
  );

  const onlineCollaborators = useMemo(() => {
    const seen = new Set<string>();
    const list: Collaborator[] = [];
    for (const p of presence) {
      if (seen.has(p.collaboratorId)) continue;
      seen.add(p.collaboratorId);
      list.push(collaboratorFor(p.collaboratorId));
    }
    return list;
  }, [presence, collaboratorFor]);

  const members = useMemo(
    () => meta.memberIds.map((id) => collaboratorFor(id)),
    [meta.memberIds, collaboratorFor],
  );

  const labelIdsByCard = useMemo(() => {
    const map = new Map<string, string[]>();
    const order = new Map(meta.labels.map((l, i) => [l.id, i]));
    for (const link of meta.cardLabels) {
      const list = map.get(link.cardId) ?? [];
      list.push(link.labelId);
      map.set(link.cardId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
    }
    return map;
  }, [meta.cardLabels, meta.labels]);

  const decorations = useMemo<CardDecorations>(() => {
    const commentCountByCard = new Map<string, number>();
    for (const c of meta.comments) {
      commentCountByCard.set(c.cardId, (commentCountByCard.get(c.cardId) ?? 0) + 1);
    }
    return {
      labelsById: new Map(meta.labels.map((l) => [l.id, l])),
      labelIdsByCard,
      commentCountByCard,
      doneListIds: new Set(
        lists.filter((l) => DONE_LIST_PATTERN.test(l.title)).map((l) => l.id),
      ),
      dragDisabled: filterActive,
    };
  }, [meta.comments, meta.labels, labelIdsByCard, lists, filterActive]);

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
    const visible = filterActive
      ? cards.filter((c) =>
          matchesFilter(c, filter, labelIdsByCard.get(c.id) ?? []),
        )
      : cards;
    if (!dragOverride) return visible;
    return visible.map((c) =>
      c.id === dragOverride.cardId ? { ...c, listId: dragOverride.listId } : c,
    );
  }, [cards, dragOverride, filter, filterActive, labelIdsByCard]);
  const hiddenCount = cards.length - displayCards.length;

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
    markDragStart();
    setActiveCard(findCard(String(event.active.id)));
  }

  function handleDragCancel() {
    markDragEnd();
    setActiveCard(null);
    setDragOverride(null);
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

    // Follow whatever list the pointer is over now, so a card can cross
    // several lists (or come back) in one drag.
    const targetListId = overIsList ? overId : overCard?.listId;
    if (!targetListId) return;

    const currentListId =
      dragOverride?.cardId === activeId
        ? dragOverride.listId
        : activeCardData.listId;
    if (targetListId === currentListId) return;

    setDragOverride({ cardId: activeId, listId: targetListId });
  }

  async function handleDragEnd(event: DragEndEvent) {
    markDragEnd();
    const { active, over } = event;
    // Read the override from this render before clearing it.
    const override = dragOverride;
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
      override?.cardId === activeId
        ? override.listId
        : overIsList
          ? overId
          : (overCard?.listId ?? activeCardData.listId);

    // The target list exactly as it was rendered during the drag (the
    // dragged card is already in it via the override), sorted by order.
    const renderedIds = (cardsByList.get(targetListId) ?? []).map((c) => c.id);
    if (!renderedIds.includes(activeId)) renderedIds.push(activeId);

    const activeIndex = renderedIds.indexOf(activeId);
    let overIndex: number;
    if (overId === activeId) {
      overIndex = activeIndex; // dropped on itself
    } else if (overCard && renderedIds.includes(overCard.id)) {
      overIndex = renderedIds.indexOf(overCard.id);
    } else {
      overIndex = renderedIds.length - 1; // dropped on the list itself: end
    }

    const changedList = targetListId !== activeCardData.listId;
    if (!changedList && overIndex === activeIndex) return; // no-op drop

    if (changedList) {
      const targetTitle = lists.find((l) => l.id === targetListId)?.title ?? "";
      if (DONE_LIST_PATTERN.test(targetTitle)) {
        setCelebratingCardId(activeId);
        setAnnouncement(`Nice! "${activeCardData.title}" moved to ${targetTitle}.`);
      } else {
        setAnnouncement(`"${activeCardData.title}" moved to ${targetTitle}.`);
      }
    }

    // Same semantics @dnd-kit's sortable preview uses, so the card lands
    // exactly where it was shown — in both drag directions.
    const orderedIds = arrayMove(renderedIds, activeIndex, overIndex);
    const newIndex = orderedIds.indexOf(activeId);
    const before = newIndex > 0 ? findCard(orderedIds[newIndex - 1]) : null;
    const after =
      newIndex < orderedIds.length - 1
        ? findCard(orderedIds[newIndex + 1])
        : null;

    // cards.order is an INTEGER column, so a midpoint must be a whole number
    // strictly between its neighbours; when there's no room, renumber.
    if (before && after && after.order - before.order < MIN_ORDER_GAP) {
      await reorderList(targetListId, orderedIds);
      return;
    }

    let newOrder: number;
    if (before && after) newOrder = Math.floor((before.order + after.order) / 2);
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

  async function handleAddCard(listId: string, title: string) {
    const cardId = await createCard(listId, title);
    if (!cardId) return;
    setNewCardIds((prev) => new Set(prev).add(cardId));
    const timer = window.setTimeout(() => {
      setNewCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
    }, NEW_CARD_HIGHLIGHT_MS);
    highlightTimers.current.push(timer);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-accent">
        <CalmBackground />
        <LatticeLoader
          label="Connecting to board"
          pattern="orbit"
          grid={3}
          shape="round"
          color="currentColor"
        />
      </div>
    );
  }

  // Only a failed initial load blocks the board; write failures use the toast.
  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
        <CalmBackground />
        <p
          role="alert"
          className="max-w-md rounded-2xl border border-line bg-surface px-5 py-4 text-center text-sm text-text-primary shadow-soft"
        >
          <span className="block font-display text-base font-bold">
            Hmm, the board didn't load.
          </span>
          <span className="mt-1 block text-text-secondary">{error}</span>
        </p>
        <button
          type="button"
          onClick={() => void retry()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative isolate flex h-screen flex-col overflow-hidden">
      <CalmBackground />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <PresenceBar
          boardTitle={boardTitle ?? ""}
          collaborators={onlineCollaborators}
          presence={presence}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onRenameBoard={updateBoardTitle}
          onSignOut={onSignOut}
          me={collaboratorFor(userId)}
          onOpenProfile={() => setProfileOpen(true)}
          isDemo={isDemo}
          onCreateAccount={onCreateAccount}
          filter={filter}
          onFilterChange={setFilter}
          labels={meta.labels}
          members={members}
          hiddenCount={hiddenCount}
        />

        <CardDecorationsContext.Provider value={decorations}>
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetectionStrategy}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
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
                  onAddCard={handleAddCard}
                  onDeleteList={deleteList}
                  newCardIds={newCardIds}
                  celebratingCardId={celebratingCardId}
                />
              ))}

            {lists.length === 0 && !isAddingList && (
              <div className="mx-auto mt-10 flex w-full max-w-sm animate-fadeUp flex-col items-center rounded-3xl border border-line bg-surface/90 px-8 py-10 text-center shadow-soft backdrop-blur-sm">
                <EmptyBoardArt className="h-28 w-40" />
                <h2 className="mt-4 font-display text-xl font-extrabold text-text-primary">
                  A fresh, calm board
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  Start with a few lists like To do, Doing and Done, then add
                  cards as ideas come up.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddingList(true)}
                  className="mt-5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90"
                >
                  Add your first list
                </button>
              </div>
            )}

            <div
              className={`w-full shrink-0 lg:w-72 ${
                lists.length === 0 && !isAddingList ? "hidden" : ""
              }`}
            >
              {isAddingList ? (
                <div className="animate-fadeUp rounded-2xl border border-line bg-surface p-3 shadow-soft focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/25">
                  <label className="sr-only" htmlFor="new-list-title">
                    New list title
                  </label>
                  <input
                    id="new-list-title"
                    autoFocus
                    maxLength={80}
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
                    placeholder="Name this list…"
                    className="w-full border-none bg-transparent font-display text-sm font-semibold text-text-primary outline-none placeholder:text-text-muted"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={submitNewList}
                      disabled={!newListTitle.trim()}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 disabled:opacity-50"
                    >
                      Add list
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingList(false);
                        setNewListTitle("");
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
                  onClick={() => setIsAddingList(true)}
                  className="w-full rounded-2xl border-2 border-dashed border-line-strong/70 bg-surface/40 px-4 py-3.5 text-left text-sm font-semibold text-text-secondary backdrop-blur-sm transition hover:border-accent/50 hover:bg-surface/80 hover:text-accent"
                >
                  + Add another list
                </button>
              )}
            </div>
          </div>

          <DragOverlay dropAnimation={reducedMotion ? null : DROP_ANIMATION}>
            {activeCard ? (
              <div className="w-72">
                <CardDragPreview
                  card={activeCard}
                  assignee={
                    activeCard.assigneeId
                      ? collaboratorsById.get(activeCard.assigneeId)
                      : undefined
                  }
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </CardDecorationsContext.Provider>

        {(actionError || metaError) && (
          <div
            role="alert"
            className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 animate-fadeUp items-start gap-3 rounded-2xl border border-line border-l-4 border-l-accent bg-surface px-4 py-3 shadow-pop"
          >
            <p className="flex-1 text-sm text-text-primary">
              {actionError ?? metaError}
              {actionError && (
                <span className="mt-0.5 block text-xs text-text-muted">
                  The board was refreshed to match the server.
                </span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                if (actionError) dismissActionError();
                else setMetaError(null);
              }}
              className="rounded-lg px-1.5 py-0.5 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        )}

        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {editingCard && (
          <CardModal
            card={editingCard}
            isDoneList={decorations.doneListIds.has(editingCard.listId)}
            members={members}
            labels={meta.labels}
            cardLabelIds={labelIdsByCard.get(editingCard.id) ?? []}
            comments={meta.comments.filter((c) => c.cardId === editingCard.id)}
            currentUserId={userId}
            collaboratorFor={collaboratorFor}
            onClose={() => setEditingCard(null)}
            onSave={(updates) => updateCard(editingCard.id, updates)}
            onDelete={() => deleteCard(editingCard.id)}
            onToggleLabel={(labelId) => meta.toggleCardLabel(editingCard.id, labelId)}
            onCreateLabel={meta.createLabel}
            onAddComment={(body) => meta.addComment(editingCard.id, body)}
            onEditComment={meta.editComment}
            onDeleteComment={meta.deleteComment}
          />
        )}

        {profileOpen && (
          <ProfileDialog
            me={collaboratorFor(userId)}
            email={isDemo ? undefined : (userEmail ?? undefined)}
            isDemo={isDemo}
            onClose={() => setProfileOpen(false)}
            onSave={meta.updateProfile}
            onUpload={meta.uploadAvatar}
            onRemoveAvatarFiles={meta.removeAvatarFiles}
          />
        )}
      </div>
    </div>
  );
}
