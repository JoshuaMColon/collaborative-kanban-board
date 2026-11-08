import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { Board } from "./components/Board";
import { CalmBackground } from "./components/CalmBackground";
import { ClickSparkLayer } from "./components/ClickSparkLayer";
import { LatticeLoader } from "./components/LatticeLoader";
import { useAuth } from "./hooks/useAuth";
import { supabase } from "./lib/supabase";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem("kanban-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  // The warm light theme is the default; the toggle remembers a choice.
  return "light";
}

// The portfolio links to /demo. I start one guest session from here,
// then replace the URL with / so a refresh doesn't mint another
// anonymous user. The flag is module-level because StrictMode runs
// the effect twice in dev.
let demoRouteHandled = false;
const openedOnDemoRoute =
  typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/demo";

function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const envBoardId = import.meta.env.VITE_TEST_BOARD_ID;
  const {
    session,
    loading,
    error,
    isAnonymous,
    signIn,
    signUp,
    signInAsGuest,
    signOut,
  } = useAuth();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  // Guests ignore VITE_TEST_BOARD_ID. I look up the is_demo board;
  // RLS is what makes that the only row this session can see.
  const [demo, setDemo] = useState<{
    userId: string;
    boardId: string | null;
    error: string | null;
  } | null>(null);
  const demoUserId = isAnonymous ? (session?.user.id ?? null) : null;

  useEffect(() => {
    if (!demoUserId) return;
    let cancelled = false;
    void supabase
      .from("boards")
      .select("id")
      .eq("is_demo", true)
      .limit(1)
      .maybeSingle()
      .then(({ data, error: demoError }) => {
        if (cancelled) return;
        setDemo({
          userId: demoUserId,
          boardId: (data?.id as string | undefined) ?? null,
          error: demoError
            ? demoError.message
            : data
              ? null
              : "The demo board isn't available right now. Please try again in a few minutes.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [demoUserId]);

  const [autoDemo, setAutoDemo] = useState(openedOnDemoRoute);

  useEffect(() => {
    if (!autoDemo || loading || demoRouteHandled) return;
    demoRouteHandled = true;
    window.history.replaceState(null, "", "/" + window.location.search);
    // Already signed in (a real account, or a guest refresh). Don't
    // start a second anonymous session on top of it.
    if (session) {
      setAutoDemo(false);
      return;
    }
    void signInAsGuest().finally(() => setAutoDemo(false));
  }, [autoDemo, loading, session, signInAsGuest]);

  const demoState = demo && demo.userId === demoUserId ? demo : null;
  const boardId = isAnonymous ? demoState?.boardId : envBoardId;

  async function createAccountFromDemo() {
    // Anonymous users aren't upgraded in place. I sign out and open
    // sign-up; the daily job deletes the guest row.
    setAuthMode("signup");
    await signOut();
  }

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  return (
    <>
      <ClickSparkLayer />
      {renderScreen()}
    </>
  );

  function renderScreen() {
    if (!isAnonymous && !envBoardId) {
      return (
        <div className="flex h-screen items-center justify-center px-6">
          <CalmBackground />
          <p className="max-w-md rounded-2xl border border-line bg-surface px-5 py-4 text-center text-sm text-text-primary shadow-soft">
            Missing VITE_TEST_BOARD_ID. Add it to .env.local (the board's UUID
            from Supabase).
          </p>
        </div>
      );
    }

    if (loading || (autoDemo && !session) || (isAnonymous && !demoState)) {
      return (
        <div className="flex h-screen items-center justify-center text-accent">
          <CalmBackground />
          <LatticeLoader
            label={isAnonymous || autoDemo ? "Opening the demo board" : "Loading session"}
            pattern="orbit"
            grid={3}
            shape="round"
            color="currentColor"
          />
        </div>
      );
    }

    if (!session) {
      return (
        <AuthScreen
          key={authMode}
          initialMode={authMode}
          onSignIn={signIn}
          onSignUp={signUp}
          onTryDemo={signInAsGuest}
          error={error}
        />
      );
    }

    if (!boardId) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
          <CalmBackground />
          <p
            role="alert"
            className="max-w-md rounded-2xl border border-line bg-surface px-5 py-4 text-center text-sm text-text-primary shadow-soft"
          >
            {demoState?.error ?? "The demo board isn't available right now."}
          </p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90"
          >
            Back to sign in
          </button>
        </div>
      );
    }

    return (
      <Board
        key={boardId}
        boardId={boardId}
        theme={theme}
        onToggleTheme={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
        userId={session.user.id}
        userEmail={session.user.email ?? null}
        isDemo={isAnonymous}
        onSignOut={async () => {
          setAuthMode("signin");
          await signOut();
        }}
        onCreateAccount={() => void createAccountFromDemo()}
      />
    );
  }
}

export default App;
