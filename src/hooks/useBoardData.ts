import { useCallback, useEffect, useState } from "react";
import { mapDbCard, mapDbList, type DbCard, type DbList } from "../lib/mappers";
import { supabase } from "../lib/supabase";
import type { BoardCard, BoardList, CardPriority } from "../types";

const ORDER_GAP = 1024;

interface UseBoardDataResult {
  boardTitle: string | null;
  lists: BoardList[];
  cards: BoardCard[];
  loading: boolean;
  error: string | null;
  moveCard: (cardId: string, listId: string, order: number) => Promise<void>;
  updateBoardTitle: (title: string) => Promise<void>;
  createCard: (listId: string, title: string) => Promise<void>;
  updateCard: (
    cardId: string,
    updates: Partial<Pick<BoardCard, "title" | "description" | "priority">>,
  ) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  createList: (title: string) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
}

function nextCardCode(existingCards: BoardCard[]): string {
  let max = 0;
  for (const c of existingCards) {
    const match = /^MAN-(\d+)$/.exec(c.code);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `MAN-${String(max + 1).padStart(3, "0")}`;
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [boardRes, listsRes, cardsRes] = await Promise.all([
      supabase.from("boards").select("title").eq("id", boardId).single(),
      supabase.from("lists").select("*").eq("board_id", boardId).order("order"),
      supabase.from("cards").select("*").eq("board_id", boardId).order("order"),
    ]);

    if (boardRes.error) setError(boardRes.error.message);
    else setBoardTitle(boardRes.data?.title ?? null);

    if (listsRes.error) setError(listsRes.error.message);
    else setLists((listsRes.data as DbList[]).map(mapDbList));

    if (cardsRes.error) setError(cardsRes.error.message);
    else setCards((cardsRes.data as DbCard[]).map(mapDbCard));

    setLoading(false);
  }, [boardId]);

  useEffect(() => {
    if (!ready) return;
    fetchAll();
  }, [ready, fetchAll]);

  // Realtime: reflect changes from any client (including this one, harmlessly)
  useEffect(() => {
    if (!ready) return;

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
            setCards((prev) =>
              prev.filter((c) => c.id !== (payload.old as DbCard).id),
            );
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
            setLists((prev) =>
              prev.filter((l) => l.id !== (payload.old as DbList).id),
            );
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
        setError(updateError.message);
        fetchAll();
        return;
      }

      if (!data || data.length === 0) {
        setError(
          "Card update matched 0 rows — likely blocked by an RLS policy on cards (UPDATE).",
        );
        fetchAll();
      }
    },
    [fetchAll],
  );

  const updateBoardTitle = useCallback(
    async (title: string) => {
      const nextTitle = title.trim() || "Untitled Board";
      setBoardTitle(nextTitle);

      const { error: updateError } = await supabase
        .from("boards")
        .update({ title: nextTitle })
        .eq("id", boardId);

      if (updateError) {
        setError(updateError.message);
        fetchAll();
      }
    },
    [boardId, fetchAll],
  );

  const createCard = useCallback(
    async (listId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;

      const siblingsInList = cards.filter((c) => c.listId === listId);
      const maxOrder = siblingsInList.length
        ? Math.max(...siblingsInList.map((c) => c.order))
        : -ORDER_GAP;
      const order = maxOrder + ORDER_GAP;
      const code = nextCardCode(cards);

      const { data, error: insertError } = await supabase
        .from("cards")
        .insert({
          code,
          title: trimmed,
          priority: "standard" as CardPriority,
          list_id: listId,
          board_id: boardId,
          order,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      if (data) {
        const mapped = mapDbCard(data as DbCard);
        setCards((prev) =>
          prev.some((c) => c.id === mapped.id) ? prev : [...prev, mapped],
        );
      }
    },
    [cards, boardId],
  );

  const updateCard = useCallback(
    async (
      cardId: string,
      updates: Partial<Pick<BoardCard, "title" | "description" | "priority">>,
    ) => {
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
      );

      const { data, error: updateError } = await supabase
        .from("cards")
        .update(updates)
        .eq("id", cardId)
        .select();

      if (updateError) {
        setError(updateError.message);
        fetchAll();
        return;
      }

      if (!data || data.length === 0) {
        setError(
          "Card update matched 0 rows — likely blocked by an RLS policy on cards (UPDATE).",
        );
        fetchAll();
      }
    },
    [fetchAll],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      const previous = cards;
      setCards((prev) => prev.filter((c) => c.id !== cardId));

      const { error: deleteError } = await supabase
        .from("cards")
        .delete()
        .eq("id", cardId);

      if (deleteError) {
        setError(deleteError.message);
        setCards(previous);
      }
    },
    [cards],
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
        setError(insertError.message);
        return;
      }

      if (data) {
        const mapped = mapDbList(data as DbList);
        setLists((prev) =>
          prev.some((l) => l.id === mapped.id) ? prev : [...prev, mapped],
        );
      }
    },
    [lists, boardId],
  );

  const deleteList = useCallback(
    async (listId: string) => {
      const previousLists = lists;
      const previousCards = cards;
      setLists((prev) => prev.filter((l) => l.id !== listId));
      setCards((prev) => prev.filter((c) => c.listId !== listId));

      const { error: deleteError } = await supabase
        .from("lists")
        .delete()
        .eq("id", listId);

      if (deleteError) {
        setError(deleteError.message);
        setLists(previousLists);
        setCards(previousCards);
      }
    },
    [lists, cards],
  );

  return {
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
  };
}