import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import "./MoltenMetal.css";

type ColorMode = "molten" | "ember" | "frost";

interface MoltenMetalProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  scale?: number;
  detail?: number;
  glow?: number;
  coreSize?: number;
  swirl?: number;
  fold?: number;
  blackPoint?: number;
  brightness?: number;
  colorMode?: ColorMode;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseStrength?: number;
  opacity?: number;
}

interface Uniform<T> {
  value: T;
}

interface MoltenUniforms {
  iResolution: Uniform<Float32Array>;
  iTime: Uniform<number>;
  uSpeed: Uniform<number>;
  uScale: Uniform<number>;
  uDetail: Uniform<number>;
  uGlow: Uniform<number>;
  uCoreSize: Uniform<number>;
  uSwirl: Uniform<number>;
  uFold: Uniform<number>;
  uBlackPoint: Uniform<number>;
  uBrightness: Uniform<number>;
  uColorMode: Uniform<number>;
  uGrain: Uniform<number>;
  uGrainIntensity: Uniform<number>;
  uOpacity: Uniform<number>;
  uMouse: Uniform<Float32Array>;
  uMouseStrength: Uniform<number>;
  uEnableMouse: Uniform<boolean>;
  uColor1: Uniform<Float32Array>;
  uColor2: Uniform<Float32Array>;
  uColor3: Uniform<Float32Array>;
}

const vertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uDetail;
uniform float uGlow;
uniform float uCoreSize;
uniform float uSwirl;
uniform float uFold;
uniform float uBlackPoint;
uniform float uBrightness;
uniform float uColorMode;
uniform float uGrain;
uniform float uGrainIntensity;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform bool uEnableMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float time = iTime * uSpeed;
  vec2 p = uScale * ((gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y) - 0.5;

  if (uEnableMouse) {
    p += (uMouse - 0.5) * uMouseStrength * 2.0;
  }

  vec2 i = p;
  float c = 0.0;
  float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
  float d = length(p);
  float rot = d + time + p.x * uSwirl;
  float cosRot = cos(rot);
  mat2 warp = mat2(cos(rot - sin(time / 5.0)), sin(rot), -sin(cosRot - time), cosRot) * uFold;
  float glowCore = uGlow * uCoreSize;

  for (float n = 0.0; n < 8.0; n++) {
    if (n >= uDetail) break;
    p *= warp;
    float t = r - time / (n + 3.0);
    i -= p + vec2(cos(t - i.x - r) + sin(t + i.y), sin(t - i.y) + cos(t + i.x) + r);
    c += glowCore / length(vec2(sin(i.x + t), cos(i.y + t)));
  }

  c /= 6.0;
  float intensity = max(c - uBlackPoint, 0.0) * uBrightness;
  float g = clamp(intensity, 0.0, 1.0);
  float mid = uColorMode > 1.5 ? 0.65 : (uColorMode > 0.5 ? 0.35 : 0.5);
  vec3 col = mix(uColor1, uColor2, smoothstep(0.0, mid, g));
  col = mix(col, uColor3, smoothstep(mid, 1.0, g));

  float a = g;
  if (uGrain > 0.5) {
    a += (hash(gl_FragCoord.xy + iTime) - 0.5) * uGrainIntensity;
  }
  a = clamp(a, 0.0, 1.0) * uOpacity;
  fragColor = vec4(col * a, a);
}
`;

function hexToRgb(hex: string): Float32Array {
  const matched = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!matched) {
    throw new Error(`Invalid MoltenMetal color: ${hex}`);
  }

  return new Float32Array([
    Number.parseInt(matched[1], 16) / 255,
    Number.parseInt(matched[2], 16) / 255,
    Number.parseInt(matched[3], 16) / 255,
  ]);
}

function colorModeValue(mode: ColorMode): number {
  if (mode === "ember") return 1;
  if (mode === "frost") return 2;
  return 0;
}

export function MoltenMetal({
  color1 = "#5227FF",
  color2 = "#FF9FFC",
  color3 = "#FFFFFF",
  speed = 0.35,
  scale = 4,
  detail = 3,
  glow = 1.6,
  coreSize = 0.1,
  swirl = 1,
  fold = -0.2,
  blackPoint = 0.05,
  brightness = 1.3,
  colorMode = "molten",
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  mouseStrength = 0.3,
  opacity = 1,
}: MoltenMetalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        webgl: 2,
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("Unable to initialize the MoltenMetal background.", error);
      return;
    }

    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    gl.clearColor(0, 0, 0, 0);
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        iResolution: { value: new Float32Array([1, 1]) },
        iTime: { value: 0 },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uDetail: { value: detail },
        uGlow: { value: glow },
        uCoreSize: { value: Math.max(coreSize, 0.001) },
        uSwirl: { value: swirl },
        uFold: { value: fold },
        uBlackPoint: { value: blackPoint },
        uBrightness: { value: brightness },
        uColorMode: { value: colorModeValue(colorMode) },
        uGrain: { value: grain ? 1 : 0 },
        uGrainIntensity: { value: grainIntensity },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uMouseStrength: { value: mouseStrength },
        uEnableMouse: { value: mouseInteraction },
        uColor1: { value: hexToRgb(color1) },
        uColor2: { value: hexToRgb(color2) },
        uColor3: { value: hexToRgb(color3) },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    const uniforms = program.uniforms as MoltenUniforms;

    const render = () => renderer.render({ scene: mesh });
    const resizeObserver = new ResizeObserver(() => {
      const bounds = container.getBoundingClientRect();
      renderer.setSize(
        Math.max(1, Math.floor(bounds.width)),
        Math.max(1, Math.floor(bounds.height)),
      );
      uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      uniforms.iResolution.value[1] = gl.drawingBufferHeight;
      render();
    });
    resizeObserver.observe(container);

    const mouse = uniforms.uMouse.value;
    const handlePointerMove = (event: PointerEvent) => {
      if (!mouseInteraction) return;
      const bounds = container.getBoundingClientRect();
      const inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom;
      mouse[0] = inside ? (event.clientX - bounds.left) / bounds.width : 0.5;
      mouse[1] = inside ? 1 - (event.clientY - bounds.top) / bounds.height : 0.5;
    };
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });

    let frameId = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    let startTime = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      uniforms.iTime.value = (time - startTime) * 0.001;
      render();
      if (!reducedMotion) frameId = window.requestAnimationFrame(animate);
    };
    const startAnimation = () => {
      if (visible && pageVisible && frameId === 0) {
        frameId = window.requestAnimationFrame(animate);
      }
    };
    const stopAnimation = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startAnimation();
      else stopAnimation();
    });
    intersectionObserver.observe(container);

    const handleVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (pageVisible) startAnimation();
      else stopAnimation();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    startAnimation();

    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      program.remove();
      geometry.remove();
      if (canvas.parentNode === container) container.removeChild(canvas);
    };
  }, [
    blackPoint,
    brightness,
    color1,
    color2,
    color3,
    colorMode,
    coreSize,
    detail,
    fold,
    glow,
    grain,
    grainIntensity,
    mouseInteraction,
    mouseStrength,
    opacity,
    scale,
    speed,
    swirl,
  ]);

  return (
    <div
      ref={containerRef}
      className="molten-metal-container"
      aria-hidden="true"
    />
  );
}
