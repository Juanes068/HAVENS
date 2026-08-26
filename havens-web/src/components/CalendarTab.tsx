/**
 * ============================================================================
 * ARCHITECTURE OVERVIEW: CalendarTab (havens-web/src/components/CalendarTab.tsx)
 * ============================================================================
 * Role: Monthly calendar matrix, day-specific RSVP schedule, and RSVP updater.
 * Current Anti-Pattern: Combines date math, day cell matrices, query filtering,
 * modal popups, and RSVP mutations in a single component.
 *
 * Target Decomposition Blueprint (See MODULARITY_AUDIT.md):
 *   - components/Calendar/CalendarGrid.tsx    -> Month grid & day cell math
 *   - components/Calendar/DayEventList.tsx    -> Cards scheduled for selected date
 *   - components/Calendar/EventDetailModal.tsx-> Full RSVP details popup
 *   - components/Calendar/hooks/useCalendar.ts-> Month nav & date filtering
 * ============================================================================
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { SectionHeading } from './SectionHeading'
import { Avatar } from './Avatar'
import { ScheduledEventCard, ScheduledEvent } from './ScheduledEventCard'
import { MY_RSVPS, GET_ALL_EVENTS, SWIPE_EVENT } from '../graphql/operations'
import { useAuth } from '../context/AuthContext'
import {
  CalendarDays,
  Compass,
  ArrowLeft,
  Check,
  HelpCircle,
  Share2,
  MapPin,
  Clock,
  Star,
  Users,
  Crown,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

// ─── [DOMAIN 1: DATE UTILITIES & MATRIX CALCULATORS] ────────────────────────
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
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null)
  const [shareCopied, setShareCopied] = useState(false)
  
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
    skip: !user,
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
          ageRange: r.event.ageRange,
          goingCount: r.event.goingCount,
          attendees: r.event.attendees,
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
          ageRange: ev.ageRange,
          goingCount: ev.goingCount,
          attendees: ev.attendees,
          rsvps: ev.rsvps,
          creator: ev.creator,
          hobbies: ev.hobbies,
          role: isHost ? 'hosting' : undefined,
        })
      }
    })

    return Array.from(eventMap.values())
  }, [rawRsvps, rawAllEvents, user])

  // Selected event entity
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null
    return unifiedEvents.find((e) => String(e.id) === String(selectedEventId)) || null
  }, [unifiedEvents, selectedEventId])

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
    const dayEvs = unifiedEvents.filter((e) => isSameCalendarDay(e.scheduledDate, today))
    if (dayEvs.length > 0) {
      setSelectedEventId(dayEvs[0].id)
    }
  }

  // Interactive Day Click Handler: Selects date and auto-switches tab to "Selected Day"
  const handleSelectDay = (day: number) => {
    const newSelected = new Date(currentViewYear, currentViewMonth, day)
    setSelectedDate(newSelected)
    setActiveTab('selected')
    const dayEvs = unifiedEvents.filter((e) => isSameCalendarDay(e.scheduledDate, newSelected))
    if (dayEvs.length > 0) {
      setSelectedEventId(dayEvs[0].id)
    } else {
      setSelectedEventId(null)
    }
  }

  // Share Event Handler (Web Share API with Clipboard Fallback)
  const handleShareEvent = async (event: ScheduledEvent) => {
    const shareUrl = `${window.location.origin}/discover?event=${event.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: event.description || `Join me for ${event.title} on Havens!`,
          url: shareUrl,
        })
        return
      } catch (err) {
        // User aborted share or not supported
      }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    }
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
          <SectionHeading>Calendar</SectionHeading>
          <p className="text-sm text-stone-500 mt-1">
            Real-time schedule of upcoming gatherings across your community
          </p>
        </div>

        {/* Primary Action Button: Post plan */}
        <button
          type="button"
          onClick={() => navigate('/plans')}
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

        {/* 2. RIGHT COLUMN: 30% WIDTH (md:col-span-3) WITH EXTENDED DETAILS OR EVENT FEED */}
        <div className="md:col-span-3 space-y-4 w-full flex flex-col max-h-[85vh]">
          
          {selectedEvent ? (
            /* ═══════════════════════════════════════════════════════════ */
            /* EXTENDED EVENT DETAIL PANEL VIEW                          */
            /* ═══════════════════════════════════════════════════════════ */
            <div className="bg-white border border-[#E2DBD0] rounded-3xl p-5 shadow-xs flex flex-col max-h-[82vh] overflow-y-auto space-y-4 [scrollbar-width:thin] [scrollbar-color:#E2DBD0_transparent]">
              
              {/* Back to feed header button */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E2DBD0]/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedEventId(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A3D] hover:text-[#3d7a55] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to plans feed</span>
                </button>
                {selectedEvent.pointsReward ? (
                  <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full shadow-2xs flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>+{selectedEvent.pointsReward} pts</span>
                  </span>
                ) : null}
              </div>

              {/* Event Image Banner (if available) */}
              {selectedEvent.imageUrl && (
                <div className="w-full h-44 rounded-2xl overflow-hidden bg-[#F4EEE2] relative border border-[#E2DBD0]/60 shrink-0">
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Status Badges */}
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {selectedEvent.role === 'hosting' ? (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/20 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-[#2D5A3D]" />
                      <span>Hosting</span>
                    </span>
                  ) : selectedEvent.response === 'going' ? (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center gap-1">
                      <Check className="w-3 h-3 text-[#2D5A3D]" />
                      <span>Going</span>
                    </span>
                  ) : selectedEvent.response === 'maybe' ? (
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#fef9ee] text-[#b87e28] flex items-center gap-1">
                      <HelpCircle className="w-3 h-3 text-[#b87e28]" />
                      <span>Maybe</span>
                    </span>
                  ) : null}

                  {selectedEvent.visibility && (
                    <span className="text-[10px] text-stone-500 capitalize px-2 py-0.5 rounded-md bg-[#F4EEE2] border border-[#E2DBD0]/60">
                      {selectedEvent.visibility.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold font-serif text-stone-900 leading-tight">
                  {selectedEvent.title}
                </h2>
              </div>

              {/* Host info row */}
              {selectedEvent.creator && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-[#FDFBF7] border border-[#E2DBD0]/60">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={selectedEvent.creator.username || 'Host'}
                      photoUrl={selectedEvent.creator.photoUrl}
                      color="#2D5A3D"
                      size="md"
                    />
                    <div>
                      <p className="text-xs font-semibold text-stone-900">
                        @{selectedEvent.creator.username}
                      </p>
                      <p className="text-[10px] text-stone-500">Event Host</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date, Time & Location Details */}
              <div className="space-y-2 text-xs">
                {selectedEvent.scheduledDate && !isNaN(new Date(selectedEvent.scheduledDate).getTime()) && (
                  <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#eaf3ed]/40 border border-[#2D5A3D]/15 text-[#2D5A3D]">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-[#2D5A3D]" />
                    <div>
                      <p className="font-semibold">
                        {new Intl.DateTimeFormat('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        }).format(new Date(selectedEvent.scheduledDate))}
                      </p>
                      <p className="text-[11px] text-stone-600 mt-0.5">
                        {new Intl.DateTimeFormat('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        }).format(new Date(selectedEvent.scheduledDate))}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FDFBF7] border border-[#E2DBD0]/60 text-stone-700">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#C47B5A]" />
                  <div>
                    <p className="font-semibold text-stone-900">
                      {selectedEvent.locationName || 'Local Haven Location'}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">Physical gathering point</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="space-y-1 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">About Gathering</h4>
                  <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap bg-[#FDFBF7] p-3 rounded-2xl border border-[#E2DBD0]/40">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Passions / Hobbies */}
              {selectedEvent.hobbies && selectedEvent.hobbies.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Passions</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEvent.hobbies.map((hb) => (
                      <span
                        key={hb.id}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30"
                      >
                        #{hb.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Going Attendees List */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="space-y-2 p-3 rounded-2xl bg-[#FAF8F5] border border-[#E2DBD0]/60">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-800">
                    <span className="flex items-center gap-1.5 text-[#2D5A3D]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Going ({selectedEvent.goingCount || selectedEvent.attendees.length})</span>
                    </span>
                    <span className="text-[10px] text-stone-500 font-normal">Confirmed Attendees</span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {selectedEvent.attendees.map((att: any) => (
                      <div key={att.id} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#E2DBD0] shrink-0 shadow-2xs">
                        <Avatar
                          name={att.username}
                          photoUrl={att.photoUrl}
                          size="xs"
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-[11px] font-semibold text-stone-800">@{att.username}</span>
                        {att.age && (
                          <span className="text-[9px] text-stone-500 font-medium">{att.age}y</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Confirmation Banner */}
              {shareCopied && (
                <div className="p-2 text-xs bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/20 rounded-xl text-center font-medium">
                  ✓ Event link copied to clipboard!
                </div>
              )}

              {/* RSVP Action Bar */}
              <div className="pt-3 border-t border-[#E2DBD0]/60 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const eventIdNum = typeof selectedEvent.id === 'string' ? parseInt(selectedEvent.id, 10) : selectedEvent.id
                      handleRsvpChange(eventIdNum, selectedEvent.response === 'going' ? 'pass' : 'going')
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 ${
                      selectedEvent.response === 'going'
                        ? 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55]'
                        : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/20'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{selectedEvent.response === 'going' ? 'Going (Confirmed)' : 'Confirm (Going)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const eventIdNum = typeof selectedEvent.id === 'string' ? parseInt(selectedEvent.id, 10) : selectedEvent.id
                      handleRsvpChange(eventIdNum, selectedEvent.response === 'maybe' ? 'pass' : 'maybe')
                    }}
                    className={`py-2.5 px-4 rounded-2xl text-xs font-semibold transition-all cursor-pointer border flex items-center justify-center gap-1.5 ${
                      selectedEvent.response === 'maybe'
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        : 'border-[#E2DBD0] bg-white text-stone-700 hover:bg-[#F4EEE2]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Maybe</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleShareEvent(selectedEvent)}
                  className="w-full py-2 px-3 rounded-2xl border border-[#E2DBD0] bg-white hover:bg-[#F4EEE2] text-stone-700 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-500" />
                  <span>Share Event</span>
                </button>
              </div>

            </div>
          ) : (
            /* ═══════════════════════════════════════════════════════════ */
            /* UPCOMING / SELECTED DAY EVENT FEED LIST                   */
            /* ═══════════════════════════════════════════════════════════ */
            <>
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
                      <span>
                        Plans for{' '}
                        {selectedDate instanceof Date && !isNaN(selectedDate.getTime())
                          ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)
                          : 'Selected Day'}
                      </span>
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

              {/* SCROLLABLE EVENT FEED CONTAINER */}
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
                        isSelected={selectedEventId !== null && String(selectedEventId) === String(event.id)}
                        onSelect={() => setSelectedEventId(event.id)}
                        onRsvpChange={handleRsvpChange}
                        currentUsername={user?.username}
                      />
                    )
                  })}
                </div>
              )}

              {/* CLEAN EMPTY STATE */}
              {!isLoading && displayedFeedEvents.length === 0 && (
                <div className="text-center py-12 px-5 rounded-3xl bg-white/80 border border-[#E2DBD0] shadow-2xs space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center mx-auto">
                    <CalendarDays className="w-6 h-6 text-[#2D5A3D]" />
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
                    className="w-full py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Discover Havens</span>
                  </button>
                </div>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  )
}

export default CalendarTab
