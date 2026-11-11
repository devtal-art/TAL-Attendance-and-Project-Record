import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AUTH_ENABLED } from '../../lib/auth';

// Wraps every app route: nothing inside renders until the user is logged in.
export default function ProtectedRoute() {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (!AUTH_ENABLED) return <Outlet />;

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
