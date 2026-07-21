import { useState } from 'react'
import { Navigation, NavPage } from './components/Navigation'
import { DiscoverView } from './pages/Discover'
import { MyPlansView } from './pages/MyPlans'
import { CalendarView } from './pages/Calendar'
import { SavedView } from './pages/Saved'
import { PostAPlanView } from './pages/PostAPlan'

export default function App() {
  const [activePage, setActivePage] = useState<NavPage>('Calendar')

  return (
    <div className="min-h-screen bg-cream text-charcoal font-sans antialiased">
      {/* Navigation Header */}
      <Navigation activePage={activePage} onNavigate={setActivePage} />

      {/* Page Content View Router */}
      <main>
        {activePage === 'Discover' && <DiscoverView />}
        {activePage === 'My Plans' && <MyPlansView onNavigate={setActivePage} />}
        {activePage === 'Calendar' && <CalendarView />}
        {activePage === 'Saved' && <SavedView />}
        {activePage === 'Post a Plan' && <PostAPlanView onNavigate={setActivePage} />}
      </main>
    </div>
  )
}
