import { lazy, Suspense, useEffect, useState } from "react";
import type { Collaborator, PresenceEntry } from "../types";
import { PresenceAvatar } from "./PresenceAvatar";
import { LazyBlurText as BlurText } from "./reactbits/LazyBlurText";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const SquishSwitch = lazy(() =>
  import("./SquishSwitch").then((module) => ({
    default: module.SquishSwitch,
  })),
);

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
  const reducedMotion = usePrefersReducedMotion();
  // The title blurs in once when the board first mounts. Captured in state so
  // later renames / realtime updates never replay it.
  const [introText] = useState(() => boardTitle.trim());
  const [introDone, setIntroDone] = useState(() => !boardTitle.trim());
  const showIntro = !introDone && !reducedMotion;

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
    <header className="border-b border-line/70 bg-surface/75 px-4 py-3.5 backdrop-blur-md sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full bg-accent"
            />
            Collaborative Kanban Board
          </p>
          <div className="relative mt-0.5 w-full max-w-xl">
          {showIntro && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-1 -mx-1"
            >
              <BlurText
                text={introText}
                animateBy="letters"
                trigger="load"
                direction="top"
                delay={28}
                stepDuration={0.32}
                blur={8}
                distance={10}
                onAnimationComplete={() => setIntroDone(true)}
                className="!flex-nowrap whitespace-pre font-display text-2xl font-extrabold tracking-tight text-text-primary"
              />
            </div>
          )}
          <input
            aria-label="Board title"
            onFocus={() => setIntroDone(true)}
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
            className={`w-full rounded-lg border-none bg-transparent px-1 -mx-1 font-display text-2xl font-extrabold tracking-tight text-text-primary outline-none transition placeholder:text-text-muted hover:bg-surface-2/70 focus:bg-surface-2/70 focus-visible:ring-2 focus-visible:ring-accent/60 ${
              showIntro && draftTitle === introText ? "text-transparent" : ""
            }`}
            placeholder="Untitled board"
          />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Suspense
            fallback={
              <button
                type="button"
                onClick={onToggleTheme}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2 text-sm font-medium text-text-primary transition hover:border-line-strong"
              >
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            }
          >
            <SquishSwitch
              checked={theme === "dark"}
              onChange={onToggleTheme}
              label={theme === "dark" ? "Light mode" : "Dark mode"}
              ariaLabel={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              trackColor="rgb(var(--border-strong))"
              trackOnColor="rgb(var(--accent) / 0.85)"
              width={76}
              height={38}
              radius={19}
              speed={50}
              stretch={36}
              hoverScale={1.035}
              colorDuration={320}
              disabled={false}
              thumbColor="rgb(var(--surface))"
              thumbOnColor="rgb(var(--surface))"
            />
          </Suspense>

          <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1.5 ring-1 ring-inset ring-success/25">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="text-xs font-semibold text-success">
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
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary shadow-soft transition hover:border-accent/40 hover:text-accent"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}