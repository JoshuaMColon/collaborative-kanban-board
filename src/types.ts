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
  code: string; // e.g. "MAN-014" — manifest-style ticket code
  title: string;
  description?: string;
  priority: CardPriority;
  assigneeId?: string;
  /** Calendar date, "YYYY-MM-DD" (no time zone). */
  dueDate?: string;
  listId: string;
  order: number;
  updatedAt: string;
}

export interface BoardList {
  id: string;
  title: string;
  order: number;
}

export interface Board {
  id: string;
  title: string;
  lists: BoardList[];
  cards: BoardCard[];
}

/**
 * Presence represents who is currently viewing/active on the board.
 * This is populated by Supabase Presence once the backend is wired up;
 * for now it's driven by mock data.
 */
export interface PresenceEntry {
  collaboratorId: string;
  email?: string;
  viewingCardId?: string;
  lastActiveAt: string;
}
