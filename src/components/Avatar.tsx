import { useState } from "react";
import type { Collaborator } from "../types";
import { safeAvatarUrl } from "../lib/avatar";

const SIZES = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  card: "h-7 w-7 text-[11px]",
  md: "h-8 w-8 text-xs",
  lg: "h-16 w-16 text-xl",
} as const;

/**
 * Round avatar: the uploaded photo when there is one, otherwise initials on
 * the person's pastel color (dark text, >= 7:1 contrast).
 */
export function Avatar({
  collaborator,
  size = "md",
  className = "",
  decorative = false,
}: {
  collaborator: Collaborator;
  size?: keyof typeof SIZES;
  className?: string;
  /** Hide from screen readers when the name is announced nearby. */
  decorative?: boolean;
}) {
  const src = safeAvatarUrl(collaborator.avatarUrl);
  const [failed, setFailed] = useState<string | null>(null);
  const showImage = src && failed !== src;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-[#1c1917] ${SIZES[size]} ${className}`}
      style={{ backgroundColor: collaborator.color }}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : collaborator.name}
      aria-hidden={decorative || undefined}
      title={collaborator.name}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden="true">{collaborator.initials}</span>
      )}
    </span>
  );
}
