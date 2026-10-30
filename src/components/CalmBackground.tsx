/**
 * Soft, CSS-only backdrop: a warm gradient, a few very slow blurred blobs and
 * a faint paper grain. Purely decorative; motion stops under
 * prefers-reduced-motion (see .calm-bg in index.css).
 */
export function CalmBackground() {
  return (
    <div className="calm-bg" aria-hidden="true">
      <div className="calm-bg__blob calm-bg__blob--1" />
      <div className="calm-bg__blob calm-bg__blob--2" />
      <div className="calm-bg__blob calm-bg__blob--3" />
      <div className="calm-bg__grain" />
    </div>
  );
}
