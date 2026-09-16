import { useState } from 'react';
import { adminFetch } from './api';

const AI_FIELDS = ['name', 'shortDescription', 'description', 'seoTitle', 'seoDesc', 'tags'];

// ✨ button for the product IMAGES card: generates copy from the first 3
// images + category/shape/metal context. Fills ONLY blank fields — your
// text is never overwritten. To redo a field, clear it first and re-run.
export default function AiCopyButton({ images, category, shape, variants, current, onFill, setError }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const run = async () => {
    setError('');
    setNote('');
    if (!images.length) {
      setError('Add at least one image first.');
      return;
    }
    setBusy(true);
    try {
      const data = await adminFetch('/api/ai/describe', {
        method: 'POST',
        // Vision + up to 6 model failovers (server/routes/ai.js MODELS) can
        // legitimately run past the client's 30s default under prod load —
        // this isn't a dead server, so give it real headroom before aborting.
        timeoutMs: 75000,
        body: {
          images: images.slice(0, 3),
          category,
          shape,
          variants: (variants || []).map((v) => ({ name: v.name, material: v.material })),
        },
      });
      const fields = data.fields || {};
      const filled = [];
      const kept = [];
      for (const key of AI_FIELDS) {
        if (!fields[key]) continue;
        const existing = (current[key] || '').trim();
        if (existing) kept.push(key);
        else {
          onFill(key, fields[key]);
          filled.push(key);
        }
      }
      if (!filled.length && !kept.length) {
        setError('AI returned nothing usable — try again.');
      } else {
        setNote(
          `✨ Filled ${filled.length ? filled.join(', ') : 'nothing new'}` +
            (kept.length ? ` — kept your ${kept.join(', ')}` : '') +
            (data.model ? ` · via ${data.model}` : '')
        );
      }
    } catch (e) {
      if (e.message.includes('not configured')) {
        setError('AI copywriter not configured — add GEMINI_API_KEY on the server.');
      } else {
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={run}
        disabled={busy || !images.length}
        title="Generate name, descriptions & SEO from your photos. Fills blank fields only — clear a field to redo it."
        className="w-full text-sm font-medium border border-[#222] rounded transition-colors hover:bg-[#222] hover:text-white disabled:opacity-40"
        style={{ padding: '10px 12px' }}
      >
        {busy ? '✨ Writing copy… (can take up to a minute)' : '✨ Generate copy with AI'}
      </button>
      {note && <p role="status" className="text-xs text-green-700 mt-2">{note}</p>}
      {!images.length && <p className="text-xs text-gray-400 mt-1">Add at least one image first.</p>}
    </div>
  );
}
