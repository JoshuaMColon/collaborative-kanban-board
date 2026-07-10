import type { Collaborator, PresenceEntry } from "../types";
import { PresenceAvatar } from "./PresenceAvatar";

export function PresenceBar({
  boardTitle,
  collaborators,
  presence,
}: {
  boardTitle: string;
  collaborators: Collaborator[];
  presence: PresenceEntry[];
}) {
  const activeIds = new Set(presence.map((p) => p.collaboratorId));

  return (
    <header className="flex items-center justify-between border-b border-ink-border bg-ink-surface px-6 py-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted">
          Manifest Board
        </p>
        <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight text-text-primary">
          {boardTitle}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-sm border border-live-green/30 bg-live-green/10 px-2.5 py-1">
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
    </header>
  );
}
