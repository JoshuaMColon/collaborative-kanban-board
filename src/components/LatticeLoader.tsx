import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import "./LatticeLoader.css";

type GridSize = 3 | 4;
type LoaderStatus = "working" | "done" | "error";
type CompletionStatus = Exclude<LoaderStatus, "working">;
type PatternName =
  | "arrow"
  | "dots"
  | "ripple"
  | "spiral"
  | "orbit"
  | "snake"
  | "sweep"
  | "spin"
  | "rain"
  | "pulse";

interface PatternConfig {
  cells: (number | null)[];
  loop: number;
  scale: number;
  lit?: number;
}

type PatternOption =
  | PatternName
  | (Omit<PatternConfig, "lit"> & { lit?: number });

interface LatticeLoaderProps {
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  status?: LoaderStatus;
  pattern?: PatternOption;
  grid?: GridSize;
  shape?: "round" | "square";
  color?: string;
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
  elapsed?: number;
  className?: string;
  style?: CSSProperties;
}

const PATTERNS: Record<
  PatternName,
  Partial<Record<GridSize, PatternConfig>>
> = {
  arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
  dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
  ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
  spiral: {
    3: {
      cells: [0, 1, 2, 7, 8, 3, 6, 5, 4],
      loop: 9,
      scale: 1.2,
      lit: 0.35,
    },
  },
  orbit: {
    3: {
      cells: [0, 1, 2, 7, null, 3, 6, 5, 4],
      loop: 8,
      scale: 1.2,
    },
    4: {
      cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6],
      loop: 6,
      scale: 1.2,
      lit: 0.45,
    },
  },
  snake: {
    3: {
      cells: [0, 1, 2, 5, 4, 3, 6, 7, 8],
      loop: 9,
      scale: 1,
      lit: 0.35,
    },
    4: {
      cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12],
      loop: 16,
      scale: 1,
      lit: 0.25,
    },
  },
  sweep: {
    4: {
      cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6],
      loop: 5,
      scale: 1,
      lit: 0.45,
    },
  },
  spin: {
    4: {
      cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2],
      loop: 4,
      scale: 1.6,
      lit: 0.35,
    },
  },
  rain: {
    4: {
      cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6],
      loop: 4,
      scale: 1.2,
      lit: 0.35,
    },
  },
  pulse: {
    4: {
      cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2],
      loop: 2.4,
      scale: 2.5,
      lit: 0.45,
    },
  },
};

const DEFAULT_PATTERN: Record<GridSize, PatternName> = {
  3: "orbit",
  4: "sweep",
};

const MARKS: Record<GridSize, Record<CompletionStatus, number[]>> = {
  3: {
    done: [2, 3, 5, 7],
    error: [0, 2, 4, 6, 8],
  },
  4: {
    done: [7, 8, 10, 13],
    error: [0, 3, 5, 6, 9, 10, 12, 15],
  },
};

function resolvePattern(pattern: PatternOption, grid: GridSize): PatternConfig {
  if (typeof pattern === "string") {
    return PATTERNS[pattern][grid] ?? PATTERNS[DEFAULT_PATTERN[grid]][grid]!;
  }

  const cells = Array.from(
    { length: grid * grid },
    (_, index) => pattern.cells[index] ?? null,
  );
  const max = Math.max(
    0,
    ...cells.filter((cell): cell is number => cell !== null),
  );
  return {
    cells,
    loop: pattern.loop ?? max + 4.2,
    scale: pattern.scale ?? 1,
    lit: pattern.lit ?? 0.62,
  };
}

function formatElapsed(deciseconds: number): string {
  return deciseconds < 600
    ? `${(deciseconds / 10).toFixed(1)}s`
    : `${Math.floor(deciseconds / 600)}m ${((deciseconds % 600) / 10).toFixed(1)}s`;
}

function spokenElapsed(deciseconds: number): string {
  return deciseconds < 600
    ? `${(deciseconds / 10).toFixed(1)} seconds`
    : `${Math.floor(deciseconds / 600)} minutes ${((deciseconds % 600) / 10).toFixed(1)} seconds`;
}

export function LatticeLoader({
  label = "Thinking",
  doneLabel = "Done in",
  errorLabel = "Failed after",
  status = "working",
  pattern = "orbit",
  grid = 3,
  shape = "round",
  color = "currentColor",
  doneColor = "#22c55e",
  errorColor = "#ef4444",
  cellSize = 6,
  gap = 2,
  fontSize = 14,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = "",
  showTimer = true,
  elapsed,
  className = "",
  style,
}: LatticeLoaderProps) {
  const size: GridSize = grid === 4 ? 4 : 3;
  const patternConfig = resolvePattern(pattern, size);
  const marks = MARKS[size];
  const delayStep = step * patternConfig.scale;
  const cycleDuration = Math.round(patternConfig.loop * delayStep);
  const timerRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef(0);
  const markRef = useRef<CompletionStatus>("done");
  const activeMark: CompletionStatus =
    status === "working" ? markRef.current : status;
  const [announcement, setAnnouncement] = useState(`${label}, in progress`);

  function paint(deciseconds: number) {
    elapsedRef.current = deciseconds;
    if (timerRef.current) {
      timerRef.current.textContent = formatElapsed(deciseconds);
    }
  }

  useLayoutEffect(() => {
    if (elapsed !== undefined) {
      paint(Math.round(elapsed * 10));
      return;
    }
    if (status !== "working") return;

    const startedAt = performance.now();
    paint(0);
    const intervalId = window.setInterval(() => {
      paint(Math.floor((performance.now() - startedAt) / 100));
    }, 100);
    return () => window.clearInterval(intervalId);
  }, [elapsed, status]);

  useEffect(() => {
    if (status === "working") {
      setAnnouncement(`${label}, in progress`);
    } else {
      const resultLabel = status === "done" ? doneLabel : errorLabel;
      setAnnouncement(
        `${resultLabel}${showTimer ? ` ${spokenElapsed(elapsedRef.current)}` : ""}`,
      );
      markRef.current = status;
    }
  }, [doneLabel, errorLabel, label, showTimer, status]);

  const loaderStyle = {
    "--ll-n": size,
    "--ll-cell": `${cellSize}px`,
    "--ll-gap": `${gap}px`,
    "--ll-font": `${fontSize}px`,
    "--ll-color": color,
    "--ll-mark": status === "error" ? errorColor : doneColor,
    "--ll-idle": idleOpacity,
    "--ll-glow": glowColor || color,
    "--ll-mark-glow":
      glowColor || (status === "error" ? errorColor : doneColor),
    "--ll-cycle": `${cycleDuration}ms`,
    ...style,
  } as CSSProperties;

  return (
    <span
      role="status"
      className={`lattice-loader${className ? ` ${className}` : ""}`}
      data-status={status}
      data-shape={shape}
      data-glow={glow ? "" : undefined}
      style={loaderStyle}
    >
      <span className="lattice-loader__grid" aria-hidden="true">
        <span className="lattice-loader__layer lattice-loader__run">
          {patternConfig.cells.map((unit, index) => (
            <span
              key={index}
              className="lattice-loader__cell"
              data-hole={unit === null ? "" : undefined}
              data-lit={
                patternConfig.lit !== undefined && patternConfig.lit !== 0.62
                  ? Math.round(patternConfig.lit * 100)
                  : undefined
              }
              style={
                unit === null
                  ? undefined
                  : { animationDelay: `${Math.round(unit * delayStep)}ms` }
              }
            />
          ))}
        </span>
        <span className="lattice-loader__layer lattice-loader__mark">
          {patternConfig.cells.map((_, index) => (
            <span
              key={index}
              className="lattice-loader__cell"
              data-on={marks[activeMark].includes(index) ? "" : undefined}
            />
          ))}
        </span>
      </span>
      <span className="lattice-loader__label" aria-hidden="true">
        <span
          className="lattice-loader__text"
          data-active={status === "working" ? "" : undefined}
        >
          {label}
        </span>
        <span
          className="lattice-loader__text"
          data-active={status === "done" ? "" : undefined}
        >
          {doneLabel}
        </span>
        <span
          className="lattice-loader__text"
          data-active={status === "error" ? "" : undefined}
        >
          {errorLabel}
        </span>
      </span>
      {showTimer ? (
        <span
          ref={timerRef}
          className="lattice-loader__timer"
          aria-hidden="true"
        >
          0.0s
        </span>
      ) : null}
      <span className="lattice-loader__sr">{announcement}</span>
    </span>
  );
}
