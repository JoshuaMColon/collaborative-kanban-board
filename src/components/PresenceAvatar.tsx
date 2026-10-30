import type { Collaborator } from "../types";

export function PresenceAvatar({
  collaborator,
  isActive = false,
  size = "md",
}: {
  collaborator: Collaborator;
  isActive?: boolean;
  size?: "sm" | "md";
}) {
  const dims = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <div className="relative inline-flex" title={collaborator.name}>
      {isActive && (
        <span
          className="absolute inset-0 rounded-full animate-pulseRing"
          style={{ backgroundColor: collaborator.color }}
          aria-hidden="true"
        />
      )}
      <div
        className={`relative flex ${dims} items-center justify-center rounded-full border-2 font-bold text-[#1c1917]`}
        style={{
          backgroundColor: collaborator.color,
          borderColor: "rgb(var(--surface))",
        }}
      >
        {collaborator.initials}
      </div>
      {isActive && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2"
          style={{
            backgroundColor: "rgb(var(--success))",
            borderColor: "rgb(var(--surface))",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
