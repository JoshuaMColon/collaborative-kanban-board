/** Due dates are plain calendar dates ("YYYY-MM-DD"), compared in local time. */

export type DueStatus = "overdue" | "soon" | "upcoming" | "done";

/** Days before the due date at which a chip turns amber. */
export const DUE_SOON_DAYS = 2;

function parseDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysUntil(due: string, now = new Date()): number {
  const ms = parseDay(due).getTime() - parseDay(todayKey(now)).getTime();
  return Math.round(ms / 86_400_000);
}

export function dueStatus(due: string, isDone: boolean, now = new Date()): DueStatus {
  if (isDone) return "done";
  const days = daysUntil(due, now);
  if (days < 0) return "overdue";
  if (days <= DUE_SOON_DAYS) return "soon";
  return "upcoming";
}

/** "Today", "Tomorrow", "Yesterday", or "Mar 4" (with year if not this year). */
export function formatDue(due: string, now = new Date()): string {
  const days = daysUntil(due, now);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  const date = parseDay(due);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

export function describeDue(due: string, status: DueStatus, now = new Date()): string {
  const days = daysUntil(due, now);
  const label = formatDue(due, now);
  const when = Math.abs(days) <= 1 ? label.toLowerCase() : label;
  if (status === "overdue") {
    return days === -1 ? "Overdue, was due yesterday" : `Overdue, was due ${when}`;
  }
  if (status === "soon") {
    return days <= 1 ? `Due ${when}` : `Due soon, ${when}`;
  }
  return `Due ${when}`;
}

/** "just now", "5m ago", "3h ago", "2d ago", or a date. */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
