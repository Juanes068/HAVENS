import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigation } from './Navigation';
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

  // Read raw stored token directly from storage to guarantee immediate sync
  const storedToken =
    token ||
    secureStorage.getItemSync(HAVENS_JWT_TOKEN_KEY) ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') ||
        localStorage.getItem('havens_jwt_token') ||
        localStorage.getItem(HAVENS_JWT_TOKEN_KEY)
      : null);

  // 1. Session verification & Profile loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex items-center justify-center font-serif">
        <div className="text-center animate-pulse text-[#2D5A3D]">Checking havens session...</div>
      </div>
    );
  }

  // 2. Unauthenticated or unreachable session: Redirect to login/registration
  if (!storedToken || !user) {
    console.warn('[ProtectedRoute] No valid authenticated user found. Redirecting to /auth.');
    return <Navigate to="/auth" replace />;
  }

  const isOnboardingRoute = location.pathname === '/onboarding';

  // 3. Authenticated but Incomplete Onboarding: Lock user to /onboarding
  if (!isOnboarded && !isOnboardingRoute) {
    console.warn('[ProtectedRoute] User has not completed onboarding. Locking access to /onboarding.');
    return <Navigate to="/onboarding" replace />;
  }

  // 4. Stable DOM structure: Keep navigation conditional without changing tree layout
  return (
    <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] font-sans antialiased overflow-x-hidden flex flex-col">
      {isOnboarded && !isOnboardingRoute && <Navigation />}
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};
