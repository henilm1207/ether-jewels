const isMailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

// Outbound email via Resend (free 3k/mo). Direct REST, no SDK dep.
// Unconfigured → skipped gracefully (checkout/payments never depend on mail).
async function sendMail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) {
    console.warn('mail skipped: RESEND_API_KEY/MAIL_FROM not set');
    return { skipped: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    // Logged server-side only (pm2 logs) — the public error stays generic.
    console.error(`resend send failed (${res.status}): ${txt.slice(0, 300)}`);
    throw Object.assign(new Error(`Email send failed (${res.status})`), { status: 502, detail: txt.slice(0, 200) });
  }
  return res.json();
}

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Order confirmation mail — fired from onPaymentSuccess (fire-and-forget).
function orderConfirmationHtml(order) {
  const id = String(order._id).slice(-8).toUpperCase();
  const rows = (order.items || [])
    .map(
      (it) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(it.name)}${it.size ? ` (size ${esc(it.size)})` : ''} × ${it.qty}<br><span style="color:#888;font-size:12px;">${esc(it.metal && it.metal.karat)} ${esc(it.metal && it.metal.color)}</span></td><td align="right" style="padding:8px 0;border-bottom:1px solid #eee;">$${Number(it.lineTotal).toFixed(2)}</td></tr>`
    )
    .join('');
  const a = order.shippingAddress || {};
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h2 style="letter-spacing:1px;">ETHERSTAR JEWELS</h2>
    <p>Thank you — your payment was successful and order <strong>#${id}</strong> is confirmed.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <p style="font-size:16px;"><strong>Total paid: $${Number(order.pricing.total).toFixed(2)} USD</strong></p>
    <p style="font-size:13px;color:#555;">Shipping to: ${esc(a.fullName)}, ${esc(a.line1)}, ${esc(a.city)} ${esc(a.zip)}, ${esc(a.country)}</p>
    <p style="font-size:13px;color:#555;">Your tracking id will appear in <strong>My Account → Orders</strong> once dispatched. Track it there — no need to reply to this mail.</p>
    <p style="font-size:12px;color:#888;">Questions? WhatsApp +91 9725756046 · etherstarjewels@gmail.com</p>
  </div>`;
}

function sendOrderConfirmation(order) {
  const to = order && order.contact && order.contact.email;
  if (!to) return Promise.resolve({ skipped: true });
  return sendMail({
    to,
    subject: `Order #${String(order._id).slice(-8).toUpperCase()} confirmed — EtherStar Jewels`,
    html: orderConfirmationHtml(order),
  }).catch((e) => {
    // Mail must never fail a paid order — log with the order id for retry.
    console.error(`order mail failed for ${order._id}:`, e.message);
    return { failed: true };
  });
}

// Welcome coupon mail — fired from POST /api/newsletter/subscribe (fire-and-forget;
// the code is also returned in the API response so the popup shows it immediately).
function welcomeCouponHtml(code) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222;">
    <h2 style="letter-spacing:1px;">ETHERSTAR JEWELS</h2>
    <p>Welcome! Here's your code for <strong>5% off your first order</strong>:</p>
    <p style="font-size:20px;font-weight:bold;letter-spacing:2px;padding:12px 16px;background:#f7f2ef;display:inline-block;">${esc(code)}</p>
    <p style="font-size:13px;color:#555;">Enter it at checkout. One-time use, valid for 30 days.</p>
  </div>`;
}

function sendWelcomeCoupon(email, code) {
  if (!email || !code) return Promise.resolve({ skipped: true });
  return sendMail({
    to: email,
    subject: 'Your 5% welcome discount — EtherStar Jewels',
    html: welcomeCouponHtml(code),
  }).catch((e) => {
    console.error(`welcome coupon mail failed for ${email}:`, e.message);
    return { failed: true };
  });
}

module.exports = { sendMail, sendOrderConfirmation, orderConfirmationHtml, sendWelcomeCoupon, isMailConfigured };
