const AVATAR_PREFIX = `${import.meta.env.VITE_SUPABASE_URL ?? ""}/storage/v1/object/public/avatars/`;

/** Only show images served from this project's avatars bucket. */
export function safeAvatarUrl(url: string | null | undefined): string | null {
  if (!url || !import.meta.env.VITE_SUPABASE_URL) return null;
  return url.startsWith(AVATAR_PREFIX) ? url : null;
}
