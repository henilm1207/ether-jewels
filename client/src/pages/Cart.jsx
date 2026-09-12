import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../config';
import ProtectedImage from '../components/ui/ProtectedImage';
import QtyStepper from '../components/cart/QtyStepper';

// Checkout draft (coupon + contact/address/note) survives the login
// round-trip: guests are sent to /account/login at checkout and return here.
const DRAFT_KEY = 'ether-cart-draft';
const readDraft = () => {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') || {};
  } catch {
    return {};
  }
};
const clearDraft = () => {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // private mode — nothing persisted
  }
};

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
  const { items, removeItem, updateQuantity, subtotal, clearCart, limitExceeded } = useCart();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const payRef = useRef(null);
  const [note, setNote] = useState(() => readDraft().note || '');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState(() => readDraft().appliedCode || '');
  // { code, discount } from POST /api/coupons/validate for the current cart.
  const [couponInfo, setCouponInfo] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  // Checkout contact/address (server requires these for every order).
  const [fullName, setFullName] = useState(() => readDraft().fullName || '');
  const [email, setEmail] = useState(() => readDraft().email || '');
  const [phone, setPhone] = useState(() => readDraft().phone || '');
  const [line1, setLine1] = useState(() => readDraft().line1 || '');
  const [city, setCity] = useState(() => readDraft().city || '');
  const [country, setCountry] = useState(() => readDraft().country || '');
  const [zip, setZip] = useState(() => readDraft().zip || '');
  const [method, setMethod] = useState('stripe'); // stripe | paypal
  const [payConfig, setPayConfig] = useState(null); // {stripePublishableKey, paypalClientId, ...}
  const [stripeStep, setStripeStep] = useState(null); // {clientSecret, orderId} after intent
  // One key per checkout attempt: double-clicks/replays reuse the pending
  // order server-side instead of minting duplicates. Rotated after each pay.
  const [checkoutKey, setCheckoutKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  );

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Live preview from the last server validation, clamped to the subtotal
  // so a stale frame can never show a discount bigger than the cart.
  const previewDiscount =
    couponInfo && appliedCode ? Math.min(Number(couponInfo.discount) || 0, Number(subtotal) || 0) : 0;

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
    idempotencyKey: checkoutKey,
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

  // Guests must log in before any payment starts; Login returns them here.
  const requireLogin = () => {
    if (!token) {
      navigate('/account/login', { state: { from: '/cart' } });
      return true;
    }
    return false;
  };

  // Whole-cart cap: breaching it (or paying over it) goes to Contact for a
  // bulk/seller inquiry instead of changing the cart.
  const goBulk = () => navigate('/pages/contact', { state: { bulk: true } });
  const commitQty = (item, n) => {
    if (!updateQuantity(item.key, n)) goBulk();
  };
  const requireWithinLimit = () => {
    if (limitExceeded) {
      goBulk();
      return true;
    }
    return false;
  };

  // Server is the source of truth: validate enforces every admin condition
  // (active, expiry, uses left, min order) and computes the discount.
  const validateCoupon = async (rawCode, cartSubtotal) => {
    const trimmed = (rawCode || '').trim().toUpperCase();
    if (!trimmed) return null;
    const res = await fetch(apiUrl('/api/coupons/validate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: trimmed, subtotal: cartSubtotal }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Invalid coupon');
    return data; // { code, discount }
  };

  const applyCoupon = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || couponBusy) return;
    setCouponBusy(true);
    setCouponError('');
    try {
      const data = await validateCoupon(trimmed, subtotal);
      setAppliedCode(data.code);
      setCouponInfo(data);
      setCode('');
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon');
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCode('');
    setCouponInfo(null);
    setCouponError('');
  };

  const onPaid = (order) => {
    setDone(order);
    clearCart();
    setAppliedCode('');
    setCouponInfo(null);
    setCouponError('');
    clearDraft();
    setStripeStep(null);
    setVToken('');
    setEmailOk(false);
    setPhoneOk(false);
    setCheckoutKey(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
  };

  // ---- Contact verification (OTP): token required before any payment ----
  // waEnabled null = mode still loading (fail-open to dual); false hides the
  // WhatsApp row until the WHATSAPP_VERIFY_ENABLED update lands.
  const [waEnabled, setWaEnabled] = useState(null);
  const [vToken, setVToken] = useState('');
  const [emailOk, setEmailOk] = useState(false);
  const [phoneOk, setPhoneOk] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [vBusy, setVBusy] = useState('');
  const [vError, setVError] = useState('');
  const [cooldown, setCooldown] = useState({ email: 0, whatsapp: 0 });

  const touchContact = (which, value) => {
    // Editing a contact resets its verification and the checkout token.
    if (which === 'email') {
      setEmail(value);
      setEmailOk(false);
      setEmailCode('');
    } else {
      setPhone(value);
      setPhoneOk(false);
      setPhoneCode('');
    }
    setVToken('');
  };

  const sendCode = async (channel) => {
    const value = channel === 'email' ? email.trim() : phone.trim();
    if (!value) return setVError(channel === 'email' ? 'Enter your email first' : 'Enter your phone with country code first');
    setVBusy(channel);
    setVError('');
    try {
      const res = await fetch(apiUrl('/api/verify/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not send code');
      if (channel === 'email') setEmailSent(true);
      else setPhoneSent(true);
      setCooldown((c) => ({ ...c, [channel]: 30 }));
    } catch (e) {
      setVError(e.message);
    } finally {
      setVBusy('');
    }
  };

  const checkCode = async (channel) => {
    const value = channel === 'email' ? email.trim() : phone.trim();
    const code = channel === 'email' ? emailCode.trim() : phoneCode.trim();
    if (code.length < 4) return setVError('Enter the 6-digit code');
    setVBusy(`${channel}-check`);
    setVError('');
    try {
      const res = await fetch(apiUrl('/api/verify/check'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, value, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      if (channel === 'email') setEmailOk(true);
      else setPhoneOk(true);
    } catch (e) {
      setVError(e.message);
    } finally {
      setVBusy('');
    }
  };

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown.email <= 0 && cooldown.whatsapp <= 0) return;
    const t = setTimeout(
      () => setCooldown((c) => ({ email: Math.max(0, c.email - 1), whatsapp: Math.max(0, c.whatsapp - 1) })),
      1000
    );
    return () => clearTimeout(t);
  }, [cooldown]);

  // WhatsApp row applies only when the server has it enabled.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/verify/mode'));
        const data = await res.json().catch(() => ({}));
        if (live) setWaEnabled(data.whatsapp !== false);
      } catch {
        if (live) setWaEnabled(true); // fail-open to today's dual behavior
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Mint the checkout token once the required channels verify (email always;
  // WhatsApp too unless the server disabled it for now).
  useEffect(() => {
    if (!emailOk || (waEnabled !== false && !phoneOk) || vToken) return;
    let live = true;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/verify/token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
        });
        const data = await res.json().catch(() => ({}));
        if (live && res.ok && data.verificationToken) setVToken(data.verificationToken);
        else if (live) setVError(data.message || 'Could not issue checkout token');
      } catch {
        if (live) setVError('Could not issue checkout token');
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailOk, phoneOk, waEnabled]);

  const verifyHeaders = vToken ? { 'X-Verification-Token': vToken } : {};

  // Persist the checkout draft so the login round-trip keeps it.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ appliedCode, note, fullName, email, phone, line1, city, country, zip })
      );
    } catch {
      // private mode — nothing persisted
    }
  }, [appliedCode, note, fullName, email, phone, line1, city, country, zip]);

  // Re-check the code whenever the cart total moves (e.g. item removed
  // below min order) — the server re-verifies at order time regardless.
  useEffect(() => {
    if (!appliedCode) return;
    let live = true;
    (async () => {
      try {
        const data = await validateCoupon(appliedCode, subtotal);
        if (live) {
          setCouponInfo(data);
          setCouponError('');
        }
      } catch (err) {
        if (live) {
          setCouponInfo(null);
          setAppliedCode('');
          setCouponError(err.message || 'Coupon no longer valid for this cart');
        }
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

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
                      <QtyStepper value={item.quantity} onCommit={(n) => commitQty(item, n)} />
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
                  <div>
                    <p className="text-sm">
                      Code <span className="font-medium">&ldquo;{appliedCode}&rdquo;</span> applied.
                      <button onClick={removeCoupon} className="underline ml-2">Remove</button>
                    </p>
                    {couponError && <p role="alert" className="text-sm text-red-700" style={{ marginTop: '8px' }}>{couponError}</p>}
                  </div>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={applyCoupon}
                  >
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Add discount code"
                      aria-label="Discount code"
                      className="form-control flex-1"
                    />
                    <button type="submit" disabled={couponBusy} className="btn btn--secondary disabled:opacity-50" style={{ padding: '0 20px' }}>
                      {couponBusy ? 'Checking…' : 'Apply'}
                    </button>
                  </form>
                )}
                {!appliedCode && couponError && <p role="alert" className="text-sm text-red-700" style={{ marginTop: '8px' }}>{couponError}</p>}
                <div className="flex items-center justify-between" style={{ marginTop: '24px', marginBottom: '8px' }}>
                  <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>Subtotal:</span>
                  <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>${(Number(subtotal) || 0).toFixed(2)} USD</span>
                </div>
                {appliedCode && couponInfo ? (
                  <>
                    <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                      <span className="text-[15px]" style={{ lineHeight: '24px' }}>Discount ({appliedCode}):</span>
                      <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>−${previewDiscount.toFixed(2)} USD</span>
                    </div>
                    <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                      <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>Total:</span>
                      <span className="text-[15px] font-medium" style={{ lineHeight: '24px' }}>${Math.max(0, (Number(subtotal) || 0) - previewDiscount).toFixed(2)} USD</span>
                    </div>
                  </>
                ) : null}
                {limitExceeded && (
                  <p role="status" className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded" style={{ padding: '10px 12px', marginBottom: '16px' }}>
                    Your cart has more than 5 items — please contact our seller for bulk orders.
                  </p>
                )}
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
                    <input value={email} onChange={(e) => touchContact('email', e.target.value)} placeholder="Email *" aria-label="Email" type="email" className="form-control" autoComplete="email" />
                    <input value={phone} onChange={(e) => touchContact('phone', e.target.value)} placeholder="Phone * (with country code)" aria-label="Phone" type="tel" className="form-control" autoComplete="tel" />
                    <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Street address *" aria-label="Street address" className="form-control sm:col-span-2" autoComplete="street-address" />
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" aria-label="City" className="form-control" autoComplete="address-level2" />
                    <div className="grid grid-cols-2 gap-3">
                      <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country *" aria-label="Country" className="form-control" autoComplete="country-name" />
                      <input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP *" aria-label="ZIP" className="form-control" autoComplete="postal-code" />
                    </div>
                  </div>

                  {/* 1 — Verify contact: OTP on email (+ WhatsApp while enabled), token unlocks payment */}
                  <div className="border border-[#ededed] bg-[#fafafa] rounded" style={{ padding: '16px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px' }}>1 · Verify contact</h3>
                    <p className="text-[13px] text-gray-500" style={{ marginBottom: '12px' }}>
                      {waEnabled !== false
                        ? 'High-value orders need a verified email and phone before payment unlocks.'
                        : 'High-value orders need a verified email before payment unlocks.'}
                    </p>
                    {vError && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '12px' }}>{vError}</p>}
                    {vToken ? (
                      <p role="status" className="text-sm text-green-700 font-medium">
                        {waEnabled !== false ? '✓ Email & phone verified — payment unlocked.' : '✓ Email verified — payment unlocked.'}
                      </p>
                    ) : (
                      <div className="grid" style={{ gap: '12px' }}>
                        <div>
                          <div className="flex items-center" style={{ gap: '8px' }}>
                            <span className="text-sm font-medium flex-1">Email {emailOk && <span className="text-green-700">✓</span>}</span>
                            {!emailOk && (
                              <button type="button" disabled={vBusy === 'email' || cooldown.email > 0} onClick={() => sendCode('email')} className="underline text-sm disabled:opacity-50">
                                {vBusy === 'email' ? 'Sending…' : emailSent ? (cooldown.email > 0 ? `Resend (${cooldown.email}s)` : 'Resend code') : 'Send code'}
                              </button>
                            )}
                          </div>
                          {!emailOk && emailSent && (
                            <div className="flex items-center" style={{ gap: '8px', marginTop: '8px' }}>
                              <input value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" aria-label="Email code" inputMode="numeric" className="form-control flex-1" style={{ letterSpacing: '4px' }} />
                              <button type="button" disabled={vBusy === 'email-check'} onClick={() => checkCode('email')} className="btn btn--secondary" style={{ padding: '0 20px' }}>
                                {vBusy === 'email-check' ? '…' : 'Verify'}
                              </button>
                            </div>
                          )}
                        </div>
                        {/* TEMP-DISABLED until the WhatsApp update: row renders only
                            while the server reports whatsapp mode enabled. */}
                        {waEnabled !== false && (
                        <div>
                          <div className="flex items-center" style={{ gap: '8px' }}>
                            <span className="text-sm font-medium flex-1">WhatsApp {phoneOk && <span className="text-green-700">✓</span>}</span>
                            {!phoneOk && (
                              <button type="button" disabled={vBusy === 'whatsapp' || cooldown.whatsapp > 0} onClick={() => sendCode('whatsapp')} className="underline text-sm disabled:opacity-50">
                                {vBusy === 'whatsapp' ? 'Sending…' : phoneSent ? (cooldown.whatsapp > 0 ? `Resend (${cooldown.whatsapp}s)` : 'Resend code') : 'Send code'}
                              </button>
                            )}
                          </div>
                          {!phoneOk && phoneSent && (
                            <div className="flex items-center" style={{ gap: '8px', marginTop: '8px' }}>
                              <input value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" aria-label="WhatsApp code" inputMode="numeric" className="form-control flex-1" style={{ letterSpacing: '4px' }} />
                              <button type="button" disabled={vBusy === 'whatsapp-check'} onClick={() => checkCode('whatsapp')} className="btn btn--secondary" style={{ padding: '0 20px' }}>
                                {vBusy === 'whatsapp-check' ? '…' : 'Verify'}
                              </button>
                            </div>
                          )}
                        </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2 — Pay (locked until verified) */}
                  <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>2 · Pay</h3>
                  <div style={!vToken ? { opacity: 0.45, pointerEvents: 'none' } : undefined} aria-disabled={!vToken}>
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
                          if (requireLogin()) return;
                          if (requireWithinLimit()) return;
                          const v = validateForm();
                          if (v) return setError(v);
                          setPlacing(true);
                          setError('');
                          try {
                            const res = await fetch(apiUrl('/api/payments/stripe/create-intent'), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', ...authHeaders, ...verifyHeaders },
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
                        {placing ? 'Preparing…' : 'Continue to card payment'}
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
                          if (requireLogin()) throw new Error('Please log in to check out');
                          if (requireWithinLimit()) throw new Error('Cart exceeds the 5-item limit — please contact our seller');
                          const v = validateForm();
                          if (v) {
                            setError(v);
                            throw new Error(v);
                          }
                          setError('');
                          const res = await fetch(apiUrl('/api/payments/paypal/create-order'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders, ...verifyHeaders },
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
                        if (requireLogin()) return;
                        if (requireWithinLimit()) return;
                        const v = validateForm();
                        if (v) return setError(v);
                        setPlacing(true);
                        setError('');
                        try {
                          const res = await fetch(apiUrl('/api/orders'), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeaders, ...verifyHeaders },
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
                  </div>{/* /pay gate — methods + manual all need the OTP token */}
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
