import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../../../context/AppContext'
import { Avatar } from '../../../components/Avatar'
import { Facepile } from '../../../components/Facepile'
import {
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Trash2,
  Settings,
  Users,
  Check,
  HelpCircle,
  Crown,
  Compass,
  Utensils,
  Palette,
  Trees,
  HeartHandshake,
  Share2,
} from 'lucide-react'
import { EventDetailModal } from '../../../components/EventDetailModal'
import { EventManagementModal } from './EventManagementModal'
import {
  SERIF,
  PlanItem,
  formatEventDisplayDate,
} from '../types'

interface PlanCardGridProps {
  plans: PlanItem[]
  loading: boolean
  onDeletePlan: (plan: PlanItem) => void
  onRsvpChange: (eventId: number, response: 'going' | 'maybe' | 'pass') => Promise<void>
  onSwitchToCreate: () => void
}

/**
 * Category-based fallback icon selector for Havens branding
 */
function getCategoryIcon(category?: string) {
  const cat = (category || '').toLowerCase()
  if (cat.includes('outdoor') || cat.includes('nature') || cat.includes('hike')) {
    return <Trees className="w-6 h-6 text-[#2D5A3D]" />
  }
  if (cat.includes('food') || cat.includes('drink') || cat.includes('dinner') || cat.includes('cafe')) {
    return <Utensils className="w-6 h-6 text-[#C47B5A]" />
  }
  if (cat.includes('art') || cat.includes('craft') || cat.includes('music')) {
    return <Palette className="w-6 h-6 text-[#7B5E87]" />
  }
  if (cat.includes('wellness') || cat.includes('mindfulness') || cat.includes('yoga')) {
    return <Sparkles className="w-6 h-6 text-[#2D5A3D]" />
  }
  if (cat.includes('social') || cat.includes('meetup') || cat.includes('circle')) {
    return <Users className="w-6 h-6 text-[#2D5A3D]" />
  }
  return <Compass className="w-6 h-6 text-[#2D5A3D]" />
}

/**
 * Single Plan Card Component with resilient image fallback and interactive RSVP buttons
 */
const PlanCardItem: React.FC<{
  plan: PlanItem
  onManage: (plan: PlanItem) => void
  onExplore: (plan: PlanItem) => void
  onDelete: (plan: PlanItem) => void
  onRsvpChange: (eventId: number, response: 'going' | 'maybe' | 'pass') => Promise<void>
}> = ({ plan, onManage, onExplore, onDelete, onRsvpChange }) => {
  const navigate = useNavigate()
  const [imgError, setImgError] = useState(false)
  const { label, time, badge } = formatEventDisplayDate(plan.scheduledDate)
  const isPast = badge === 'Past'
  const displayHobbies = (plan.hobbies || []).slice(0, 4)
  const remainingCount = Math.max(0, (plan.hobbies?.length || 0) - 4)

  const goingAttendees = (plan.rsvps || []).filter((r: any) => r.response === 'going')
  const maybeAttendees = (plan.rsvps || []).filter((r: any) => r.response === 'maybe')
  const goingCount = goingAttendees.length || plan.goingCount || plan.going || 0
  const maybeCount = maybeAttendees.length || 0

  const isHost = plan.role === 'hosting'
  const userResponse = plan.userResponse || (isHost ? 'hosting' : undefined)
  const planIdNum = typeof plan.id === 'string' ? parseInt(plan.id, 10) : plan.id

  const handleCardClick = () => {
    navigate(`/event/${planIdNum}`)
  }

  const hasValidImage = Boolean(plan.imageUrl) && !imgError

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-3xl border transition-all duration-200 bg-white group overflow-hidden flex flex-col p-5 sm:p-5.5 shadow-xs hover:shadow-md cursor-pointer justify-between ${
        isPast ? 'border-[#E2DBD0] opacity-85' : 'border-[#E2DBD0] hover:border-[#2D5A3D]/50'
      }`}
    >
      <div>
        {/* Uniform Plan Cover Banner (Image or Clean Fallback) */}
        <div className="relative w-full h-44 rounded-2xl overflow-hidden mb-4 border border-[#E2DBD0]/60 shrink-0 bg-gradient-to-br from-[#FAF8F5] via-[#F4EEE2] to-[#EAE2D2] flex items-center justify-center">
          {hasValidImage ? (
            <img
              src={plan.imageUrl}
              alt={plan.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            /* Clean Generic Fallback UI */
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center select-none">
              <div className="w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#E2DBD0]/80 shadow-2xs flex items-center justify-center group-hover:scale-108 group-hover:bg-white group-hover:shadow-xs transition-all duration-300">
                {getCategoryIcon(plan.category)}
              </div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mt-2">
                {plan.category || 'Gathering'}
              </span>
            </div>
          )}

          {/* Floating Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-2xs border border-[#E2DBD0]/40">
              {plan.category || 'Gathering'}
            </span>

            <div className="flex items-center gap-1.5">
              {isHost ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-2xs flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-white" />
                  <span>Hosting</span>
                </span>
              ) : userResponse === 'going' ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-2xs flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 text-white" />
                  <span>Going</span>
                </span>
              ) : userResponse === 'maybe' ? (
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                  <HelpCircle className="w-2.5 h-2.5 text-white" />
                  <span>Maybe</span>
                </span>
              ) : null}

              {badge && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs shadow-2xs ${
                    isPast ? 'bg-[#fdf0eb]/95 text-[#C47B5A]' : 'bg-white/95 text-[#2D5A3D]'
                  }`}
                >
                  {badge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="mb-2">
          <h3
            className="text-lg sm:text-xl font-bold text-stone-900 leading-snug line-clamp-2 min-h-[3.25rem] group-hover:text-[#2D5A3D] transition-colors"
            style={{ fontFamily: SERIF }}
          >
            {plan.title}
          </h3>
        </div>

        {/* Age Restriction Badge */}
        {plan.ageRange && (
          <div className="mb-2.5">
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
              🎂 Age: {plan.ageRange}
            </span>
          </div>
        )}

        {/* Description Preview */}
        <p className="text-xs text-[#6b645d] line-clamp-2 mb-3 leading-relaxed min-h-[2rem]">
          {plan.description || 'Intimate gathering organized on Havens.'}
        </p>

        {/* Date, Time & Location */}
        <div className="space-y-1.5 text-xs text-stone-500 mb-3.5">
          <div className="flex items-center gap-2 font-medium text-stone-700">
            <Clock className="w-4 h-4 text-[#2D5A3D] shrink-0" />
            <span>{label}</span>
            {time && (
              <>
                <span>·</span>
                <span>{time}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-[#C47B5A] shrink-0" />
            <span className="truncate">{plan.locationName || 'Location specified'}</span>
          </div>
        </div>

        {/* Hobbies (Strictly Max 4) */}
        {displayHobbies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 items-center">
            {displayHobbies.map((h: any) => (
              <span
                key={h.id}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-[#FAF8F5] text-stone-600 border border-[#E2DBD0]/70"
              >
                #{h.name}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="text-[11px] text-stone-500 font-medium px-2 py-0.5 bg-[#F0EAE0] rounded-xl">
                +{remainingCount}
              </span>
            )}
          </div>
        )}

        {/* Attendance Facepile Stack */}
        <div className="pt-2.5 pb-2 border-t border-[#E2DBD0]/60 flex items-center justify-between gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
          <Facepile
            attendees={plan.attendees}
            rsvps={plan.rsvps}
            totalGoingCount={goingCount}
            size="sm"
            max={4}
            showLabel={true}
          />
        </div>
      </div>

      {/* Footer with RSVP summary & Action Buttons */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#E2DBD0]/40 gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700">
          <span className="text-[11px] font-bold text-[#2D5A3D]">
            {isHost ? '👑 You are Host' : userResponse === 'going' ? '✓ You are Going' : userResponse === 'maybe' ? '❓ Marked Maybe' : 'Gathering'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isHost ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onManage(plan)
                }}
                className="px-3 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                title="Manage Event & RSVPs"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Manage</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(plan)
                }}
                className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer border border-rose-200 shadow-2xs"
                title="Delete this plan"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            /* Attending User Action Controls */
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRsvpChange(planIdNum, userResponse === 'going' ? 'pass' : 'going')
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                  userResponse === 'going'
                    ? 'bg-[#2D5A3D] text-white ring-1 ring-[#2D5A3D]/30'
                    : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/25'
                }`}
                title={userResponse === 'going' ? 'Going (Click to cancel RSVP)' : 'Confirm attendance (Going)'}
              >
                <Check className="w-3 h-3" />
                <span>{userResponse === 'going' ? 'Going' : 'Confirm'}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRsvpChange(planIdNum, userResponse === 'maybe' ? 'pass' : 'maybe')
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                  userResponse === 'maybe'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                    : 'border-[#E2DBD0] bg-white text-stone-700 hover:text-stone-900 hover:bg-[#FAF8F5]'
                }`}
                title={userResponse === 'maybe' ? 'Maybe (Click to cancel RSVP)' : 'Mark as Maybe'}
              >
                <HelpCircle className="w-3 h-3" />
                <span>Maybe</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onExplore(plan)
                }}
                className="p-1.5 rounded-xl border border-[#E2DBD0] hover:bg-[#F4EEE2] text-stone-600 transition-colors cursor-pointer"
                title="View details"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export const PlanCardGrid: React.FC<PlanCardGridProps> = ({
  plans,
  loading,
  onDeletePlan,
  onRsvpChange,
  onSwitchToCreate,
}) => {
  const { user } = useAuth()
  const { t } = useApp()
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | 'hosting' | 'going' | 'maybe'>('all')
  const [managingPlan, setManagingPlan] = useState<PlanItem | null>(null)
  const [exploringPlan, setExploringPlan] = useState<PlanItem | null>(null)

  // Filter plans by status (time) and attendance role
  const filteredPlans = useMemo(() => {
    return plans.filter((event) => {
      // 1. Role Filter
      if (roleFilter === 'hosting' && event.role !== 'hosting') return false
      if (roleFilter === 'going' && event.userResponse !== 'going') return false
      if (roleFilter === 'maybe' && event.userResponse !== 'maybe') return false

      // 2. Status Filter (Time)
      if (statusFilter === 'all') return true
      if (!event.scheduledDate) return true

      const eventTime = new Date(event.scheduledDate).getTime()
      const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
      const isUpcoming = !isNaN(eventTime) && eventTime >= startOfToday

      if (statusFilter === 'upcoming') return isUpcoming
      if (statusFilter === 'past') return !isUpcoming

      return true
    })
  }, [plans, statusFilter, roleFilter])

  return (
    <div className="space-y-6">
      {/* Sub-filtering Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E2DBD0]/60">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#F0EAE0] rounded-xl p-1 border border-[#E2DBD0]/60">
            {(['all', 'hosting', 'going', 'maybe'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                  roleFilter === r
                    ? 'bg-[#2D5A3D] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {r === 'all' ? 'All Plans' : r}
              </button>
            ))}
          </div>

          <span className="text-xs font-bold font-serif text-[#2C2C2C] ml-2">
            Showing {filteredPlans.length} {filteredPlans.length === 1 ? 'Plan' : 'Plans'}
          </span>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#F0EAE0] rounded-xl p-1 border border-[#E2DBD0]/60 self-start md:self-auto">
          {(['all', 'upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
                statusFilter === tab
                  ? 'bg-white text-[#2C2C2C] shadow-xs'
                  : 'text-[#8a8278] hover:text-[#2C2C2C]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12 text-stone-500 text-xs animate-pulse">
          Loading your plans & RSVPs...
        </div>
      )}

      {/* Grid of Uniform Plan Cards */}
      {!loading && filteredPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <PlanCardItem
              key={plan.id}
              plan={plan}
              onManage={(p) => setManagingPlan(p)}
              onExplore={(p) => setExploringPlan(p)}
              onDelete={(p) => onDeletePlan(p)}
              onRsvpChange={onRsvpChange}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPlans.length === 0 && (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-[#E2DBD0] shadow-2xs space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-8 h-8 text-[#2D5A3D]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2C2C2C] font-serif">
              {roleFilter === 'hosting'
                ? "You haven't posted any plans yet"
                : roleFilter === 'going'
                ? 'No confirmed upcoming gatherings'
                : roleFilter === 'maybe'
                ? 'No tentative gatherings marked as maybe'
                : `No ${statusFilter === 'all' ? '' : statusFilter} plans found`}
            </h3>
            <p className="text-xs text-[#8a8278] mt-1.5 leading-relaxed max-w-md mx-auto">
              Turn a casual idea into an intimate hangout, hike, dinner, or workshop. Or discover events in your community to RSVP!
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={onSwitchToCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>{t('createPlan')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Event Management Modal (Host controls: Edit details + RSVP Attendance Directory) */}
      {managingPlan && (
        <EventManagementModal
          plan={managingPlan}
          isOpen={Boolean(managingPlan)}
          onClose={() => setManagingPlan(null)}
          onDelete={(p) => {
            setManagingPlan(null)
            onDeletePlan(p)
          }}
          onEventUpdated={() => {
            // refetch handled via apollo cache
          }}
        />
      )}

      {/* Expanded Event Detail Modal (For Attending / Exploring plans) */}
      {exploringPlan && (
        <EventDetailModal
          event={exploringPlan}
          onClose={() => setExploringPlan(null)}
          onRsvpChange={(eventId, response) => {
            onRsvpChange(eventId, response)
          }}
          onDeletePlan={(p) => {
            setExploringPlan(null)
            onDeletePlan(p)
          }}
          currentUsername={user?.username}
        />
      )}
    </div>
  )
}

export default PlanCardGrid


