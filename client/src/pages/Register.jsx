import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* Site-matched underline fields (same language as Contact page) */
const fieldStyle = {
  border: 0,
  borderBottom: '1px solid #ededed',
  borderRadius: 0,
  padding: 0,
  boxShadow: 'none',
  color: '#222',
};

const inputClass =
  'w-full bg-transparent text-[14px] focus:outline-none placeholder:text-[rgba(34,34,34,0.75)]';

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSending(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account. Please try again.');
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
            Create an account
          </h1>
          <p className="text-gray-600 text-[15px]" style={{ marginTop: '12px' }}>
            Faster checkout, order history and early access to new pieces.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="reg-first" className="sr-only">First name</label>
              <input
                id="reg-first"
                name="firstName"
                type="text"
                placeholder="First name"
                value={form.firstName}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={50}
                autoComplete="given-name"
                className={inputClass}
                style={{ ...fieldStyle, height: '46px' }}
              />
            </div>
            <div>
              <label htmlFor="reg-last" className="sr-only">Last name</label>
              <input
                id="reg-last"
                name="lastName"
                type="text"
                placeholder="Last name"
                value={form.lastName}
                onChange={handleChange}
                required
                minLength={2}
                maxLength={50}
                autoComplete="family-name"
                className={inputClass}
                style={{ ...fieldStyle, height: '46px' }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-phone" className="sr-only">Mobile number</label>
            <input
              id="reg-phone"
              name="phone"
              type="tel"
              placeholder="Mobile number"
              value={form.phone}
              onChange={handleChange}
              required
              pattern="[+]?[0-9\s\-()]{7,20}"
              title="Enter a valid mobile number"
              autoComplete="tel"
              className={inputClass}
              style={{ ...fieldStyle, height: '46px' }}
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="sr-only">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              spellCheck={false}
              className={inputClass}
              style={{ ...fieldStyle, height: '46px' }}
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="sr-only">Password (min 6 characters)</label>
            <div className="relative">
              <input
                id="reg-password"
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                maxLength={128}
                autoComplete="new-password"
                className={inputClass}
                style={{ ...fieldStyle, height: '46px', paddingRight: '60px' }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-0 top-0 text-xs underline hover:opacity-70"
                style={{ height: '46px' }}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reg-confirm" className="sr-only">Confirm password</label>
            <input
              id="reg-confirm"
              name="confirm"
              type={showPw ? 'text' : 'password'}
              placeholder="Confirm password"
              value={form.confirm}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={inputClass}
              style={{ ...fieldStyle, height: '46px' }}
            />
          </div>

          {error && <p role="alert" className="text-sm text-red-700 text-center">{error}</p>}

          <button
            type="submit"
            disabled={sending}
            className="btn btn--primary w-full disabled:opacity-50"
          >
            {sending ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account? <Link to="/account/login" className="underline">Log in</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
