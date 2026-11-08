export type CardPriority = "low" | "standard" | "urgent";

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string; // hex, used for avatar ring + presence dot
  /** Public Storage URL of the user's avatar, if they uploaded one. */
  avatarUrl?: string | null;
}

/** Row from public.profiles (one per auth user, created on signup). */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CardComment {
  id: string;
  cardId: string;
  /** null for seeded demo comments or a deleted account. */
  authorId: string | null;
  body: string;
  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export type LabelColor =
  | "terracotta"
  | "amber"
  | "sage"
  | "teal"
  | "sky"
  | "plum"
  | "rose"
  | "slate";

export interface BoardLabel {
  id: string;
  name: string;
  color: LabelColor;
}

export interface CardLabelLink {
  cardId: string;
  labelId: string;
}

export interface BoardCard {
  id: string;
  code: string; // e.g. "MAN-014", assigned by a Postgres trigger
  title: string;
  description?: string;
  priority: CardPriority;
  assigneeId?: string;
  /** Calendar date, "YYYY-MM-DD" (no time zone). */
  dueDate?: string;
  listId: string;
  /** Integer position in the list. Gaps, not a dense 0..n index. */
  order: number;
  updatedAt: string;
}

export interface BoardList {
  id: string;
  title: string;
  /** Append order. Lists aren't drag-reordered; cards are. */
  order: number;
}

export interface Board {
  id: string;
  title: string;
  lists: BoardList[];
  /** Flat, not nested under lists. The list id on each card is the join. */
  cards: BoardCard[];
}

/**
 * One person currently connected to this board, from Supabase Presence.
 * viewingCardId is on the payload, but this client never publishes one,
 * so "who's looking at this card" stays empty.
 */
export interface PresenceEntry {
  collaboratorId: string;
  email?: string;
  viewingCardId?: string;
  lastActiveAt: string;
}
