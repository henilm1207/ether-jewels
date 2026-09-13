import { useEffect, useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useBag } from '../../context/BagContext';
import { FREE_SHIPPING_THRESHOLD } from '../../config';
import ProtectedImage from '../ui/ProtectedImage';
import QtyStepper from '../cart/QtyStepper';

// Live: 350px drawer, $1000 free-shipping goal, 80px thumbs, 38×110 qty.
export default function CartDrawer({ isOpen, onClose }) {
  const { items, hydrating, removeItem, updateQuantity, subtotal, totalItems, limitExceeded } = useBag();
  const navigate = useNavigate();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const goCheckout = () => {
    onClose();
    navigate('/cart');
  };

  // Whole-cart cap: breaching it (or checking out over it) goes to Contact
  // for a bulk/seller inquiry instead of changing the cart.
  const goBulk = () => {
    onClose();
    navigate('/pages/contact', { state: { bulk: true } });
  };
  const commitQty = (item, n) => {
    if (!updateQuantity(item.key, n)) goBulk();
  };

  return (
    <>
      {/* Overlay — live #444 at 64% */}
      <div
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: 'rgba(68,68,68,0.64)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div role="dialog" aria-modal="true" aria-label={`Your cart, ${totalItems} items`} className="fixed top-0 right-0 h-full w-full max-w-[350px] bg-white z-[101] flex flex-col animate-slide-in-right">
        {/* Header — live 60px */}
        <div className="flex items-center justify-between border-b border-[#ededed]" style={{ height: '60px', padding: '16px 20px' }}>
          <h2
            className="text-[15px] font-medium"
            style={{ margin: 0, textTransform: 'none', letterSpacing: 'normal', lineHeight: '24px' }}
          >
            Your cart ({items.length} {items.length === 1 ? 'item' : 'items'})
          </h2>
          <button onClick={onClose} className="p-1 hover:opacity-70" aria-label="Close cart">
            <X size={22} />
          </button>
        </div>

        {/* Shipping goal */}
        <div className="bg-[#f7f2ef]" style={{ padding: '12px 20px' }}>
          {subtotal >= FREE_SHIPPING_THRESHOLD ? (
            <p className="text-sm text-center font-medium">
              Congratulations! Your order qualifies for free shipping
            </p>
          ) : (
            <>
              <p className="text-sm text-center" style={{ marginBottom: '8px' }}>
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

        {/* Items */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 20px' }}>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center" style={{ maxWidth: '300px', margin: '0 auto' }}>
              <ShoppingBag size={48} className="text-gray-300" style={{ marginBottom: '12px' }} />
              {hydrating ? (
                <p className="text-[15px] text-gray-500" role="status" style={{ marginTop: '30px', marginBottom: '20px' }}>Loading your cart…</p>
              ) : (
                <>
                  <p className="text-[15px] text-gray-500" style={{ marginTop: '30px', marginBottom: '20px' }}>Your cart is empty</p>
                  <Link
                    to="/collections/rings"
                    onClick={onClose}
                    className="btn btn--primary w-full"
                    style={{ marginBottom: '12px' }}
                  >
                    Continue Shopping
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div>
              {items.map((item, i) => (
                <div key={item.key} className="flex" style={{ padding: '20px 0', marginTop: i === 0 ? '16px' : 0, borderBottom: '1px solid #ededed' }}>
                  <Link
                    to={`/products/${item.product.slug}`}
                    onClick={onClose}
                    className="flex-shrink-0 bg-[#f7f2ef] overflow-hidden"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <ProtectedImage
                      src={item.variant?.image || item.product.images?.[0] || '/images/placeholder.webp'}
                      alt={item.product.name}
                      watermark
                      className="w-full h-full object-cover"
                      loading="lazy"
                      width={80}
                      height={80}
                    />
                  </Link>

                  <div className="flex-1 min-w-0" style={{ paddingInlineStart: '12px' }}>
                    <Link
                      to={`/products/${item.product.slug}`}
                      onClick={onClose}
                      className="text-[15px] font-medium hover:opacity-70 transition-opacity block truncate"
                      style={{ marginBottom: '4px' }}
                    >
                      {item.product.name}
                    </Link>
                    {item.variant && (
                      <p className="text-xs text-gray-500">{item.variant.name}{item.variant.kt ? ` / ${item.variant.kt}` : ''}{item.size ? ` / Size ${item.size}` : ''}</p>
                    )}
                    <p className="text-[15px] font-medium" style={{ margin: '5px 0' }}>
                      ${(Number(item.variant?.price ?? item.product.price) || 0).toFixed(2)}
                    </p>

                    <div className="flex items-center flex-wrap">
                      <QtyStepper value={item.quantity} onCommit={(n) => commitQty(item, n)} />
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-gray-500 hover:text-[#222] underline"
                        style={{ fontSize: '14px', textTransform: 'capitalize', lineHeight: 1, marginInlineStart: '12px' }}
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
          <div className="border-t border-[#ededed]" style={{ padding: '13px 20px 24px' }}>
            <button
              onClick={() => setNoteOpen(!noteOpen)}
              className="text-[13px] underline hover:text-black"
              style={{ marginBottom: '8px' }}
            >
              Add order note
            </button>
            {noteOpen && (
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note to your order"
                rows={2}
                className="form-control"
                style={{ marginBottom: '12px', lineHeight: 1.6, paddingTop: '8px' }}
              />
            )}
            {appliedCode ? (
              <p className="text-[13px]" style={{ marginBottom: '8px' }}>
                Code &ldquo;{appliedCode}&rdquo; — discounts calculated at checkout.
              </p>
            ) : (
              <form
                className="flex gap-2"
                style={{ marginBottom: '8px' }}
                onSubmit={(e) => { e.preventDefault(); if (code.trim()) setAppliedCode(code.trim()); }}
              >
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Add discount code"
                  className="form-control flex-1"
                  aria-label="Discount code"
                />
                <button type="submit" className="btn btn--secondary" style={{ padding: '0 20px' }}>
                  Apply
                </button>
              </form>
            )}
            <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
              <span className="font-medium" style={{ fontSize: '15px', lineHeight: '24px' }}>Subtotal:</span>
              <span className="font-medium" style={{ fontSize: '15px', lineHeight: '26px' }}>${subtotal.toFixed(2)} USD</span>
            </div>
            <p className="text-xs text-gray-500" style={{ marginBottom: '12px' }}>Tax included. Shipping calculated at checkout.</p>
            {limitExceeded && (
              <p role="status" className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px', marginBottom: '12px' }}>
                Your cart has more than 5 items — please contact our seller for bulk orders.
              </p>
            )}
            <div className="flex" style={{ gap: '8px' }}>
              <button onClick={limitExceeded ? goBulk : goCheckout} className="btn btn--primary flex-1">
                {limitExceeded ? 'Contact seller' : 'Check out'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
