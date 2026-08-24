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

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0];
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

/**
 * Builds a stable identity (name/initials/color) for a user.
 *
 * If `email` is known (e.g. for the current signed-in user, or once a
 * profiles table exists and presence broadcasts email), it's used directly.
 * Otherwise this falls back to a placeholder derived from the user id, since
 * Presence payloads from OTHER users only carry their id today.
 */
export function identityFor(userId: string, email?: string | null): Collaborator {
  const hash = hashString(userId);
  const color = PALETTE[hash % PALETTE.length];

  if (email) {
    return {
      id: userId,
      name: email,
      initials: initialsFromEmail(email),
      color,
    };
  }

  return {
    id: userId,
    name: `User ${userId.slice(0, 6)}`,
    initials: userId.slice(0, 2).toUpperCase(),
    color,
  };
}