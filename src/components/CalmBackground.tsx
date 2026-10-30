import { AuroraLayer } from "./AuroraBackground";

/**
 * Soft backdrop: a warm CSS gradient, a few very slow blurred blobs, an
 * optional React Bits Aurora shader on top (WebGL2 + motion allowed only) and
 * a faint paper grain. Purely decorative; motion stops under
 * prefers-reduced-motion (see .calm-bg in index.css).
 */
export function CalmBackground() {
  return (
    <div className="calm-bg" aria-hidden="true">
      <div className="calm-bg__blob calm-bg__blob--1" />
      <div className="calm-bg__blob calm-bg__blob--2" />
      <div className="calm-bg__blob calm-bg__blob--3" />
      <AuroraLayer />
      <div className="calm-bg__grain" />
    </div>
  );
}
