import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { Avatar } from '../components/Avatar'
import { MY_RSVPS, GET_ALL_EVENTS } from '../graphql/operations'

export const MyPlansView: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const { data: rsvpData, loading: rsvpLoading, error: rsvpError, refetch: refetchRsvps } = useQuery(MY_RSVPS, {
    fetchPolicy: 'cache-and-network',
  })

  const { data: eventsData, loading: eventsLoading } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  const rsvps = rsvpData?.myRsvps || []
  const allEvents = eventsData?.allEvents || []

  // Adapt GraphQL backend RSVPs and events into unified MyPlans shape
  const plans = rsvps.map((r: any, idx: number) => ({
    id: parseInt(r.event?.id || idx + 1, 10),
    title: r.event?.title || 'Community Gathering',
    date: 'Fri Jul 24',
    time: '6:00 PM',
    location: r.event?.locationName || 'Vancouver, BC',
    role: r.response === 'going' ? 'attending' : 'hosting',
    status: activeTab,
    attendees: [{ name: r.event?.creator?.username || 'Host', color: '#2D5A3D' }],
    confirmed: 4,
    pending: 1,
  }))

  const isLoading = rsvpLoading || eventsLoading

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex items-end justify-between mb-8">
        <div>
          <SectionHeading>My Plans</SectionHeading>
          <p className="text-sm text-muted mt-1">Plans you're hosting or attending</p>
        </div>
        <button
          onClick={() => navigate('/post-a-plan')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-sm font-medium transition-colors shadow-xs"
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

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20 text-muted font-normal animate-pulse text-sm font-serif">
          Loading your plans from havens...
        </div>
      )}

      {/* Error State */}
      {rsvpError && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm mb-6 flex justify-between items-center">
          <span>Failed to load RSVPs: {rsvpError.message}</span>
          <button onClick={() => refetchRsvps()} className="text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Plans list */}
      {!isLoading && (
        <div className="flex flex-col gap-3">
          {plans.map((plan: any) => (
            <div
              key={plan.id}
              className="p-5 rounded-xl border border-border bg-white hover:shadow-sm transition-shadow duration-150 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
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
                            ? 'bg-[#eaf3ed] text-[#2D5A3D]'
                            : 'bg-sand text-[#5a5450]'
                        }`}
                      >
                        {plan.role === 'hosting' ? 'Hosting' : 'Attending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted mb-3">
                      <span>{plan.time}</span>
                      <span>·</span>
                      <span>{plan.location}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {plan.attendees.map((a: any) => (
                          <Avatar key={a.name} name={a.name} color={a.color} />
                        ))}
                      </div>
                      <span className="text-xs text-muted">{plan.confirmed} confirmed</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-[#5a5450] hover:border-[#b5cebe] hover:text-charcoal transition-colors">
                    Share
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-medium transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && plans.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">No active plans found</p>
          <p className="text-sm">Explore Discover or post a plan to get started.</p>
        </div>
      )}
    </div>
  )
}
