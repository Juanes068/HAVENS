import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Avatar } from './Avatar'
import { Facepile } from './Facepile'
import { HelpCircle, Clock, Crown, Check, Share2 } from 'lucide-react'

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
  ageRange?: string
  goingCount?: number
  creator?: {
    id?: string | number
    username: string
    photoUrl?: string
  }
  attendees?: {
    id: string | number
    username: string
    photoUrl?: string
    age?: number
    neighbourhood?: string
    cityName?: string
  }[]
  rsvps?: {
    id: string | number
    response: string
    user: {
      id: string | number
      username: string
      photoUrl?: string
    }
  }[]
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
  const { t, language } = useApp()
  const locale = language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US'

  // Parse dynamic scheduled date safely
  const rawDate = event.scheduledDate ? new Date(event.scheduledDate) : new Date()
  const isValidDate = !isNaN(rawDate.getTime())
  const eventDate = isValidDate ? rawDate : new Date()

  // Format date parts using standard Intl.DateTimeFormat with active language locale
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' }).format(eventDate)
  const dayNum = eventDate.getDate()
  const weekdayShort = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(eventDate)
  const timeFormatted = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(eventDate)
  const fullDateFormatted = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(eventDate)

  const isHost =
    event.role === 'hosting' ||
    (Boolean(currentUsername) && event.creator?.username?.toLowerCase() === currentUsername?.toLowerCase())

  const rsvpStatus = event.response || (isHost ? 'hosting' : undefined)

  const navigate = useNavigate()
  const displayHobbies = (event.hobbies || []).slice(0, 4)
  const remainingHobbiesCount = Math.max(0, (event.hobbies?.length || 0) - 4)

  const handleCardClick = () => {
    if (onSelect) {
      onSelect()
    } else {
      navigate(`/event/${event.id}`)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className={`p-4 rounded-2xl border transition-all duration-200 bg-white cursor-pointer ${
        isSelected
          ? 'border-[#2D5A3D] ring-2 ring-[#2D5A3D]/20 shadow-md bg-[#FAFDFB]'
          : isPast
          ? 'border-[#E2DBD0] opacity-85 hover:opacity-100 hover:shadow-xs'
          : 'border-[#E2DBD0] hover:border-[#2D5A3D]/50 hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        {/* Left section: Date badge & Event details */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0 w-full">
          
          {/* Dynamic Date Chip */}
          <div
            className={`shrink-0 w-14 sm:w-16 flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition-colors ${
              isPast
                ? 'bg-[#F5F2EC] border-[#E2DBD0] text-stone-500'
                : isSelected
                ? 'bg-[#eaf3ed] border-[#2D5A3D]/40 text-[#2D5A3D]'
                : 'bg-[#FAF8F5] border-[#E2DBD0] text-stone-800'
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
              {monthShort}
            </span>
            <span className="text-xl font-bold font-serif leading-none my-0.5">
              {dayNum}
            </span>
            <span className="text-[9px] font-medium text-stone-500">
              {weekdayShort}
            </span>
          </div>

          {/* Event Content Details */}
          <div className="flex-1 min-w-0">
            {/* Header badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <h3 className="text-sm font-bold text-stone-900 font-serif truncate">
                {event.title}
              </h3>

              {isHost && (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] border border-[#2D5A3D]/20 flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-[#2D5A3D]" />
                  <span>{t('host')}</span>
                </span>
              )}

              {isPast ? (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#fdf0eb] text-[#C47B5A] border border-[#C47B5A]/20 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-[#C47B5A]" />
                  <span>{t('past')}</span>
                </span>
              ) : rsvpStatus === 'going' ? (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D] flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 text-[#2D5A3D]" />
                  <span>{t('going')}</span>
                </span>
              ) : rsvpStatus === 'maybe' ? (
                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#fef9ee] text-[#b87e28] flex items-center gap-1">
                  <HelpCircle className="w-2.5 h-2.5 text-[#b87e28]" />
                  <span>{t('maybe')}</span>
                </span>
              ) : null}

              {event.pointsReward ? (
                <span className="text-xs font-bold text-amber-900 bg-amber-50/90 border border-amber-300 px-2.5 py-1 rounded-full shadow-2xs inline-flex items-center gap-1">
                  ⭐ +{event.pointsReward} {t('ptsReward')}
                </span>
              ) : null}
            </div>

            {/* Time & Location */}
            <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-2 truncate">
              <span className="shrink-0">{timeFormatted}</span>
              <span>·</span>
              <span className="truncate">📍 {event.locationName || 'Nearby'}</span>
            </div>

            {/* Attendees Facepile */}
            <div className="mb-2" onClick={(e) => e.stopPropagation()}>
              <Facepile
                attendees={event.attendees}
                rsvps={event.rsvps}
                totalGoingCount={event.goingCount}
                size="xs"
                max={4}
                showLabel={true}
              />
            </div>

            {/* Hobbies / Passions (Strictly Max 4) */}
            {displayHobbies.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center">
                {displayHobbies.map((h) => (
                  <span
                    key={h.id}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-lg bg-[#FAF8F5] text-stone-600 border border-[#E2DBD0]/60"
                  >
                    #{h.name}
                  </span>
                ))}
                {remainingHobbiesCount > 0 && (
                  <span className="text-[10px] text-stone-500 font-medium px-1.5 py-0.5 bg-[#F0EAE0] rounded-md">
                    +{remainingHobbiesCount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Action buttons / Read-only state */}
        {showActions && (
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 self-stretch sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60" onClick={(e) => e.stopPropagation()}>
            {isPast ? (
              <div className="flex sm:flex-col items-center sm:items-end gap-1 w-full sm:w-auto">
                <span
                  title="Past events are archived and strictly read-only"
                  className="px-2.5 py-1 rounded-lg bg-stone-100 text-stone-500 text-[11px] font-medium cursor-not-allowed border border-stone-200 inline-flex items-center gap-1 select-none"
                >
                  {t('readOnly')}
                </span>
              </div>
            ) : (
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                        rsvpStatus === 'going'
                          ? 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] ring-1 ring-[#2D5A3D]/30'
                          : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/25'
                      }`}
                      title={rsvpStatus === 'going' ? t('going') : t('confirm')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{rsvpStatus === 'going' ? t('going') : t('confirm')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const eventIdNum = typeof event.id === 'string' ? parseInt(event.id, 10) : event.id
                        onRsvpChange(eventIdNum, rsvpStatus === 'maybe' ? 'pass' : 'maybe')
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                        rsvpStatus === 'maybe'
                          ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs font-bold'
                          : 'border-[#E2DBD0] bg-white text-stone-700 hover:text-stone-900 hover:bg-[#FAF8F5]'
                      }`}
                      title={t('maybe')}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{t('maybe')}</span>
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
                        text: `Join me at ${event.title} on havens!`,
                        url: window.location.href,
                      }).catch(() => {})
                    } else {
                      navigator.clipboard?.writeText(window.location.href)
                      alert(t('eventLinkCopied'))
                    }
                  }}
                  className="p-1.5 rounded-xl border border-[#E2DBD0] text-stone-500 hover:text-stone-900 hover:bg-[#F4EEE2] transition-colors cursor-pointer"
                  title={t('shareEvent')}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
