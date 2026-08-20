import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp, Language } from '../context/AppContext'

interface NavItem {
  key: 'discover' | 'social' | 'calendar' | 'saved' | 'plans'
  label: string
  path: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'discover', label: 'Discover', path: '/discover' },
  { key: 'social', label: 'Social', path: '/social' },
  { key: 'calendar', label: 'Calendar', path: '/calendar' },
  { key: 'saved', label: 'Saved', path: '/saved' },
  { key: 'plans', label: 'Plans', path: '/plans' },
]

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
]

export const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { language, setLanguage, t } = useApp()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLangOpen, setIsLangOpen] = useState(false)
  const langMenuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    setIsMobileMenuOpen(false)
    setIsLangOpen(false)
    logout()
    navigate('/auth')
  }

  const handleNavClick = () => {
    setIsMobileMenuOpen(false)
    setIsLangOpen(false)
  }

  // Close retractable language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2DBD0] bg-[#F4EEE2]/95 backdrop-blur-md w-full max-w-[100vw] text-[#2C2C2C]">
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

          {/* Desktop Navigation Links */}
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
                {t(item.key) || item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Section: Retractable Language Icon + Chat Icon + Profile Avatar + Sign Out */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* RETRACTABLE LANGUAGE MENU (Shows only Globe Icon by default) */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setIsLangOpen((prev) => !prev)}
              className="p-2 rounded-xl border border-[#E2DBD0] hover:bg-[#E2DBD0]/60 transition-colors flex items-center gap-1 text-xs font-bold text-[#5a5450] hover:text-[#2C2C2C] cursor-pointer shadow-2xs"
              title="Change Language"
            >
              <span className="text-base leading-none">🌐</span>
              <span className="uppercase text-[11px] font-bold text-[#2D5A3D] ml-0.5">{language}</span>
            </button>

            {/* Retractable Dropdown Popover */}
            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-xl border border-[#E2DBD0] py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-1 text-[10px] font-bold text-[#8a8278] uppercase tracking-wider border-b border-[#E2DBD0]/50 mb-1">
                  Language
                </div>
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code)
                      setIsLangOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#F0EAE0] transition-colors cursor-pointer ${
                      language === lang.code ? 'text-[#2D5A3D] font-bold bg-[#eaf3ed]/60' : 'text-[#5a5450]'
                    }`}
                  >
                    <span>{lang.label}</span>
                    {language === lang.code && <span className="text-[11px] font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Icon */}
          <NavLink
            to="/chat"
            onClick={handleNavClick}
            title="Messages"
            className={({ isActive }) =>
              `relative p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'text-[#5a5450] hover:text-[#2D5A3D] hover:bg-[#E2DBD0]/60'
              }`
            }
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </NavLink>

          {/* Profile Avatar */}
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

          {/* Desktop Sign Out Button */}
          <button
            onClick={handleLogout}
            className="hidden md:inline-flex px-3 py-1.5 rounded-lg border border-[#E2DBD0] text-xs font-medium text-muted hover:text-rose-700 hover:border-rose-200 transition-colors cursor-pointer"
          >
            {t('signOut')}
          </button>

          {/* Mobile Hamburger Toggle */}
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

      {/* Mobile Collapsible Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2DBD0] bg-[#F4EEE2] shadow-xl px-4 py-4 space-y-1.5 animate-fade-in">
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
              {t(item.key) || item.label}
            </NavLink>
          ))}

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
            {t('messages')}
          </NavLink>

          <div className="pt-3 border-t border-[#E2DBD0]/60">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>{t('signOut')}</span>
              <span className="text-xs">🚪</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
