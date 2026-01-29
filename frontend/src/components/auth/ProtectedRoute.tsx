import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'COUPLE' | 'VENDOR' | 'ADMIN';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
  redirectTo = '/login',
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page with return url
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (requiredUserType && user.user_type !== requiredUserType) {
    // Redirect to appropriate dashboard based on user type
    const dashboardRoutes = {
      COUPLE: '/dashboard',
      VENDOR: '/vendor/dashboard',
      ADMIN: '/admin/dashboard',
    };
    return <Navigate to={dashboardRoutes[user.user_type]} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;