import { lazy, Suspense } from "react";
import { useIsDarkTheme } from "../hooks/useIsDarkTheme";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { isDragGesture } from "../lib/dragState";

const ClickSpark = lazy(() => import("./reactbits/ClickSpark"));

/** Terracotta + amber, matching --accent; dark mode uses softer, translucent tints. */
const SPARK_COLORS = {
  light: ["#b4432e", "#d9862b", "#c9622f"],
  dark: ["rgba(240, 147, 122, 0.8)", "rgba(242, 192, 120, 0.75)"],
};

const shouldSpark = () => !isDragGesture();

/**
 * App-wide click sparks (React Bits Click Spark). A fixed, pointer-events-none
 * layer listens for document clicks, so it never intercepts clicks or input.
 * Sparks are tiny and short; nothing animates (no rAF) between bursts.
 * Not mounted at all under prefers-reduced-motion, and suppressed for
 * @dnd-kit drags (during and just after the drop).
 */
export function ClickSparkLayer() {
  const reducedMotion = usePrefersReducedMotion();
  const dark = useIsDarkTheme();
  if (reducedMotion) return null;

  return (
    <Suspense fallback={null}>
      <ClickSpark
        listenOnDocument
        shouldSpark={shouldSpark}
        sparkColor={dark ? SPARK_COLORS.dark : SPARK_COLORS.light}
        sparkCount={7}
        sparkSize={9}
        sparkRadius={18}
        sparkWidth={1.6}
        duration={420}
        randomness={0.35}
        className="click-spark-layer"
        style={{ position: "fixed", inset: 0, zIndex: 70, pointerEvents: "none" }}
      />
    </Suspense>
  );
}
