// Static catalog — the simple, always-complete dropdown source for the
// product form. DB extras (quick-added customs) merge in at render time.
// Keep keys in sync with server/scripts/ensure-catalog.js (same tree).
export const VARIANTS = [
  { key: 'rings', name: 'Rings' },
  { key: 'bracelets', name: 'Bracelets' },
  { key: 'necklaces', name: 'Necklaces' },
  { key: 'chains', name: 'Chains' },
  { key: 'earrings', name: 'Earrings' },
  { key: 'hiphop', name: 'Hiphop' },
];

export const SUBS = {
  rings: [
    { key: 'solitaire-rings', name: 'Solitaire Rings' },
    { key: 'halo-rings', name: 'Halo Rings' },
    { key: 'engagement-rings', name: 'Engagement Rings' },
    { key: 'three-stone-rings', name: 'Three Stone Rings' },
    { key: 'bands', name: 'Bands' },
  ],
  bracelets: [
    { key: 'tennis-bracelets', name: 'Tennis Bracelets' },
    { key: 'bangle-bracelets', name: 'Bangle Bracelets' },
  ],
  necklaces: [
    { key: 'tennis-necklaces', name: 'Tennis Necklaces' },
    { key: 'solitaire-necklaces', name: 'Solitaire Necklaces' },
    { key: 'diamond-necklaces', name: 'Diamond Necklaces' },
  ],
  chains: [
    { key: 'cuban-link-chains', name: 'Cuban Link Chains' },
    { key: 'rope-chains', name: 'Rope Chains' },
    { key: 'figaro-chains', name: 'Figaro Chains' },
    { key: 'tennis-chains', name: 'Tennis Chains' },
  ],
  earrings: [
    { key: 'stud-earrings', name: 'Stud Earrings' },
    { key: 'halo-earrings', name: 'Halo Earrings' },
    { key: 'drop-earrings', name: 'Drop Earrings' },
    { key: 'hoop-earrings', name: 'Hoop Earrings' },
  ],
  hiphop: [
    { key: 'hiphop-pendants', name: 'Hiphop Pendants' },
    { key: 'hiphop-chains', name: 'Hiphop Chains' },
    { key: 'hiphop-bracelets', name: 'Hiphop Bracelets' },
  ],
};

// Ring leaves get sizes on the product page; everything else sells without.
export const RING_LEAVES = new Set(SUBS.rings.map((s) => s.key));
