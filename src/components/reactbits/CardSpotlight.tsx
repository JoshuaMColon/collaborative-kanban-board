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

/** The glow itself: a soft fill under the content and a thin lit rim. */
export function CardSpotlightLayers() {
  return (
    <>
      <span aria-hidden="true" className="card-spot card-spot--fill" />
      <span aria-hidden="true" className="card-spot card-spot--rim" />
    </>
  );
}
