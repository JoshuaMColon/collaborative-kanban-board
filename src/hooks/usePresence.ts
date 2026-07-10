import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PresenceEntry } from "../types";

interface TrackedState {
  userId: string;
  viewingCardId?: string;
  lastActiveAt: string;
}

/**
 * Tracks the current user's presence on a board and returns everyone
 * currently connected. viewingCardId can be updated later (e.g. on card
 * hover/focus) via the returned setViewingCard function.
 */
export function usePresence(boardId: string, userId: string | null, ready: boolean) {
  const [entries, setEntries] = useState<PresenceEntry[]>([]);
  const [viewingCardId, setViewingCardId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!ready || !userId) return;

    const channel = supabase.channel(`board-${boardId}-presence`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<TrackedState>();
        const flattened: PresenceEntry[] = Object.values(state)
          .flat()
          .map((entry) => ({
            collaboratorId: entry.userId,
            viewingCardId: entry.viewingCardId,
            lastActiveAt: entry.lastActiveAt,
          }));
        setEntries(flattened);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            viewingCardId,
            lastActiveAt: new Date().toISOString(),
          } satisfies TrackedState);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Intentionally excluding viewingCardId from deps — updates go through
    // the separate effect below so we don't tear down/rebuild the channel
    // every time the user hovers a different card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, boardId]);

  return { presence: entries, setViewingCard: setViewingCardId };
}