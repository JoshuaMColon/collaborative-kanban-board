import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { mapDbCard, mapDbList, type DbCard, type DbList } from "../lib/mappers";
import type { BoardCard, BoardList } from "../types";

interface UseBoardDataResult {
  boardTitle: string | null;
  lists: BoardList[];
  cards: BoardCard[];
  loading: boolean;
  error: string | null;
  /** Optimistically applies a local move, then persists it to Supabase. */
  moveCard: (cardId: string, listId: string, order: number) => Promise<void>;
}

export function useBoardData(boardId: string, ready: boolean): UseBoardDataResult {
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
        { event: "*", schema: "public", table: "cards", filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setCards((prev) => prev.filter((c) => c.id !== (payload.old as DbCard).id));
            return;
          }
          const updated = mapDbCard(payload.new as DbCard);
          setCards((prev) => {
            const exists = prev.some((c) => c.id === updated.id);
            return exists
              ? prev.map((c) => (c.id === updated.id ? updated : c))
              : [...prev, updated];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists", filter: `board_id=eq.${boardId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setLists((prev) => prev.filter((l) => l.id !== (payload.old as DbList).id));
            return;
          }
          const updated = mapDbList(payload.new as DbList);
          setLists((prev) => {
            const exists = prev.some((l) => l.id === updated.id);
            return exists
              ? prev.map((l) => (l.id === updated.id ? updated : l))
              : [...prev, updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, boardId]);

  const moveCard = useCallback(
    async (cardId: string, listId: string, order: number) => {
      // Optimistic local update — Realtime echo of our own write is a harmless no-op.
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, listId, order } : c))
      );

      const { error: updateError } = await supabase
        .from("cards")
        .update({ list_id: listId, order })
        .eq("id", cardId);

      if (updateError) {
        setError(updateError.message);
        // Re-sync from source of truth if the write failed.
        fetchAll();
      }
    },
    [fetchAll]
  );

  return { boardTitle, lists, cards, loading, error, moveCard };
}