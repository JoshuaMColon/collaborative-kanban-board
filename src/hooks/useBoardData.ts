import { useCallback, useEffect, useRef, useState } from "react";
import { mapDbCard, mapDbList, type DbCard, type DbList } from "../lib/mappers";
import { supabase } from "../lib/supabase";
import type { BoardCard, BoardList, CardPriority } from "../types";

const ORDER_GAP = 1024;

type CardUpdates = Partial<Pick<BoardCard, "title" | "description" | "priority">>;

interface UseBoardDataResult {
  boardTitle: string | null;
  lists: BoardList[];
  cards: BoardCard[];
  /** True only while the initial load (or an explicit retry) is in flight. */
  loading: boolean;
  /** Blocking error: the board itself could not be loaded. */
  error: string | null;
  /** Non-blocking error from a write that failed; the board stays usable. */
  actionError: string | null;
  dismissActionError: () => void;
  /** Re-run the full load (used by the "Retry" button on the error screen). */
  retry: () => Promise<void>;
  moveCard: (cardId: string, listId: string, order: number) => Promise<void>;
  /** Re-number every card in a list with even gaps, in the given order. */
  reorderList: (listId: string, orderedCardIds: string[]) => Promise<void>;
  updateBoardTitle: (title: string) => Promise<void>;
  createCard: (listId: string, title: string) => Promise<string | null>;
  updateCard: (cardId: string, updates: CardUpdates) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
}

// Realtime DELETE payloads only carry the primary key unless the table uses
// REPLICA IDENTITY FULL, so read just the id and tolerate anything missing.
function deletedId(old: unknown): string | null {
  if (old && typeof old === "object" && "id" in old) {
    const id = (old as { id: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

export function useBoardData(
  boardId: string,
  ready: boolean,
): UseBoardDataResult {
  const [boardTitle, setBoardTitle] = useState<string | null>(null);
  const [lists, setLists] = useState<BoardList[]>([]);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Ignore results from an older fetch if a newer one has started.
  const fetchSeq = useRef(0);

  // `silent` = background resync after a failed write: no loader, and a
  // failure shows as a non-blocking message instead of replacing the board.
  const fetchAll = useCallback(
    async (silent = false) => {
      const seq = ++fetchSeq.current;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const [boardRes, listsRes, cardsRes] = await Promise.all([
        supabase.from("boards").select("title").eq("id", boardId).single(),
        supabase.from("lists").select("*").eq("board_id", boardId).order("order"),
        supabase.from("cards").select("*").eq("board_id", boardId).order("order"),
      ]);

      if (seq !== fetchSeq.current) {
        // A newer fetch superseded this one; just make sure a blocking
        // load never leaves the spinner up.
        if (!silent) setLoading(false);
        return;
      }

      const failure =
        boardRes.error?.message ??
        listsRes.error?.message ??
        cardsRes.error?.message ??
        null;

      if (!boardRes.error) setBoardTitle(boardRes.data?.title ?? null);
      if (!listsRes.error) setLists((listsRes.data as DbList[]).map(mapDbList));
      if (!cardsRes.error) setCards((cardsRes.data as DbCard[]).map(mapDbCard));

      if (failure) {
        if (silent) setActionError(`Couldn't refresh the board: ${failure}`);
        else setError(failure);
      }

      if (!silent) setLoading(false);
    },
    [boardId],
  );

  const resync = useCallback(() => {
    void fetchAll(true);
  }, [fetchAll]);

  const reportWriteError = useCallback(
    (message: string) => {
      setActionError(message);
      resync();
    },
    [resync],
  );

  const dismissActionError = useCallback(() => setActionError(null), []);
  const retry = useCallback(() => fetchAll(false), [fetchAll]);

  useEffect(() => {
    if (!ready) return;
    void fetchAll(false);
  }, [ready, fetchAll]);

  // Realtime: reflect changes from any client (including this one, harmlessly)
  useEffect(() => {
    if (!ready) return;

    const removeCard = (old: unknown) => {
      const id = deletedId(old);
      if (!id) return;
      setCards((prev) => prev.filter((c) => c.id !== id));
    };

    const removeList = (old: unknown) => {
      const id = deletedId(old);
      if (!id) return;
      setLists((prev) => prev.filter((l) => l.id !== id));
      // If the DB cascades, card DELETE events arrive too; drop them now
      // either way so a removed column never leaves orphaned cards behind.
      setCards((prev) => prev.filter((c) => c.listId !== id));
    };

    const channel = supabase
      .channel(`board-${boardId}-data`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cards",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            removeCard(payload.old);
            return;
          }
          const updated = mapDbCard(payload.new as DbCard);
          setCards((prev) => {
            const exists = prev.some((c) => c.id === updated.id);
            return exists
              ? prev.map((c) => (c.id === updated.id ? updated : c))
              : [...prev, updated];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lists",
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            removeList(payload.old);
            return;
          }
          const updated = mapDbList(payload.new as DbList);
          setLists((prev) => {
            const exists = prev.some((l) => l.id === updated.id);
            return exists
              ? prev.map((l) => (l.id === updated.id ? updated : l))
              : [...prev, updated];
          });
        },
      )
      // Filtered subscriptions can miss DELETE events (the old row usually
      // only has its id, so `board_id` can't be matched). Listen to deletes
      // unfiltered as well; removing an id we don't have is a no-op.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "cards" },
        (payload) => removeCard(payload.old),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "lists" },
        (payload) => removeList(payload.old),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, boardId]);

  const moveCard = useCallback(
    async (cardId: string, listId: string, order: number) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, listId, order } : c)),
      );

      const { data, error: updateError } = await supabase
        .from("cards")
        .update({ list_id: listId, order })
        .eq("id", cardId)
        .select();

      if (updateError) {
        reportWriteError(`Couldn't move the card: ${updateError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        reportWriteError(
          "Couldn't move the card — you may not have permission to edit it.",
        );
      }
    },
    [reportWriteError],
  );

  const reorderList = useCallback(
    async (listId: string, orderedCardIds: string[]) => {
      const newOrders = new Map(
        orderedCardIds.map((id, i) => [id, (i + 1) * ORDER_GAP] as const),
      );

      setCards((prev) =>
        prev.map((c) => {
          const order = newOrders.get(c.id);
          return order === undefined ? c : { ...c, listId, order };
        }),
      );

      const results = await Promise.all(
        orderedCardIds.map((id, i) =>
          supabase
            .from("cards")
            .update({ list_id: listId, order: (i + 1) * ORDER_GAP })
            .eq("id", id),
        ),
      );

      const failed = results.find((r) => r.error);
      if (failed?.error) {
        reportWriteError(`Couldn't reorder the list: ${failed.error.message}`);
      }
    },
    [reportWriteError],
  );

  // Only writes a title the user actually typed — never forces a default
  // "Untitled Board" string into local state or the database. An empty/
  // whitespace-only value is a no-op, so the input's placeholder is what
  // carries the "Untitled board" hint instead of a stored value.
  const updateBoardTitle = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      setBoardTitle(trimmed);

      const { error: updateError } = await supabase
        .from("boards")
        .update({ title: trimmed })
        .eq("id", boardId);

      if (updateError) {
        reportWriteError(`Couldn't rename the board: ${updateError.message}`);
      }
    },
    [boardId, reportWriteError],
  );

  const createCard = useCallback(
    async (listId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return null;

      const siblingsInList = cards.filter((c) => c.listId === listId);
      const maxOrder = siblingsInList.length
        ? Math.max(...siblingsInList.map((c) => c.order))
        : -ORDER_GAP;
      const order = maxOrder + ORDER_GAP;

      const { data, error: insertError } = await supabase
        .from("cards")
        // `code` is omitted on purpose: a BEFORE INSERT trigger assigns the
        // next MAN-### code server-side (unique per board), and `.select()`
        // reads the created row back so local state gets the real code.
        .insert({
          title: trimmed,
          priority: "standard" as CardPriority,
          list_id: listId,
          board_id: boardId,
          order,
        })
        .select()
        .single();

      if (insertError) {
        reportWriteError(`Couldn't add the card: ${insertError.message}`);
        return null;
      }

      if (data) {
        const mapped = mapDbCard(data as DbCard);
        setCards((prev) =>
          prev.some((c) => c.id === mapped.id) ? prev : [...prev, mapped],
        );
        return mapped.id;
      }

      return null;
    },
    [cards, boardId, reportWriteError],
  );

  const updateCard = useCallback(
    async (cardId: string, updates: CardUpdates) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
      );

      // supabase-js drops `undefined` keys when serialising, so a cleared
      // description has to be sent as an explicit null to actually persist.
      const dbUpdates: {
        title?: string;
        description?: string | null;
        priority?: CardPriority;
      } = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if ("description" in updates) {
        dbUpdates.description = updates.description ?? null;
      }

      const { data, error: updateError } = await supabase
        .from("cards")
        .update(dbUpdates)
        .eq("id", cardId)
        .select();

      if (updateError) {
        reportWriteError(`Couldn't save the card: ${updateError.message}`);
        return;
      }

      if (!data || data.length === 0) {
        reportWriteError(
          "Couldn't save the card — you may not have permission to edit it.",
        );
      }
    },
    [reportWriteError],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      const removed = cards.find((c) => c.id === cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));

      const { error: deleteError } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId);

      if (deleteError) {
        if (removed) {
          setCards((prev) =>
            prev.some((c) => c.id === removed.id) ? prev : [...prev, removed],
          );
        }
        reportWriteError(`Couldn't delete the card: ${deleteError.message}`);
      }
    },
    [cards, reportWriteError],
  );

  const createList = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const maxOrder = lists.length
        ? Math.max(...lists.map((l) => l.order))
        : -1;
      const order = maxOrder + 1;

      const { data, error: insertError } = await supabase
        .from("lists")
        .insert({ title: trimmed, board_id: boardId, order })
        .select()
        .single();

      if (insertError) {
        reportWriteError(`Couldn't add the list: ${insertError.message}`);
        return;
      }

      if (data) {
        const mapped = mapDbList(data as DbList);
        setLists((prev) =>
          prev.some((l) => l.id === mapped.id) ? prev : [...prev, mapped],
        );
      }
    },
    [lists, boardId, reportWriteError],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const removedList = lists.find((l) => l.id === listId);
      const removedCards = cards.filter((c) => c.listId === listId);

      // Optimistic: the column and its cards disappear immediately.
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setCards((prev) => prev.filter((c) => c.listId !== listId));

      const rollback = () => {
        if (removedList) {
          setLists((prev) =>
            prev.some((l) => l.id === removedList.id)
              ? prev
              : [...prev, removedList],
          );
        }
        setCards((prev) => {
          const have = new Set(prev.map((c) => c.id));
          return [...prev, ...removedCards.filter((c) => !have.has(c.id))];
        });
      };

      // Delete the cards first so this works whether or not the database
      // cascades list deletes to cards (and never trips a FK constraint).
      const { error: cardsError } = await supabase
        .from("cards")
        .delete()
        .eq("list_id", listId);

      if (cardsError) {
        rollback();
        reportWriteError(`Couldn't delete the list: ${cardsError.message}`);
        return;
      }

      const { data, error: listError } = await supabase
        .from("lists")
        .delete()
        .eq("id", listId)
        .select("id");

      if (listError || !data || data.length === 0) {
        rollback();
        reportWriteError(
          listError
            ? `Couldn't delete the list: ${listError.message}`
            : "Couldn't delete the list — you may not have permission to remove it.",
        );
      }
    },
    [lists, cards, reportWriteError],
  );

  return {
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
  };
}
