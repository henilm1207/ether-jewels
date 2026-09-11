/* Shared dual-thumb range slider (collection + diamond tool).
   Track 6px #f5f5f5, fill `color`, 14px round thumbs that scale on hover.
   `lightThumbs`: white thumbs with dark edge (diamond tool style). */
export default function RangeSlider({ min, max, step = 1, lo, hi, onChange, color = '#222', lightThumbs = false, label = 'Range' }) {
  const span = max - min;
  const pct = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || !Number.isFinite(span) || span <= 0) return 0;
    return Math.min(100, Math.max(0, ((n - min) / span) * 100));
  };
  const loNum = Number(lo);
  const hiNum = Number(hi);
  const safeLo = Number.isFinite(loNum) ? Math.min(Math.max(loNum, min), max) : min;
  const safeHi = Number.isFinite(hiNum) ? Math.min(Math.max(hiNum, min), max) : max;
  const loPct = pct(safeLo);
  const hiPct = pct(safeHi);
  const thumbBg = lightThumbs ? '#fff' : color;
  const thumbBorder = lightThumbs ? `1px solid ${color}` : 'none';
  return (
    <div>
      <div className="relative" style={{ height: '14px', '--thumb-color': thumbBg, '--thumb-border': thumbBorder }}>
        <div className="absolute w-full" style={{ top: '4px', height: '6px', background: '#f5f5f5', borderRadius: '3px' }} />
        <div className="absolute" style={{ left: `${loPct}%`, right: `${100 - hiPct}%`, top: '4px', height: '6px', background: color, borderRadius: '3px' }} />
        <input
          type="range" min={min} max={max} step={step} value={safeLo}
          onChange={(e) => onChange(Math.min(Number(e.target.value), safeHi), safeHi)}
          aria-label={`${label} minimum`}
          className="range-thumb"
          style={{ zIndex: safeLo > min + span / 2 ? 5 : 3, '--thumb-color': thumbBg, '--thumb-border': thumbBorder }}
        />
        <input
          type="range" min={min} max={max} step={step} value={safeHi}
          onChange={(e) => onChange(safeLo, Math.max(Number(e.target.value), safeLo))}
          aria-label={`${label} maximum`}
          className="range-thumb"
          style={{ zIndex: 4, '--thumb-color': thumbBg, '--thumb-border': thumbBorder }}
        />
      </div>
    </div>
  );
}
