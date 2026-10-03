import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import "./SquishSwitch.css";

interface SquishSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  ariaLabel?: string;
  title?: string;
  disabled?: boolean;
  trackColor?: string;
  trackOnColor?: string;
  thumbColor?: string;
  thumbOnColor?: string;
  width?: number;
  height?: number;
  radius?: number;
  speed?: number;
  stretch?: number;
  hoverScale?: number;
  colorDuration?: number;
  className?: string;
  id?: string;
}

interface PointerGrip {
  id: number;
  grab: number | null;
  moved: boolean;
  startX: number;
  onAtPress: boolean;
  slop: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const FLOW_SPRING = { stiffness: 320, damping: 40, mass: 0.6 };
const SWELL_SPRING = { stiffness: 520, damping: 34, mass: 0.6 };
const MAX_STRETCH = 0.4;
const STRETCH_SPEED = 600;

export function SquishSwitch({
  checked,
  onChange,
  label = "",
  ariaLabel,
  title,
  disabled = false,
  trackColor = "#27272a",
  trackOnColor = "#f5f5f5",
  thumbColor = "",
  thumbOnColor = "",
  width = 76,
  height = 38,
  radius = 19,
  speed = 50,
  stretch = 36,
  hoverScale = 1.035,
  colorDuration = 320,
  className = "",
  id,
}: SquishSwitchProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const inset = Math.max(3, Math.round(height * 0.11));
  const thumbSize = height - inset * 2;
  const min = inset;
  const max = width - inset - thumbSize;
  const mid = (min + max) / 2;
  const trackRadius = Math.min(radius, height / 2);
  const thumbRadius = Math.max(2, trackRadius - inset);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLSpanElement>(null);
  const gripRef = useRef<PointerGrip | null>(null);
  const checkedRef = useRef(checked);
  checkedRef.current = checked;
  const skipClickRef = useRef(false);
  const autoId = useId();
  const buttonId = id ?? autoId;

  const x = useMotionValue(checked ? max : min);
  const flow = useSpring(useVelocity(x), FLOW_SPRING);
  const swell = useSpring(1, SWELL_SPRING);
  const stretchGain = reduceMotion ? 0 : clamp(stretch, 0, 100) / 100;
  const stretchOf = (velocity: number) =>
    1 + Math.min(MAX_STRETCH, Math.abs(velocity) / STRETCH_SPEED) * stretchGain;
  const scaleX = useTransform(
    [flow, swell],
    ([velocity, swellScale]: number[]) => stretchOf(velocity) * swellScale,
  );
  const scaleY = useTransform(
    [flow, swell],
    ([velocity, swellScale]: number[]) => swellScale / stretchOf(velocity),
  );

  const commit = (next: boolean) => {
    if (next === checkedRef.current) return;
    checkedRef.current = next;
    onChange(next);
  };

  useEffect(() => {
    if (dragging) return;
    const target = checked ? max : min;
    if (reduceMotion) {
      x.jump(target);
      return;
    }

    const controls = animate(x, target, {
      type: "spring",
      stiffness: 170 - (50 - clamp(speed, 0, 100)) * 1.1,
      damping: 21.5,
      mass: 0.9,
      restDelta: 0.001,
      restSpeed: 0.01,
    });
    return () => controls.stop();
  }, [checked, dragging, max, min, reduceMotion, speed, x]);

  const localX = (clientX: number) => {
    const element = trackRef.current;
    if (!element) return 0;
    const bounds = element.getBoundingClientRect();
    const scale = bounds.width / (element.offsetWidth || bounds.width) || 1;
    return (clientX - bounds.left) / scale;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (disabled || gripRef.current || event.button !== 0) return;
    gripRef.current = {
      id: event.pointerId,
      grab: null,
      moved: false,
      startX: event.clientX,
      onAtPress: checkedRef.current,
      slop: event.pointerType === "touch" ? 8 : 4,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const grip = gripRef.current;
    if (!grip || grip.id !== event.pointerId) return;
    const pointerX = localX(event.clientX);
    if (grip.grab === null) {
      grip.grab = pointerX - x.get();
      return;
    }
    if (!grip.moved && Math.abs(event.clientX - grip.startX) > grip.slop) {
      grip.moved = true;
    }
    if (!grip.moved) return;
    const nextX = clamp(pointerX - grip.grab, min, max);
    x.set(nextX);
    commit(nextX > mid);
  };

  const handlePointerUp = (
    event: ReactPointerEvent<HTMLButtonElement>,
    cancelled: boolean,
  ) => {
    const grip = gripRef.current;
    if (!grip || grip.id !== event.pointerId) return;
    gripRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (cancelled) commit(grip.onAtPress);
    else if (!grip.moved) commit(!checkedRef.current);
    skipClickRef.current = true;
    window.setTimeout(() => {
      skipClickRef.current = false;
    }, 0);
    setDragging(false);
  };

  const customProperties = {
    "--ss-w": `${width}px`,
    "--ss-h": `${height}px`,
    "--ss-inset": `${inset}px`,
    "--ss-thumb": `${thumbSize}px`,
    "--ss-r": `${trackRadius}px`,
    "--ss-thumb-r": `${thumbRadius}px`,
    "--ss-track": trackColor,
    "--ss-track-on": trackOnColor,
    "--ss-thumb-color":
      thumbColor || `color-mix(in srgb, ${trackOnColor} 19%, ${trackColor})`,
    "--ss-thumb-on": thumbOnColor || trackColor,
    "--ss-fade": `${colorDuration}ms`,
  } as CSSProperties;

  return (
    <span className={`squish-switch-root${className ? ` ${className}` : ""}`}>
      <button
        id={buttonId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        className="squish-switch"
        data-on={checked ? "" : undefined}
        data-held={dragging ? "" : undefined}
        style={customProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => handlePointerUp(event, false)}
        onPointerCancel={(event) => handlePointerUp(event, true)}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse" && !disabled) swell.set(hoverScale);
        }}
        onPointerLeave={() => swell.set(1)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && gripRef.current) {
            const grip = gripRef.current;
            if (event.currentTarget.hasPointerCapture(grip.id)) {
              event.currentTarget.releasePointerCapture(grip.id);
            }
            commit(grip.onAtPress);
            gripRef.current = null;
            setDragging(false);
          }
        }}
        onClick={() => {
          if (skipClickRef.current) {
            skipClickRef.current = false;
            return;
          }
          if (!disabled) commit(!checkedRef.current);
        }}
      >
        <span ref={trackRef} className="squish-switch__track">
          <motion.span
            className="squish-switch__thumb"
            aria-hidden="true"
            style={{ x, scaleX, scaleY }}
          />
        </span>
      </button>
      {label && (
        <label htmlFor={buttonId} className="squish-switch__label">
          {label}
        </label>
      )}
    </span>
  );
}
