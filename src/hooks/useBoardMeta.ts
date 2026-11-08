import { useCallback, useEffect, useRef, useState } from "react";
import {
  mapDbComment,
  mapDbLabel,
  mapDbProfile,
  type DbCardLabel,
  type DbComment,
  type DbLabel,
  type DbProfile,
} from "../lib/mappers";
import { supabase } from "../lib/supabase";
import type {
  BoardLabel,
  CardComment,
  CardLabelLink,
  LabelColor,
  Profile,
} from "../types";

export const COMMENT_MAX = 2000;
export const DISPLAY_NAME_MAX = 50;
export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function rowId(old: unknown): string | null {
  if (old && typeof old === "object" && "id" in old) {
    const id = (old as { id: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function upsertById<T extends { id: string }>(prev: T[], next: T): T[] {
  return prev.some((x) => x.id === next.id)
    ? prev.map((x) => (x.id === next.id ? next : x))
    : [...prev, next];
}

// The demo cap raises a sentence I already wrote in SQL. A duplicate
// label name comes back as a constraint, which I translate. Everything
// else is shown as Supabase sent it.
function friendly(message: string): string {
  if (/demo board is full/i.test(message)) return message;
  if (/board_labels_board_name_key|duplicate key/i.test(message)) {
    return "A label with that name already exists.";
  }
  return message;
}

/**
 * Members, profiles, labels, and comments for one board.
 *
 * Split from useBoardData so list and card ordering stays on its own
 * channel. On open I upsert my own board_members row (that's how the
 * assignee list learns I've been here), then load the rest.
 *
 * Comments wait for the insert to return so I have the server id.
 * Label toggles and deletes paint first and roll back if the write fails.
 */
export function useBoardMeta({
  boardId,
  userId,
  ready,
  extraUserIds,
  onError,
}: {
  boardId: string;
  userId: string;
  ready: boolean;
  /** Other ids we need names for (e.g. card assignees). */
  extraUserIds: string[];
  onError: (message: string) => void;
}) {
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(() => new Map());
  const [labels, setLabels] = useState<BoardLabel[]>([]);
  const [cardLabels, setCardLabels] = useState<CardLabelLink[]>([]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const requested = useRef<Set<string>>(new Set());
  // onError changes identity when the parent re-renders. I read it
  // through a ref so `report` can keep an empty dependency list.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const report = useCallback((prefix: string, message: string) => {
    onErrorRef.current(`${prefix}: ${friendly(message)}`);
  }, []);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => id && !requested.current.has(id));
    if (missing.length === 0) return;
    // Remember who I asked for. On failure I forget them so a later
    // load can retry; a success stays cached for this session.
    missing.forEach((id) => requested.current.add(id));
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", missing);
    if (error) {
      missing.forEach((id) => requested.current.delete(id));
      return;
    }
    setProfiles((prev) => {
      const next = new Map(prev);
      for (const row of data as DbProfile[]) next.set(row.id, mapDbProfile(row));
      return next;
    });
  }, []);

  // Join as myself, then load. The insert policy only allows my own
  // row, role member, on a board I can access. ignoreDuplicates so a
  // second visit doesn't error on the primary key.
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function load() {
      await supabase
        .from("board_members")
        .upsert(
          { board_id: boardId, user_id: userId },
          { onConflict: "board_id,user_id", ignoreDuplicates: true },
        );

      const [membersRes, labelsRes, linksRes, commentsRes] = await Promise.all([
        supabase.from("board_members").select("user_id").eq("board_id", boardId),
        supabase
          .from("board_labels")
          .select("id, board_id, name, color")
          .eq("board_id", boardId)
          .order("created_at"),
        supabase
          .from("card_labels")
          .select("card_id, label_id, board_id")
          .eq("board_id", boardId),
        supabase
          .from("card_comments")
          .select("*")
          .eq("board_id", boardId)
          .order("created_at"),
      ]);
      if (cancelled) return;

      // If the member list fails, the picker still has me.
      const members = membersRes.error
        ? [userId]
        : Array.from(
            new Set([userId, ...(membersRes.data ?? []).map((m) => m.user_id as string)]),
          );
      setMemberIds(members);
      if (!labelsRes.error) setLabels((labelsRes.data as DbLabel[]).map(mapDbLabel));
      if (!linksRes.error) {
        setCardLabels(
          (linksRes.data as DbCardLabel[]).map((l) => ({
            cardId: l.card_id,
            labelId: l.label_id,
          })),
        );
      }
      const loadedComments = commentsRes.error
        ? []
        : (commentsRes.data as DbComment[]).map(mapDbComment);
      setComments(loadedComments);

      await loadProfiles([
        ...members,
        ...loadedComments.map((c) => c.authorId ?? ""),
      ]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, boardId, userId, loadProfiles]);

  // Names for assignees who haven't joined the members list yet.
  const extraKey = extraUserIds.join(",");
  useEffect(() => {
    if (!ready || !extraKey) return;
    void loadProfiles(extraKey.split(","));
  }, [ready, extraKey, loadProfiles]);

  // The auth.users trigger inserts the profile, usually with a better
  // name than "Guest". I only insert after a load came back without
  // my row, and I wait so I don't beat that trigger. ignoreDuplicates
  // leaves the row alone if it arrived during the wait.
  useEffect(() => {
    if (!ready || profiles.has(userId) || !requested.current.has(userId)) return;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, display_name: "Guest" },
          { onConflict: "id", ignoreDuplicates: true },
        )
        .select("id, display_name, avatar_url");
      const row = (data as DbProfile[] | null)?.[0];
      if (row) setProfiles((prev) => new Map(prev).set(row.id, mapDbProfile(row)));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [ready, profiles, userId]);

  // Separate channel from cards and lists so a comment storm doesn't
  // share a subscription with ordering. Deletes are unfiltered, same
  // reason as useBoardData: the old row may not carry board_id.
  // Profile updates aren't board-scoped; I ignore ids I haven't loaded.
  useEffect(() => {
    if (!ready) return;
    const filter = `board_id=eq.${boardId}`;

    const channel = supabase
      .channel(`board-${boardId}-meta`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "card_comments", filter },
        (payload) => {
          if (payload.eventType === "DELETE") return; // handled below
          const comment = mapDbComment(payload.new as DbComment);
          setComments((prev) => upsertById(prev, comment));
          if (comment.authorId) void loadProfiles([comment.authorId]);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "card_comments" },
        (payload) => {
          const id = rowId(payload.old);
          if (id) setComments((prev) => prev.filter((c) => c.id !== id));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_labels", filter },
        (payload) => {
          if (payload.eventType === "DELETE") return;
          setLabels((prev) => upsertById(prev, mapDbLabel(payload.new as DbLabel)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "board_labels" },
        (payload) => {
          const id = rowId(payload.old);
          if (!id) return;
          setLabels((prev) => prev.filter((l) => l.id !== id));
          setCardLabels((prev) => prev.filter((l) => l.labelId !== id));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "card_labels", filter },
        (payload) => {
          const row = payload.new as DbCardLabel;
          setCardLabels((prev) =>
            prev.some((l) => l.cardId === row.card_id && l.labelId === row.label_id)
              ? prev
              : [...prev, { cardId: row.card_id, labelId: row.label_id }],
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "card_labels" },
        (payload) => {
          const row = payload.old as Partial<DbCardLabel>;
          if (!row.card_id || !row.label_id) return;
          setCardLabels((prev) =>
            prev.filter((l) => !(l.cardId === row.card_id && l.labelId === row.label_id)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "board_members", filter },
        (payload) => {
          const id = (payload.new as { user_id?: string }).user_id;
          if (!id) return;
          setMemberIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          void loadProfiles([id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const profile = mapDbProfile(payload.new as DbProfile);
          setProfiles((prev) =>
            prev.has(profile.id) ? new Map(prev).set(profile.id, profile) : prev,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ready, boardId, loadProfiles]);

  // Labels ----------------------------------------------------------------
  const createLabel = useCallback(
    async (name: string, color: LabelColor) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const { data, error } = await supabase
        .from("board_labels")
        .insert({ board_id: boardId, name: trimmed, color })
        .select("id, board_id, name, color")
        .single();
      if (error) {
        report("Couldn't create the label", error.message);
        return null;
      }
      const label = mapDbLabel(data as DbLabel);
      setLabels((prev) => upsertById(prev, label));
      return label;
    },
    [boardId, report],
  );

  const deleteLabel = useCallback(
    async (labelId: string) => {
      const before = { labels, cardLabels };
      setLabels((prev) => prev.filter((l) => l.id !== labelId));
      setCardLabels((prev) => prev.filter((l) => l.labelId !== labelId));
      const { error } = await supabase.from("board_labels").delete().eq("id", labelId);
      if (error) {
        setLabels(before.labels);
        setCardLabels(before.cardLabels);
        report("Couldn't delete the label", error.message);
      }
    },
    [labels, cardLabels, report],
  );

  const toggleCardLabel = useCallback(
    async (cardId: string, labelId: string) => {
      const has = cardLabels.some((l) => l.cardId === cardId && l.labelId === labelId);
      if (has) {
        setCardLabels((prev) =>
          prev.filter((l) => !(l.cardId === cardId && l.labelId === labelId)),
        );
        const { error } = await supabase
          .from("card_labels")
          .delete()
          .eq("card_id", cardId)
          .eq("label_id", labelId);
        if (error) {
          setCardLabels((prev) => [...prev, { cardId, labelId }]);
          report("Couldn't remove the label", error.message);
        }
      } else {
        setCardLabels((prev) => [...prev, { cardId, labelId }]);
        // I send board_id so the row is complete, but the trigger
        // overwrites it from the card before the policy checks it.
        const { error } = await supabase
          .from("card_labels")
          .insert({ card_id: cardId, label_id: labelId, board_id: boardId });
        if (error) {
          setCardLabels((prev) =>
            prev.filter((l) => !(l.cardId === cardId && l.labelId === labelId)),
          );
          report("Couldn't add the label", error.message);
        }
      }
    },
    [cardLabels, boardId, report],
  );

  // Comments --------------------------------------------------------------
  const addComment = useCallback(
    async (cardId: string, body: string) => {
      const trimmed = body.trim().slice(0, COMMENT_MAX);
      if (!trimmed) return false;
      // Not optimistic. I need the server id, and the insert policy
      // requires author_id to be me.
      const { data, error } = await supabase
        .from("card_comments")
        .insert({ card_id: cardId, board_id: boardId, author_id: userId, body: trimmed })
        .select("*")
        .single();
      if (error) {
        report("Couldn't post the comment", error.message);
        return false;
      }
      setComments((prev) => upsertById(prev, mapDbComment(data as DbComment)));
      return true;
    },
    [boardId, userId, report],
  );

  const editComment = useCallback(
    async (commentId: string, body: string) => {
      const trimmed = body.trim().slice(0, COMMENT_MAX);
      if (!trimmed) return false;
      const { data, error } = await supabase
        .from("card_comments")
        // Only `body` is grantable. author_id and card_id can't change.
        .update({ body: trimmed })
        .eq("id", commentId)
        .select("*");
      // The update policy is author_id = me. A miss comes back as zero
      // rows, which I treat as "not yours".
      if (error || !data?.length) {
        report("Couldn't edit the comment", error?.message ?? "you can only edit your own comments");
        return false;
      }
      setComments((prev) => upsertById(prev, mapDbComment(data[0] as DbComment)));
      return true;
    },
    [report],
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      const removed = comments.find((c) => c.id === commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      const { data, error } = await supabase
        .from("card_comments")
        .delete()
        .eq("id", commentId)
        .select("id");
      // Author-only, same as edit. Zero rows puts the comment back.
      if (error || !data?.length) {
        if (removed) setComments((prev) => upsertById(prev, removed));
        report("Couldn't delete the comment", error?.message ?? "you can only delete your own comments");
      }
    },
    [comments, report],
  );

  // Profile ---------------------------------------------------------------
  const updateProfile = useCallback(
    async (updates: { displayName?: string; avatarUrl?: string | null }) => {
      const db: { display_name?: string; avatar_url?: string | null } = {};
      if (updates.displayName !== undefined) {
        db.display_name = updates.displayName.trim().slice(0, DISPLAY_NAME_MAX);
      }
      // Clearing the photo has to be an explicit null. Undefined would
      // be dropped and the old URL would stay.
      if ("avatarUrl" in updates) db.avatar_url = updates.avatarUrl ?? null;
      const { data, error } = await supabase
        .from("profiles")
        .update(db)
        .eq("id", userId)
        .select("id, display_name, avatar_url");
      if (error || !data?.length) {
        return error?.message ?? "Your profile couldn't be saved.";
      }
      const profile = mapDbProfile(data[0] as DbProfile);
      setProfiles((prev) => new Map(prev).set(profile.id, profile));
      return null;
    },
    [userId],
  );

  /** Uploads to avatars/<uid>/… and returns the public URL (or an error). */
  const uploadAvatar = useCallback(
    async (file: File): Promise<{ url?: string; error?: string }> => {
      if (!AVATAR_TYPES.includes(file.type)) {
        return { error: "Please choose a PNG, JPEG, WebP or GIF image." };
      }
      if (file.size > AVATAR_MAX_BYTES) {
        return { error: "That image is over 1 MB. Please pick a smaller one." };
      }
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      // avatars/<uid>/... is what the storage policy checks. A new
      // object name busts the cached public URL; I delete the older
      // files in this folder afterwards.
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const bucket = supabase.storage.from("avatars");
      const { error } = await bucket.upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) return { error: error.message };

      const { data: existing } = await bucket.list(userId);
      const stale = (existing ?? [])
        .map((f) => `${userId}/${f.name}`)
        .filter((p) => p !== path);
      if (stale.length) await bucket.remove(stale);

      return { url: bucket.getPublicUrl(path).data.publicUrl };
    },
    [userId],
  );

  const removeAvatarFiles = useCallback(async () => {
    const bucket = supabase.storage.from("avatars");
    const { data: existing } = await bucket.list(userId);
    const paths = (existing ?? []).map((f) => `${userId}/${f.name}`);
    if (paths.length) await bucket.remove(paths);
  }, [userId]);

  return {
    memberIds,
    profiles,
    labels,
    cardLabels,
    comments,
    createLabel,
    deleteLabel,
    toggleCardLabel,
    addComment,
    editComment,
    deleteComment,
    updateProfile,
    uploadAvatar,
    removeAvatarFiles,
  };
}
