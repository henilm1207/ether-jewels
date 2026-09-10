import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');

  return (
    <section className="py-10 md:py-14">
      <div className="container container-narrow" style={{ maxWidth: '880px' }}>
        <div className="text-center" style={{ paddingBottom: '40px' }}>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            Your cart
          </h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center">
            <ShoppingBag size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-[15px]" style={{ marginBottom: '24px' }}>Your cart is empty</p>
            <Link to="/collections/rings" className="btn btn--primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '24px' }}>
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4"
                  style={{ padding: '24px 0', borderBottom: '1px solid #ededed' }}
                >
                  <Link
                    to={`/products/${item.product.slug}`}
                    className="flex-shrink-0 bg-[#f7f2ef] overflow-hidden"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product.slug}`} className="text-[15px] font-medium hover:opacity-70 block truncate">
                      {item.product.name}
                    </Link>
                    {item.variant && <p className="text-xs text-gray-500">{item.variant.name}</p>}
                    <p className="text-[15px] font-medium" style={{ margin: '5px 0' }}>
                      ${(item.variant?.price || item.product.price).toFixed(2)}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-[#ededed]" style={{ height: '38px', width: '110px' }}>
                        <button onClick={() => updateQuantity(item.key, item.quantity - 1)} className="px-2.5 hover:bg-gray-50 h-full" aria-label="Decrease quantity">
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-sm font-medium text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.key, item.quantity + 1)} className="px-2.5 hover:bg-gray-50 h-full" aria-label="Increase quantity">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.key)} className="text-gray-500 hover:text-[#222] underline" style={{ fontSize: '14px', lineHeight: 1, marginInlineStart: '12px' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label htmlFor="cart-note" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '12px' }}>
                  Add order note
                </label>
                <textarea
                  id="cart-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note to your order"
                  rows={3}
                  className="form-control"
                  style={{ lineHeight: 1.6, paddingTop: '10px', paddingBottom: '10px' }}
                />
              </div>
              <div>
                <p className="text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '12px' }}>
                  Add discount code
                </p>
                {appliedCode ? (
                  <p className="text-sm">
                    Code <span className="font-medium">&ldquo;{appliedCode}&rdquo;</span> applied — discounts calculated at checkout.
                  </p>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => { e.preventDefault(); if (code.trim()) setAppliedCode(code.trim()); }}
                  >
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Add discount code"
                      className="form-control flex-1"
                    />
                    <button type="submit" className="btn btn--secondary" style={{ padding: '0 20px' }}>
                      Apply
                    </button>
                  </form>
                )}
                <div className="flex items-center justify-between" style={{ marginTop: '24px', marginBottom: '8px' }}>
                  <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>Subtotal:</span>
                  <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>${subtotal.toFixed(2)} USD</span>
                </div>
                <p className="text-xs text-gray-500" style={{ marginBottom: '16px' }}>
                  Tax included. <Link to="/pages/shipping-and-deliveries" className="underline">Shipping</Link> calculated at checkout.
                </p>
                <div className="flex gap-2">
                  <button className="btn btn--primary flex-1">Check out</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
