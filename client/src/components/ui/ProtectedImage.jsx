// Anti-copy image wrapper (images-only policy).
// Blocks casual right-click save + drag-to-desktop on product imagery,
// while keeping text selectable and admin workflows untouched.
// The watermark is baked into the file at upload time (sharp composite of
// server/assets/watermark.png) so the mark survives screenshots — this
// component only stops the trivial "right-click > Save image" path, and
// resolves local /uploads/* paths against the backend base URL.
import { resolveMediaUrl } from '../../lib/media';

export default function ProtectedImage({
  src,
  alt = '',
  watermark = false,
  className = '',
  onError,
  ...rest
}) {
  void watermark; // kept for call-site compat; watermark is baked at upload
  return (
    <img
      src={resolveMediaUrl(src)}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onError={onError}
      referrerPolicy="no-referrer"
      className={`protected-img ${className}`.trim()}
      {...rest}
    />
  );
}
