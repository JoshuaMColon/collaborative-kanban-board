const AVATAR_PREFIX = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/`;

// The avatars bucket is public, so a profile could store any string.
// I only render URLs that point at this project's own object path.
export function safeAvatarUrl(url: string | null | undefined): string | null {
  if (!url || !import.meta.env.VITE_SUPABASE_URL) return null;
  return url.startsWith(AVATAR_PREFIX) ? url : null;
}
