import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface NavItem {
  label: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Discover', path: '/discover' },
  { label: 'Social', path: '/social' },
  { label: 'My Plans', path: '/my-plans' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Saved', path: '/saved' },
  { label: 'Post a Plan', path: '/post-a-plan' },
]

export const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[#F4EEE2]/90 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
        <span
          className="text-xl text-[#2D5A3D] mr-4 shrink-0 cursor-pointer font-serif font-semibold tracking-tight lowercase"
          onClick={() => navigate('/discover')}
        >
          havens
        </span>
        <nav className="flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#2D5A3D] text-white'
                    : 'text-[#5a5450] hover:text-charcoal hover:bg-sand'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {user && (
            <div
              onClick={() => navigate('/profile')}
              title={`View @${user.username}'s Profile`}
              className="w-9 h-9 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-xs cursor-pointer overflow-hidden border-2 border-white shadow-xs hover:scale-105 transition-transform shrink-0"
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
