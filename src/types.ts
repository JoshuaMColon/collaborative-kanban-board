export type CardPriority = "low" | "standard" | "urgent";

export interface Collaborator {
  id: string;
  name: string;
  initials: string;
  color: string; // hex, used for avatar ring + presence dot
}

export interface CardComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO timestamp
}

export interface BoardCard {
  id: string;
  code: string; // e.g. "MAN-014" — manifest-style ticket code
  title: string;
  description?: string;
  priority: CardPriority;
  assigneeId?: string;
  listId: string;
  order: number;
  comments: CardComment[];
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
  viewingCardId?: string;
  lastActiveAt: string;
}
