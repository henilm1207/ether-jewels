import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config';
import ProtectedImage from '../components/ui/ProtectedImage';

// Stripe card form — rendered inside <Elements> once the PaymentIntent exists.
function StripeCardInner({ email, orderId, onPaid, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirming, setConfirming] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements || confirming) return;
        setConfirming(true);
        try {
          const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: { receipt_email: email },
            redirect: 'if_required',
          });
          if (error) throw new Error(error.message || 'Card payment failed');
          if (!paymentIntent || paymentIntent.status !== 'succeeded')
            throw new Error(`Payment not completed (status: ${paymentIntent ? paymentIntent.status : 'unknown'})`);
          // Deterministic reconcile (the webhook fires too — both idempotent).
          const res = await fetch(apiUrl('/api/payments/stripe/confirm'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, paymentIntentId: paymentIntent.id }),
          });
          const data = await res.json().catch(() => ({}));
          onPaid(data.order || { _id: orderId, payment: { status: 'paid' } });
        } catch (err) {
          onError(err.message || 'Card payment failed');
        } finally {
          setConfirming(false);
        }
      }}
    >
      <PaymentElement />
      <button type="submit" disabled={!stripe || confirming} className="btn btn--primary w-full disabled:opacity-50" style={{ marginTop: '16px' }}>
        {confirming ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}

export default function Cart() {
  const { items, removeItem, updateQuantity, subtotal, clearCart } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const payRef = useRef(null);
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  // Checkout contact/address (server requires these for every order).
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [zip, setZip] = useState('');
  const [method, setMethod] = useState('stripe'); // stripe | paypal
  const [payConfig, setPayConfig] = useState(null); // {stripePublishableKey, paypalClientId, ...}
  const [stripeStep, setStripeStep] = useState(null); // {clientSecret, orderId} after intent

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Buy It Now lands here with {checkout:true} — bring payment into view.
  useEffect(() => {
    if (location.state && location.state.checkout && payRef.current) {
      payRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/payments/config'));
        const data = await res.json().catch(() => ({}));
        if (live && res.ok) setPayConfig(data);
      } catch {
        // offline — manual fallback below still works
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const stripePromise = useMemo(
    () => (payConfig && payConfig.stripePublishableKey ? loadStripe(payConfig.stripePublishableKey) : null),
    [payConfig]
  );

  const cartItems = () =>
    items.map((it) => ({
      product: it.product._id || it.product.id,
      qty: it.quantity,
      karat: it.variant?.kt || '14KT',
      metalColor: it.variant?.material || it.variant?.name,
      size: it.size || undefined,
    }));

  const checkoutBody = () => ({
    items: cartItems(),
    couponCode: appliedCode || undefined,
    shippingAddress: { fullName: fullName.trim(), line1: line1.trim(), city: city.trim(), country: country.trim(), zip: zip.trim(), phone: phone.trim() || undefined },
    contact: { name: fullName.trim() || undefined, email: email.trim(), phone: phone.trim() || undefined },
    orderNote: note.slice(0, 1000),
  });

  const validateForm = () => {
    if (!fullName.trim()) return 'Full name required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Valid email required';
    if (!line1.trim() || !city.trim() || !country.trim() || !zip.trim()) return 'Complete shipping address required';
    return '';
  };

  const onPaid = (order) => {
    setDone(order);
    clearCart();
  };

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
                    <ProtectedImage src={item.variant?.image || item.product.images?.[0] || '/images/placeholder.webp'} alt={item.product.name} watermark loading="lazy" width={80} height={80} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product.slug}`} className="text-[15px] font-medium hover:opacity-70 block truncate">
                      {item.product.name}
                    </Link>
                    {item.variant && <p className="text-xs text-gray-500">{item.variant.name}{item.variant.kt ? ` / ${item.variant.kt}` : ''}{item.size ? ` / Size ${item.size}` : ''}</p>}
                    <p className="text-[15px] font-medium" style={{ margin: '5px 0' }}>
                      ${(Number(item.variant?.price ?? item.product.price) || 0).toFixed(2)}
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
                  <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>${(Number(subtotal) || 0).toFixed(2)} USD</span>
                </div>
                <p className="text-xs text-gray-500" style={{ marginBottom: '16px' }}>
                  Tax included. <Link to="/pages/shipping-and-deliveries" className="underline">Shipping</Link> calculated at checkout.
                </p>
                {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '12px' }}>{error}</p>}
                {done ? (
                  <div role="status" className="bg-[#f7f2ef] p-4 text-sm">
                    <p className="font-medium">
                      {done.payment?.status === 'paid' ? 'Payment successful — ' : ''}Order {done._id} placed — ${Number(done.pricing?.total || 0).toFixed(2)} USD.
                    </p>
                    <p className="text-gray-600 mt-1">We emailed your confirmation. <button className="underline" onClick={() => { setDone(null); navigate('/'); }}>Continue shopping</button></p>
                  </div>
                ) : (
                <div ref={payRef} style={{ scrollMarginTop: '100px' }}>
                  {/* Contact + address — required for every order, guest checkout OK */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name *" aria-label="Full name" className="form-control" autoComplete="name" />
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email *" aria-label="Email" type="email" className="form-control" autoComplete="email" />
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" aria-label="Phone" type="tel" className="form-control" autoComplete="tel" />
                    <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address *" aria-label="Street address" className="form-control sm:col-span-2" autoComplete="street-address" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" aria-label="City" className="form-control" autoComplete="address-level2" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country *" aria-label="Country" className="form-control" autoComplete="country-name" />
                      <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP *" aria-label="ZIP" className="form-control" autoComplete="postal-code" />
                    </div>
                  </div>

                  {/* Method tabs */}
                  <div className="flex" style={{ gap: '12px', marginBottom: '16px' }} role="group" aria-label="Payment method">
                    {['stripe', 'paypal'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => { setMethod(m); setStripeStep(null); setError(''); }}
                        aria-pressed={method === m}
                        className={`flex-1 transition-all text-[13px] font-medium uppercase ${method === m ? 'bg-[#222] text-white border border-[#222]' : 'bg-white text-[#222] border hover:border-[#222]'}`}
                        style={{ minHeight: '46px', padding: '8px 14px', borderColor: method === m ? '#222' : '#ededed', letterSpacing: '1px' }}
                      >
                        {m === 'stripe' ? 'Card' : 'PayPal'}
                      </button>
                    ))}
                  </div>

                  {method === 'stripe' ? (
                    !payConfig?.stripePublishableKey ? (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px' }}>
                        Card payments are not configured yet — use PayPal or place a manual order below.
                      </p>
                    ) : !stripeStep ? (
                      <button
                        disabled={placing}
                        onClick={async () => {
                          const v = validateForm();
                          if (v) return setError(v);
                          setPlacing(true);
                          setError('');
                          try {
                            const res = await fetch(apiUrl('/api/payments/stripe/create-intent'), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...authHeaders },
                              body: JSON.stringify(checkoutBody()),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.message || 'Could not start card payment');
                            setStripeStep({ clientSecret: data.clientSecret, orderId: data.orderId });
                          } catch (e) {
                            setError(e.message);
                          } finally {
                            setPlacing(false);
                          }
                        }}
                        className="btn btn--primary w-full disabled:opacity-50"
                      >
                        {placing ? 'Preparing…' : `Continue to card payment — $${(Number(subtotal) || 0).toFixed(2)} USD`}
                      </button>
                    ) : (
                      <>
                        <Elements stripe={stripePromise} options={{ clientSecret: stripeStep.clientSecret }}>
                          <StripeCardInner
                            email={email.trim()}
                            orderId={stripeStep.orderId}
                            onPaid={onPaid}
                            onError={setError}
                          />
                        </Elements>
                        <button onClick={() => setStripeStep(null)} className="underline text-sm text-gray-500 mt-3">← Back to details</button>
                      </>
                    )
                  ) : !payConfig?.paypalClientId ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px' }}>
                      PayPal is not configured yet — use Card or place a manual order below.
                    </p>
                  ) : (
                    <PayPalScriptProvider options={{ clientId: payConfig.paypalClientId, currency: 'USD', intent: 'capture' }}>
                      <PayPalButtons
                        style={{ layout: 'vertical', shape: 'rect', label: 'paypal' }}
                        forceReRender={[fullName, email, phone, line1, city, country, zip, appliedCode, items]}
                        createOrder={async () => {
                          const v = validateForm();
                          if (v) {
                            setError(v);
                            throw new Error(v);
                          }
                          setError('');
                          const res = await fetch(apiUrl('/api/payments/paypal/create-order'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify(checkoutBody()),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.message || 'Could not start PayPal payment');
                          return data.paypalOrderId;
                        }}
                        onApprove={async (paypalData) => {
                          try {
                            const res = await fetch(apiUrl('/api/payments/paypal/capture'), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...authHeaders },
                              body: JSON.stringify({ paypalOrderId: paypalData.orderID }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.message || 'PayPal capture failed');
                            onPaid(data.order);
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                        onCancel={() => setError('PayPal payment cancelled — your order is saved as pending, you can retry.')}
                        onError={() => setError('PayPal could not load — check connection or try Card.')}
                      />
                    </PayPalScriptProvider>
                  )}

                  {/* Manual fallback — only while NO gateway is configured.
                      Vanishes automatically once Stripe/PayPal keys land. */}
                  {!payConfig?.stripePublishableKey && !payConfig?.paypalClientId && (
                  <div className="text-center" style={{ marginTop: '16px' }}>
                    <button
                      disabled={placing}
                      onClick={async () => {
                        const v = validateForm();
                        if (v) return setError(v);
                        setPlacing(true);
                        setError('');
                        try {
                          const res = await fetch(apiUrl('/api/orders'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders },
                            body: JSON.stringify({ ...checkoutBody(), payment: { method: 'card' } }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.message || 'Checkout failed');
                          onPaid(data);
                        } catch (e) {
                          setError(e.message);
                        } finally {
                          setPlacing(false);
                        }
                      }}
                      className="underline text-sm text-gray-500 disabled:opacity-50"
                    >
                      {placing ? 'Placing order…' : 'or place order without online payment'}
                    </button>
                  </div>
                  )}
                </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
