import { useEffect, useState } from "react";
import type { Collaborator, PresenceEntry } from "../types";
import { PresenceAvatar } from "./PresenceAvatar";

export function PresenceBar({
  boardTitle,
  collaborators,
  presence,
  theme,
  onToggleTheme,
  onRenameBoard,
  onSignOut,
}: {
  boardTitle: string;
  collaborators: Collaborator[];
  presence: PresenceEntry[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onRenameBoard: (title: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const activeIds = new Set(presence.map((p) => p.collaboratorId));
  const [draftTitle, setDraftTitle] = useState(boardTitle);

  useEffect(() => {
    setDraftTitle(boardTitle);
  }, [boardTitle]);

  async function commitTitle() {
    const trimmed = draftTitle.trim();
    // Only write when the user actually typed something — an empty field
    // just keeps showing the placeholder, no forced default gets saved.
    if (!trimmed) {
      setDraftTitle("");
      return;
    }
    setDraftTitle(trimmed);
    await onRenameBoard(trimmed);
  }

  return (
    <header className="border-b border-ink-border bg-ink-surface px-4 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
            Collaborative Kanban Board
          </p>
          <input
            aria-label="Board title"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void commitTitle();
              }
              if (event.key === "Escape") {
                setDraftTitle(boardTitle);
              }
            }}
            className="mt-0.5 w-full max-w-xl border-none bg-transparent font-display text-xl font-semibold tracking-tight text-text-primary outline-none placeholder:text-text-muted"
            placeholder="Untitled board"
          />
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

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="rounded-full border border-ink-border/70 bg-ink px-3 py-2 font-mono text-[11px] text-text-muted transition hover:border-signal-amber/40 hover:text-signal-amber"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}