const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authRequired, requireAdmin } = require('../middleware/auth');

const router = express.Router();
// Failover chain: env pin first, then newest stable flash models.
// Verified live against this project's key — 2.5-flash 404s for new
// accounts, so it is deliberately excluded.
const MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
].filter((m, i, arr) => typeof m === 'string' && m.trim() && arr.indexOf(m) === i);
const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;

// Hard caps matching Product schema / SEO best practice
const CAPS = { name: 80, shortDescription: 120, description: 1200, seoTitle: 60, seoDesc: 160 };

const SYSTEM_PROMPT = `You are the senior copywriter for EtherStar Jewels, a lab-grown diamond jewelry house.
Voice: elegant, confident, warm. Short sentences. No hype words like "stunning" more than once.
Facts you may state: lab-grown certified diamonds, handcrafted settings, USD pricing decided separately (never invent prices).
Always return JSON only with exactly these keys: name, shortDescription, description, seoTitle, seoDesc.
- name: product display name, no price, no "USD".
- shortDescription: one line shown under the title.
- description: 2-3 sentences for the product page.
- seoTitle: <=60 chars, includes main keywords.
- seoDesc: <=160 chars, click-worthy search snippet.`;

async function fetchImage(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`Image fetch failed (${res.status})`);
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!type.startsWith('image/')) throw new Error('URL is not an image');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error('Image exceeds 5MB');
    return { bytes: buf.toString('base64'), mimeType: type };
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/ai/describe — Gemini vision copywriter (admin only)
router.post('/describe', authRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: 'AI copywriter not configured — add GEMINI_API_KEY' });
    }
    const { images, category = '', shape = '', variants = [] } = req.body || {};
    const urls = Array.isArray(images) ? images.filter((u) => typeof u === 'string' && u.trim()).slice(0, MAX_IMAGES) : [];
    if (!urls.length) return res.status(400).json({ message: 'At least one product image URL required' });

    let parts;
    try {
      parts = await Promise.all(urls.map(fetchImage));
    } catch (e) {
      return res.status(400).json({ message: e.message || 'Could not read product images' });
    }

    const context = [
      category ? `Category: ${String(category).slice(0, 40)}` : null,
      shape ? `Diamond shape: ${String(shape).slice(0, 20)}` : null,
      Array.isArray(variants) && variants.length
        ? `Metals offered: ${variants.map((v) => String((v && (v.material || v.name)) || '').slice(0, 30)).filter(Boolean).join(', ').slice(0, 120)}`
        : null,
    ].filter(Boolean).join('\n');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const contents = [
      ...parts.map((p) => ({ inlineData: { data: p.bytes, mimeType: p.mimeType } })),
      { text: `Write the product copy for this jewelry piece.\n${context}\nReturn JSON only.` },
    ];

    // Fail over immediately (no sleep): 503/429/500/retired-model usually
    // means the next pool is healthy. Auth/bad-request/safety fail fast.
    let text = null;
    let servingModel = null;
    let lastError = null;
    const started = Date.now();
    for (const name of MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: name,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        });
        const attemptAt = Date.now();
        const result = await model.generateContent(contents);
        try {
          text = result.response.text();
        } catch {
          lastError = new Error('unusable copy');
          console.warn(`AI describe: ${name} returned unreadable output, trying next model`);
          continue;
        }
        servingModel = name;
        console.log(`AI describe: ${urls.length} images via ${name} in ${Date.now() - attemptAt}ms`);
        break;
      } catch (e) {
        lastError = e;
        const msg = (e && e.message) || '';
        const retryable =
          (e && (e.status === 429 || e.status === 503 || e.status === 500 || e.status === 404)) ||
          /\b(429|503|500|404)\b|quota exceeded|rate limit exceeded|resource exhausted|overloaded|no longer available/i.test(msg);
        console.warn(`AI describe: ${name} failed (${(e && e.status) || 'n/a'})${retryable ? ', trying next model' : ''}`);
        if (!retryable) throw e;
      }
    }
    if (text == null) {
      const msg = (lastError && lastError.message) || '';
      if ((lastError && lastError.status === 429) || /\b429\b|quota exceeded|rate limit exceeded|resource exhausted/i.test(msg))
        return res.status(429).json({ message: 'AI is busy — wait a minute and retry' });
      if ((lastError && lastError.status === 503) || /\b503\b|overloaded/i.test(msg))
        return res.status(503).json({ message: 'AI models are busy — try again in a moment' });
      if (lastError) throw lastError;
      return res.status(502).json({ message: 'AI returned unusable copy — try again' });
    }
    console.log(`AI describe: done in ${Date.now() - started}ms`);

    let parsed;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
    } catch {
      return res.status(502).json({ message: 'AI returned unusable copy — try again' });
    }
    const fields = {};
    for (const [key, cap] of Object.entries(CAPS)) {
      const v = typeof parsed[key] === 'string' ? parsed[key].trim() : '';
      if (v) fields[key] = v.slice(0, cap);
    }
    if (!Object.keys(fields).length)
      return res.status(502).json({ message: 'AI returned empty copy — try again' });

    res.json({ fields, filled: Object.keys(fields), model: servingModel });
  } catch (e) {
    const msg = (e && e.message) || '';
    if ((e && e.status === 429) || /\b429\b|quota exceeded|rate limit exceeded|resource exhausted/i.test(msg))
      return res.status(429).json({ message: 'AI is busy — wait a minute and retry' });
    next(e);
  }
});

module.exports = router;
