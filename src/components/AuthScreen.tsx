import { useState } from "react";

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);

    const ok =
      mode === "signin"
        ? await onSignIn(email, password)
        : await onSignUp(email, password);

    if (ok && mode === "signup") {
      setNotice("Account created. Check your email if confirmation is required.");
    }

    setSubmitting(false);
  }

  return (
    <div className="flex h-screen items-center justify-center bg-ink px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-ink-border bg-ink-surface p-6"
      >
        <h1 className="mb-1 font-display text-xl font-semibold text-text-primary">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mb-5 font-mono text-[11px] text-text-muted">
          Manifest Board
        </p>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-ink-border bg-ink px-3 py-2 text-sm text-text-primary outline-none focus:border-signal-amber/60"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Password
          </span>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-sm border border-ink-border bg-ink px-3 py-2 text-sm text-text-primary outline-none focus:border-signal-amber/60"
          />
        </label>

        {error && (
          <p className="mb-3 font-mono text-[11px] text-signal-amber">{error}</p>
        )}
        {notice && (
          <p className="mb-3 font-mono text-[11px] text-live-green">{notice}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-signal-amber px-4 py-2 text-sm font-semibold text-ink transition hover:bg-signal-amber/90 disabled:opacity-50"
        >
          {mode === "signin" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-3 w-full font-mono text-[11px] text-text-muted transition hover:text-text-primary"
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}