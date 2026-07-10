import { useEffect, useState } from "react";
import { Board } from "./components/Board";
import { initialBoard } from "./data/mockData";

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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    window.localStorage.setItem("kanban-theme", theme);
  }, [theme]);

  return (
    <Board
      initialBoard={initialBoard}
      theme={theme}
      onToggleTheme={() =>
        setTheme((current) => (current === "dark" ? "light" : "dark"))
      }
    />
  );
}

export default App;
