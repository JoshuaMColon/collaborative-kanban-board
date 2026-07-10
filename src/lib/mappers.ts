import type { BoardCard, BoardList, CardPriority } from "../types";

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
    listId: row.list_id,
    order: row.order,
    comments: [], // comments aren't in the schema yet
    updatedAt: row.updated_at,
  };
}