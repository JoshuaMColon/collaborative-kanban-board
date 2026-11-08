import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { PresenceEntry } from "../types";

interface TrackedState {
  userId: string;
  email: string | null;
  viewingCardId?: string;
  lastActiveAt: string;
}

/**
 * Who is on this board right now.
 *
 * I key the channel by user id so someone's tabs group under one key.
 * The header dedupes on that id; the raw snapshot can still hold one
 * entry per tab. `sync` is the whole snapshot, which I flatten because
 * Supabase groups metas by the presence key.
 *
 * viewingCardId is sent with the track payload captured at subscribe
 * time. setViewingCard only updates local state, and the board never
 * calls it, so cards don't show a "looking at this" face. The header
 * still knows who is online.
 */
export function usePresence(
  boardId: string,
  userId: string | null,
  email: string | null,
  ready: boolean,
) {
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
            email: entry.email ?? undefined,
            viewingCardId: entry.viewingCardId,
            lastActiveAt: entry.lastActiveAt,
          }));
        setEntries(flattened);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            email,
            viewingCardId,
            lastActiveAt: new Date().toISOString(),
          } satisfies TrackedState);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // viewingCardId is read once, inside subscribe. It is not a
    // dependency: rebuilding the channel on every change would flap
    // presence for everyone else. Nothing writes it today.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, email, boardId]);

  return { presence: entries, setViewingCard: setViewingCardId };
}