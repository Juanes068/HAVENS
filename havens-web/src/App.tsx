import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppContextProvider } from './context/AppContext'
import { AuthPage } from './pages/Auth'
import { OnboardingView } from './pages/Onboarding'
import { DiscoverView } from './pages/Discover'
import { SocialView } from './pages/Social'
import { PlansView } from './pages/Plans'
import { CalendarView } from './pages/Calendar'
import { SavedView } from './pages/Saved'
import { ProfileSettingsView } from './pages/ProfileSettings'
import { UserProfileDetailView } from './pages/UserProfileDetail'
import { ChatHubView } from './pages/ChatHub'
import { TermsPage } from './pages/Terms'

export default function App() {
  return (
    <AppContextProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Private Application Routes (Guarded by ProtectedRoute) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/discover" replace />} />
            <Route path="/onboarding" element={<OnboardingView />} />
            <Route path="/discover" element={<DiscoverView />} />
            <Route path="/social" element={<SocialView />} />
            <Route path="/chat" element={<ChatHubView />} />
            <Route path="/plans" element={<PlansView />} />
            <Route path="/my-plans" element={<Navigate to="/plans" replace />} />
            <Route path="/post-a-plan" element={<Navigate to="/plans" replace />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/saved" element={<SavedView />} />
            <Route path="/profile" element={<ProfileSettingsView />} />
            <Route path="/profile/:userId" element={<UserProfileDetailView />} />
            <Route path="/user/:userId" element={<UserProfileDetailView />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/discover" replace />} />
        </Routes>
      </BrowserRouter>
    </AppContextProvider>
  )
}
