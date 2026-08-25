import React, { useState, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../../../context/AppContext'
import { Calendar, Sparkles, MapPin, Clock, Trash2 } from 'lucide-react'
import { EventDetailModal } from '../../../components/EventDetailModal'
import {
  SERIF,
  PlanItem,
  formatEventDisplayDate,
} from '../types'

interface PlanCardGridProps {
  createdData: any
  allData: any
  loading: boolean
  onDeletePlan: (plan: PlanItem) => void
  onSwitchToCreate: () => void
}

export const PlanCardGrid: React.FC<PlanCardGridProps> = ({
  createdData,
  allData,
  loading,
  onDeletePlan,
  onSwitchToCreate,
}) => {
  const { user } = useAuth()
  const { t } = useApp()
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [exploringPlan, setExploringPlan] = useState<PlanItem | null>(null)

  // Strict creator filter logic
  const myCreatedPlans = useMemo(() => {
    const rawList: PlanItem[] = createdData?.myCreatedEvents || allData?.allEvents || []

    return rawList.filter((event) => {
      const currentUserId = user?.id ? String(user.id) : ''
      const currentUsername = user?.username ? user.username.toLowerCase() : ''

      const eventCreatorId = event.creator?.id ? String(event.creator.id) : ''
      const eventCreatorUsername = event.creator?.username ? event.creator.username.toLowerCase() : ''

      const isMatch =
        (currentUserId && eventCreatorId === currentUserId) ||
        (currentUsername && eventCreatorUsername === currentUsername)

      if (!isMatch) return false

      if (statusFilter === 'all') return true
      if (!event.scheduledDate) return true

      const eventTime = new Date(event.scheduledDate).getTime()
      const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
      const isUpcoming = !isNaN(eventTime) && eventTime >= startOfToday

      if (statusFilter === 'upcoming') return isUpcoming
      if (statusFilter === 'past') return !isUpcoming

      return true
    })
  }, [createdData, allData, user, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2DBD0]/60">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-serif text-[#2C2C2C]">
            Showing {myCreatedPlans.length} Created {myCreatedPlans.length === 1 ? 'Plan' : 'Plans'}
          </span>
          <span className="text-[11px] bg-[#eaf3ed] text-[#2D5A3D] font-semibold px-2.5 py-0.5 rounded-full">
            Strict Creator Filter: {user?.username || 'Authenticated User'}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#F0EAE0] rounded-xl p-1 border border-[#E2DBD0]/60 self-start sm:self-auto">
          {(['all', 'upcoming', 'past'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer ${
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
          Loading your created plans...
        </div>
      )}

      {/* Grid of Plan Cards */}
      {!loading && myCreatedPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCreatedPlans.map((plan) => {
            const { label, time, badge } = formatEventDisplayDate(plan.scheduledDate)
            const isPast = badge === 'Past'
            const displayHobbies = (plan.hobbies || []).slice(0, 4)
            const remainingCount = Math.max(0, (plan.hobbies?.length || 0) - 4)

            return (
              <div
                key={plan.id}
                onClick={() => setExploringPlan(plan)}
                className={`rounded-3xl border transition-all duration-200 bg-white group overflow-hidden flex flex-col p-5 sm:p-5.5 shadow-xs hover:shadow-md cursor-pointer justify-between ${
                  isPast ? 'border-[#E2DBD0] opacity-85' : 'border-[#E2DBD0] hover:border-[#2D5A3D]/50'
                }`}
              >
                <div>
                  {/* Optional Plan Cover Image Banner */}
                  {plan.imageUrl ? (
                    <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden mb-4 border border-[#E2DBD0]/60 bg-gradient-to-tr from-[#2D5A3D]/15 via-[#F4EEE2] to-[#C47B5A]/15 shrink-0">
                      <img
                        src={plan.imageUrl}
                        alt={plan.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-2xs">
                          {plan.category || 'Gathering'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-2xs">
                            Hosting
                          </span>
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
                  ) : (
                    /* Top Badges for Card without Image */
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-[#eaf3ed] text-[#2D5A3D]">
                        {plan.category || 'Gathering'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-2xs">
                          Hosting
                        </span>
                        {badge && (
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isPast ? 'bg-[#fdf0eb] text-[#C47B5A]' : 'bg-[#eaf3ed] text-[#2D5A3D]'
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <h3
                    className="text-lg sm:text-xl font-bold text-stone-900 mb-2 leading-snug truncate group-hover:text-[#2D5A3D] transition-colors"
                    style={{ fontFamily: SERIF }}
                  >
                    {plan.title}
                  </h3>

                  {/* Optional Description Preview */}
                  {plan.description && (
                    <p className="text-xs text-[#6b645d] line-clamp-2 mb-3 leading-relaxed">
                      {plan.description}
                    </p>
                  )}

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
                </div>

                {/* Footer with Guest count and Delete Button */}
                <div className="flex items-center justify-between pt-3 border-t border-[#E2DBD0]/60" onClick={(e) => e.stopPropagation()}>
                  <span className="text-xs font-semibold text-stone-700">
                    👥 {plan.going || 1} {plan.going === 1 ? 'guest' : 'guests'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeletePlan(plan)
                    }}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer border border-rose-200 flex items-center gap-1 shadow-2xs"
                    title="Delete this plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('deleteEvent')}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && myCreatedPlans.length === 0 && (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-[#E2DBD0] shadow-2xs space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-8 h-8 text-[#2D5A3D]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#2C2C2C] font-serif">
              {statusFilter === 'all'
                ? "You haven't posted any plans yet"
                : `No ${statusFilter} plans found`}
            </h3>
            <p className="text-xs text-[#8a8278] mt-1.5 leading-relaxed max-w-md mx-auto">
              Turn a casual idea into an intimate hangout, hike, dinner, or workshop. Friends are waiting for your invite!
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

      {/* Expanded Event Detail Modal */}
      {exploringPlan && (
        <EventDetailModal
          event={exploringPlan}
          onClose={() => setExploringPlan(null)}
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
