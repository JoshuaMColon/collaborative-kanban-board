import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!cancelled) setSession(newSession);
      },
    );

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      setError(signInError.message);
      return false;
    }
    return true;
  }

  async function signUp(email: string, password: string) {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      return false;
    }
    if (data.user && !data.session) {
      setError("Check your email to confirm your account before signing in.");
    }
    return true;
  }

  // Demo mode: a throwaway anonymous session that can only reach the seeded
  // demo board (enforced by RLS on the is_anonymous JWT claim).
  async function signInAsGuest() {
    setError(null);
    const { error: anonError } = await supabase.auth.signInAnonymously();
    if (anonError) {
      const disabled =
        anonError.code === "anonymous_provider_disabled" ||
        /anonymous sign-ins are disabled/i.test(anonError.message);
      setError(
        disabled
          ? "The demo isn't switched on yet. Please sign up or check back soon."
          : anonError.status === 429
            ? "Lots of people are trying the demo right now. Please try again in a few minutes."
            : anonError.message,
      );
      return false;
    }
    return true;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAnonymous = Boolean(session?.user?.is_anonymous);

  return {
    session,
    loading,
    error,
    isAnonymous,
    signIn,
    signUp,
    signInAsGuest,
    signOut,
  };
}