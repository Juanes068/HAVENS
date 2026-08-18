import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from './SectionHeading'
import { ScheduledEventCard, ScheduledEvent } from './ScheduledEventCard'
import { MY_RSVPS, GET_ALL_EVENTS, SWIPE_EVENT } from '../graphql/operations'
import { useAuth } from '../context/AuthContext'

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

interface CalendarDayProps {
  day: number | null
  isToday: boolean
  isSelected: boolean
  events: ScheduledEvent[]
  isPastMonthDay: boolean
  onClick: () => void
}

const CalendarDayCell: React.FC<CalendarDayProps> = ({
  day,
  isToday,
  isSelected,
  events,
  isPastMonthDay,
  onClick,
}) => {
  if (day === null) {
    return <div className="h-20 sm:h-24 rounded-xl bg-transparent" />
  }

  const hasEvents = events.length > 0
  const hasPastEventsOnly = hasEvents && events.every((e) => {
    const d = e.scheduledDate ? new Date(e.scheduledDate) : null
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return d ? d.getTime() < now.getTime() : false
  })

  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-20 sm:h-24 rounded-xl p-2 sm:p-2.5 text-left transition-all duration-150 border flex flex-col justify-between cursor-pointer relative group ${
        isSelected
          ? 'border-[#2D5A3D] bg-[#f0f6f2] shadow-sm ring-1 ring-[#2D5A3D]/30'
          : isToday
          ? 'border-[#2D5A3D]/40 bg-[#f5faf7] shadow-2xs'
          : hasEvents
          ? 'border-[#E2DBD0] bg-white hover:border-[#b5cebe] hover:bg-[#FAFDFB]'
          : 'border-transparent hover:border-[#E2DBD0] hover:bg-sand/40'
      }`}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className={`text-xs sm:text-sm font-medium w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full transition-colors ${
            isToday
              ? 'bg-[#2D5A3D] text-white font-bold'
              : isSelected
              ? 'bg-[#2D5A3D]/15 text-[#2D5A3D] font-bold'
              : isPastMonthDay
              ? 'text-muted'
              : 'text-charcoal'
          }`}
        >
          {day}
        </span>

        {hasEvents && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              hasPastEventsOnly
                ? 'bg-sand text-muted'
                : 'bg-[#eaf3ed] text-[#2D5A3D]'
            }`}
          >
            {events.length} {events.length === 1 ? 'plan' : 'plans'}
          </span>
        )}
      </div>

      {/* Mini Event Titles */}
      <div className="flex flex-col gap-1 w-full overflow-hidden mt-1">
        {events.slice(0, 2).map((e) => (
          <div key={String(e.id)} className="flex items-center gap-1.5 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isPastMonthDay ? 'bg-muted' : 'bg-[#2D5A3D]'
              }`}
            />
            <span className="text-[10px] text-[#5a5450] truncate leading-tight font-medium">
              {e.title}
            </span>
          </div>
        ))}
        {events.length > 2 && (
          <span className="text-[9px] text-muted font-medium pl-2.5">
            +{events.length - 2} more
          </span>
        )}
      </div>
    </button>
  )
}

export const CalendarTab: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  // Real-time system date anchor
  const now = useMemo(() => new Date(), [])
  const todayYear = now.getFullYear()
  const todayMonth = now.getMonth()
  const todayDay = now.getDate()
  const todayMidnight = useMemo(() => {
    const t = new Date(now)
    t.setHours(0, 0, 0, 0)
    return t
  }, [now])

  // Calendar month navigation state
  const [viewDate, setViewDate] = useState<Date>(() => new Date(todayYear, todayMonth, 1))
  const [selectedDay, setSelectedDay] = useState<number | null>(() => todayDay)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')

  // GraphQL Data queries
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

  // Swipe / RSVP mutation for dynamic interactive updates
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
      console.error('[Calendar RSVP Mutation Error]', err)
    }
  }

  // Combine and normalize events from GraphQL
  const rawRsvps = rsvpData?.myRsvps || []
  const rawAllEvents = eventsData?.allEvents || []

  const unifiedEvents: ScheduledEvent[] = useMemo(() => {
    const eventMap = new Map<string, ScheduledEvent>()

    // 1. Ingest RSVP'd events
    rawRsvps.forEach((r: any) => {
      if (r.event && r.event.id) {
        const idStr = String(r.event.id)
        eventMap.set(idStr, {
          id: r.event.id,
          title: r.event.title || 'Gathering',
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

    // 2. Ingest other events (e.g. created by user or available on Havens)
    rawAllEvents.forEach((ev: any) => {
      const idStr = String(ev.id)
      if (!eventMap.has(idStr)) {
        const isHost = ev.creator?.username?.toLowerCase() === user?.username?.toLowerCase()
        eventMap.set(idStr, {
          id: ev.id,
          title: ev.title || 'Community Activity',
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
          role: isHost ? 'hosting' : undefined,
        })
      }
    })

    return Array.from(eventMap.values())
  }, [rawRsvps, rawAllEvents, user, now])

  // Strict Upcoming vs Past Filtering Logic
  const { upcomingEvents, pastEvents } = useMemo(() => {
    const upcoming: ScheduledEvent[] = []
    const past: ScheduledEvent[] = []

    unifiedEvents.forEach((ev) => {
      const evDate = ev.scheduledDate ? new Date(ev.scheduledDate) : new Date(now)
      const evTimestamp = isNaN(evDate.getTime()) ? now.getTime() : evDate.getTime()

      if (evTimestamp >= todayMidnight.getTime()) {
        upcoming.push(ev)
      } else {
        past.push(ev)
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

    return { upcomingEvents: upcoming, pastEvents: past }
  }, [unifiedEvents, todayMidnight, now])

  // Month navigation helpers
  const currentYear = viewDate.getFullYear()
  const currentMonth = viewDate.getMonth()

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1))
    setSelectedDay(null)
  }

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1))
    setSelectedDay(null)
  }

  const handleJumpToToday = () => {
    setViewDate(new Date(todayYear, todayMonth, 1))
    setSelectedDay(todayDay)
  }

  // Dynamic formatted Month + Year title
  const monthTitle = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(viewDate)

  // Compute calendar matrix cells
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth)

  const cells: (number | null)[] = useMemo(() => {
    const padLeading = Array(firstDayOfWeek).fill(null)
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const allCells = [...padLeading, ...monthDays]
    while (allCells.length % 7 !== 0) {
      allCells.push(null)
    }
    return allCells
  }, [firstDayOfWeek, daysInMonth])

  // Events on a given day of the currently viewed month
  const getEventsForMonthDay = (day: number) => {
    return unifiedEvents.filter((e) => {
      const d = e.scheduledDate ? new Date(e.scheduledDate) : null
      if (!d || isNaN(d.getTime())) return false
      return (
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d.getDate() === day
      )
    })
  }

  // Events on the currently selected day
  const selectedDayEvents = selectedDay ? getEventsForMonthDay(selectedDay) : []
  const isSelectedDayPast = selectedDay
    ? new Date(currentYear, currentMonth, selectedDay, 23, 59, 59).getTime() < todayMidnight.getTime()
    : false

  const displayedListEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents
  const isLoading = rsvpLoading || eventsLoading

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 antialiased">
      {/* Top Header & Mode Toggle Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <SectionHeading>Calendar & My Plans</SectionHeading>
          <p className="text-sm text-muted mt-1">
            Real-time schedule of your hosted and attending gatherings
          </p>
        </div>

        {/* Action Buttons & Tab Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Upcoming vs Past Pill Toggle */}
          <div className="flex items-center gap-1 p-1 bg-sand rounded-xl shadow-2xs border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                {upcomingEvents.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'past'
                  ? 'bg-white text-charcoal shadow-xs'
                  : 'text-muted hover:text-charcoal'
              }`}
            >
              <span>Past Events</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === 'past'
                    ? 'bg-[#fdf0eb] text-[#C47B5A]'
                    : 'bg-sand text-muted'
                }`}
              >
                {pastEvents.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/post-a-plan')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Post a plan
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {rsvpError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs mb-6 flex justify-between items-center">
          <span>Failed to sync calendar data: {rsvpError.message}</span>
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

      {/* Main Grid: Calendar Month View (Left) + Plans Feed (Right) */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: Interactive Month Matrix */}
        <div className="flex-1 min-w-0">
          
          {/* Calendar Header with Dynamic Month/Year & Navigation Controls */}
          <div className="flex items-center justify-between mb-4 bg-white p-4 rounded-2xl border border-border shadow-2xs">
            <div>
              <h2 className="text-xl font-bold font-serif text-charcoal">
                {monthTitle}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {isLoading
                  ? 'Fetching live schedule...'
                  : `${
                      unifiedEvents.filter((e) => {
                        const d = e.scheduledDate ? new Date(e.scheduledDate) : null
                        return (
                          d &&
                          d.getFullYear() === currentYear &&
                          d.getMonth() === currentMonth
                        )
                      }).length
                    } plans in this month`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleJumpToToday}
                title="Jump to Current Date"
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-charcoal hover:bg-sand transition-colors cursor-pointer"
              >
                Today
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-charcoal hover:bg-sand transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8l4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  title="Next Month"
                  className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-charcoal hover:bg-sand transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Legend */}
          <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-muted uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Dynamic Month Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {cells.map((day, i) => {
              const dayEvents = day ? getEventsForMonthDay(day) : []
              const isToday =
                day !== null &&
                currentYear === todayYear &&
                currentMonth === todayMonth &&
                day === todayDay

              const isPastDay =
                day !== null &&
                new Date(currentYear, currentMonth, day, 23, 59, 59).getTime() <
                  todayMidnight.getTime()

              return (
                <CalendarDayCell
                  key={i}
                  day={day}
                  isToday={isToday}
                  isSelected={day === selectedDay}
                  events={dayEvents}
                  isPastMonthDay={isPastDay}
                  onClick={() => {
                    if (day) {
                      setSelectedDay(day === selectedDay ? null : day)
                    }
                  }}
                />
              )
            })}
          </div>

          {/* Selected Day Agenda Drill-Down Panel */}
          {selectedDay && (
            <div className="mt-6 p-6 rounded-2xl border border-border bg-white shadow-2xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📅</span>
                  <h3 className="text-base font-bold text-charcoal font-serif">
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(currentYear, currentMonth, selectedDay))}
                  </h3>
                  {selectedDay === todayDay &&
                    currentYear === todayYear &&
                    currentMonth === todayMonth && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white">
                        Today
                      </span>
                    )}
                  {isSelectedDayPast && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fdf0eb] text-[#C47B5A]">
                      Past Date
                    </span>
                  )}
                </div>

                <span className="text-xs text-muted">
                  {selectedDayEvents.length}{' '}
                  {selectedDayEvents.length === 1 ? 'event scheduled' : 'events scheduled'}
                </span>
              </div>

              {selectedDayEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayEvents.map((event) => (
                    <ScheduledEventCard
                      key={String(event.id)}
                      event={event}
                      isPast={isSelectedDayPast}
                      onRsvpChange={handleRsvpChange}
                      currentUsername={user?.username}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted bg-sand/30 rounded-xl border border-dashed border-border/80">
                  <p className="text-sm font-medium">No plans scheduled for this day</p>
                  <p className="text-xs mt-1 text-[#8a8278]">
                    Click another date or post a plan to invite friends!
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Filtered Plans Feed (Upcoming / Past) */}
        <aside className="w-full lg:w-96 shrink-0">
          <div className="sticky top-24 space-y-4">
            
            {/* Feed Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <h2 className="text-lg font-bold text-charcoal font-serif">
                {activeTab === 'upcoming' ? 'Upcoming Plans' : 'Past Plans History'}
              </h2>
              <span className="text-xs font-semibold text-[#2D5A3D]">
                {displayedListEvents.length} {activeTab}
              </span>
            </div>

            {/* Loading Indicator */}
            {isLoading && (
              <div className="text-center py-12 text-muted font-serif animate-pulse text-sm">
                Updating your Havens schedule...
              </div>
            )}

            {/* Plans List */}
            {!isLoading && displayedListEvents.length > 0 && (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {displayedListEvents.map((event) => {
                  const evDate = event.scheduledDate ? new Date(event.scheduledDate) : new Date()
                  const isEventPast = activeTab === 'past' || evDate.getTime() < todayMidnight.getTime()
                  const isSelectedInFeed =
                    selectedDay !== null &&
                    evDate.getFullYear() === currentYear &&
                    evDate.getMonth() === currentMonth &&
                    evDate.getDate() === selectedDay

                  return (
                    <ScheduledEventCard
                      key={String(event.id)}
                      event={event}
                      isPast={isEventPast}
                      isSelected={isSelectedInFeed}
                      onSelect={() => {
                        setViewDate(new Date(evDate.getFullYear(), evDate.getMonth(), 1))
                        setSelectedDay(evDate.getDate())
                      }}
                      onRsvpChange={handleRsvpChange}
                      currentUsername={user?.username}
                    />
                  )
                })}
              </div>
            )}

            {/* EMPTY STATE */}
            {!isLoading && displayedListEvents.length === 0 && (
              <div className="text-center py-12 px-6 rounded-2xl bg-white border border-border shadow-2xs space-y-4">
                <div className="w-14 h-14 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center text-2xl mx-auto font-serif font-bold">
                  🌿
                </div>

                <div>
                  <h3 className="text-base font-bold text-charcoal font-serif">
                    {activeTab === 'upcoming'
                      ? 'Your calendar is clear. Go discover some Havens!'
                      : 'No past plans found'}
                  </h3>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">
                    {activeTab === 'upcoming'
                      ? 'Browse live community events, RSVP with friends, or host your own gathering.'
                      : 'Events you attended previously will appear here archived as read-only.'}
                  </p>
                </div>

                {activeTab === 'upcoming' && (
                  <button
                    type="button"
                    onClick={() => navigate('/discover')}
                    className="w-full py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    🔍 Discover Havens Events
                  </button>
                )}
              </div>
            )}

            {/* Community Banner */}
            <div className="p-5 rounded-2xl bg-[#2D5A3D] text-white shadow-xs">
              <p className="text-sm font-semibold mb-1">Bring people together</p>
              <p className="text-xs text-[#b5cebe] mb-3 leading-relaxed">
                Connect with local groups and turn shared interests into real-life memories.
              </p>
              <button
                type="button"
                onClick={() => navigate('/post-a-plan')}
                className="w-full py-2 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors cursor-pointer"
              >
                + Host a new Haven
              </button>
            </div>

          </div>
        </aside>

      </div>
    </div>
  )
}
