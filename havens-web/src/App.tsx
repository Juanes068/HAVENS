import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Navigation } from './components/Navigation'
import { AuthPage } from './pages/Auth'
import { OnboardingView } from './pages/Onboarding'
import { DiscoverView } from './pages/Discover'
import { SocialView } from './pages/Social'
import { MyPlansView } from './pages/MyPlans'
import { CalendarView } from './pages/Calendar'
import { SavedView } from './pages/Saved'
import { PostAPlanView } from './pages/PostAPlan'

/**
 * ProtectedRoute component ensuring that only authenticated users
 * can access private application routes.
 */
const ProtectedRoute: React.FC = () => {
  const { token, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4EEE2] text-[#2C2C2C] flex items-center justify-center font-serif">
        <div className="text-center animate-pulse">Checking havens session...</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen bg-cream text-charcoal font-sans antialiased">
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Route */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Standalone Onboarding Route */}
        <Route path="/onboarding" element={<OnboardingView />} />

        {/* Private Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/social" element={<SocialView />} />
          <Route path="/my-plans" element={<MyPlansView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/saved" element={<SavedView />} />
          <Route path="/post-a-plan" element={<PostAPlanView />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
