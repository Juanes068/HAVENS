import React from 'react'
import { Avatar } from './Avatar'
import { HelpCircle, Clock, Crown, Check } from 'lucide-react'

export interface ScheduledEvent {
  id: string | number
  title: string
  description?: string
  locationName?: string
  scheduledDate?: string | Date
  createdAt?: string
  imageUrl?: string
  pointsReward?: number
  visibility?: string
  trustScore?: number
  creator?: {
    id?: string | number
    username: string
    photoUrl?: string
  }
  hobbies?: {
    id: string | number
    name: string
  }[]
  response?: 'going' | 'maybe' | 'pass' | string
  role?: 'hosting' | 'attending'
}

export interface ScheduledEventCardProps {
  event: ScheduledEvent
  isPast?: boolean
  isSelected?: boolean
  onSelect?: () => void
  onRsvpChange?: (eventId: number, response: 'going' | 'maybe' | 'pass') => void
  currentUsername?: string
  showActions?: boolean
}

export const ScheduledEventCard: React.FC<ScheduledEventCardProps> = ({
  event,
  isPast = false,
  isSelected = false,
  onSelect,
  onRsvpChange,
  currentUsername,
  showActions = true,
}) => {
  // Parse dynamic scheduled date safely
  const rawDate = event.scheduledDate ? new Date(event.scheduledDate) : new Date()
  const isValidDate = !isNaN(rawDate.getTime())
  const eventDate = isValidDate ? rawDate : new Date()

  // Format date parts using standard Intl.DateTimeFormat
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(eventDate)
  const dayNum = eventDate.getDate()
  const weekdayShort = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(eventDate)
  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(eventDate)
  const fullDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(eventDate)

  const isHost =
    event.role === 'hosting' ||
    (Boolean(currentUsername) && event.creator?.username?.toLowerCase() === currentUsername?.toLowerCase())

  const rsvpStatus = event.response || (isHost ? 'hosting' : undefined)

  return (
    <div
      onClick={onSelect}
      className={`p-5 rounded-2xl border transition-all duration-200 bg-white ${
        onSelect ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? 'border-[#2D5A3D] ring-2 ring-[#2D5A3D]/20 shadow-md bg-[#FAFDFB]'
          : isPast
          ? 'border-border/70 opacity-85 hover:border-border hover:opacity-100 hover:shadow-xs'
          : 'border-border hover:border-[#b5cebe] hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Left section: Date badge & Event details */}
        <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
          
          {/* Dynamic Date Chip */}
          <div
            className={`shrink-0 w-16 sm:w-18 flex flex-col items-center justify-center rounded-xl border py-2.5 px-1 text-center transition-colors ${
              isPast
                ? 'bg-[#F5F2EC] border-[#E2DBD0] text-muted'
                : isSelected
                ? 'bg-[#eaf3ed] border-[#2D5A3D]/40 text-[#2D5A3D]'
                : 'bg-cream border-border text-charcoal'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {monthShort}
            </span>
            <span className="text-2xl font-bold font-serif leading-none my-0.5">
              {dayNum}
            </span>
            <span className="text-[10px] font-medium text-muted">
              {weekdayShort}
            </span>
          </div>

          {/* Event Content Details */}
          <div className="flex-1 min-w-0">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-base font-semibold text-charcoal font-serif truncate">
                {event.title}
              </h3>

              {isHost && (
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/20 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-[#2D5A3D]" />
                  <span>Hosting</span>
                </span>
              )}

              {isPast ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fdf0eb] text-[#C47B5A] border border-[#C47B5A]/20 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#C47B5A]" />
                  <span>Past Event</span>
                </span>
              ) : rsvpStatus === 'going' ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#2D5A3D]" />
                  <span>Going</span>
                </span>
              ) : rsvpStatus === 'maybe' ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fef9ee] text-[#b87e28] flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-[#b87e28]" />
                  <span>Maybe</span>
                </span>
              ) : null}

              {event.visibility && (
                <span className="text-[10px] text-muted capitalize px-2 py-0.5 rounded-md bg-sand/60">
                  {event.visibility.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Date, Time & Location row */}
            <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted mb-2.5">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-muted" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                {timeFormatted}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 truncate max-w-[260px]" title={event.locationName || 'Location TBD'}>
                <svg className="w-3.5 h-3.5 text-muted shrink-0" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                  <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                </svg>
                {event.locationName || 'Vancouver, BC'}
              </span>
              <span>·</span>
              <span className="text-muted">{fullDateFormatted}</span>
            </div>

            {/* Description Snippet */}
            {event.description && (
              <p className="text-xs text-[#5a5450] line-clamp-2 leading-relaxed mb-3">
                {event.description}
              </p>
            )}

            {/* Host & Tags Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
              <div className="flex items-center gap-2">
                {event.creator && (
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      name={event.creator.username || 'Havens Member'}
                      photoUrl={event.creator.photoUrl}
                      color="#2D5A3D"
                      size="sm"
                    />
                    <span className="text-xs text-charcoal font-medium">
                      @{event.creator.username}
                    </span>
                  </div>
                )}
                {event.pointsReward ? (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full ml-1">
                    ⭐ +{event.pointsReward} pts
                  </span>
                ) : null}
              </div>

              {event.hobbies && event.hobbies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {event.hobbies.slice(0, 3).map((h) => (
                    <span
                      key={h.id}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sand text-[#5a5450]"
                    >
                      #{h.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Action buttons / Read-only state */}
        {showActions && (
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/60">
            {isPast ? (
              /* STRICTLY READ-ONLY FOR PAST EVENTS */
              <div className="flex sm:flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
                <span
                  title="Past events are archived and strictly read-only"
                  className="px-3 py-1.5 rounded-lg bg-sand/70 text-[#8a8278] text-xs font-medium cursor-not-allowed border border-border inline-flex items-center gap-1.5 select-none"
                >
                  <svg className="w-3.5 h-3.5 text-[#8a8278]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Archived / Read-Only
                </span>
                <span className="text-[10px] text-muted">RSVP Closed</span>
              </div>
            ) : (
              /* DYNAMIC ACTION CONTROLS FOR UPCOMING EVENTS */
              <div className="flex items-center gap-1.5">
                {onRsvpChange && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const eventIdNum = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id
                        onRsvpChange(eventIdNum, rsvpStatus === 'going' ? 'pass' : 'going')
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                        rsvpStatus === 'going'
                          ? 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55]'
                          : 'bg-sand hover:bg-[#e4dcd2] text-charcoal border border-border'
                      }`}
                    >
                      {rsvpStatus === 'going' ? '✓ Attending' : "I'm In"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const eventIdNum = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id
                        onRsvpChange(eventIdNum, 'maybe')
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border flex items-center justify-center ${
                        rsvpStatus === 'maybe'
                          ? 'bg-amber-100 border-amber-300 text-amber-900'
                          : 'border-border bg-white text-muted hover:text-charcoal hover:border-[#b5cebe]'
                      }`}
                      title="Mark as Maybe"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (navigator.share) {
                      navigator.share({
                        title: event.title,
                        text: `Join me at ${event.title} on Havens!`,
                        url: window.location.href,
                      }).catch(() => {})
                    } else {
                      navigator.clipboard?.writeText(window.location.href)
                      alert('Event link copied to clipboard!')
                    }
                  }}
                  className="p-1.5 rounded-lg border border-border text-muted hover:text-charcoal hover:border-[#b5cebe] transition-colors cursor-pointer"
                  title="Share event"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <circle cx="12.5" cy="3.5" r="2" />
                    <circle cx="3.5" cy="8" r="2" />
                    <circle cx="12.5" cy="12.5" r="2" />
                    <path d="M5.3 9l5.4 2.5M10.7 4.5L5.3 7" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
