import { createContext, useContext } from "react";
import type { BoardLabel } from "../types";

export interface CardDecorations {
  labelsById: ReadonlyMap<string, BoardLabel>;
  labelIdsByCard: ReadonlyMap<string, string[]>;
  commentCountByCard: ReadonlyMap<string, number>;
  /** Lists that look like a finish line; due chips there aren't urgent. */
  doneListIds: ReadonlySet<string>;
  /** Drag is paused while a filter hides some cards. */
  dragDisabled: boolean;
}

const EMPTY: CardDecorations = {
  labelsById: new Map(),
  labelIdsByCard: new Map(),
  commentCountByCard: new Map(),
  doneListIds: new Set(),
  dragDisabled: false,
};

export const CardDecorationsContext = createContext<CardDecorations>(EMPTY);

export function useCardDecorations() {
  return useContext(CardDecorationsContext);
}
