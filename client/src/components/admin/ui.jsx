// Shared admin UI atoms — plain back-office styling.
export const SHAPE_NAMES = ['Round', 'Princess', 'Cushion', 'Oval', 'Pear', 'Emerald', 'Marquise', 'Asscher', 'Heart'];
export const RING_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9'];
export const RING_CATEGORIES = ['rings', 'solitaire-rings', 'halo-rings', 'engagement-rings', 'three-stone-rings', 'bands'];
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

export function Field({ label, children, hint }) {
  return (
    <label className="block" style={{ marginBottom: '14px' }}>
      <span className="block text-xs font-medium uppercase tracking-wider text-gray-600" style={{ marginBottom: '6px' }}>
        {label}
      </span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputCls = 'w-full bg-white border border-[#d9d9d9] rounded text-sm';
export const inputStyle = { padding: '10px 12px', color: '#222' };

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
            {head.map((h) => (
              <th key={h} className="font-medium" style={{ padding: '10px 12px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const td = { padding: '10px 12px', borderTop: '1px solid #f0f0f0', verticalAlign: 'top' };

export function ErrorMsg({ error }) {
  if (!error) return null;
  return <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded" style={{ padding: '10px 12px', marginBottom: '14px' }}>{error}</p>;
}
