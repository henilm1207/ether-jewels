import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotFound from '../../pages/NotFound';

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
  if (user.role !== 'admin') return <NotFound />;
  return children;
}
