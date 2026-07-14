import { useState } from "react";
import type { BoardCard, CardPriority } from "../types";

const PRIORITY_OPTIONS: CardPriority[] = ["low", "standard", "urgent"];

export function CardModal({
  card,
  onClose,
  onSave,
  onDelete,
}: {
  card: BoardCard;
  onClose: () => void;
  onSave: (
    updates: Partial<Pick<BoardCard, "title" | "description" | "priority">>,
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState<CardPriority>(card.priority);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    await onSave({
      title: trimmedTitle,
      description: description.trim() || undefined,
      priority,
    });
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete card "${card.code}"? This can't be undone.`)) {
      return;
    }
    setSaving(true);
    await onDelete();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-ink-border bg-ink-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[11px] text-text-muted">
            {card.code}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted transition hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-sm border border-ink-border bg-ink px-3 py-2 font-display text-sm text-text-primary outline-none focus:border-signal-amber/60"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-sm border border-ink-border bg-ink px-3 py-2 text-sm text-text-primary outline-none focus:border-signal-amber/60"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Priority
          </span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CardPriority)}
            className="w-full rounded-sm border border-ink-border bg-ink px-3 py-2 font-mono text-sm text-text-primary outline-none focus:border-signal-amber/60"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-sm border border-signal-amber/30 px-3 py-1.5 font-mono text-[11px] text-signal-amber transition hover:bg-signal-amber/10 disabled:opacity-50"
          >
            Delete card
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-sm px-3 py-1.5 text-sm text-text-secondary transition hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="rounded-sm bg-signal-amber px-4 py-1.5 text-sm font-semibold text-ink transition hover:bg-signal-amber/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
