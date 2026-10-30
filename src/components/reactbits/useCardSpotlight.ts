/*
 * CardSpotlight — adapted from React Bits "Spotlight Card"
 * (https://reactbits.dev) by David Haz.
 * Copyright (c) 2026 David Haz. Licensed under the MIT + Commons Clause
 * License Condition v1.0 — full text in ./LICENSE.md
 * (https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md)
 * Used here as part of this application; not for resale or redistribution as
 * a standalone component.
 *
 * Changes from the original: instead of wrapping each card (one window
 * listener + rAF loop per card), the glow is two pointer-events-none layers
 * driven by CSS variables that a card writes from its own pointermove. Fade
 * in/out is a CSS transition, and focus-visible shows a centred glow. Styles
 * live in index.css (.card-spot*).
 */
import { useCallback, useRef, type PointerEvent } from "react";

/** Pointer handlers that keep --spot-x / --spot-y in sync with the cursor. */
export function useCardSpotlight(disabled = false) {
  const frame = useRef(0);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (disabled || event.pointerType !== "mouse") return;
      const el = event.currentTarget;
      const { clientX, clientY } = event;
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${clientX - rect.left}px`);
        el.style.setProperty("--spot-y", `${clientY - rect.top}px`);
      });
    },
    [disabled],
  );

  return { onPointerMove };
}
