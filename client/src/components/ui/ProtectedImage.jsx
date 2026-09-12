// Anti-copy image wrapper (images-only policy).
// Blocks casual right-click save + drag-to-desktop on product imagery,
// while keeping text selectable and admin workflows untouched.
// Watermarking itself is applied via protectedUrl() (Cloudinary overlay)
// so the mark survives screenshots — this component only stops the
// trivial "right-click > Save image" path.
import { useState } from 'react';
import { protectedUrl } from '../../lib/cloudinary';

export default function ProtectedImage({
  src,
  alt = '',
  watermark = false,
  className = '',
  onError,
  ...rest
}) {
  const watermarkedSrc = watermark ? protectedUrl(src) : src;
  const [failedOver, setFailedOver] = useState(false);
  // If the watermarked transform ever fails (missing overlay asset, bad
  // transform), fall back to the original URL once — images must never
  // blank because of a protection feature.
  const displaySrc = failedOver ? src : watermarkedSrc;
  return (
    <img
      src={displaySrc}
      alt={alt}
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      onError={(e) => {
        if (!failedOver && displaySrc !== src) {
          setFailedOver(true);
        } else if (onError) {
          onError(e);
        }
      }}
      referrerPolicy="no-referrer"
      className={`protected-img ${className}`.trim()}
      {...rest}
    />
  );
}
