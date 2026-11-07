import type { Collaborator, Profile } from "../types";

// Soft pastels; avatars render dark text on these (all >= 7:1 contrast).
const PALETTE = ["#F4A582", "#8FD1B0", "#9DBBF2", "#E8A0BF", "#E9C46A"];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // force a 32-bit int so the color doesn't drift
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
 * Name, initials, and color for a user id when I don't have a profile yet.
 *
 * The color is hashed from the id so the same person looks the same on
 * every client. I prefer identityFromProfile once the profile row has
 * loaded. The email argument is only a fallback label (the signed-in
 * user, or whatever presence happened to send); other people usually
 * arrive as an id alone.
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

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] ?? "?").slice(0, 2).toUpperCase();
}

/** Profile wins over the id placeholder: real display name and avatar. */
export function identityFromProfile(profile: Profile): Collaborator {
  const base = identityFor(profile.id);
  return {
    ...base,
    name: profile.displayName,
    initials: initialsFromName(profile.displayName),
    avatarUrl: profile.avatarUrl,
  };
}

// Seeded demo comments and deleted accounts store a null author_id.
// They share this one identity so the thread doesn't show a blank face.

export const TEAM_IDENTITY: Collaborator = {
  id: "kanban-team",
  name: "Kanban team",
  initials: "KT",
  color: "#E9C46A",
};
