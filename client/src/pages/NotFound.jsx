import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="py-20 text-center container">
      <p className="text-subheading">404</p>
      <h1 className="font-heading text-2xl mb-4">Page not found</h1>
      <p className="text-gray-600 mb-6">The page you asked for doesn&apos;t exist.</p>
      <Link to="/" className="btn btn--primary">Return home</Link>
    </div>
  );
}
