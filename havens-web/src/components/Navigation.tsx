import React from 'react'

export type NavPage = 'Discover' | 'My Plans' | 'Calendar' | 'Saved' | 'Post a Plan'

const NAV_LINKS: NavPage[] = ['Discover', 'My Plans', 'Calendar', 'Saved', 'Post a Plan']

interface NavigationProps {
  activePage: NavPage
  onNavigate: (page: NavPage) => void
}

export const Navigation: React.FC<NavigationProps> = ({ activePage, onNavigate }) => {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[#F4EEE2]/90 backdrop-blur-sm">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-8">
        <span
          className="text-xl text-forest mr-4 shrink-0 cursor-pointer font-serif font-semibold tracking-tight lowercase"
          onClick={() => onNavigate('Discover')}
        >
          havens
        </span>
        <nav className="flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link}
              onClick={() => onNavigate(link)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                activePage === link
                  ? 'bg-forest text-white'
                  : 'text-[#5a5450] hover:text-charcoal hover:bg-sand'
              }`}
            >
              {link}
            </button>
          ))}
        </nav>
        <button className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-forest text-white text-sm font-medium hover:bg-forest-light transition-colors duration-150">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path
              d="M13.5 8A5.5 5.5 0 1 1 8 2.5"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
            <path
              d="M8 1l2.5 2-2.5 2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sync Calendar
        </button>
      </div>
    </header>
  )
}
