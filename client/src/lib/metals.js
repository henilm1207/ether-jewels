// Static metal → swatch-color map — single source of truth.
// Admin form auto-fills the swatch from the metal; the collection filter
// and PDP swatches read the same values, so shades can never disagree.
// Existing Collection filter hexes kept exactly; Platinum/Silver added.

export const METALS = [
  { name: 'Yellow Gold', swatch: '#FFD700' },
  { name: 'Rose Gold', swatch: '#E0BFB8' },
  { name: 'White Gold', swatch: '#E8E8E8' },
  { name: 'Platinum', swatch: '#E5E4E2' },
  { name: 'Sterling Silver', swatch: '#C0C0C0' },
];

export const DEFAULT_METAL = METALS[0];

// Resolve any metal/material label to its static swatch hex.
// Case-insensitive keyword match so "14K Rose Gold", "rose", "White Gold"
// all resolve; bare "Gold" falls back to Yellow Gold; unknown → fallback.
export function metalColor(label, fallback = DEFAULT_METAL.swatch) {
  const s = String(label || '').toLowerCase();
  if (!s.trim()) return fallback;
  if (s.includes('rose')) return '#E0BFB8';
  if (s.includes('white')) return '#E8E8E8';
  if (s.includes('yellow')) return '#FFD700';
  if (s.includes('platin')) return '#E5E4E2';
  if (s.includes('silver') || s.includes('sterling')) return '#C0C0C0';
  if (s.includes('gold')) return '#FFD700';
  return fallback;
}
