import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMyOrders } from './Orders';
import { Notice, OPEN_STATUSES, orderNo, SectionTitle } from './shared';

const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const today = () => new Date().toISOString().slice(0, 10);

// /account/profile — personal details. Email + phone freeze while an
// order is in progress (server-enforced; the courier relies on them).
export default function ProfileDetails() {
  const { user, updateProfile } = useAuth();
  const { orders } = useMyOrders();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user)
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        dob: toInputDate(user.dob),
        anniversary: toInputDate(user.anniversary),
        gender: user.gender || '',
      });
  }, [user]);

  if (!form) return null;
  const openOrder = orders.find((o) => OPEN_STATUSES.includes(o.status));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        ...(openOrder ? {} : { email: form.email.trim(), phone: form.phone.trim() }),
        dob: form.dob || null,
        anniversary: form.anniversary || null,
        gender: form.gender,
      });
      setMsg('Profile saved ✓');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const label = (text, extra) => (
    <span className="block text-[13px] text-gray-700" style={{ marginBottom: '6px' }}>
      {text}
      {extra && <span className="text-gray-400"> {extra}</span>}
    </span>
  );

  return (
    <>
      <SectionTitle title="Personal details" />
      {openOrder && (
        <Notice kind="warn">
          Email and mobile are locked while order #{orderNo(openOrder)} is {openOrder.status} — the courier uses them. You can change them after delivery.
        </Notice>
      )}
      <Notice>{msg}</Notice>
      <Notice kind="error">{error}</Notice>
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '14px' }}>
        <label>{label('First name')}<input value={form.firstName} onChange={set('firstName')} disabled={saving} className="form-control" autoComplete="given-name" /></label>
        <label>{label('Last name')}<input value={form.lastName} onChange={set('lastName')} disabled={saving} className="form-control" autoComplete="family-name" /></label>
        <label>{label('Email')}<input value={form.email} onChange={set('email')} type="email" disabled={saving || !!openOrder} className="form-control disabled:opacity-50" autoComplete="email" /></label>
        <label>{label('Mobile')}<input value={form.phone} onChange={set('phone')} type="tel" disabled={saving || !!openOrder} className="form-control disabled:opacity-50" autoComplete="tel" /></label>

        <p className="sm:col-span-2 text-xs uppercase tracking-wider text-gray-500" style={{ marginTop: '12px' }}>Special dates</p>
        <p className="sm:col-span-2 text-sm text-gray-500" style={{ marginTop: '-8px' }}>Tell us and we'll send you something special on the day.</p>
        <label>{label('Birthday', '(optional)')}<input value={form.dob} onChange={set('dob')} type="date" max={today()} disabled={saving} className="form-control" autoComplete="bday" /></label>
        <label>{label('Anniversary', '(optional)')}<input value={form.anniversary} onChange={set('anniversary')} type="date" max={today()} disabled={saving} className="form-control" /></label>
        <label>
          {label('Gender', '(optional)')}
          <select value={form.gender} onChange={set('gender')} disabled={saving} className="form-control">
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other</option>
          </select>
        </label>

        <div className="sm:col-span-2" style={{ marginTop: '8px' }}>
          <button type="submit" disabled={saving} className="btn btn--primary disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </>
  );
}
