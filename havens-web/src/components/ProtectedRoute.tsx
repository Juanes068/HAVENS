import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { HAVENS_JWT_TOKEN_KEY } from '../services/apollo';
import { secureStorage } from '../services/secureStore';

/**
 * ProtectedRoute component ensuring that:
 * 1. Only authenticated users with a valid JWT token can access private routes (unauthenticated users -> /auth).
 * 2. Authenticated users MUST have completed onboarding (hobbies array populated) before accessing main app (/discover, /social, etc.).
 * 3. Incomplete onboarding automatically force-redirects to `/onboarding`.
 * 4. Maintains a stable DOM tree hierarchy so child routes (like OnboardingView) are never unmounted during session updates.
 */
export const ProtectedRoute: React.FC = () => {
  const { token, user, isLoading, isOnboarded } = useAuth();
  const location = useLocation();

  // 1. Session verification & Profile loading state: Render loading spinner during active checks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex items-center justify-center font-serif">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#2D5A3D] border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium text-[#2D5A3D]">Checking havens session...</div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: No token or user after loading finished -> redirect to /auth
  if (!token || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const isOnboardingRoute = location.pathname === '/onboarding';

  // 3. Authenticated but Incomplete Onboarding: Lock user to /onboarding
  if (!isOnboarded && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  // 4. Stable DOM structure: Render navigation and private route outlet
  const showNav = isOnboarded && !isOnboardingRoute;

  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] font-sans antialiased overflow-x-hidden flex flex-col justify-between">
      {showNav && <Navigation />}
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>
      {showNav && <Footer />}
    </div>
  );
};
