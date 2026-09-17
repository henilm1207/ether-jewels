// General catalog CSV export (every field, admin's own records) — distinct
// from lib/alibabaExport.js, which builds fixed columns matching Alibaba's
// bulk-upload template. Shares the same escaping rule (quote on comma/CR/LF,
// double up embedded quotes) so both files stay Excel/Sheets-safe.
function csvEscape(value) {
  const s = value == null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const CSV_HEADERS = [
  'Name', 'Slug', 'Style code', 'Category', 'Status', 'Shape', 'Shapes',
  'Diamond colors', 'Clarity', 'Price (10KT)', '14KT delta', '18KT delta',
  'Compare at price', 'In stock', 'Stock qty', 'Featured',
  'Metal weight (g)', 'Diamond weight (ct)',
  'Cert authority', 'Cert number', 'Appraisal value', 'Created at',
];

function buildCatalogCsv(products) {
  const rows = [CSV_HEADERS];
  for (const p of products) {
    rows.push(
      [
        p.name,
        p.slug,
        p.styleCode || '',
        p.category,
        p.status,
        p.shape || '',
        (p.shapes || []).join('|'),
        (p.diamondColors || []).join('|'),
        (p.clarity || []).join('|'),
        p.price,
        p.kt14Delta,
        p.kt18Delta,
        p.compareAtPrice ?? '',
        p.inStock,
        p.stockQty,
        p.featured,
        p.details?.metalWeightGrams ?? '',
        p.details?.diamondCaratWeight ?? '',
        p.details?.certAuthority || '',
        p.details?.certNumber || '',
        p.details?.appraisalValue ?? '',
        p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
      ]
        .map(csvEscape)
        .join(',')
    );
  }
  return rows.join('\r\n');
}

module.exports = { buildCatalogCsv };
