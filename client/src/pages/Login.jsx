import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state && location.state.from ? location.state.from : '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    const home = user.role === 'admin' ? '/admin' : (from.startsWith('/admin') ? '/' : from);
    navigate(home, { replace: true });
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const me = await login(email.trim(), password);
      if (me.role === 'admin') navigate('/admin', { replace: true });
      else navigate(from.startsWith('/admin') ? '/' : from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
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
            Log in
          </h1>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="login-email" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
              Email
            </label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="form-control" placeholder="Email" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="login-password" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
              Password
            </label>
            <div className="relative">
              <input id="login-password" type={showPw ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="form-control" placeholder="Password" style={{ paddingRight: '60px' }} />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs underline hover:opacity-70">
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-700" style={{ marginBottom: '16px' }}>{error}</p>}
          <button type="submit" disabled={sending} className="btn btn--primary w-full disabled:opacity-50" style={{ marginBottom: '16px' }}>
            {sending ? 'Logging in…' : 'Log in'}
          </button>
          <p className="text-center text-sm text-gray-600">
            New customer? <Link to="/account/register" className="underline">Create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
