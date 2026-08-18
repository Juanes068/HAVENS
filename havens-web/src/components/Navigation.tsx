import React, { useState } from 'react'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    setIsMobileMenuOpen(false)
    logout()
    navigate('/auth')
  }

  const handleNavClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-[#F4EEE2]/95 backdrop-blur-md w-full max-w-[100vw]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Desktop Navigation */}
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <span
            className="text-xl text-[#2D5A3D] mr-2 shrink-0 cursor-pointer font-serif font-semibold tracking-tight lowercase"
            onClick={() => {
              handleNavClick()
              navigate('/discover')
            }}
          >
            havens
          </span>

          {/* Desktop Navigation Links (Hidden on < md screens) */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#2D5A3D] text-white shadow-xs'
                      : 'text-[#5a5450] hover:text-charcoal hover:bg-sand'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Section: Chat Icon + Profile Avatar + Sign Out + Mobile Hamburger */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* CHAT ICON: Navigate to /chat — Always visible on desktop & mobile */}
          <NavLink
            to="/chat"
            onClick={handleNavClick}
            title="Messages — End-to-end encrypted"
            className={({ isActive }) =>
              `relative p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'text-[#5a5450] hover:text-[#2D5A3D] hover:bg-[#E2DBD0]/60'
              }`
            }
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </NavLink>

          {/* PROFILE AVATAR: ALWAYS VISIBLE ON MOBILE & DESKTOP */}
          {user && (
            <div
              onClick={() => {
                handleNavClick()
                navigate('/profile')
              }}
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

          {/* Desktop Sign Out Button (Hidden on < md screens) */}
          <button
            onClick={handleLogout}
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
          >
            Sign out
          </button>

          {/* Mobile Hamburger Toggle Button (Only visible on < md screens) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-lg text-[#2D5A3D] hover:bg-[#E2DBD0]/60 transition-colors cursor-pointer"
          >
            <span className="text-xl leading-none font-bold">
              {isMobileMenuOpen ? '✕' : '☰'}
            </span>
          </button>

        </div>
      </div>

      {/* MOBILE COLLAPSIBLE DROPDOWN MENU (Only visible on < md screens when open) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-[#F4EEE2] shadow-xl px-4 py-4 space-y-1.5 animate-fade-in">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `block px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#2D5A3D] text-white'
                    : 'text-[#5a5450] hover:bg-[#E2DBD0] hover:text-charcoal'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}

          {/* Chat Link in Mobile Menu */}
          <NavLink
            to="/chat"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `block px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${
                isActive
                  ? 'bg-[#2D5A3D] text-white'
                  : 'text-[#5a5450] hover:bg-[#E2DBD0] hover:text-charcoal'
              }`
            }
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Messages
          </NavLink>

          <div className="pt-3 border-t border-border/60">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>Sign out</span>
              <span className="text-xs">🚪</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
