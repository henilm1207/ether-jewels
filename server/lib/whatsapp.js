// WhatsApp OTP sender (Meta Cloud API). Billed per authentication template
// outside service windows (pennies at this scale); sandbox test numbers free.
// Requires WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID + an approved auth
// template name in WHATSAPP_TEMPLATE — without these it 503s honestly.
async function sendWhatsAppOtp(phone, code) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE;
  if (!token || !phoneId || !template) {
    const err = new Error('WhatsApp OTP not configured yet');
    err.status = 503;
    throw err;
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en_US' },
        components: [{ type: 'body', parameters: [{ type: 'text', text: String(code) }] }],
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw Object.assign(new Error('WhatsApp send failed'), { status: 502, detail: txt.slice(0, 200) });
  }
  return res.json();
}

module.exports = { sendWhatsAppOtp };
