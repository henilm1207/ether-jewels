import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiUrl } from '../config';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not send code');
      // Same message whether or not the account exists — advance regardless.
      setNotice(data.message || 'If that email is registered, a reset code was sent.');
      setStep('reset');
      setCooldown(30);
    } catch (err) {
      setError(err.message || 'Could not send code');
    } finally {
      setSending(false);
    }
  };

  const resendCode = async () => {
    if (cooldown > 0) return;
    setError('');
    try {
      const res = await fetch(apiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not resend code');
      setNotice('A new code was sent if that email is registered.');
      setCooldown(30);
    } catch (err) {
      setError(err.message || 'Could not resend code');
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(apiUrl('/api/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not reset password');
      navigate('/account/login', { replace: true, state: { notice: 'Password reset — please log in.' } });
    } catch (err) {
      setError(err.message || 'Could not reset password');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container" style={{ maxWidth: '560px' }}>
        <div className="text-center" style={{ paddingBottom: '40px' }}>
          <p className="text-subheading" style={{ marginBottom: '12px' }}>Account</p>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            Forgot password
          </h1>
        </div>

        {step === 'email' && (
          <form onSubmit={requestCode}>
            <p className="text-sm text-gray-600" style={{ marginBottom: '24px' }}>
              Enter your account email and we'll send you a 6-digit code to reset your password.
            </p>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="fp-email" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
                Email
              </label>
              <input id="fp-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="form-control" placeholder="Email" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '16px' }}>{error}</p>}
            <button type="submit" disabled={sending} className="btn btn--primary w-full disabled:opacity-50" style={{ marginBottom: '16px' }}>
              {sending ? 'Sending…' : 'Send reset code'}
            </button>
            <p className="text-center text-sm text-gray-600">
              <Link to="/account/login" className="underline">Back to log in</Link>
            </p>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={resetPassword}>
            {notice && <p className="text-sm text-gray-600" style={{ marginBottom: '24px' }}>{notice}</p>}
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="fp-code" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
                6-digit code
              </label>
              <input id="fp-code" type="text" inputMode="numeric" pattern="[0-9]{6}" required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoComplete="one-time-code" className="form-control" placeholder="123456" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="fp-password" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
                New password
              </label>
              <div className="relative">
                <input id="fp-password" type={showPw ? 'text' : 'password'} required minLength={6} maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="form-control" placeholder="New password" style={{ paddingRight: '60px' }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs underline hover:opacity-70">
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="fp-confirm" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
                Confirm new password
              </label>
              <input id="fp-confirm" type={showPw ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="form-control" placeholder="Confirm new password" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '16px' }}>{error}</p>}
            <button type="submit" disabled={sending} className="btn btn--primary w-full disabled:opacity-50" style={{ marginBottom: '16px' }}>
              {sending ? 'Resetting…' : 'Reset password'}
            </button>
            <p className="text-center text-sm text-gray-600">
              Didn't get a code?{' '}
              <button type="button" onClick={resendCode} disabled={cooldown > 0} className="underline disabled:opacity-50 disabled:no-underline">
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              </button>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
