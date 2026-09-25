import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import "./ElectricBorder.css";

interface ElectricBorderProps {
  children: ReactNode;
  color?: string;
  speed?: number;
  chaos?: number;
  thickness?: number;
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
}

export function ElectricBorder({
  children,
  color = "#5227ff",
  speed = 1,
  chaos = 0.12,
  thickness = 2,
  borderRadius = 24,
  className,
  style,
}: ElectricBorderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !container || !context) return;
    const activeCanvas = canvas;
    const activeContainer = container;
    const drawingContext = context;

    const borderOffset = 16;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let lastFrameTime = 0;
    let time = 0;
    let animationId = 0;
    const shouldAnimate = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    function resizeCanvas() {
      const bounds = activeContainer.getBoundingClientRect();
      width = bounds.width + borderOffset * 2;
      height = bounds.height + borderOffset * 2;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      activeCanvas.width = width * pixelRatio;
      activeCanvas.height = height * pixelRatio;
      activeCanvas.style.width = `${width}px`;
      activeCanvas.style.height = `${height}px`;
    }

    function random(value: number) {
      const result = (Math.sin(value * 12.9898) * 43758.5453) % 1;
      return result < 0 ? result + 1 : result;
    }

    function noise2D(x: number, y: number) {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const fx = x - x0;
      const fy = y - y0;
      const smoothX = fx * fx * (3 - 2 * fx);
      const smoothY = fy * fy * (3 - 2 * fy);
      const a = random(x0 + y0 * 57);
      const b = random(x0 + 1 + y0 * 57);
      const c = random(x0 + (y0 + 1) * 57);
      const d = random(x0 + 1 + (y0 + 1) * 57);

      return (
        a * (1 - smoothX) * (1 - smoothY) +
        b * smoothX * (1 - smoothY) +
        c * (1 - smoothX) * smoothY +
        d * smoothX * smoothY
      );
    }

    function octavedNoise(progress: number, seed: number) {
      let value = 0;
      let amplitude = chaos;
      let frequency = 10;

      for (let octave = 0; octave < 8; octave += 1) {
        value +=
          amplitude *
          (noise2D(frequency * progress + seed * 100, time * frequency * 0.3) -
            0.5);
        frequency *= 1.6;
        amplitude *= 0.7;
      }

      return value;
    }

    function roundedRectPoint(
      progress: number,
      left: number,
      top: number,
      rectWidth: number,
      rectHeight: number,
      radius: number,
    ) {
      const straightWidth = rectWidth - 2 * radius;
      const straightHeight = rectHeight - 2 * radius;
      const cornerLength = (Math.PI * radius) / 2;
      const perimeter =
        2 * straightWidth + 2 * straightHeight + 4 * cornerLength;
      let distance = progress * perimeter;

      function corner(
        centerX: number,
        centerY: number,
        startAngle: number,
        segmentProgress: number,
      ) {
        const angle = startAngle + segmentProgress * (Math.PI / 2);
        return {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        };
      }

      if (distance <= straightWidth) {
        return { x: left + radius + distance, y: top };
      }
      distance -= straightWidth;

      if (distance <= cornerLength) {
        return corner(
          left + rectWidth - radius,
          top + radius,
          -Math.PI / 2,
          distance / cornerLength,
        );
      }
      distance -= cornerLength;

      if (distance <= straightHeight) {
        return { x: left + rectWidth, y: top + radius + distance };
      }
      distance -= straightHeight;

      if (distance <= cornerLength) {
        return corner(
          left + rectWidth - radius,
          top + rectHeight - radius,
          0,
          distance / cornerLength,
        );
      }
      distance -= cornerLength;

      if (distance <= straightWidth) {
        return {
          x: left + rectWidth - radius - distance,
          y: top + rectHeight,
        };
      }
      distance -= straightWidth;

      if (distance <= cornerLength) {
        return corner(
          left + radius,
          top + rectHeight - radius,
          Math.PI / 2,
          distance / cornerLength,
        );
      }
      distance -= cornerLength;

      if (distance <= straightHeight) {
        return { x: left, y: top + rectHeight - radius - distance };
      }
      distance -= straightHeight;

      return corner(
        left + radius,
        top + radius,
        Math.PI,
        distance / cornerLength,
      );
    }

    function drawFrame(currentTime: number) {
      const currentPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      if (currentPixelRatio !== pixelRatio) resizeCanvas();

      if (lastFrameTime) {
        time += Math.min((currentTime - lastFrameTime) / 1000, 0.05) * speed;
      }
      lastFrameTime = currentTime;

      drawingContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      drawingContext.clearRect(0, 0, width, height);
      drawingContext.strokeStyle = color;
      drawingContext.lineWidth = thickness;
      drawingContext.lineCap = "round";
      drawingContext.lineJoin = "round";

      const rectWidth = width - borderOffset * 2;
      const rectHeight = height - borderOffset * 2;
      const radius = Math.min(borderRadius, rectWidth / 2, rectHeight / 2);
      const perimeter = 2 * (rectWidth + rectHeight) + 2 * Math.PI * radius;
      const sampleCount = Math.max(24, Math.floor(perimeter / 3));
      const displacement = 18;

      drawingContext.beginPath();
      for (let index = 0; index <= sampleCount; index += 1) {
        const progress = index / sampleCount;
        const point = roundedRectPoint(
          progress,
          borderOffset,
          borderOffset,
          rectWidth,
          rectHeight,
          radius,
        );
        const x = point.x + octavedNoise(progress * 8, 0) * displacement;
        const y = point.y + octavedNoise(progress * 8, 1) * displacement;

        if (index === 0) drawingContext.moveTo(x, y);
        else drawingContext.lineTo(x, y);
      }
      drawingContext.closePath();
      drawingContext.stroke();

      if (shouldAnimate) {
        animationId = window.requestAnimationFrame(drawFrame);
      }
    }

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(activeContainer);
    drawFrame(0);

    return () => {
      window.cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, [borderRadius, chaos, color, speed, thickness]);

  const borderStyle = {
    "--electric-border-color": color,
    "--electric-border-width": `${thickness}px`,
    borderRadius: `${borderRadius}px`,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      className={`electric-border ${className ?? ""}`}
      style={borderStyle}
    >
      <div className="eb-canvas-container" aria-hidden="true">
        <canvas ref={canvasRef} className="eb-canvas" />
      </div>
      <div className="eb-layers" aria-hidden="true">
        <div className="eb-glow-1" />
        <div className="eb-glow-2" />
        <div className="eb-background-glow" />
      </div>
      <div className="eb-content">{children}</div>
    </div>
  );
}
