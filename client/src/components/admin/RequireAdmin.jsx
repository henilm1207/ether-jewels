import { lazy, Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RouteFallback from '../ui/RouteFallback';

// Lazy so this thin guard (bundled eagerly — see App.jsx) doesn't drag the
// 404 page's chunk into the main bundle for every visitor; it's only needed
// for the rare non-admin-hits-/admin case.
const NotFound = lazy(() => import('../../pages/NotFound'));

// Guards /admin/* — customers and guests see a 404 (never advertise the panel).
export default function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-500 text-sm" role="status">
        Checking access…
      </div>
    );
  }
  if (!user) return <Navigate to="/account/login" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <NotFound />
      </Suspense>
    );
  }
  return children;
}
