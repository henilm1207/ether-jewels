import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { Notice, SectionTitle } from './shared';

// /account/security — change password, sign out everywhere. Both rotate
// every session (server bumps tokenVersion), so we re-login afterwards.
export default function Security() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const changePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.next.length < 6) return setPwError('New password must be 6+ chars');
    if (pw.next !== pw.confirm) return setPwError('New passwords do not match');
    setPwSaving(true);
    try {
      const res = await fetch(apiUrl('/api/auth/password'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Password change failed');
      logout();
      navigate('/account/login', { replace: true });
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const signOutAll = async () => {
    if (!window.confirm('Sign out every device including this one?')) return;
    try {
      await fetch(apiUrl('/api/auth/logout-all'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch {
      // server unreachable — still drop the local session below
    }
    logout();
    navigate('/account/login', { replace: true });
  };

  return (
    <>
      <SectionTitle title="Login & security" />
      <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Change password</p>
      <Notice kind="error">{pwError}</Notice>
      <form onSubmit={changePassword} className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: '12px', marginBottom: '32px' }}>
        <input value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} placeholder="Current password" aria-label="Current password" type="password" required className="form-control sm:col-span-2" autoComplete="current-password" />
        <input value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} placeholder="New password (6+ chars)" aria-label="New password" type="password" required className="form-control" autoComplete="new-password" />
        <input value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} placeholder="Confirm new password" aria-label="Confirm new password" type="password" required className="form-control" autoComplete="new-password" />
        <div className="sm:col-span-2">
          <button type="submit" disabled={pwSaving} className="btn btn--primary disabled:opacity-50">{pwSaving ? 'Changing…' : 'Change password'}</button>
          <p className="text-xs text-gray-500" style={{ marginTop: '8px' }}>You'll be signed out everywhere and asked to log in again.</p>
        </div>
      </form>

      <p className="text-xs uppercase tracking-wider text-gray-500" style={{ marginBottom: '10px' }}>Devices</p>
      <p className="text-sm text-gray-600" style={{ marginBottom: '12px' }}>Lost a phone or used a shared computer? End every session at once.</p>
      <button type="button" onClick={signOutAll} className="btn btn--secondary">Sign out all devices</button>
    </>
  );
}
