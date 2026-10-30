import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

/** Tracks the `.dark` class App.tsx toggles on <html>. */
export function useIsDarkTheme() {
  return useSyncExternalStore(subscribe, isDark, () => false);
}
