import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setNotice('Account login is coming soon. Please contact us for order assistance.');
  };

  return (
    <section className="py-10 md:py-14">
      <div className="container" style={{ maxWidth: '560px' }}>
        <div className="text-center" style={{ paddingBottom: '40px' }}>
          <h1 className="font-heading" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', marginBottom: 0 }}>
            Log in
          </h1>
        </div>
        <form onSubmit={submit}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="login-email" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
              Email
            </label>
            <input id="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" placeholder="Email" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="login-password" className="block text-[13px] font-medium uppercase" style={{ letterSpacing: '1px', marginBottom: '8px' }}>
              Password
            </label>
            <input id="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" placeholder="Password" />
          </div>
          {notice && <p className="text-sm text-gray-600" style={{ marginBottom: '16px' }}>{notice}</p>}
          <button type="submit" className="btn btn--primary w-full" style={{ marginBottom: '16px' }}>
            Log in
          </button>
          <p className="text-center text-sm text-gray-600">
            New customer? <Link to="/pages/contact" className="underline">Contact us to create an account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
