import React, { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { EventCard, DiscoverPlan } from '../components/EventCard'

const DISCOVER_PLANS: DiscoverPlan[] = [
  {
    id: 1,
    title: 'Sunrise hike & coffee',
    host: 'Maya R.',
    date: 'Sat Jul 18',
    time: '6:30 AM',
    location: 'Runyon Canyon',
    category: 'Outdoors',
    going: 12,
    mutualsFriends: 3,
    img: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop&auto=format',
    tags: ['hiking', 'morning'],
  },
  {
    id: 2,
    title: 'Natural wine tasting',
    host: 'The Porch',
    date: 'Fri Jul 17',
    time: '7:00 PM',
    location: 'Los Feliz',
    category: 'Food & Drink',
    going: 24,
    mutualsFriends: 5,
    img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop&auto=format',
    tags: ['wine', 'social'],
  },
  {
    id: 3,
    title: 'Beach bonfire night',
    host: 'Jordan L.',
    date: 'Sat Jul 19',
    time: '8:00 PM',
    location: 'Zuma Beach',
    category: 'Social',
    going: 31,
    mutualsFriends: 7,
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format',
    tags: ['bonfire', 'beach'],
  },
  {
    id: 4,
    title: 'Sunday farmers market',
    host: 'Priya K.',
    date: 'Sun Jul 20',
    time: '9:00 AM',
    location: 'Silver Lake',
    category: 'Food & Drink',
    going: 8,
    mutualsFriends: 2,
    img: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&auto=format',
    tags: ['market', 'morning'],
  },
  {
    id: 5,
    title: 'Outdoor film screening',
    host: 'Cinespia',
    date: 'Sat Jul 25',
    time: '8:30 PM',
    location: 'Hollywood Forever',
    category: 'Arts',
    going: 180,
    mutualsFriends: 9,
    img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop&auto=format',
    tags: ['film', 'night'],
  },
  {
    id: 6,
    title: 'Ceramics open studio',
    host: 'Clay LA',
    date: 'Thu Jul 24',
    time: '6:00 PM',
    location: 'Echo Park',
    category: 'Arts',
    going: 14,
    mutualsFriends: 4,
    img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&auto=format',
    tags: ['craft', 'creative'],
  },
]

const CATEGORIES = ['All', 'Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

export const DiscoverView: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('All')
  const [savedIds, setSavedIds] = useState<number[]>([1])

  const filtered =
    activeCategory === 'All'
      ? DISCOVER_PLANS
      : DISCOVER_PLANS.filter((p) => p.category === activeCategory)

  const toggleSave = (id: number) =>
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <SectionHeading>Discover plans</SectionHeading>
          <p className="text-sm text-muted mt-1">What your city is getting up to this week</p>
        </div>
        <div className="flex items-center gap-2 bg-sand rounded-xl p-1">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-charcoal shadow-sm">
            This week
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-charcoal">
            This month
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-charcoal">
            Near me
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
              activeCategory === cat
                ? 'bg-forest text-white'
                : 'bg-sand text-[#5a5450] hover:bg-[#e4dcd2] hover:text-charcoal'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Card + Grid */}
      {filtered.length > 0 && (
        <>
          {/* Featured Card */}
          <div className="mb-6 rounded-2xl overflow-hidden border border-border bg-white flex h-64 group cursor-pointer">
            <div className="w-2/5 relative overflow-hidden bg-border">
              <img
                src={filtered[0].img}
                alt={filtered[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
            </div>
            <div className="flex-1 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf3ed] text-forest">
                    {filtered[0].category}
                  </span>
                  {filtered[0].mutualsFriends > 0 && (
                    <span className="text-xs text-muted">
                      {filtered[0].mutualsFriends} friends going
                    </span>
                  )}
                </div>
                <h2 className="text-2xl text-charcoal mb-2 font-serif font-semibold">
                  {filtered[0].title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {filtered[0].date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {filtered[0].time}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                    {filtered[0].location}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {['#2D5A3D', '#7aaa8a', '#C47B5A'].map((c, i) => (
                      <div
                        key={i}
                        className="w-7 h-7 rounded-full border-2 border-white"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted">{filtered[0].going} going</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSave(filtered[0].id)
                    }}
                    className={`p-2 rounded-lg border transition-colors ${
                      savedIds.includes(filtered[0].id)
                        ? 'border-forest bg-[#eaf3ed]'
                        : 'border-border hover:border-[#b5cebe]'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill={savedIds.includes(filtered[0].id) ? '#2D5A3D' : 'none'}
                      stroke={savedIds.includes(filtered[0].id) ? '#2D5A3D' : '#8a8278'}
                      strokeWidth="1.3"
                    >
                      <path d="M3 2h10v12l-5-3-5 3V2z" />
                    </svg>
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-forest text-white text-sm font-medium hover:bg-forest-light transition-colors">
                    I'm in
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Rest of plans grid */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.slice(1).map((plan) => (
              <EventCard
                key={plan.id}
                plan={plan}
                isSaved={savedIds.includes(plan.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">Nothing here yet</p>
          <p className="text-sm">Try a different category or check back soon.</p>
        </div>
      )}
    </div>
  )
}
