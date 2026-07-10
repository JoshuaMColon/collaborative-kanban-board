import type { Collaborator, PresenceEntry } from "../types";
import { PresenceAvatar } from "./PresenceAvatar";

export function PresenceBar({
  boardTitle,
  collaborators,
  presence,
  theme,
  onToggleTheme,
}: {
  boardTitle: string;
  collaborators: Collaborator[];
  presence: PresenceEntry[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
}) {
  const activeIds = new Set(presence.map((p) => p.collaboratorId));

  return (
    <header className="border-b border-ink-border bg-ink-surface px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Manifest Board
          </p>
          <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-text-primary">
            {boardTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center gap-2 rounded-full border border-ink-border/70 bg-ink px-3 py-2 text-sm font-medium text-text-primary transition hover:border-ink-borderLight"
          >
            <span className="text-base">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>

          <div className="flex items-center gap-1.5 rounded-full border border-live-green/30 bg-live-green/10 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-live-green" />
            <span className="font-mono text-[11px] text-live-green">
              {presence.length} online
            </span>
          </div>

          <div className="flex -space-x-2">
            {collaborators.map((c) => (
              <PresenceAvatar
                key={c.id}
                collaborator={c}
                isActive={activeIds.has(c.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
