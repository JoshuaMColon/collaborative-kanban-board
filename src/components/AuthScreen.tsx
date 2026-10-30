import { useState } from "react";
import { CalmBackground } from "./CalmBackground";
import { LazyBlurText as BlurText } from "./reactbits/LazyBlurText";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

export function AuthScreen({
  onSignIn,
  onSignUp,
  error,
}: {
  onSignIn: (email: string, password: string) => Promise<boolean>;
  onSignUp: (email: string, password: string) => Promise<boolean>;
  error: string | null;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const heading = mode === "signin" ? "Welcome back" : "Create your account";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);

    const ok =
      mode === "signin"
        ? await onSignIn(email, password)
        : await onSignUp(email, password);

    if (ok && mode === "signup") {
      setNotice(
        "Account created. Check your email if confirmation is required.",
      );
    }

    setSubmitting(false);
  }

  return (
    <div className="flex h-screen items-center justify-center px-6">
      <CalmBackground />
      <form
        onSubmit={handleSubmit}
        // Subtle entrance: rise a few px, unblur and settle (CSS, so it's
        // free; collapses to instant under prefers-reduced-motion).
        className="relative z-10 w-full max-w-sm animate-cardIn rounded-3xl border border-line bg-surface/95 p-7 shadow-pop backdrop-blur-sm"
      >
        <div
          aria-hidden="true"
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="4" width="5" height="14" rx="1.5" />
            <rect x="9.5" y="4" width="5" height="10" rx="1.5" />
            <rect x="15.5" y="4" width="5" height="7" rx="1.5" />
          </svg>
        </div>
        {reducedMotion ? (
          <h1 className="mb-1 font-display text-2xl font-extrabold text-text-primary">
            {heading}
          </h1>
        ) : (
          <div className="mb-1">
            <h1 className="sr-only">{heading}</h1>
            <div aria-hidden="true">
              <BlurText
                key={heading}
                text={heading}
                animateBy="words"
                trigger="load"
                direction="top"
                delay={90}
                stepDuration={0.4}
                blur={10}
                distance={14}
                className="font-display text-2xl font-extrabold text-text-primary"
              />
            </div>
          </div>
        )}
        <p className="mb-6 text-sm text-text-secondary">
          {mode === "signin"
            ? "Sign in to pick up where your team left off."
            : "Join the board and start planning together."}
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-priority-urgent/10 px-3 py-2 text-xs font-medium text-priority-urgent">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">{notice}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full rounded-lg py-1 text-sm text-text-secondary transition hover:text-accent"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
