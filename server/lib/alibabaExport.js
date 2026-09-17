// Column headers match row 3 of Alibaba's official bulk-upload template
// (server/assets/Alibaba default template (recommended).xlsx) exactly, in
// the same order, so exported rows can be pasted straight into that sheet
// starting at row 5. SPU ID + SKU code/pricing/attribute 1 are populated to
// group a product's 3 karat-tier exports as one listing with 3 SKU
// variants (see buildAlibabaCsv). Remaining columns we don't populate
// (tiered/range pricing, shipping template, product dimensions) are left
// blank for the admin to fill in manually before uploading.
const CSV_HEADERS = [
  'Product title', 'Product image 1', 'Product image 2', 'Product image 3', 'Product image 4',
  'Product image 5', 'Product image 6', 'Product description', 'Place of origin', 'Brand name',
  'Category', 'Product attribute name 1', 'Product attribute value 1', 'Product attribute name 2',
  'Product attribute value 2', 'Product attribute name 3', 'Product attribute value 3',
  'Product attribute name 4', 'Product attribute value 4', 'Product attribute name 5',
  'Product attribute value 5', 'Sell product by', 'Batch quantity', 'Unit', 'Currency',
  'Pricing type', 'Inventory', 'SPU ID (Model number)', 'SKU code', 'SKU pricing',
  'SKU attribute name 1', 'SKU attribute value 1', 'SKU attribute name 2', 'SKU attribute value 2',
  'SKU attribute name 3', 'SKU attribute value 3', 'SKU attribute name 4', 'SKU attribute value 4',
  'Tiered pricing 1', 'MOQ 1', 'Tiered pricing 2', 'MOQ 2', 'Tiered pricing 3', 'MOQ 3',
  'Range pricing (Lower limit)', 'Range pricing (Higher limit)', 'Gross weight (KG)',
  'Shipping template name', 'Shipping quantity 1', 'Estimated shipping lead time 1',
  'Shipping quantity 2', 'Estimated shipping lead time 2', 'Shipping quantity 3',
  'Estimated shipping lead time 3', 'Product size-Length', 'Product size-Width', 'Product size-Height',
];

const BRAND_NAME = 'EtherStar Jewels';

function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toAbsoluteImageUrl(image, publicApiBase) {
  if (!image) return '';
  if (/^https?:\/\//i.test(image)) return image;
  return `${publicApiBase.replace(/\/$/, '')}${image}`;
}

// Karat price tiers — every product stores a 10KT base `price` plus
// `kt14Delta`/`kt18Delta` (same fields that power the storefront's PDP
// karat toggle). One export call = one tier's price for every row.
function tierPrice(p, tier) {
  if (tier === '14KT') return p.price + (p.kt14Delta || 0);
  if (tier === '18KT') return p.price + (p.kt18Delta || 0);
  return p.price;
}

function buildAlibabaCsv(products, publicApiBase, tier = '10KT') {
  const rows = [CSV_HEADERS];
  for (const p of products) {
    const images = Array.isArray(p.images) ? p.images : [];
    const a = p.alibaba || {};
    rows.push([
      p.name,
      toAbsoluteImageUrl(images[0], publicApiBase),
      toAbsoluteImageUrl(images[1], publicApiBase),
      toAbsoluteImageUrl(images[2], publicApiBase),
      toAbsoluteImageUrl(images[3], publicApiBase),
      toAbsoluteImageUrl(images[4], publicApiBase),
      toAbsoluteImageUrl(images[5], publicApiBase),
      p.shortDescription || p.description || '',
      a.origin || '',
      BRAND_NAME,
      a.category || '',
      a.attr1Name || '', a.attr1Value || '',
      a.attr2Name || '', a.attr2Value || '',
      a.attr3Name || '', a.attr3Value || '',
      a.attr4Name || '', a.attr4Value || '',
      a.attr5Name || '', a.attr5Value || '',
      'unit', // Sell product by — batch selling isn't modeled on the site
      '', // Batch quantity — only used when selling by batch
      a.unit || 'Piece/Pieces',
      'USD',
      'SKU pricing', // one row per product per karat tier
      p.stockQty ?? '',
      p.styleCode || '', // SPU ID — shared across the 3 tier exports so Alibaba groups them as one listing with 3 SKU variants
      `${p.styleCode || p._id}-${tier}`, // SKU code — unique per karat tier
      tierPrice(p, tier),
      'Karat', tier, '', '', '', '', '', '', // SKU attribute 1 = Karat/tier; 2-4 unused
      '', '', '', '', '', '', '', '', // Tiered pricing 1-3 + MOQ 1-3 + range pricing lower/higher — unused (pricing type is SKU pricing)
      a.grossWeightKg ?? '',
      '', // Shipping template name — set up in the Alibaba seller account, fill in manually
      1, // Shipping quantity 1
      a.leadTimeDays ?? p.details?.deliveryDays ?? '',
      '', '', '', '', // Shipping quantity/lead time 2-3 — unused
      '', '', '', // Product size L/W/H — not tracked on the site
    ]);
  }
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
}

module.exports = { buildAlibabaCsv };
