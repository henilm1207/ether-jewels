import { X, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function CartDrawer({ isOpen, onClose }) {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const FREE_SHIPPING_THRESHOLD = 1000;
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer — live is 420px */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-white z-[101] flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#ededed]">
          <h2 className="text-[13px] font-medium tracking-[1px] uppercase">
            Your cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-70">
            <X size={20} />
          </button>
        </div>

        {/* Shipping Progress */}
        <div className="px-6 py-3 bg-[#f7f2ef]">
          {subtotal >= FREE_SHIPPING_THRESHOLD ? (
            <p className="text-sm text-center text-green-700 font-medium">
              ✓ Your order qualifies for free shipping!
            </p>
          ) : (
            <>
              <p className="text-sm text-center mb-2">
                Spend ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for free shipping
              </p>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#222] transition-all duration-500"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={48} className="text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-4">Your cart is empty</p>
              <Link
                to="/collections/solitaire-rings"
                onClick={onClose}
                className="px-6 py-3 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.key} className="flex gap-4 py-4 border-b border-[#ededed] last:border-0">
                  <Link
                    to={`/products/${item.product.slug}`}
                    onClick={onClose}
                    className="flex-shrink-0 w-[80px] h-[80px] bg-[#f7f2ef] overflow-hidden"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/products/${item.product.slug}`}
                      onClick={onClose}
                      className="text-sm font-medium hover:opacity-70 transition-opacity block truncate"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.variant.name}</p>
                    )}
                    <p className="text-sm font-medium mt-1">
                      ${(item.variant?.price || item.product.price).toFixed(2)}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-[#ededed]">
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-50"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-sm font-medium min-w-[32px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-50"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-xs text-gray-500 hover:text-[#222] underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-[#ededed] px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Subtotal:</span>
              <span className="text-sm font-medium">${subtotal.toFixed(2)} USD</span>
            </div>
            <p className="text-xs text-gray-500">Tax included. Shipping calculated at checkout.</p>
            <button className="w-full py-3.5 bg-[#222] text-white text-[13px] font-medium uppercase tracking-wider hover:bg-black transition-colors">
              Check out
            </button>
            <Link
              to="/cart"
              onClick={onClose}
              className="block w-full py-3.5 border border-[#222] text-center text-[13px] font-medium uppercase tracking-wider hover:bg-[#222] hover:text-white transition-colors"
            >
              View cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
