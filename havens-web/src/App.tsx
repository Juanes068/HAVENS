import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthPage } from './pages/Auth'
import { OnboardingView } from './pages/Onboarding'
import { DiscoverView } from './pages/Discover'
import { SocialView } from './pages/Social'
import { MyPlansView } from './pages/MyPlans'
import { CalendarView } from './pages/Calendar'
import { SavedView } from './pages/Saved'
import { PostAPlanView } from './pages/PostAPlan'
import { ProfileSettingsView } from './pages/ProfileSettings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Route */}
        <Route path="/auth" element={<AuthPage />} />

        {/* Private Application Routes (Guarded by ProtectedRoute) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/onboarding" element={<OnboardingView />} />
          <Route path="/discover" element={<DiscoverView />} />
          <Route path="/social" element={<SocialView />} />
          <Route path="/my-plans" element={<MyPlansView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/saved" element={<SavedView />} />
          <Route path="/post-a-plan" element={<PostAPlanView />} />
          <Route path="/profile" element={<ProfileSettingsView />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/discover" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
