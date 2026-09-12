import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

// Shared favorite (wishlist) heart. Safe inside <Link> cards — the click
// never navigates. Guests persist locally, members sync to their account.
export default function FavButton({ product, size = 20, className = '', style }) {
  const { isFav, toggleFav } = useWishlist();
  const id = product ? product._id || product.id : '';
  const fav = isFav(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(product);
      }}
      aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={fav}
      title={fav ? 'Remove from favorites' : 'Add to favorites'}
      className={`inline-flex items-center justify-center rounded-full bg-white/95 shadow-sm transition-transform hover:scale-110 ${className}`.trim()}
      style={{ width: '36px', height: '36px', ...style }}
    >
      <Heart
        size={size}
        strokeWidth={1.75}
        className="text-[#222]"
        fill={fav ? '#222' : 'none'}
        aria-hidden="true"
      />
    </button>
  );
}
