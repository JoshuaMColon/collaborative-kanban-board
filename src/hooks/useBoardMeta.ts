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

function friendly(message: string): string {
  if (/demo board is full/i.test(message)) return message;
  if (/board_labels_board_name_key|duplicate key/i.test(message)) {
    return "A label with that name already exists.";
  }
  return message;
}

/**
 * Everything around the cards: board members and their profiles, labels,
 * which cards carry which labels, and comments. Kept separate from
 * useBoardData so the card/list sync stays exactly as it was.
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
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const report = useCallback((prefix: string, message: string) => {
    onErrorRef.current(`${prefix}: ${friendly(message)}`);
  }, []);

  const loadProfiles = useCallback(async (ids: string[]) => {
    const missing = ids.filter((id) => id && !requested.current.has(id));
    if (missing.length === 0) return;
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

  // Join the board (members list + assignee picker), then load everything.
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

  // The signup trigger creates profiles, but self-heal if ours is missing.
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

  // Realtime for comments, labels, label links, members and profile edits.
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
        // board_id is filled in (and checked) by a trigger.
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
        .update({ body: trimmed })
        .eq("id", commentId)
        .select("*");
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
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const bucket = supabase.storage.from("avatars");
      const { error } = await bucket.upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
      if (error) return { error: error.message };

      // Tidy up older uploads in this user's folder (best effort).
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
