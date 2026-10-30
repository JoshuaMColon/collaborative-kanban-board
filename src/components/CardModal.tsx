import { useEffect, useId, useState } from "react";
import { PRIORITY_META } from "../lib/priority";
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
  const titleId = useId();

  // Escape closes the dialog (it used to need a click on ✕ or the backdrop).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    await onSave({
      title: trimmedTitle,
      // An empty description is passed as undefined here; useBoardData sends
      // it to Supabase as an explicit null so clearing it actually persists.
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
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-[rgb(var(--shadow)/0.35)] p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md animate-fadeUp rounded-2xl border border-line bg-surface p-6 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="font-display text-lg font-bold text-text-primary">
            Edit card
            <span className="ml-2 align-middle font-mono text-[11px] font-normal text-text-muted">
              {card.code}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">
            Title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text-primary shadow-inner shadow-[rgb(var(--shadow)/0.03)] outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25 font-display font-semibold"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text-primary shadow-inner shadow-[rgb(var(--shadow)/0.03)] outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold text-text-secondary">
            Priority
          </span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as CardPriority)}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text-primary shadow-inner shadow-[rgb(var(--shadow)/0.03)] outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-priority-urgent transition hover:bg-priority-urgent/10 disabled:opacity-50"
          >
            Delete card
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-2 hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
