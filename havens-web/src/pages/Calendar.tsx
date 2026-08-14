import React, { useState } from 'react'
import { useQuery } from '@apollo/client'
import { SectionHeading } from '../components/SectionHeading'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'
import { GET_ALL_EVENTS } from '../graphql/operations'

export type EventType = 'friend' | 'mutual' | 'conflict'

export interface CalEvent {
  id: number
  day: number
  title: string
  type: EventType
  time: string
  location?: string
  attendees: string[]
  avatarColor: string
}

const TYPE_DOT: Record<EventType, string> = {
  friend: 'bg-[#2D5A3D]',
  mutual: 'bg-[#7aaa8a]',
  conflict: 'bg-[#C47B5A]',
}

const TYPE_BADGE: Record<EventType, { bg: string; text: string; label: string }> = {
  friend: { bg: 'bg-[#eaf3ed]', text: 'text-[#2D5A3D]', label: "Friend's plan" },
  mutual: { bg: 'bg-[#f0f6f2]', text: 'text-[#5a8a6a]', label: 'Mutual' },
  conflict: { bg: 'bg-[#fdf0eb]', text: 'text-[#C47B5A]', label: 'Conflict' },
}   

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function CalendarDay({
  day,
  isToday,
  isSelected,
  events,
  onClick,
}: {
  day: number | null
  isToday: boolean
  isSelected: boolean
  events: CalEvent[]
  onClick: () => void
}) {
  if (day === null) return <div className="h-24 rounded-lg" />
  const hasConflict = events.some((e) => e.type === 'conflict')
  return (
    <button
      onClick={onClick}
      className={`h-24 rounded-xl p-2.5 text-left transition-all duration-150 border flex flex-col ${
        isSelected
          ? 'border-[#2D5A3D] bg-[#f0f6f2] shadow-sm'
          : isToday
          ? 'border-[#2D5A3D]/30 bg-[#f5faf7]'
          : 'border-transparent hover:border-border hover:bg-sand/40'
      }`}
    >
      <div className="flex items-center justify-between mb-auto">
        <span
          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
            isToday ? 'bg-[#2D5A3D] text-white' : isSelected ? 'text-[#2D5A3D]' : 'text-charcoal'
          }`}
        >
          {day}
        </span>
        {hasConflict && (
          <span className="text-[9px] font-medium text-terracotta bg-[#fdf0eb] px-1.5 py-0.5 rounded-full">
            conflict
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 mt-1">
        {events.slice(0, 2).map((e) => (
          <div key={e.id} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[e.type]}`} />
            <span className="text-[10px] text-[#5a5450] truncate leading-none">{e.title}</span>
          </div>
        ))}
        {events.length > 2 && (
          <span className="text-[10px] text-muted pl-3">+{events.length - 2} more</span>
        )}
      </div>
    </button>
  )
}

export const CalendarView: React.FC = () => {
  const [selectedDay, setSelectedDay] = useState<number | null>(15)
  const year = 2026
  const month = 6
  const today = 15

  const { data, loading } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  const rawEvents = data?.allEvents || []

  // Dynamic mapping from GraphQL backend events to CalEvent matrix
  const events: CalEvent[] = rawEvents.map((evt: any, idx: number) => ({
    id: parseInt(evt.id, 10) || idx + 1,
    day: ((idx * 5 + 3) % 28) + 1, // Distribute events across month days
    title: evt.title || 'Community Activity',
    type: idx % 3 === 0 ? 'friend' : idx % 3 === 1 ? 'mutual' : 'conflict',
    time: '6:00 PM',
    location: evt.locationName || 'Vancouver',
    attendees: [evt.creator?.username || 'Member'],
    avatarColor: idx % 2 === 0 ? '#2D5A3D' : '#7aaa8a',
  }))

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const getEventsForDay = (day: number) => events.filter((e) => e.day === day)

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-7">
      {/* Calendar panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionHeading>July 2026</SectionHeading>
            <p className="text-sm text-muted mt-0.5">
              {loading ? 'Fetching calendar schedule...' : `${events.length} live plans this month`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted uppercase tracking-wider py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => (
            <CalendarDay
              key={i}
              day={day}
              isToday={day === today}
              isSelected={day === selectedDay}
              events={day ? getEventsForDay(day) : []}
              onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
            />
          ))}
        </div>

        {selectedDay && getEventsForDay(selectedDay).length > 0 && (
          <div className="mt-6 p-5 rounded-xl border border-border bg-white">
            <h3 className="text-base text-charcoal mb-3 font-serif font-semibold">
              July {selectedDay}
            </h3>
            <div className="flex flex-col gap-2">
              {getEventsForDay(selectedDay).map((event) => {
                const badge = TYPE_BADGE[event.type]
                return (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg bg-cream">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[event.type]}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-charcoal">{event.title}</span>
                      <span className="text-xs text-muted ml-2">
                        {event.time} · {event.location}
                      </span>
                    </div>
                    <Badge label={badge.label} bg={badge.bg} text={badge.text} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-72 shrink-0">
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-charcoal font-serif font-semibold">Upcoming Plans</h2>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-260px)]">
            {events.slice(0, 5).map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedDay(event.day)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  event.day === selectedDay
                    ? 'border-[#2D5A3D] bg-[#f0f6f2] shadow-sm'
                    : 'border-border bg-white hover:border-[#b5cebe]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex flex-col items-center bg-cream rounded-lg px-2.5 py-1.5 border border-border min-w-[44px]">
                    <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                      Jul
                    </span>
                    <span className="text-lg font-semibold text-charcoal leading-tight font-serif">
                      {event.day}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal truncate">{event.title}</p>
                    <p className="text-xs text-muted mt-1">{event.location}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-[#2D5A3D] text-white">
            <p className="text-sm font-medium mb-1">Make plans happen</p>
            <p className="text-xs text-[#b5cebe] mb-3 leading-relaxed">
              Your friends are active on havens — post a plan today.
            </p>
          </div>
        </div>
      </aside>
    </div>
  )
}
