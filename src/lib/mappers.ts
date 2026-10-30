import type {
  BoardCard,
  BoardLabel,
  BoardList,
  CardComment,
  CardPriority,
  LabelColor,
  Profile,
} from "../types";

// Raw shapes as they come back from Supabase (snake_case, matches the SQL schema)
export interface DbList {
  id: string;
  board_id: string;
  title: string;
  order: number;
}

export interface DbCard {
  id: string;
  code: string;
  title: string;
  description: string | null;
  priority: CardPriority;
  assignee_id: string | null;
  list_id: string;
  board_id: string;
  order: number;
  updated_at: string;
  due_date: string | null;
}

export interface DbProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface DbComment {
  id: string;
  card_id: string;
  board_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface DbLabel {
  id: string;
  board_id: string;
  name: string;
  color: LabelColor;
}

export interface DbCardLabel {
  card_id: string;
  label_id: string;
  board_id: string;
}

export function mapDbList(row: DbList): BoardList {
  return {
    id: row.id,
    title: row.title,
    order: row.order,
  };
}

export function mapDbCard(row: DbCard): BoardCard {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority,
    assigneeId: row.assignee_id ?? undefined,
    dueDate: row.due_date ?? undefined,
    listId: row.list_id,
    order: row.order,
    updatedAt: row.updated_at,
  };
}

export function mapDbProfile(row: DbProfile): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

export function mapDbComment(row: DbComment): CardComment {
  return {
    id: row.id,
    cardId: row.card_id,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDbLabel(row: DbLabel): BoardLabel {
  return { id: row.id, name: row.name, color: row.color };
}