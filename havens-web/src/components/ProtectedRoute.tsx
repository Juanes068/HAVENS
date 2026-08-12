import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation } from './Navigation';
import { HAVENS_JWT_TOKEN_KEY } from '../services/apollo';
import { secureStorage } from '../services/secureStore';

/**
 * ProtectedRoute component ensuring that only authenticated users with a valid JWT token
 * can access private application routes.
 * 
 * Immediately redirects unauthenticated users to `/auth` before dashboard components can render.
 */
export const ProtectedRoute: React.FC = () => {
  const { token, isLoading } = useAuth();

  // Read raw stored token directly from storage to guarantee immediate sync
  const storedToken =
    token ||
    secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY) ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') ||
        localStorage.getItem('havens_jwt_token') ||
        localStorage.getItem(HAVENS_JWT_TOKEN_KEY)
      : null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex items-center justify-center font-serif">
        <div className="text-center animate-pulse text-[#2D5A3D]">Checking havens session...</div>
      </div>
    );
  }

  if (!storedToken) {
    console.warn('[ProtectedRoute] No valid token found in context or storage. Redirecting to /auth.');
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] font-sans antialiased overflow-x-hidden flex flex-col">
      <Navigation />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
