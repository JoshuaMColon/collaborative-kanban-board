import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/**
 * TEMPORARY: signs in with a hardcoded test account so RLS-protected queries
 * have a real session to authenticate against, before a proper login screen
 * exists. Replace this with real signup/login UI, then delete the env vars
 * this depends on (VITE_TEST_USER_EMAIL / VITE_TEST_USER_PASSWORD).
 */
export function useAuthBootstrap() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        if (!cancelled) {
          setSession(existing.session);
          setLoading(false);
        }
        return;
      }

      const email = import.meta.env.VITE_TEST_USER_EMAIL;
      const password = import.meta.env.VITE_TEST_USER_PASSWORD;

      if (!email || !password) {
        if (!cancelled) {
          setError(
            "No active session and no VITE_TEST_USER_EMAIL / VITE_TEST_USER_PASSWORD set."
          );
          setLoading(false);
        }
        return;
      }

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (!cancelled) {
        if (signInError) setError(signInError.message);
        setSession(data.session ?? null);
        setLoading(false);
      }
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!cancelled) setSession(newSession);
      }
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading, error };
}