import { createClient } from "@supabase/supabase-js";

// One browser client for auth, Postgres, realtime, and storage.
// The anon key is public on purpose. Who can read or write is decided
// by row-level security, not by hiding this key. I throw at startup
// when the env is missing so a bad deploy fails here instead of on
// the first request.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);