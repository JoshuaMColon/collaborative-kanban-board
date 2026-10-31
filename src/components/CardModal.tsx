import { useId, useMemo, useRef, useState } from "react";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { COMMENT_MAX } from "../hooks/useBoardMeta";
import type { CardUpdates } from "../hooks/useBoardData";
import { describeDue, dueStatus, timeAgo } from "../lib/dates";
import { LABEL_COLORS, LABEL_NAME_MAX, labelChipClass } from "../lib/labels";
import { PRIORITY_META } from "../lib/priority";
import type {
  BoardCard,
  BoardLabel,
  CardComment,
  CardPriority,
  Collaborator,
  LabelColor,
} from "../types";
import { Avatar } from "./Avatar";

const PRIORITY_OPTIONS: CardPriority[] = ["low", "standard", "urgent"];
const CARD_TITLE_MAX = 200;
const CARD_DESCRIPTION_MAX = 5000;

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text-primary shadow-inner shadow-[rgb(var(--shadow)/0.03)] outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25";
const SECTION_LABEL = "mb-1 block text-xs font-semibold text-text-secondary";
const GHOST_BTN =
  "rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50";

export function CardModal({
  card,
  isDoneList,
  members,
  labels,
  cardLabelIds,
  comments,
  currentUserId,
  collaboratorFor,
  onClose,
  onSave,
  onDelete,
  onToggleLabel,
  onCreateLabel,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: {
  card: BoardCard;
  isDoneList: boolean;
  /** People who can be assigned (board members, with profiles). */
  members: Collaborator[];
  labels: BoardLabel[];
  cardLabelIds: string[];
  comments: CardComment[];
  currentUserId: string;
  collaboratorFor: (userId: string | null) => Collaborator;
  onClose: () => void;
  onSave: (updates: CardUpdates) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleLabel: (labelId: string) => Promise<void>;
  onCreateLabel: (name: string, color: LabelColor) => Promise<BoardLabel | null>;
  onAddComment: (body: string) => Promise<boolean>;
  onEditComment: (commentId: string, body: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [priority, setPriority] = useState<CardPriority>(card.priority);
  const [assigneeId, setAssigneeId] = useState(card.assigneeId ?? "");
  const [dueDate, setDueDate] = useState(card.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const onKeyDown = useDialogFocus(dialogRef, onClose, titleInputRef);

  // Someone assigned who isn't in the members list still shows up.
  const assigneeOptions = useMemo(() => {
    const list = [...members];
    if (card.assigneeId && !list.some((m) => m.id === card.assigneeId)) {
      list.push(collaboratorFor(card.assigneeId));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [members, card.assigneeId, collaboratorFor]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setSaving(true);
    await onSave({
      title: trimmedTitle,
      // Empty values are passed as undefined; useBoardData sends them to
      // Supabase as explicit nulls so clearing a field actually persists.
      description: description.trim() || undefined,
      priority,
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
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

  const due = dueDate ? dueStatus(dueDate, isDoneList) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-[rgb(var(--shadow)/0.35)] p-3 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-3xl animate-fadeUp flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line/70 px-6 py-4">
          <h2 id={titleId} className="font-display text-lg font-bold text-text-primary">
            Edit card
            <span className="ml-2 align-middle font-mono text-[11px] font-normal text-text-muted">
              {card.code}
            </span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-text-muted transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5 md:grid-cols-[minmax(0,1fr)_15rem]">
          {/* Main column: details + comments */}
          <div className="min-w-0">
            <label className="mb-3 block">
              <span className={SECTION_LABEL}>Title</span>
              <input
                ref={titleInputRef}
                value={title}
                maxLength={CARD_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                className={`${FIELD} font-display font-semibold`}
              />
            </label>

            <label className="mb-5 block">
              <span className={SECTION_LABEL}>Description</span>
              <textarea
                value={description}
                maxLength={CARD_DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add a few details…"
                className={`${FIELD} resize-y`}
              />
            </label>

            <CommentThread
              comments={comments}
              currentUserId={currentUserId}
              collaboratorFor={collaboratorFor}
              onAdd={onAddComment}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
            />
          </div>

          {/* Side column: properties */}
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className={SECTION_LABEL}>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CardPriority)}
                className={FIELD}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_META[p].label}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <label className={SECTION_LABEL} htmlFor={`${titleId}-assignee`}>
                Assignee
              </label>
              <div className="flex items-center gap-2">
                <Avatar
                  collaborator={
                    assigneeId
                      ? collaboratorFor(assigneeId)
                      : { id: "none", name: "Unassigned", initials: "–", color: "rgb(var(--surface-2))" }
                  }
                  size="md"
                  decorative
                  className="ring-1 ring-line"
                />
                <select
                  id={`${titleId}-assignee`}
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className={FIELD}
                >
                  <option value="">Unassigned</option>
                  {assigneeOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.id === currentUserId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1 flex gap-1">
                {assigneeId !== currentUserId && (
                  <button type="button" className={GHOST_BTN} onClick={() => setAssigneeId(currentUserId)}>
                    Assign to me
                  </button>
                )}
                {assigneeId && (
                  <button type="button" className={GHOST_BTN} onClick={() => setAssigneeId("")}>
                    Unassign
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={SECTION_LABEL} htmlFor={`${titleId}-due`}>
                Due date
              </label>
              <input
                id={`${titleId}-due`}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`${FIELD} [color-scheme:inherit]`}
              />
              <div className="mt-1 flex min-h-[1.75rem] items-center justify-between gap-2">
                {dueDate && due ? (
                  <span className={`due-chip due-${due} rounded-full px-2 py-0.5 text-[11px] font-semibold`}>
                    {describeDue(dueDate, due)}
                  </span>
                ) : (
                  <span className="text-[11px] text-text-muted">No due date</span>
                )}
                {dueDate && (
                  <button type="button" className={GHOST_BTN} onClick={() => setDueDate("")}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <LabelPicker
              labels={labels}
              selectedIds={cardLabelIds}
              onToggle={onToggleLabel}
              onCreate={onCreateLabel}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line/70 px-6 py-3.5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-priority-urgent transition hover:bg-priority-urgent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-priority-urgent/50 disabled:opacity-50"
          >
            Delete card
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabelPicker({
  labels,
  selectedIds,
  onToggle,
  onCreate,
}: {
  labels: BoardLabel[];
  selectedIds: string[];
  onToggle: (labelId: string) => Promise<void>;
  onCreate: (name: string, color: LabelColor) => Promise<BoardLabel | null>;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<LabelColor>("terracotta");
  const [busy, setBusy] = useState(false);
  const groupId = useId();

  async function submit() {
    if (!name.trim() || busy) return;
    setBusy(true);
    const label = await onCreate(name, color);
    setBusy(false);
    if (label) {
      setName("");
      setCreating(false);
      await onToggle(label.id);
    }
  }

  return (
    <div>
      <p className={SECTION_LABEL} id={groupId}>
        Labels
      </p>
      {labels.length === 0 && !creating && (
        <p className="mb-1 text-[11px] text-text-muted">No labels on this board yet.</p>
      )}
      <ul className="flex flex-wrap gap-1.5" aria-labelledby={groupId}>
        {labels.map((label) => {
          const on = selectedIds.includes(label.id);
          return (
            <li key={label.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => void onToggle(label.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                  on
                    ? labelChipClass(label.color)
                    : "border border-dashed border-line-strong text-text-secondary hover:border-solid hover:text-text-primary"
                }`}
              >
                {on ? (
                  <span aria-hidden="true">✓</span>
                ) : (
                  <span aria-hidden="true" className={`label-${label.color} label-swatch h-2 w-2 rounded-full`} />
                )}
                {label.name}
              </button>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <div className="mt-2 rounded-xl border border-line bg-surface-2/60 p-2.5">
          <label className="sr-only" htmlFor={`${groupId}-name`}>
            New label name
          </label>
          <input
            id={`${groupId}-name`}
            autoFocus
            value={name}
            maxLength={LABEL_NAME_MAX}
            placeholder="Label name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            className={`${FIELD} py-1.5 text-xs`}
          />
          <div role="radiogroup" aria-label="Label color" className="mt-2 flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={color === c.id}
                aria-label={c.name}
                data-tip={c.name}
                onClick={() => setColor(c.id)}
                className={`label-${c.id} label-swatch h-6 w-6 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                  color === c.id ? "ring-2 ring-text-primary ring-offset-2 ring-offset-surface" : ""
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!name.trim() || busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
            >
              Create label
            </button>
            <button type="button" className={GHOST_BTN} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${GHOST_BTN} mt-1.5 -ml-2.5`} onClick={() => setCreating(true)}>
          + New label
        </button>
      )}
    </div>
  );
}

function CommentThread({
  comments,
  currentUserId,
  collaboratorFor,
  onAdd,
  onEdit,
  onDelete,
}: {
  comments: CardComment[];
  currentUserId: string;
  collaboratorFor: (userId: string | null) => Collaborator;
  onAdd: (body: string) => Promise<boolean>;
  onEdit: (commentId: string, body: string) => Promise<boolean>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const headingId = useId();

  async function post() {
    if (!draft.trim() || posting) return;
    setPosting(true);
    const ok = await onAdd(draft);
    setPosting(false);
    if (ok) setDraft("");
  }

  async function saveEdit(id: string) {
    if (!editDraft.trim()) return;
    const ok = await onEdit(id, editDraft);
    if (ok) setEditingId(null);
  }

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-secondary">
        Comments
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] tabular-nums text-text-muted">
          {comments.length}
        </span>
      </h3>

      <div className="mb-3">
        <label className="sr-only" htmlFor={`${headingId}-new`}>
          Write a comment
        </label>
        <textarea
          id={`${headingId}-new`}
          value={draft}
          maxLength={COMMENT_MAX}
          rows={2}
          placeholder="Write a comment… (Ctrl+Enter to post)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void post();
            }
          }}
          className={`${FIELD} resize-y`}
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-text-muted" aria-live="polite">
            {draft.length > COMMENT_MAX - 200 ? `${COMMENT_MAX - draft.length} characters left` : ""}
          </span>
          <button
            type="button"
            onClick={() => void post()}
            disabled={!draft.trim() || posting}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
          >
            Comment
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-text-muted">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {[...comments].reverse().map((comment) => {
            const author = collaboratorFor(comment.authorId);
            const mine = comment.authorId === currentUserId;
            const edited =
              new Date(comment.updatedAt).getTime() - new Date(comment.createdAt).getTime() > 1000;
            return (
              <li key={comment.id} className="flex gap-2.5">
                <Avatar collaborator={author} size="md" decorative />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span className="font-semibold text-text-primary">
                      {author.name}
                      {mine ? " (you)" : ""}
                    </span>
                    <time dateTime={comment.createdAt} className="text-text-muted" title={new Date(comment.createdAt).toLocaleString()}>
                      {timeAgo(comment.createdAt)}
                      {edited ? " · edited" : ""}
                    </time>
                  </p>
                  {editingId === comment.id ? (
                    <div className="mt-1">
                      <label className="sr-only" htmlFor={`edit-${comment.id}`}>
                        Edit comment
                      </label>
                      <textarea
                        id={`edit-${comment.id}`}
                        autoFocus
                        value={editDraft}
                        maxLength={COMMENT_MAX}
                        rows={2}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            void saveEdit(comment.id);
                          }
                        }}
                        className={`${FIELD} resize-y`}
                      />
                      <div className="mt-1 flex gap-1">
                        <button
                          type="button"
                          onClick={() => void saveEdit(comment.id)}
                          disabled={!editDraft.trim()}
                          className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button type="button" className={GHOST_BTN} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap break-words rounded-xl rounded-tl-sm bg-surface-2/80 px-3 py-2 text-sm text-text-primary">
                      {comment.body}
                    </p>
                  )}
                  {mine && editingId !== comment.id && (
                    <div className="mt-0.5 flex items-center gap-1">
                      {confirmingId === comment.id ? (
                        <>
                          <span className="text-[11px] text-text-secondary">Delete this comment?</span>
                          <button
                            type="button"
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-priority-urgent transition hover:bg-priority-urgent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-priority-urgent/50"
                            onClick={() => {
                              setConfirmingId(null);
                              void onDelete(comment.id);
                            }}
                          >
                            Delete
                          </button>
                          <button type="button" className={GHOST_BTN} onClick={() => setConfirmingId(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={GHOST_BTN}
                            onClick={() => {
                              setEditingId(comment.id);
                              setEditDraft(comment.body);
                            }}
                          >
                            Edit
                          </button>
                          <button type="button" className={GHOST_BTN} onClick={() => setConfirmingId(comment.id)}>
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
