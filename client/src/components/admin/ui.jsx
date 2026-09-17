// Shared admin UI atoms — plain back-office styling.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';

export const SHAPE_NAMES = ['Round', 'Princess', 'Cushion', 'Oval', 'Pear', 'Emerald', 'Marquise', 'Asscher', 'Heart', 'Radiant'];
export const RING_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];
export const RING_CATEGORIES = ['rings', 'solitaire-rings', 'halo-rings', 'engagement-rings', 'three-stone-rings', 'bands'];
// Diamond color grades D (colorless) to N — mirrors server/config/catalog.js DIAMOND_COLORS.
export const DIAMOND_COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
// Diamond clarity grades IF (best) to I3 — mirrors server/config/catalog.js DIAMOND_CLARITY.
export const DIAMOND_CLARITY = ['IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'];
export const isRingCategory = (c) => RING_CATEGORIES.includes(c);

export function PageHead({ title, sub, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3" style={{ marginBottom: '20px' }}>
      <div>
        <h1 className="font-heading" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{title}</h1>
        {sub && <p className="text-sm text-gray-500">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children }) {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded" style={{ padding: '16px' }}>
      {children}
    </div>
  );
}

export function Field({ label, children, hint, info }) {
  return (
    <label className="block" style={{ marginBottom: '14px' }}>
      <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
        {label}
        {info && (
          <span title={info} className="inline-flex normal-case tracking-normal flex-shrink-0">
            <Info size={13} className="text-gray-400" aria-label={info} />
          </span>
        )}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full bg-white border border-[#d9d9d9] rounded text-sm';
export const inputStyle = { padding: '10px 12px', color: '#222' };

// Multi-select dropdown: closed button showing a "N selected" summary, opens
// a checkbox-list panel. The only "pick several" idiom elsewhere in the admin
// panel is inline checkbox grids, which don't fit a single form field's slot.
export function MultiSelectDropdown({ options, values, onChange, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  const summary = values.length
    ? `${values.length} selected`
    : placeholder;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputCls} text-left flex items-center justify-between gap-2`}
        style={inputStyle}
      >
        <span className={values.length ? '' : 'text-gray-400'}>{summary}</span>
        <span className="text-gray-400 flex-shrink-0">▾</span>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-10 bg-white border border-[#d9d9d9] rounded shadow-sm overflow-y-auto"
          style={{ top: 'calc(100% + 4px)', left: 0, right: 0, maxHeight: '240px', padding: '6px' }}
        >
          {options.length === 0 ? (
            <p className="text-xs text-gray-400" style={{ padding: '6px 8px' }}>No options.</p>
          ) : (
            options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm rounded hover:bg-gray-50 cursor-pointer" style={{ padding: '6px 8px' }}>
                <input type="checkbox" checked={values.includes(opt.value)} onChange={() => toggle(opt.value)} />
                {opt.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function Pill({ value, map }) {
  const colors = {
    active: 'bg-green-100 text-green-800',
    draft: 'bg-yellow-100 text-yellow-800',
    archived: 'bg-gray-200 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    new: 'bg-blue-100 text-blue-800',
    replied: 'bg-green-100 text-green-800',
    closed: 'bg-gray-200 text-gray-600',
    confirmed: 'bg-blue-100 text-blue-800',
    making: 'bg-yellow-100 text-yellow-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-200 text-gray-600',
  };
  const label = (map && map[value]) || value;
  return (
    <span className={`inline-block text-xs font-medium rounded px-2 py-0.5 ${colors[value] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}

export function Table({ head, children }) {
  return (
    <div className="bg-white border border-[#e5e5e5] rounded overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: '640px' }}>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-[#e5e5e5]">
            {head.map((h, i) => (
              <th key={i} className="font-medium" style={{ padding: '10px 12px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = { padding: '10px 12px', borderTop: '1px solid #f0f0f0', verticalAlign: 'top' };

// Icon-only row action (Edit/Archive/Delete across every admin list table).
// `to` renders a Link (navigate to an edit page); omit it for an inline
// onClick action. `tone="danger"` is for anything that removes/hides a
// record from the storefront (archive, delete) — plain pencil-gray otherwise.
export function RowIconButton({ icon: Icon, label, onClick, to, tone = 'default', disabled, size = 16 }) {
  const toneCls = tone === 'danger' ? 'text-red-700 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100';
  const cls = `inline-flex items-center justify-center rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneCls}`;
  const style = { width: '30px', height: '30px' };
  if (to) {
    return (
      <Link to={to} title={label} aria-label={label} className={cls} style={style}>
        <Icon size={size} />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className={cls} style={style}>
      <Icon size={size} />
    </button>
  );
}

export function ErrorMsg({ error }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded" style={{ padding: '10px 12px', marginBottom: '14px' }}>{error}</p>;
}
