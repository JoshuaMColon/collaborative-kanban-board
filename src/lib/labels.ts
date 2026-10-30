import type { LabelColor } from "../types";

/** Warm-palette label colors. Must match the CHECK constraint on board_labels. */
export const LABEL_COLORS: { id: LabelColor; name: string }[] = [
  { id: "terracotta", name: "Terracotta" },
  { id: "amber", name: "Amber" },
  { id: "sage", name: "Sage" },
  { id: "teal", name: "Teal" },
  { id: "sky", name: "Sky" },
  { id: "plum", name: "Plum" },
  { id: "rose", name: "Rose" },
  { id: "slate", name: "Slate" },
];

export const LABEL_NAME_MAX = 24;

/** Classes for a label chip; colors come from --label-* tokens in index.css. */
export function labelChipClass(color: LabelColor) {
  return `label-chip label-${color}`;
}
