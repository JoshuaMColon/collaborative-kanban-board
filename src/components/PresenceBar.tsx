import { lazy, Suspense, useEffect, useState } from "react";
import type { BoardLabel, Collaborator, PresenceEntry } from "../types";
import { EMPTY_FILTER, isFilterActive, type BoardFilter } from "../lib/filters";
import { Avatar } from "./Avatar";
import { PresenceAvatar } from "./PresenceAvatar";
import { LazyBlurText as BlurText } from "./reactbits/LazyBlurText";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const FILTER_FIELD =
  "rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-text-primary outline-none transition placeholder:text-text-muted hover:border-line-strong focus:border-accent/60 focus:ring-2 focus:ring-accent/25";

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
  me,
  onOpenProfile,
  isDemo,
  onCreateAccount,
  filter,
  onFilterChange,
  labels,
  members,
  hiddenCount,
}: {
  boardTitle: string;
  collaborators: Collaborator[];
  presence: PresenceEntry[];
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onRenameBoard: (title: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  me: Collaborator;
  onOpenProfile: () => void;
  isDemo: boolean;
  onCreateAccount: () => void;
  filter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  labels: BoardLabel[];
  members: Collaborator[];
  /** Cards hidden by the current filter. */
  hiddenCount: number;
}) {
  const filtering = isFilterActive(filter);
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
            {isDemo && (
              <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-fg">
                Demo
              </span>
            )}
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
            maxLength={120}
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
            onClick={onOpenProfile}
            aria-label={`Your profile (${me.name})`}
            title="Your profile"
            className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-xs font-semibold text-text-secondary shadow-soft transition hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <Avatar collaborator={me} size="sm" decorative />
            <span className="max-w-[8rem] truncate">{me.name}</span>
          </button>

          <button
            type="button"
            onClick={() => void onSignOut()}
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-text-secondary shadow-soft transition hover:border-accent/40 hover:text-accent"
          >
            {isDemo ? "Leave demo" : "Sign out"}
          </button>
        </div>
      </div>

      <div
        role="search"
        aria-label="Filter cards"
        className="mt-3 flex flex-wrap items-center gap-2"
      >
        <label className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <span className="sr-only">Search cards</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="m10.5 10.5 3 3" />
          </svg>
          <input
            type="search"
            value={filter.text}
            maxLength={100}
            onChange={(e) => onFilterChange({ ...filter, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Escape" && filter.text) {
                e.preventDefault();
                onFilterChange({ ...filter, text: "" });
              }
            }}
            placeholder="Search cards…"
            className={`${FILTER_FIELD} w-full pl-8`}
          />
        </label>
        <label>
          <span className="sr-only">Filter by label</span>
          <select
            value={filter.labelId}
            onChange={(e) => onFilterChange({ ...filter, labelId: e.target.value })}
            className={FILTER_FIELD}
          >
            <option value="">All labels</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by assignee</span>
          <select
            value={filter.assigneeId}
            onChange={(e) => onFilterChange({ ...filter, assigneeId: e.target.value })}
            className={FILTER_FIELD}
          >
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === me.id ? `${m.name} (you)` : m.name}
              </option>
            ))}
          </select>
        </label>
        {filtering && (
          <>
            <button
              type="button"
              onClick={() => onFilterChange(EMPTY_FILTER)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Clear filters
            </button>
            <p className="text-xs text-text-muted" role="status">
              {hiddenCount} card{hiddenCount === 1 ? "" : "s"} hidden · dragging is paused while filtering
            </p>
          </>
        )}
      </div>

      {isDemo && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-text-primary">
          <p className="flex-1">
            <span className="font-semibold">You're exploring a shared demo board.</span>{" "}
            <span className="text-text-secondary">
              Anyone trying the demo sees your changes, and it resets every hour.
            </span>
          </p>
          <button
            type="button"
            onClick={onCreateAccount}
            className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Create a free account
          </button>
        </div>
      )}
    </header>
  );
}