import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import "./ClickSpark.css";

type Easing = "linear" | "ease-in" | "ease-in-out" | "ease-out";

interface ClickSparkProps {
  sparkColor?: string;
  lightModeSparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: Easing;
  extraScale?: number;
  children: ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
  color: string;
}

export function ClickSpark({
  sparkColor = "#fff",
  lightModeSparkColor = "#111827",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const startAnimationRef = useRef<(() => void) | null>(null);

  const ease = useCallback(
    (value: number) => {
      switch (easing) {
        case "linear":
          return value;
        case "ease-in":
          return value * value;
        case "ease-in-out":
          return value < 0.5
            ? 2 * value * value
            : -1 + (4 - 2 * value) * value;
        default:
          return value * (2 - value);
      }
    },
    [easing],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !parent) return;
    if (!context) {
      console.error("Unable to initialize the ClickSpark canvas.");
      return;
    }

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(parent);
    resizeCanvas();

    const draw = (timestamp: number) => {
      const bounds = canvas.getBoundingClientRect();
      context.clearRect(0, 0, bounds.width, bounds.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = Math.max(0, elapsed / duration);
        const eased = ease(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);
        const directionX = Math.cos(spark.angle);
        const directionY = Math.sin(spark.angle);

        context.strokeStyle = spark.color;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(
          spark.x + distance * directionX,
          spark.y + distance * directionY,
        );
        context.lineTo(
          spark.x + (distance + lineLength) * directionX,
          spark.y + (distance + lineLength) * directionY,
        );
        context.stroke();
        return true;
      });

      if (sparksRef.current.length > 0) {
        animationFrameRef.current = window.requestAnimationFrame(draw);
      } else {
        animationFrameRef.current = null;
      }
    };

    startAnimationRef.current = () => {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = window.requestAnimationFrame(draw);
      }
    };

    return () => {
      resizeObserver.disconnect();
      startAnimationRef.current = null;
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      sparksRef.current = [];
    };
  }, [duration, ease, extraScale, sparkColor, sparkRadius, sparkSize]);

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || sparkCount <= 0) return;
    const bounds = canvas.getBoundingClientRect();
    const startTime = performance.now();

    sparksRef.current.push(
      ...Array.from({ length: Math.floor(sparkCount) }, (_, index) => ({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
        angle: (2 * Math.PI * index) / sparkCount,
        startTime,
        color: document.documentElement.classList.contains("dark")
          ? sparkColor
          : lightModeSparkColor,
      })),
    );
    startAnimationRef.current?.();
  };

  return (
    <div className="click-spark-root" onClick={handleClick}>
      <canvas
        ref={canvasRef}
        className="click-spark-canvas"
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
