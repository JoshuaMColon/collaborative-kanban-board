import type { BoardCard } from "../types";

export interface BoardFilter {
  text: string;
  labelId: string; // "" = any
  assigneeId: string; // "" = anyone, "none" = unassigned
}

export const EMPTY_FILTER: BoardFilter = { text: "", labelId: "", assigneeId: "" };

export function isFilterActive(f: BoardFilter) {
  return Boolean(f.text.trim() || f.labelId || f.assigneeId);
}

export function matchesFilter(card: BoardCard, f: BoardFilter, labelIds: string[]) {
  const q = f.text.trim().toLowerCase();
  if (
    q &&
    !card.title.toLowerCase().includes(q) &&
    !(card.description ?? "").toLowerCase().includes(q) &&
    !card.code.toLowerCase().includes(q)
  ) {
    return false;
  }
  if (f.labelId && !labelIds.includes(f.labelId)) return false;
  if (f.assigneeId === "none" && card.assigneeId) return false;
  if (f.assigneeId && f.assigneeId !== "none" && card.assigneeId !== f.assigneeId) {
    return false;
  }
  return true;
}
