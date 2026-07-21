import React, { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { Avatar } from '../components/Avatar'
import { NavPage } from '../components/Navigation'

interface MyPlan {
  id: number
  title: string
  date: string
  time: string
  location: string
  role: 'hosting' | 'attending'
  status: 'upcoming' | 'past'
  attendees: { name: string; color: string }[]
  confirmed: number
  pending: number
}

const MY_PLANS: MyPlan[] = [
  { id: 1, title: 'Sunset picnic at Griffith', date: 'Fri Jul 17', time: '5:30 PM', location: 'Griffith Park', role: 'hosting', status: 'upcoming', attendees: [{ name: 'Maya', color: '#7aaa8a' }, { name: 'Priya', color: '#2D5A3D' }, { name: 'Leo', color: '#b5cebe' }], confirmed: 6, pending: 2 },
  { id: 2, title: 'Gallery opening — MOCA', date: 'Wed Jul 9', time: '6:00 PM', location: 'MOCA, Downtown', role: 'attending', status: 'upcoming', attendees: [{ name: 'Zoe', color: '#C47B5A' }, { name: 'Marcus', color: '#2D5A3D' }], confirmed: 24, pending: 4 },
  { id: 3, title: 'Jazz at the Bowl', date: 'Tue Jul 28', time: '7:00 PM', location: 'Hollywood Bowl', role: 'hosting', status: 'upcoming', attendees: [{ name: 'Keiko', color: '#7aaa8a' }, { name: 'Tom', color: '#2D5A3D' }, { name: 'Alex', color: '#b5cebe' }], confirmed: 8, pending: 1 },
  { id: 4, title: 'Rooftop dinner party', date: 'Thu Jun 19', time: '7:30 PM', location: 'The Perch, Koreatown', role: 'hosting', status: 'past', attendees: [{ name: 'Priya', color: '#2D5A3D' }, { name: 'Sam', color: '#7aaa8a' }, { name: 'Leo', color: '#b5cebe' }], confirmed: 9, pending: 0 },
  { id: 5, title: 'Morning hike at Runyon', date: 'Sat Jun 14', time: '8:00 AM', location: 'Runyon Canyon', role: 'attending', status: 'past', attendees: [{ name: 'Maya', color: '#7aaa8a' }, { name: 'Jordan', color: '#C47B5A' }], confirmed: 5, pending: 0 },
  { id: 6, title: 'Warehouse party', date: 'Wed Jun 4', time: '10:00 PM', location: 'Arts District', role: 'attending', status: 'past', attendees: [{ name: 'Dev', color: '#2D5A3D' }, { name: 'Zoe', color: '#C47B5A' }, { name: 'Finn', color: '#7aaa8a' }], confirmed: 60, pending: 0 },
]

interface MyPlansProps {
  onNavigate?: (page: NavPage) => void
}

export const MyPlansView: React.FC<MyPlansProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const filtered = MY_PLANS.filter((p) => p.status === activeTab)

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <SectionHeading>My Plans</SectionHeading>
          <p className="text-sm text-muted mt-1">Plans you're hosting or attending</p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('Post a Plan')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-forest text-white text-sm font-medium hover:bg-forest-light transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Post a plan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-sand rounded-xl w-fit mb-8">
        {(['upcoming', 'past'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-150 capitalize ${
              activeTab === tab ? 'bg-white text-charcoal shadow-sm' : 'text-muted hover:text-charcoal'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Plans list */}
      <div className="flex flex-col gap-3">
        {filtered.map((plan) => (
          <div
            key={plan.id}
            className="p-5 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow duration-150 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Date block */}
                <div className="shrink-0 w-14 flex flex-col items-center bg-cream rounded-xl border border-border py-2">
                  <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                    {plan.date.split(' ')[1]}
                  </span>
                  <span className="text-2xl font-semibold text-charcoal leading-tight font-serif">
                    {plan.date.split(' ')[2]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-charcoal font-serif">
                      {plan.title}
                    </h3>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        plan.role === 'hosting'
                          ? 'bg-[#eaf3ed] text-forest'
                          : 'bg-sand text-[#5a5450]'
                      }`}
                    >
                      {plan.role === 'hosting' ? 'Hosting' : 'Attending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted mb-3">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      {plan.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      {plan.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1">
                      {plan.attendees.map((a) => (
                        <Avatar key={a.name} name={a.name} color={a.color} />
                      ))}
                    </div>
                    <span className="text-xs text-muted">
                      {plan.confirmed} confirmed{plan.pending > 0 ? ` · ${plan.pending} pending` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {activeTab === 'upcoming' && (
                <div className="flex items-center gap-2 shrink-0">
                  {plan.role === 'hosting' && (
                    <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-[#5a5450] hover:border-[#b5cebe] hover:text-charcoal transition-colors">
                      Edit
                    </button>
                  )}
                  <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-[#5a5450] hover:border-[#b5cebe] hover:text-charcoal transition-colors">
                    Share
                  </button>
                  {plan.role === 'hosting' && (
                    <button className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-medium hover:bg-forest-light transition-colors">
                      Manage
                    </button>
                  )}
                </div>
              )}
              {activeTab === 'past' && (
                <button className="shrink-0 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-[#5a5450] hover:border-[#b5cebe] transition-colors">
                  Do it again
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">Nothing here yet</p>
          <p className="text-sm">Your {activeTab} plans will appear here.</p>
        </div>
      )}
    </div>
  )
}
