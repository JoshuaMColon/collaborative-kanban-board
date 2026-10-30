import { lazy, Suspense, type ComponentProps } from "react";
import type BlurTextComponent from "./BlurText";

type Props = ComponentProps<typeof BlurTextComponent>;

// Start fetching right away so the chunk (BlurText + motion, shared with the
// theme switch) is usually ready by the first paint.
const load = import("./BlurText");
const BlurText = lazy(() => load);

/**
 * React Bits BlurText, code-split so `motion` stays out of the entry chunk.
 * While the chunk loads, the text is held invisible — the same state the
 * animation starts from — so there's no flash of un-animated text.
 */
export function LazyBlurText(props: Props) {
  return (
    <Suspense
      fallback={
        <p className={`flex ${props.className ?? ""}`} style={{ opacity: 0 }}>
          {props.text}
        </p>
      }
    >
      <BlurText {...props} />
    </Suspense>
  );
}
