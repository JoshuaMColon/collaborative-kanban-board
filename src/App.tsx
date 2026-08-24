import { useEffect, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { Board } from "./components/Board";
import { useAuth } from "./hooks/useAuth";

type ThemeMode = "light" | "dark";

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem("kanban-theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const boardId = import.meta.env.VITE_TEST_BOARD_ID;
  const { session, loading, error, signIn, signUp, signOut } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  if (!boardId) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink px-6">
        <p className="max-w-md text-center font-mono text-sm text-signal-amber">
          Missing VITE_TEST_BOARD_ID. Add it to .env.local (the board's UUID
          from Supabase).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ink">
        <p className="font-mono text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} error={error} />;
  }

  return (
    <Board
      boardId={boardId}
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
      userId={session.user.id}
      onSignOut={signOut}
    />
  );
}

export default App;