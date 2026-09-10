/* Shared dual-thumb range slider (collection + diamond tool).
   Track 6px #f5f5f5, fill `color`, 14px round thumbs that scale on hover.
   `lightThumbs`: white thumbs with dark edge (diamond tool style). */
export default function RangeSlider({ min, max, step = 1, lo, hi, onChange, color = '#222', lightThumbs = false }) {
  const loPct = ((lo - min) / (max - min)) * 100;
  const hiPct = ((hi - min) / (max - min)) * 100;
  return (
    <div>
      <div className="relative" style={{ height: '14px' }}>
        <div className="absolute w-full" style={{ top: '4px', height: '6px', background: '#f5f5f5', borderRadius: '3px' }} />
        <div className="absolute" style={{ left: `${loPct}%`, right: `${100 - hiPct}%`, top: '4px', height: '6px', background: color, borderRadius: '3px' }} />
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)}
          aria-label="Minimum value"
          className="range-thumb" style={{ zIndex: lo > min + (max - min) / 2 ? 5 : 3 }}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))}
          aria-label="Maximum value"
          className="range-thumb" style={{ zIndex: 4 }}
        />
      </div>
      <style>{`
        input[type=range].range-thumb { position: absolute; inset: 0; width: 100%; appearance: none; -webkit-appearance: none; background: transparent; pointer-events: none; margin: 0; height: 14px; }
        input[type=range].range-thumb::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: ${lightThumbs ? '#fff' : color}; border: ${lightThumbs ? `1px solid ${color}` : 'none'}; pointer-events: auto; cursor: pointer; transition: transform .2s ease; }
        input[type=range].range-thumb::-webkit-slider-thumb:hover { transform: scale(1.3); }
        input[type=range].range-thumb::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: ${lightThumbs ? '#fff' : color}; border: ${lightThumbs ? `1px solid ${color}` : 'none'}; pointer-events: auto; cursor: pointer; }
        input[type=range].range-thumb::-moz-range-track { background: transparent; }
      `}</style>
    </div>
  );
}
