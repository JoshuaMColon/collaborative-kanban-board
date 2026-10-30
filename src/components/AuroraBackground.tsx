import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useIsDarkTheme } from "../hooks/useIsDarkTheme";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

const Aurora = lazy(() => import("./reactbits/Aurora"));

let webgl2: boolean | null = null;
function supportsWebGL2() {
  if (webgl2 !== null) return webgl2;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2 = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webgl2 = false;
  }
  return webgl2;
}

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
const isHidden = () => document.hidden;

/** Warm palette for the shader, tuned to the cream / terracotta tokens. */
const PALETTES = {
  light: {
    colorStops: ["#f2b8a0", "#f7d9b0", "#e8a48c"],
    opacity: 0.55,
    lightMode: true,
  },
  dark: {
    colorStops: ["#6e3527", "#8a4a36", "#4f3446"],
    opacity: 0.4,
    lightMode: false,
  },
} as const;

/**
 * React Bits Aurora, layered over the static CSS gradient of .calm-bg.
 * Only mounts when WebGL2 exists and the user hasn't asked for reduced
 * motion — otherwise the CSS gradient is all you see. The shader loop stops
 * while the tab is hidden (Aurora checks document.hidden every frame and we
 * also pass `paused`), and the canvas fades in once it has drawn.
 */
export function AuroraLayer() {
  const reducedMotion = usePrefersReducedMotion();
  const dark = useIsDarkTheme();
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, () => false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(supportsWebGL2());
  }, []);

  if (!enabled || reducedMotion) return null;
  const palette = dark ? PALETTES.dark : PALETTES.light;

  return (
    <div className="calm-bg__aurora">
      <Suspense fallback={null}>
        <Aurora
          colorStops={[...palette.colorStops]}
          opacity={palette.opacity}
          lightMode={palette.lightMode}
          amplitude={0.7}
          blend={0.75}
          speed={0.35}
          height={0.5}
          glow={0.5}
          layers={2}
          mouseInteraction={false}
          intro
          paused={hidden}
          dpr={0.75}
        />
      </Suspense>
    </div>
  );
}
