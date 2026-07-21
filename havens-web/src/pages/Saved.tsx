import React, { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'

interface SavedPlan {
  id: number
  title: string
  host: string
  date: string
  location: string
  category: string
  going: number
  img: string
  savedOn: string
  note?: string
}

const SAVED_PLANS: SavedPlan[] = [
  { id: 1, title: 'Outdoor film screening', host: 'Cinespia', date: 'Sat Jul 25', location: 'Hollywood Forever', category: 'Arts', going: 180, savedOn: 'Saved 3 days ago', img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop&auto=format', note: 'Ask Jordan if she wants to come' },
  { id: 2, title: 'Ceramics open studio', host: 'Clay LA', date: 'Thu Jul 24', location: 'Echo Park', category: 'Arts', going: 14, savedOn: 'Saved 1 week ago', img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&auto=format' },
  { id: 3, title: 'Natural wine tasting', host: 'The Porch', date: 'Fri Jul 17', location: 'Los Feliz', category: 'Food & Drink', going: 24, savedOn: 'Saved 2 weeks ago', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop&auto=format', note: 'Could be fun for the whole group' },
  { id: 4, title: 'Sunrise yoga on the roof', host: 'Nomad Hotel', date: 'Sun Aug 2', location: 'Downtown LA', category: 'Wellness', going: 22, savedOn: 'Saved 3 weeks ago', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop&auto=format' },
  { id: 5, title: 'Sunday farmers market', host: 'Priya K.', date: 'Sun Jul 20', location: 'Silver Lake', category: 'Food & Drink', going: 8, savedOn: 'Saved yesterday', img: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&auto=format' },
]

export const SavedView: React.FC = () => {
  const [saved, setSaved] = useState(SAVED_PLANS)
  const unsave = (id: number) => setSaved((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-8">
        <SectionHeading>Saved</SectionHeading>
        <p className="text-sm text-muted mt-1">{saved.length} plans bookmarked</p>
      </div>

      {saved.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">Nothing saved yet</p>
          <p className="text-sm">Bookmark plans from Discover to find them here.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        {saved.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-border bg-white overflow-hidden group hover:shadow-md transition-shadow duration-200 cursor-pointer flex"
          >
            <div className="w-40 shrink-0 relative overflow-hidden bg-border">
              <img
                src={plan.img}
                alt={plan.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sand text-[#5a5450]">
                    {plan.category}
                  </span>
                  <button
                    onClick={() => unsave(plan.id)}
                    className="p-1 rounded-md text-muted hover:text-terracotta hover:bg-[#fdf0eb] transition-colors"
                    title="Remove from saved"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="#2D5A3D" stroke="#2D5A3D" strokeWidth="1.2">
                      <path d="M3 2h10v12l-5-3-5 3V2z" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-base font-semibold text-charcoal mb-1.5 leading-snug font-serif">
                  {plan.title}
                </h3>
                <div className="text-xs text-muted space-y-1 mb-3">
                  <p className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {plan.date} · {plan.location}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 14c0-3.31 2.69-5 6-5s6 1.69 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {plan.host} · {plan.going} going
                  </p>
                </div>
                {plan.note && (
                  <p className="text-xs text-muted italic border-l-2 border-border pl-2 leading-relaxed">
                    {plan.note}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] text-[#b5b0aa]">{plan.savedOn}</span>
                <button className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-medium hover:bg-forest-light transition-colors">
                  I'm in
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
