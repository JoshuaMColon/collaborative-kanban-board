/**
 * Click sparks live outside DndContext, so they can't see a drag.
 * I set this for the gesture and keep it up for 300ms after, because
 * the browser still fires a click on drop and that would spark on a
 * card I just moved.
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
