import { useId, useRef, useState } from "react";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { AVATAR_TYPES, DISPLAY_NAME_MAX } from "../hooks/useBoardMeta";
import type { Collaborator } from "../types";
import { Avatar } from "./Avatar";
import { initialsFromName } from "../lib/identity";

const FIELD =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-accent/60 focus:ring-2 focus:ring-accent/25";

export function ProfileDialog({
  me,
  email,
  isDemo,
  onClose,
  onSave,
  onUpload,
  onRemoveAvatarFiles,
}: {
  me: Collaborator;
  email?: string;
  isDemo: boolean;
  onClose: () => void;
  onSave: (updates: { displayName?: string; avatarUrl?: string | null }) => Promise<string | null>;
  onUpload: (file: File) => Promise<{ url?: string; error?: string }>;
  onRemoveAvatarFiles: () => Promise<void>;
}) {
  const [name, setName] = useState(me.name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me.avatarUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onKeyDown = useDialogFocus(dialogRef, onClose, nameRef);

  const preview: Collaborator = {
    ...me,
    name: name.trim() || me.name,
    initials: initialsFromName(name.trim() || me.name),
    avatarUrl,
  };

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setStatus("Uploading…");
    const { url, error: uploadError } = await onUpload(file);
    if (uploadError || !url) {
      setError(uploadError ?? "Upload failed.");
      setStatus(null);
    } else {
      const saveError = await onSave({ avatarUrl: url });
      if (saveError) setError(saveError);
      else {
        setAvatarUrl(url);
        setStatus("Photo updated.");
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    const saveError = await onSave({ avatarUrl: null });
    if (saveError) setError(saveError);
    else {
      await onRemoveAvatarFiles();
      setAvatarUrl(null);
      setStatus("Photo removed.");
    }
    setBusy(false);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Your name can't be empty.");
      return;
    }
    setBusy(true);
    setError(null);
    const saveError = trimmed === me.name ? null : await onSave({ displayName: trimmed });
    setBusy(false);
    if (saveError) setError(saveError);
    else onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-[rgb(var(--shadow)/0.35)] p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-fadeUp rounded-2xl border border-line bg-surface p-6 shadow-pop outline-none"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id={titleId} className="font-display text-lg font-bold text-text-primary">
            Your profile
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

        <div className="mb-5 flex items-center gap-4">
          <Avatar collaborator={preview} size="lg" className="ring-2 ring-line" />
          <div className="min-w-0">
            {isDemo ? (
              <p className="text-xs leading-relaxed text-text-secondary">
                Photo uploads are for free accounts. Demo guests show up with initials.
              </p>
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept={AVATAR_TYPES.join(",")}
                  className="sr-only"
                  id={`${titleId}-file`}
                  disabled={busy}
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <div className="flex flex-wrap gap-1.5">
                  <label
                    htmlFor={`${titleId}-file`}
                    className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-text-primary transition hover:bg-surface-2 focus-within:ring-2 focus-within:ring-accent/50"
                  >
                    {avatarUrl ? "Change photo" : "Upload photo"}
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => void handleRemove()}
                      disabled={busy}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-text-muted">PNG, JPEG, WebP or GIF, up to 1 MB.</p>
              </>
            )}
          </div>
        </div>

        <label className="mb-1 block text-xs font-semibold text-text-secondary" htmlFor={`${titleId}-name`}>
          Display name
        </label>
        <input
          id={`${titleId}-name`}
          ref={nameRef}
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          className={FIELD}
        />
        {email && <p className="mt-1.5 text-[11px] text-text-muted">Signed in as {email}</p>}

        <p className="mt-3 min-h-[1.25rem] text-xs" role={error ? "alert" : "status"}>
          {error ? (
            <span className="text-priority-urgent">{error}</span>
          ) : (
            <span className="text-text-secondary">{status}</span>
          )}
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={busy || !name.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-soft transition hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
