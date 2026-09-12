// Cloudinary delivery-time watermark helper.
// Originals stored in Product.images[] stay clean; the overlay is injected
// into the delivery URL so every storefront render is watermarked, while
// screenshots / hotlinked copies keep the mark.
//
// Setup (one time, Cloudinary dashboard):
//  1. Upload your logo/text as public id `ether-jewels/watermark`
//     (Settings → Upload → or via admin panel Media upload).
//  2. Dashboard → Security → Allowed Referrers: add your store domains.
//  3. Dashboard → Security → Enable "Strict Transformations" (balanced mode
//     keeps existing public URLs working; only this transform is allowed
//     once you add it to the allowlist).
//
// URL shape: https://res.cloudinary.com/<cloud>/image/upload/<transform>/v123/....
// We insert the transform right after `/upload/` so versioned + unversioned
// URLs both work. Non-Cloudinary URLs (local /images/*) pass through.

const WATERMARK_ID = 'ether-jewels:watermark';
// Relative-size text-safe overlay: bottom-right, subtle, scales with image.
const WATERMARK_TRANSFORM = `l_${WATERMARK_ID},fl_relative,w_0.16,o_55,g_south_east,x_24,y_24/fl_progressive,q_auto`;

export function protectedUrl(src) {
  if (typeof src !== 'string' || !src) return src;
  // Gated: the overlay asset `ether-jewels/watermark` must exist in the
  // Cloudinary account or every transformed URL 400s (blank images).
  // Keep OFF until the asset is uploaded and the transformed URL is
  // verified 200 — then set VITE_ENABLE_WATERMARK=true and redeploy.
  if (import.meta.env.VITE_ENABLE_WATERMARK !== 'true') return src;
  if (!src.includes('res.cloudinary.com') || !src.includes('/upload/')) return src;
  if (src.includes(WATERMARK_ID)) return src; // already watermarked
  return src.replace('/upload/', `/upload/${WATERMARK_TRANSFORM}/`);
}

export const CLOUDINARY_WATERMARK_ID = 'ether-jewels/watermark';
