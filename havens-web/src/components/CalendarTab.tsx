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

/**
 * Robust calendar date comparator that avoids timezone shifting bugs
 * when comparing event scheduledDate strings against target Date objects.
 */
function isSameCalendarDay(eventDateStr: string | null | undefined, targetDate: Date): boolean {
  if (!eventDateStr) return false

  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()
  const targetDay = targetDate.getDate()

  // Parse YYYY-MM-DD prefix if present in ISO string
  if (typeof eventDateStr === 'string' && eventDateStr.includes('-')) {
    const parts = eventDateStr.split('T')[0].split('-')
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10)
      const m = parseInt(parts[1], 10) - 1
      const d = parseInt(parts[2], 10)

      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        if (y === targetYear && m === targetMonth && d === targetDay) {
          return true
        }
      }
    }
  }

  // Fallback to Date object comparison
  const parsed = new Date(eventDateStr)
  if (isNaN(parsed.getTime())) return false

  return (
    parsed.getFullYear() === targetYear &&
    parsed.getMonth() === targetMonth &&
    parsed.getDate() === targetDay
  )
}

interface CalendarDayCellProps {
  day: number | null
  isToday: boolean
  isSelected: boolean
  events: ScheduledEvent[]
  onClick: () => void
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  isToday,
  isSelected,
  events,
  onClick,
}) => {
  if (day === null) {
    return <div className="aspect-square w-full max-h-14 sm:max-h-16" />
  }

  const hasEvents = events.length > 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`aspect-square w-full max-h-14 sm:max-h-16 flex flex-col items-center justify-center p-1 sm:p-1.5 relative transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-[#2D5A3D] text-white rounded-xl sm:rounded-2xl shadow-xs scale-[1.02] z-10'
          : isToday
          ? 'rounded-xl sm:rounded-2xl ring-1 ring-[#2D5A3D]/40 text-[#2D5A3D] hover:bg-[#E2DBD0]'
          : 'rounded-xl sm:rounded-2xl text-stone-700 hover:bg-[#E2DBD0]'
      }`}
    >
      {/* Date Number */}
      <span
        className={`text-sm sm:text-base leading-none transition-colors ${
          isSelected
            ? 'font-bold text-white'
            : isToday
            ? 'font-bold text-[#2D5A3D]'
            : 'font-medium text-stone-800'
        }`}
      >
        {day}
      </span>

      {/* Terracotta Event Indicator Dot */}
      <div className="h-1.5 flex items-center justify-center mt-1">
        {hasEvents && (
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isSelected ? 'bg-white ring-1 ring-white/40' : 'bg-[#C47B5A]'
            }`}
          />
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

  // Calendar month navigation state & interactive selectedDate state
  const [viewDate, setViewDate] = useState<Date>(() => new Date(todayYear, todayMonth, 1))
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date(todayYear, todayMonth, todayDay))
  
  // Right Column Tabs: ONLY "Upcoming" and "Selected Day"
  const [activeTab, setActiveTab] = useState<'upcoming' | 'selected'>('upcoming')

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

  // Combine and normalize events from GraphQL backend
  const rawRsvps = rsvpData?.myRsvps || []
  const rawAllEvents = eventsData?.allEvents || []

  const unifiedEvents: ScheduledEvent[] = useMemo(() => {
    const eventMap = new Map<string, ScheduledEvent>()

    // 1. Ingest user RSVP'd events (strictly preserve actual scheduledDate without fake fallback)
    rawRsvps.forEach((r: any) => {
      if (r.event && r.event.id) {
        const idStr = String(r.event.id)
        eventMap.set(idStr, {
          id: r.event.id,
          title: r.event.title || 'Gathering',
          description: r.event.description,
          locationName: r.event.locationName,
          scheduledDate: r.event.scheduledDate || undefined,
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

    // 2. Ingest other community events (including user-hosted ones)
    rawAllEvents.forEach((ev: any) => {
      const idStr = String(ev.id)
      if (!eventMap.has(idStr)) {
        const isHost = ev.creator?.username?.toLowerCase() === user?.username?.toLowerCase()
        eventMap.set(idStr, {
          id: ev.id,
          title: ev.title || 'Community Activity',
          description: ev.description,
          locationName: ev.locationName,
          scheduledDate: ev.scheduledDate || undefined,
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
  }, [rawRsvps, rawAllEvents, user])

  // Filter 1: Upcoming Events (scheduledDate >= todayMidnight)
  const upcomingEvents = useMemo(() => {
    const upcoming: ScheduledEvent[] = []

    unifiedEvents.forEach((ev) => {
      if (!ev.scheduledDate) return
      const evDate = new Date(ev.scheduledDate)
      if (!isNaN(evDate.getTime()) && evDate.getTime() >= todayMidnight.getTime()) {
        upcoming.push(ev)
      }
    })

    // Sort ascending (soonest first)
    upcoming.sort((a, b) => {
      const dateA = new Date(a.scheduledDate || 0).getTime()
      const dateB = new Date(b.scheduledDate || 0).getTime()
      return dateA - dateB
    })

    return upcoming
  }, [unifiedEvents, todayMidnight])

  // 1. STRICT DATE FILTERING LOGIC: Strictly match ONLY events on the exact selectedDate
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return []
    return unifiedEvents.filter((ev) => isSameCalendarDay(ev.scheduledDate, selectedDate))
  }, [unifiedEvents, selectedDate])

  // Month navigation helpers
  const currentViewYear = viewDate.getFullYear()
  const currentViewMonth = viewDate.getMonth()

  const handlePrevMonth = () => {
    setViewDate(new Date(currentViewYear, currentViewMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate(new Date(currentViewYear, currentViewMonth + 1, 1))
  }

  const handleJumpToToday = () => {
    const today = new Date(todayYear, todayMonth, todayDay)
    setViewDate(new Date(todayYear, todayMonth, 1))
    setSelectedDate(today)
    setActiveTab('selected')
  }

  // Interactive Day Click Handler: Selects date and auto-switches tab to "Selected Day"
  const handleSelectDay = (day: number) => {
    const newSelected = new Date(currentViewYear, currentViewMonth, day)
    setSelectedDate(newSelected)
    setActiveTab('selected') // Auto-switch UX
  }

  // Dynamic formatted Month + Year title
  const monthTitle = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(viewDate)

  const selectedDateFormatted = selectedDate
    ? new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(selectedDate)
    : ''

  const isSelectedDateToday =
    selectedDate &&
    selectedDate.getFullYear() === todayYear &&
    selectedDate.getMonth() === todayMonth &&
    selectedDate.getDate() === todayDay

  const isSelectedDatePast =
    selectedDate &&
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 23, 59, 59).getTime() <
      todayMidnight.getTime()

  // Compute calendar matrix cells
  const daysInMonth = getDaysInMonth(currentViewYear, currentViewMonth)
  const firstDayOfWeek = getFirstDayOfWeek(currentViewYear, currentViewMonth)

  const cells: (number | null)[] = useMemo(() => {
    const padLeading = Array(firstDayOfWeek).fill(null)
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const allCells = [...padLeading, ...monthDays]
    while (allCells.length % 7 !== 0) {
      allCells.push(null)
    }
    return allCells
  }, [firstDayOfWeek, daysInMonth])

  // Events on a given day of the currently viewed month (for terracotta dot indicators)
  const getEventsForMonthDay = (day: number) => {
    const target = new Date(currentViewYear, currentViewMonth, day)
    return unifiedEvents.filter((e) => isSameCalendarDay(e.scheduledDate, target))
  }

  const monthEventsCount = unifiedEvents.filter((e) => {
    if (!e.scheduledDate) return false
    const d = new Date(e.scheduledDate)
    return (
      !isNaN(d.getTime()) &&
      d.getFullYear() === currentViewYear &&
      d.getMonth() === currentViewMonth
    )
  }).length

  const displayedFeedEvents = activeTab === 'upcoming' ? upcomingEvents : selectedDayEvents
  const isLoading = rsvpLoading || eventsLoading

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-8 antialiased">
      {/* Top Header Bar & Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <SectionHeading>Calendar & My Plans</SectionHeading>
          <p className="text-sm text-stone-500 mt-1">
            Real-time schedule of your hosted and attending gatherings
          </p>
        </div>

        {/* Primary Action Button: Post plan */}
        <button
          type="button"
          onClick={() => navigate('/post-a-plan')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
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

      {/* Error State Banner */}
      {rsvpError && !isLoading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs mb-6 flex justify-between items-center">
          <span>Failed to sync calendar data: {rsvpError.message}</span>
          <button
            type="button"
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

      {/* THE 70/30 SPLIT LAYOUT (grid-cols-1 md:grid-cols-10) */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-8 lg:gap-10 items-start">
        
        {/* LEFT COLUMN: 70% WIDTH (md:col-span-7) COMPACT ORGANIC CALENDAR GRID */}
        <div className="md:col-span-7 md:sticky md:top-4 h-fit space-y-3">
          <div className="bg-transparent">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-4 pb-3 border-b border-stone-200/60">
              <div className="text-left">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800 tracking-tight">
                  {monthTitle}
                </h2>
                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                  {isLoading
                    ? 'fetching schedule...'
                    : `${monthEventsCount} ${monthEventsCount === 1 ? 'plan' : 'plans'} in ${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(viewDate).toLowerCase()}`}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  title="Jump to Current Date"
                  className="px-3 py-1 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-[#E2DBD0] transition-colors cursor-pointer bg-transparent"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={handlePrevMonth}
                  title="Previous Month"
                  className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-[#E2DBD0] transition-colors cursor-pointer bg-transparent"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
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
                  className="w-8 h-8 rounded-lg border border-stone-300 flex items-center justify-center text-stone-600 hover:text-stone-900 hover:bg-[#E2DBD0] transition-colors cursor-pointer bg-transparent"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
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

            {/* Days of the Week: Lowercase, crisp text-xs */}
            <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-400 tracking-widest lowercase pb-2">
              {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Compact Grid Cells with "Filled Chair" Selection */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {cells.map((day, i) => {
                const dayEvents = day ? getEventsForMonthDay(day) : []
                const isToday =
                  day !== null &&
                  currentViewYear === todayYear &&
                  currentViewMonth === todayMonth &&
                  day === todayDay

                const isSelected =
                  day !== null &&
                  selectedDate !== null &&
                  selectedDate.getFullYear() === currentViewYear &&
                  selectedDate.getMonth() === currentViewMonth &&
                  selectedDate.getDate() === day

                return (
                  <CalendarDayCell
                    key={i}
                    day={day}
                    isToday={isToday}
                    isSelected={isSelected}
                    events={dayEvents}
                    onClick={() => {
                      if (day) {
                        handleSelectDay(day)
                      }
                    }}
                  />
                )
              })}
            </div>

          </div>
        </div>

        {/* 2. RIGHT COLUMN: 30% WIDTH (md:col-span-3) WITH INTERNAL VERTICAL SCROLL */}
        <div className="md:col-span-3 space-y-4 w-full flex flex-col max-h-[85vh]">
          
          {/* Clean Pill Toggle Menu: STRICTLY Two Tabs ("Upcoming" & "Selected Day") */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-[#F0EAE0] rounded-xl shadow-2xs border border-[#E2DBD0]/60 w-full sm:w-auto">
              
              {/* Tab 1: Upcoming */}
              <button
                type="button"
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-stone-800 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>Upcoming</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'upcoming'
                      ? 'bg-[#eaf3ed] text-[#2D5A3D]'
                      : 'bg-[#F0EAE0] text-stone-500'
                  }`}
                >
                  {upcomingEvents.length}
                </span>
              </button>

              {/* Tab 2: Selected Day */}
              <button
                type="button"
                onClick={() => setActiveTab('selected')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'selected'
                    ? 'bg-white text-stone-800 shadow-xs'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                <span>Selected Day</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'selected'
                      ? 'bg-[#eaf3ed] text-[#2D5A3D]'
                      : 'bg-[#F0EAE0] text-stone-500'
                  }`}
                >
                  {selectedDayEvents.length}
                </span>
              </button>

            </div>
          </div>

          {/* Feed Title Bar with Selected Date Context */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E2DBD0]/60 shrink-0">
            <h3 className="text-sm font-bold font-serif text-stone-800 flex items-center gap-2 flex-wrap">
              {activeTab === 'upcoming' ? (
                <span>All Upcoming Plans ({upcomingEvents.length})</span>
              ) : (
                <>
                  <span>Plans for {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)}</span>
                  {isSelectedDateToday && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white">
                      Today
                    </span>
                  )}
                  {isSelectedDatePast && !isSelectedDateToday && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fdf0eb] text-[#C47B5A]">
                      Past
                    </span>
                  )}
                </>
              )}
            </h3>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center py-16 text-stone-400 font-serif animate-pulse text-sm">
              Loading your Havens schedule...
            </div>
          )}

          {/* 2. SCROLLABLE EVENT FEED CONTAINER (max-h-[70vh] overflow-y-auto with smooth styled scrollbar) */}
          {!isLoading && displayedFeedEvents.length > 0 && (
            <div className="flex-1 overflow-y-auto max-h-[68vh] pr-1.5 space-y-3.5 [scrollbar-width:thin] [scrollbar-color:#E2DBD0_transparent]">
              {displayedFeedEvents.map((event) => {
                const evDate = event.scheduledDate ? new Date(event.scheduledDate) : new Date()
                const isEventPast = evDate.getTime() < todayMidnight.getTime()

                return (
                  <ScheduledEventCard
                    key={String(event.id)}
                    event={event}
                    isPast={isEventPast}
                    onRsvpChange={handleRsvpChange}
                    currentUsername={user?.username}
                  />
                )
              })}
            </div>
          )}

          {/* 3. CLEAN EMPTY STATE: Displayed ONLY when exact clicked date has 0 events */}
          {!isLoading && displayedFeedEvents.length === 0 && (
            <div className="text-center py-12 px-5 rounded-3xl bg-white/80 border border-[#E2DBD0] shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center text-xl mx-auto font-serif font-bold">
                🌿
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-800 font-serif">
                  {activeTab === 'upcoming'
                    ? 'Your calendar is clear. Go discover some Havens!'
                    : 'No events scheduled for this date.'}
                </h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {activeTab === 'upcoming'
                    ? 'Explore upcoming community gatherings, RSVP with friends, or host your own plan.'
                    : `No gatherings are scheduled for ${selectedDateFormatted}. Click another date on the calendar or explore live community events.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/discover')}
                className="w-full py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                🔍 Discover Havens
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}

export default CalendarTab
