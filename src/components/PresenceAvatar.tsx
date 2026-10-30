import type { Collaborator } from "../types";
import { Avatar } from "./Avatar";

export function PresenceAvatar({
  collaborator,
  isActive = false,
  size = "md",
}: {
  collaborator: Collaborator;
  isActive?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="relative inline-flex" title={collaborator.name}>
      {isActive && (
        <span
          className="absolute inset-0 rounded-full animate-pulseRing"
          style={{ backgroundColor: collaborator.color }}
          aria-hidden="true"
        />
      )}
      <Avatar
        collaborator={collaborator}
        size={size}
        className="border-2 [border-color:rgb(var(--surface))]"
      />
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
