import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

// Email/password sessions and the anonymous guest session live in the
// same place. I subscribe to auth changes so a refresh, a sign-out in
// another tab, or "Try the demo" all update one `session`.
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
    // Confirm-email projects return a user and no session. I say so
    // instead of treating that as a signed-in board. The profile row
    // is created by the auth.users trigger, not here.
    if (data.user && !data.session) {
      setError("Check your email to confirm your account before signing in.");
    }
    return true;
  }

  // Anonymous auth is the demo. The JWT carries is_anonymous, and RLS
  // uses that claim to keep the guest on the seeded board. I rewrite
  // the two failures people actually hit (provider off, per-IP limit)
  // and leave anything else as Supabase sent it.
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

  // Set by signInAnonymously(). App uses this to pick the demo board
  // and to hide account-only actions.
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