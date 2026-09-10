import { useState } from 'react';
import { Link } from 'react-router-dom';
import { shapes } from '../data/products';
import RangeSlider from '../components/filters/RangeSlider';

// Diamond search tool styled like the live Nivoda panel.
// Filter state is API-ready (shape, carat/price/table/ratio min-max, color,
// clarity, cut, polish, symmetry, fluorescence, cert). No live feed is
// connected yet, so the results slot renders Coming Soon.

const WINE = '#37181d';

const BAR_SHAPES = ['Round', 'Princess', 'Cushion', 'Oval', 'Pear', 'Emerald'];
const MORE_SHAPES = ['Marquise', 'Heart'];
const COLORS = ['K', 'J', 'I', 'H', 'G', 'F', 'E', 'D'];
const CLARITY = ['VS2', 'VS1', 'VVS2', 'VVS1', 'IF', 'FL'];
const CUTS = ['Very Good', 'Excellent', 'Ideal'];
const POLISH = ['Good', 'Very Good', 'Excellent'];
const SYMMETRY = ['Good', 'Very Good', 'Excellent'];
const FLUOR = ['NON', 'FNT', 'MED', 'VST'];
const CERTS = ['GIA', 'IGI', 'WISE'];

const CARAT_MIN = 1;
const CARAT_MAX = 30;
const PRICE_MIN = 1;
const PRICE_MAX = 5000000;

function FilterLabel({ children, action }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
      <h3 className="font-heading" style={{ fontSize: '13px', letterSpacing: '2px', marginBottom: 0 }}>
        {children}
      </h3>
      {action}
    </div>
  );
}

/* Segmented scale bar — single bordered container, filled active segments */
function Segmented({ options, selected, onToggle }) {
  return (
    <div className="flex overflow-hidden" style={{ border: `1px solid ${WINE}`, borderRadius: '10px', background: '#fff' }}>
      {options.map((opt, i) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            aria-pressed={active}
            className="flex-1 transition-colors"
            style={{
              padding: '12px 4px',
              fontSize: '13px',
              fontWeight: 500,
              background: active ? WINE : 'transparent',
              color: active ? '#fff' : '#222',
              borderLeft: i === 0 ? 'none' : `1px solid ${WINE}`,
              whiteSpace: 'nowrap',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ValueBox({ value, onChange, unit, prefix, ariaLabel, step = 'any', min }) {
  return (
    <label
      className="flex items-center flex-1 bg-white"
      style={{ height: '46px', border: '1px solid #d9d9d9', borderRadius: '8px', padding: '0 14px' }}
    >
      {prefix && <span className="text-[15px] text-gray-500">{prefix}</span>}
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-transparent text-[15px] focus:outline-none"
        style={{ textAlign: 'right' }}
      />
      {unit && <span className="text-[15px] text-gray-500" style={{ marginLeft: '6px' }}>{unit}</span>}
    </label>
  );
}

export default function Diamond() {
  const [advOpen, setAdvOpen] = useState(true);
  const [moreShapes, setMoreShapes] = useState(false);
  const [whiteFancy, setWhiteFancy] = useState('WHITE');
  const [selectedShapes, setSelectedShapes] = useState([]);
  const [carat, setCarat] = useState([CARAT_MIN, CARAT_MAX]);
  const [caratFrom, setCaratFrom] = useState('');
  const [caratTo, setCaratTo] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [colors, setColors] = useState([]);
  const [clarity, setClarity] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [table, setTable] = useState([0, 100]);
  const [tableFrom, setTableFrom] = useState('');
  const [tableTo, setTableTo] = useState('');
  const [ratio, setRatio] = useState([0.8, 3]);
  const [ratioFrom, setRatioFrom] = useState('');
  const [ratioTo, setRatioTo] = useState('');
  const [polish, setPolish] = useState([]);
  const [symmetry, setSymmetry] = useState([]);
  const [fluor, setFluor] = useState([]);
  const [certs, setCerts] = useState([]);

  const toggle = (list, setList, value) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const shapeByName = (name) => shapes.find((s) => s.name === name);
  const visibleShapes = [...BAR_SHAPES, ...(moreShapes ? MORE_SHAPES : [])]
    .map(shapeByName)
    .filter(Boolean);

  const caratLo = caratFrom !== '' ? Math.max(CARAT_MIN, Math.min(CARAT_MAX, Number(caratFrom))) : carat[0];
  const caratHi = caratTo !== '' ? Math.max(CARAT_MIN, Math.min(CARAT_MAX, Number(caratTo))) : carat[1];
  const priceLo = priceFrom !== '' ? Math.max(PRICE_MIN, Math.min(PRICE_MAX, Number(priceFrom))) : PRICE_MIN;
  const priceHi = priceTo !== '' ? Math.max(PRICE_MIN, Math.min(PRICE_MAX, Number(priceTo))) : PRICE_MAX;
  const tableLo = tableFrom !== '' ? Math.max(0, Math.min(100, Number(tableFrom))) : table[0];
  const tableHi = tableTo !== '' ? Math.max(0, Math.min(100, Number(tableTo))) : table[1];
  const ratioLo = ratioFrom !== '' ? Math.max(0.8, Math.min(3, Number(ratioFrom))) : ratio[0];
  const ratioHi = ratioTo !== '' ? Math.max(0.8, Math.min(3, Number(ratioTo))) : ratio[1];

  const fmt = (n) => Number(n).toLocaleString('en-US');

  return (
    <section className="py-8 md:py-12">
      <div className="container">
        {/* LAB GROWN tab title */}
        <div className="text-center" style={{ marginBottom: '32px' }}>
          <h2 className="font-heading" style={{ fontSize: '20px', letterSpacing: '3px', marginBottom: '8px' }}>
            Lab Grown
          </h2>
          <div className="mx-auto" style={{ width: '64px', height: '2px', background: WINE }} />
        </div>

        {/* Main 2-column tool grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '40px 48px' }}>
          {/* LEFT */}
          <div>
            <div style={{ marginBottom: '32px' }}>
              <FilterLabel>Shape</FilterLabel>
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6" style={{ gap: '10px' }}>
                {visibleShapes.map((shape) => {
                  const active = selectedShapes.includes(shape.name);
                  return (
                    <button
                      key={shape.slug}
                      onClick={() => toggle(selectedShapes, setSelectedShapes, shape.name)}
                      aria-pressed={active}
                      className="flex flex-col items-center transition-colors"
                      style={{
                        padding: '12px 4px 10px',
                        border: active ? `1px solid ${WINE}` : '1px solid #e2e2e2',
                        borderRadius: '10px',
                        background: active ? WINE : '#fff',
                        color: active ? '#fff' : '#222',
                      }}
                    >
                      <span className="flex items-center justify-center" style={{ width: '44px', height: '44px', marginBottom: '6px' }}>
                        <img
                          src={shape.image}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-contain"
                          style={active ? { filter: 'brightness(0) invert(1)' } : undefined}
                        />
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: active ? 700 : 500 }}>{shape.name}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setMoreShapes(!moreShapes)}
                className="inline-flex items-center gap-1 text-[13px] hover:opacity-70"
                style={{ marginTop: '12px' }}
                aria-expanded={moreShapes}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${moreShapes ? 'rotate-180' : ''}`}>
                  <path d="M2 4l4 4 4-4" />
                </svg>
                {moreShapes ? 'Fewer Shapes' : 'More Shapes'}
              </button>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <FilterLabel
                action={
                  <span className="flex overflow-hidden" style={{ border: '1px solid #d9d9d9', borderRadius: '8px' }} role="group" aria-label="Diamond type">
                    {['WHITE', 'FANCY'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setWhiteFancy(t)}
                        aria-pressed={whiteFancy === t}
                        style={{
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 500,
                          letterSpacing: '1px',
                          background: whiteFancy === t ? '#e5e5e5' : 'transparent',
                          color: '#222',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </span>
                }
              >
                Colour
              </FilterLabel>
              <Segmented options={COLORS} selected={colors} onToggle={(v) => toggle(colors, setColors, v)} />
            </div>

            <div>
              <FilterLabel>Cut</FilterLabel>
              <Segmented options={CUTS} selected={cuts} onToggle={(v) => toggle(cuts, setCuts, v)} />
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div style={{ marginBottom: '32px' }}>
              <FilterLabel>Carats</FilterLabel>
              <RangeSlider min={CARAT_MIN} max={CARAT_MAX} step={0.1} lo={caratLo} hi={caratHi} color={WINE} lightThumbs
                onChange={(lo, hi) => { setCarat([lo, hi]); setCaratFrom(''); setCaratTo(''); }} />
              <div className="flex" style={{ gap: '12px', marginTop: '12px' }}>
                <ValueBox value={caratFrom !== '' ? caratFrom : carat[0]} min={CARAT_MIN} step={0.1} ariaLabel="Min carats" unit="ct"
                  onChange={(v) => { setCaratFrom(v); if (v !== '') setCarat([Math.min(Number(v), carat[1]), carat[1]]); }} />
                <ValueBox value={caratTo !== '' ? caratTo : carat[1]} min={CARAT_MIN} step={0.1} ariaLabel="Max carats" unit="ct"
                  onChange={(v) => { setCaratTo(v); if (v !== '') setCarat([carat[0], Math.max(Number(v), carat[0])]); }} />
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <FilterLabel>Clarity</FilterLabel>
              <Segmented options={CLARITY} selected={clarity} onToggle={(v) => toggle(clarity, setClarity, v)} />
            </div>

            <div>
              <FilterLabel>Price</FilterLabel>
              <RangeSlider min={PRICE_MIN} max={PRICE_MAX} step={100} lo={priceLo} hi={priceHi} color={WINE} lightThumbs
                onChange={(lo, hi) => { setPriceFrom(lo === PRICE_MIN ? '' : String(lo)); setPriceTo(hi === PRICE_MAX ? '' : String(hi)); }} />
              <div className="flex items-center" style={{ gap: '12px', marginTop: '12px' }}>
                <ValueBox value={priceFrom !== '' ? fmt(priceFrom) : fmt(PRICE_MIN)} ariaLabel="Min price" prefix="$"
                  onChange={(v) => setPriceFrom(v.replace(/,/g, ''))} />
                <span className="text-gray-400">–</span>
                <ValueBox value={priceTo !== '' ? fmt(priceTo) : fmt(PRICE_MAX)} ariaLabel="Max price" prefix="$"
                  onChange={(v) => setPriceTo(v.replace(/,/g, ''))} />
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div style={{ borderTop: '1px solid #ededed', marginTop: '40px', paddingTop: '24px' }}>
          <button
            onClick={() => setAdvOpen(!advOpen)}
            aria-expanded={advOpen}
            className="inline-flex items-center gap-2 hover:opacity-70"
            style={{ fontSize: '15px', fontWeight: 600 }}
          >
            Advanced Filters
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-transform ${advOpen ? 'rotate-180' : ''}`}>
              <path d="M2 4l4 4 4-4" />
            </svg>
          </button>

          {advOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '32px 48px', marginTop: '24px' }}>
              <div>
                <FilterLabel>Table</FilterLabel>
                <RangeSlider min={0} max={100} step={1} lo={tableLo} hi={tableHi} color={WINE} lightThumbs
                  onChange={(lo, hi) => { setTable([lo, hi]); setTableFrom(''); setTableTo(''); }} />
                <div className="flex" style={{ gap: '12px', marginTop: '12px' }}>
                  <ValueBox value={tableFrom !== '' ? tableFrom : table[0]} ariaLabel="Min table percent"
                    onChange={(v) => { setTableFrom(v); if (v !== '') setTable([Math.min(Number(v), table[1]), table[1]]); }} />
                  <ValueBox value={tableTo !== '' ? tableTo : table[1]} ariaLabel="Max table percent"
                    onChange={(v) => { setTableTo(v); if (v !== '') setTable([table[0], Math.max(Number(v), table[0])]); }} />
                </div>
              </div>
              <div>
                <FilterLabel>Ratio</FilterLabel>
                <RangeSlider min={0.8} max={3} step={0.1} lo={ratioLo} hi={ratioHi} color={WINE} lightThumbs
                  onChange={(lo, hi) => { setRatio([lo, hi]); setRatioFrom(''); setRatioTo(''); }} />
                <div className="flex" style={{ gap: '12px', marginTop: '12px' }}>
                  <ValueBox value={ratioFrom !== '' ? ratioFrom : ratio[0].toFixed(1)} ariaLabel="Min ratio" step={0.1}
                    onChange={(v) => { setRatioFrom(v); if (v !== '') setRatio([Math.min(Number(v), ratio[1]), ratio[1]]); }} />
                  <ValueBox value={ratioTo !== '' ? ratioTo : ratio[1].toFixed(1)} ariaLabel="Max ratio" step={0.1}
                    onChange={(v) => { setRatioTo(v); if (v !== '') setRatio([ratio[0], Math.max(Number(v), ratio[0])]); }} />
                </div>
              </div>
              <div>
                <FilterLabel>Polish</FilterLabel>
                <Segmented options={POLISH} selected={polish} onToggle={(v) => toggle(polish, setPolish, v)} />
              </div>
              <div>
                <FilterLabel>Symmetry</FilterLabel>
                <Segmented options={SYMMETRY} selected={symmetry} onToggle={(v) => toggle(symmetry, setSymmetry, v)} />
              </div>
              <div>
                <FilterLabel>Fluorescence</FilterLabel>
                <Segmented options={FLUOR} selected={fluor} onToggle={(v) => toggle(fluor, setFluor, v)} />
              </div>
              <div>
                <FilterLabel>Certificate</FilterLabel>
                <Segmented options={CERTS} selected={certs} onToggle={(v) => toggle(certs, setCerts, v)} />
              </div>
            </div>
          )}
        </div>

        {/* Results slot — Coming Soon until the live feed lands */}
        <div id="diamond-results" className="text-center bg-[#f7f2ef]" style={{ padding: '80px 24px', marginTop: '48px' }}>
          <h2 className="font-heading coming-soon-title" style={{ color: '#222', marginBottom: '16px' }}>
            Coming Soon
          </h2>
          <p className="text-gray-600 mx-auto" style={{ fontSize: '15px', lineHeight: 1.7, maxWidth: '480px', marginBottom: '32px' }}>
            Our diamond search is launching soon — browse our certified settings in the meantime.
          </p>
          <Link to="/collections/rings" className="btn btn--primary">
            Shop Settings
          </Link>
        </div>

      </div>
      <style>{`
        .coming-soon-title { font-size: 42px; line-height: 1.15; }
        @media (min-width: 768px) { .coming-soon-title { font-size: 64px; } }
      `}</style>
    </section>
  );
}
