/**
 * Tiny shared flag so effects outside <DndContext> (e.g. click sparks) can
 * tell whether a pointer gesture was a @dnd-kit drag. The browser may fire a
 * `click` after the drop, so we keep reporting "dragging" for a short grace
 * period after the drag ends or is cancelled.
 */
const GRACE_MS = 300;
let active = false;
let endedAt = -Infinity;

export function markDragStart() {
  active = true;
}

export function markDragEnd() {
  active = false;
  endedAt = performance.now();
}

export function isDragGesture() {
  return active || performance.now() - endedAt < GRACE_MS;
}
