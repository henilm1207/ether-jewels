import { apiUrl } from '../../config';

// fetch + JSON + throw-on-error for the signed-in account pages.
export async function accountFetch(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(apiUrl(path), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong'), { fields: data.fields });
  return data;
}

export const OPEN_STATUSES = ['pending', 'confirmed', 'making', 'shipped'];
export const orderNo = (o) => String(o._id).slice(-8).toUpperCase();

export const statusStyle = (s) => {
  switch (s) {
    case 'delivered':
      return { background: '#e7f4e7', color: '#1d6b1d' };
    case 'cancelled':
      return { background: '#f6e3e3', color: '#8f1d1d' };
    case 'shipped':
    case 'making':
      return { background: '#e8effc', color: '#1d3f8f' };
    default:
      return { background: '#f7f2ef', color: '#563c22' };
  }
};

export function StatusPill({ status }) {
  return (
    <span className="text-[13px] font-medium rounded-full capitalize" style={{ padding: '3px 12px', ...statusStyle(status) }}>
      {status}
    </span>
  );
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between" style={{ gap: '12px', marginBottom: '24px' }}>
      <div>
        <h1 className="font-heading" style={{ fontSize: 'clamp(1.35rem, 3vw, 1.9rem)', marginBottom: subtitle ? '6px' : 0 }}>{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ kind = 'ok', children }) {
  if (!children) return null;
  const cls = kind === 'error' ? 'text-red-700' : kind === 'warn' ? 'text-amber-700 bg-amber-50 border border-amber-200 rounded' : 'text-green-700';
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`text-sm ${cls}`} style={{ marginBottom: '12px', padding: kind === 'warn' ? '10px 12px' : 0 }}>
      {children}
    </p>
  );
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
