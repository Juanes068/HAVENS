import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { ScheduledEventCard, ScheduledEvent } from '../components/ScheduledEventCard'
import { MY_RSVPS, GET_ALL_EVENTS, SWIPE_EVENT } from '../graphql/operations'
import { useAuth } from '../context/AuthContext'

export const MyPlansView: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  const now = useMemo(() => new Date(), [])
  const todayMidnight = useMemo(() => {
    const t = new Date(now)
    t.setHours(0, 0, 0, 0)
    return t
  }, [now])

  const {
    data: rsvpData,
    loading: rsvpLoading,
    error: rsvpError,
    refetch: refetchRsvps,
  } = useQuery(MY_RSVPS, {
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: eventsData,
    loading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  const [swipeEventMutation] = useMutation(SWIPE_EVENT, {
    onCompleted: () => {
      refetchRsvps()
      refetchEvents()
    },
  })

  const handleRsvpChange = async (eventId: number, response: 'going' | 'maybe' | 'pass') => {
    try {
      await swipeEventMutation({
        variables: {
          eventId,
          response,
        },
      })
    } catch (err) {
      console.error('[MyPlans RSVP Mutation Error]', err)
    }
  }

  const rawRsvps = rsvpData?.myRsvps || []
  const rawAllEvents = eventsData?.allEvents || []

  // Adapt GraphQL backend RSVPs and events into unified MyPlans shape
  const unifiedPlans: ScheduledEvent[] = useMemo(() => {
    const planMap = new Map<string, ScheduledEvent>()

    // 1. Add user's explicit RSVPs
    rawRsvps.forEach((r: any) => {
      if (r.event && r.event.id) {
        const idStr = String(r.event.id)
        planMap.set(idStr, {
          id: r.event.id,
          title: r.event.title || 'Community Gathering',
          description: r.event.description,
          locationName: r.event.locationName,
          scheduledDate: r.event.scheduledDate || r.event.createdAt || now.toISOString(),
          createdAt: r.event.createdAt,
          imageUrl: r.event.imageUrl,
          pointsReward: r.event.pointsReward,
          visibility: r.event.visibility,
          trustScore: r.event.trustScore,
          creator: r.event.creator,
          hobbies: r.event.hobbies,
          response: r.response,
          role:
            r.event.creator?.username?.toLowerCase() === user?.username?.toLowerCase()
              ? 'hosting'
              : 'attending',
        })
      }
    })

    // 2. Add plans hosted by the user
    rawAllEvents.forEach((ev: any) => {
      const isHost = ev.creator?.username?.toLowerCase() === user?.username?.toLowerCase()
      if (isHost && !planMap.has(String(ev.id))) {
        planMap.set(String(ev.id), {
          id: ev.id,
          title: ev.title || 'Hosted Plan',
          description: ev.description,
          locationName: ev.locationName,
          scheduledDate: ev.scheduledDate || ev.createdAt || now.toISOString(),
          createdAt: ev.createdAt,
          imageUrl: ev.imageUrl,
          pointsReward: ev.pointsReward,
          visibility: ev.visibility,
          trustScore: ev.trustScore,
          creator: ev.creator,
          hobbies: ev.hobbies,
          role: 'hosting',
          response: 'going',
        })
      }
    })

    return Array.from(planMap.values())
  }, [rawRsvps, rawAllEvents, user, now])

  // Strict dynamic filtering for upcoming vs past plans
  const { upcomingPlans, pastPlans } = useMemo(() => {
    const upcoming: ScheduledEvent[] = []
    const past: ScheduledEvent[] = []

    unifiedPlans.forEach((plan) => {
      const pDate = plan.scheduledDate ? new Date(plan.scheduledDate) : new Date(now)
      const pTime = isNaN(pDate.getTime()) ? now.getTime() : pDate.getTime()

      if (pTime >= todayMidnight.getTime()) {
        upcoming.push(plan)
      } else {
        past.push(plan)
      }
    })

    // Sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || 0).getTime()
      const dateB = new Date(b.scheduledDate || 0).getTime()
      return dateA - dateB
    })

    // Sort past descending (most recent past first)
    past.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || 0).getTime()
      const dateB = new Date(b.scheduledDate || 0).getTime()
      return dateB - dateA
    })

    return { upcomingPlans: upcoming, pastPlans: past }
  }, [unifiedPlans, todayMidnight, now])

  const displayedPlans = activeTab === 'upcoming' ? upcomingPlans : pastPlans
  const isLoading = rsvpLoading || eventsLoading

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 antialiased">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <SectionHeading>My Plans</SectionHeading>
          <p className="text-sm text-muted mt-1">
            Real-time schedule of plans you are hosting or attending
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-xs font-semibold text-charcoal hover:bg-sand transition-colors cursor-pointer"
          >
            <span>📅</span>
            <span>Calendar View</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/post-a-plan')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Post a plan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-sand rounded-xl w-fit mb-8 shadow-2xs border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-white text-charcoal shadow-xs'
              : 'text-muted hover:text-charcoal'
          }`}
        >
          <span>Upcoming</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'upcoming'
                ? 'bg-[#eaf3ed] text-[#2D5A3D]'
                : 'bg-sand text-muted'
            }`}
          >
            {upcomingPlans.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'past'
              ? 'bg-white text-charcoal shadow-xs'
              : 'text-muted hover:text-charcoal'
          }`}
        >
          <span>Past Plans</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'past'
                ? 'bg-[#fdf0eb] text-[#C47B5A]'
                : 'bg-sand text-muted'
            }`}
          >
            {pastPlans.length}
          </span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-20 text-muted font-serif animate-pulse text-sm">
          Loading your real-time plans from havens...
        </div>
      )}

      {/* Error State */}
      {rsvpError && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs mb-6 flex justify-between items-center">
          <span>Failed to load RSVPs: {rsvpError.message}</span>
          <button
            onClick={() => {
              refetchRsvps()
              refetchEvents()
            }}
            className="text-xs font-semibold underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Plans list */}
      {!isLoading && displayedPlans.length > 0 && (
        <div className="flex flex-col gap-4 max-w-4xl">
          {displayedPlans.map((plan) => (
            <ScheduledEventCard
              key={String(plan.id)}
              event={plan}
              isPast={activeTab === 'past'}
              onRsvpChange={handleRsvpChange}
              currentUsername={user?.username}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedPlans.length === 0 && (
        <div className="text-center py-16 px-6 max-w-md mx-auto rounded-3xl bg-white border border-border shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center text-2xl mx-auto font-bold">
            🌿
          </div>
          <div>
            <h3 className="text-base font-bold text-charcoal font-serif">
              {activeTab === 'upcoming'
                ? 'Your calendar is clear. Go discover some Havens!'
                : 'No past plans on record'}
            </h3>
            <p className="text-xs text-muted mt-1.5 leading-relaxed">
              {activeTab === 'upcoming'
                ? 'Join your community by swiping on plans or creating your own event.'
                : 'Past attended events will be archived here for your memories.'}
            </p>
          </div>
          {activeTab === 'upcoming' && (
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              🔍 Explore Havens Feed
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default MyPlansView
