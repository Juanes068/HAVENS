import React, { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { Avatar } from '../components/Avatar'
import { Badge } from '../components/Badge'

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
  friend: 'bg-forest',
  mutual: 'bg-sage',
  conflict: 'bg-terracotta',
}

const TYPE_BADGE: Record<EventType, { bg: string; text: string; label: string }> = {
  friend: { bg: 'bg-[#eaf3ed]', text: 'text-forest', label: "Friend's plan" },
  mutual: { bg: 'bg-[#f0f6f2]', text: 'text-[#5a8a6a]', label: 'Mutual' },
  conflict: { bg: 'bg-[#fdf0eb]', text: 'text-terracotta', label: 'Conflict' },
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const CAL_EVENTS: CalEvent[] = [
  { id: 1, day: 2, title: 'Morning hike at Runyon', type: 'friend', time: '8:00 AM', location: 'Runyon Canyon', attendees: ['Maya', 'Jordan'], avatarColor: '#7aaa8a' },
  { id: 2, day: 4, title: 'Rooftop dinner', type: 'friend', time: '7:30 PM', location: 'The Perch', attendees: ['Priya', 'Sam', 'Leo'], avatarColor: '#2D5A3D' },
  { id: 3, day: 7, title: 'Coffee & catch-up', type: 'mutual', time: '10:00 AM', location: 'Intelligentsia', attendees: ['Alex', 'Nadia'], avatarColor: '#b5cebe' },
  { id: 4, day: 9, title: 'Gallery opening', type: 'friend', time: '6:00 PM', location: 'MOCA', attendees: ['Zoe', 'Marcus'], avatarColor: '#2D5A3D' },
  { id: 5, day: 11, title: 'Beach volleyball', type: 'mutual', time: '2:00 PM', location: 'Venice Beach', attendees: ['Tom', 'Keiko', 'Dev'], avatarColor: '#7aaa8a' },
  { id: 6, day: 12, title: "Farmer's market brunch", type: 'friend', time: '9:30 AM', location: 'Silver Lake FM', attendees: ['Cleo', 'Finn'], avatarColor: '#2D5A3D' },
  { id: 7, day: 14, title: 'Pilates class', type: 'conflict', time: '7:00 AM', location: 'Modo Yoga', attendees: ['Sasha'], avatarColor: '#C47B5A' },
  { id: 8, day: 14, title: 'Work offsite', type: 'conflict', time: '9:00 AM', location: 'Ace Hotel', attendees: ['Team'], avatarColor: '#C47B5A' },
  { id: 9, day: 17, title: 'Sunset picnic', type: 'friend', time: '5:30 PM', location: 'Griffith Park', attendees: ['Maya', 'Priya', 'Leo'], avatarColor: '#2D5A3D' },
  { id: 10, day: 19, title: 'Film screening', type: 'mutual', time: '7:00 PM', location: 'The Luminary', attendees: ['Nadia', 'Omar'], avatarColor: '#b5cebe' },
  { id: 11, day: 21, title: 'Cooking class', type: 'friend', time: '6:30 PM', location: 'Milk Street Kitchen', attendees: ['Jordan', 'Cleo'], avatarColor: '#2D5A3D' },
  { id: 12, day: 23, title: 'Warehouse party', type: 'mutual', time: '10:00 PM', location: 'Arts District', attendees: ['Dev', 'Zoe', 'Finn'], avatarColor: '#7aaa8a' },
  { id: 13, day: 25, title: 'Weekend road trip', type: 'conflict', time: 'All day', location: 'Big Sur', attendees: ['Sam', 'Marcus'], avatarColor: '#C47B5A' },
  { id: 14, day: 26, title: 'Weekend road trip', type: 'conflict', time: 'All day', location: 'Big Sur', attendees: ['Sam', 'Marcus'], avatarColor: '#C47B5A' },
  { id: 15, day: 28, title: 'Jazz at the Bowl', type: 'friend', time: '7:00 PM', location: 'Hollywood Bowl', attendees: ['Keiko', 'Tom', 'Alex'], avatarColor: '#2D5A3D' },
  { id: 16, day: 30, title: 'Rooftop yoga', type: 'mutual', time: '8:00 AM', location: 'Nomad Hotel', attendees: ['Sasha', 'Nadia'], avatarColor: '#7aaa8a' },
]

const UPCOMING_IDS = [4, 9, 11, 15, 1, 7]

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
          ? 'border-forest bg-[#f0f6f2] shadow-sm'
          : isToday
          ? 'border-forest/30 bg-[#f5faf7]'
          : 'border-transparent hover:border-border hover:bg-sand/40'
      }`}
    >
      <div className="flex items-center justify-between mb-auto">
        <span
          className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
            isToday ? 'bg-forest text-white' : isSelected ? 'text-forest' : 'text-charcoal'
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
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const getEventsForDay = (day: number) => CAL_EVENTS.filter((e) => e.day === day)
  const upcomingEvents = UPCOMING_IDS.map((id) => CAL_EVENTS.find((e) => e.id === id)!).filter(Boolean)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-7">
      {/* Calendar panel */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <SectionHeading>July 2026</SectionHeading>
            <p className="text-sm text-muted mt-0.5">14 plans this month · 2 conflicts to resolve</p>
          </div>
          <div className="flex items-center gap-2">
            {['M10 12L6 8l4-4', 'M6 4l4 4-4 4'].map((d, i) => (
              <button
                key={i}
                className="w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted hover:text-charcoal hover:border-[#b5cebe] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-5 mb-5">
          {[
            { color: '#2D5A3D', label: "Friends' plans" },
            { color: '#7aaa8a', label: 'Mutuals' },
            { color: '#C47B5A', label: 'Conflicts' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
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
                    <div className="flex items-center gap-1">
                      {event.attendees.slice(0, 3).map((name) => (
                        <Avatar key={name} name={name} color={event.avatarColor} />
                      ))}
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
            <button className="text-xs text-forest font-medium hover:text-forest-light transition-colors">
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { value: '14', label: 'This month', color: '#2D5A3D' },
              { value: '2', label: 'Conflicts', color: '#C47B5A' },
            ].map(({ value, label, color }) => (
              <div key={label} className="p-3 rounded-xl bg-white border border-border text-center">
                <p className="text-xl font-semibold font-serif" style={{ color }}>
                  {value}
                </p>
                <p className="text-[11px] text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-260px)]">
            {upcomingEvents.map((event) => {
              const badge = TYPE_BADGE[event.type]
              const dName = dayNames[new Date(2026, 6, event.day).getDay()]
              return (
                <button
                  key={event.id}
                  onClick={() => setSelectedDay(event.day === selectedDay ? null : event.day)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    event.day === selectedDay
                      ? 'border-forest bg-[#f0f6f2] shadow-sm'
                      : 'border-border bg-white hover:border-[#b5cebe] hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 flex flex-col items-center bg-cream rounded-lg px-2.5 py-1.5 border border-border min-w-[44px]">
                      <span className="text-[10px] font-medium text-muted uppercase tracking-wider">
                        {dName}
                      </span>
                      <span className="text-lg font-semibold text-charcoal leading-tight font-serif">
                        {event.day}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-charcoal leading-snug truncate">
                          {event.title}
                        </p>
                        <Badge label={badge.label} bg={badge.bg} text={badge.text} />
                      </div>
                      <p className="text-xs text-muted mb-2">
                        {event.time}
                        {event.location ? ` · ${event.location}` : ''}
                      </p>
                      <div className="flex items-center gap-1">
                        {event.attendees.slice(0, 4).map((name) => (
                          <Avatar key={name} name={name} color={event.avatarColor} />
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-4 p-4 rounded-xl bg-forest text-white">
            <p className="text-sm font-medium mb-1">Make plans happen</p>
            <p className="text-xs text-[#b5cebe] mb-3 leading-relaxed">
              Your friends are free this weekend — propose something.
            </p>
            <button className="w-full py-2 rounded-lg bg-white/15 hover:bg-white/25 text-sm font-medium transition-colors">
              + Suggest a plan
            </button>
          </div>
        </div>
      </aside>
    </div>
  )
}
