import type { Collaborator } from "../types";

const PALETTE = ["#FF8A3D", "#3DDC97", "#6FA8FF", "#E45B8C", "#C9A63D"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * TEMPORARY: there's no profiles table yet, so we can't show a real name.
 * This derives a stable initials/color pair from the user id so the same
 * person always renders the same way. Replace with real profile data
 * (display_name, avatar_color columns) once that table exists.
 */
export function identityFor(userId: string): Collaborator {
  const hash = hashString(userId);
  const initials = userId.slice(0, 2).toUpperCase();
  const color = PALETTE[hash % PALETTE.length];

  return {
    id: userId,
    name: `User ${userId.slice(0, 6)}`,
    initials,
    color,
  };
}