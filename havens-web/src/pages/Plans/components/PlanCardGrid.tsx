import React, { useState, useMemo } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../../../context/AppContext'
import {
  SERIF,
  CATEGORY_ICONS,
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
          <span className="text-[11px] text-stone-500 bg-[#eaf3ed] text-[#2D5A3D] font-semibold px-2.5 py-0.5 rounded-full">
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

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border transition-all duration-200 bg-white group overflow-hidden flex flex-col shadow-2xs hover:shadow-sm ${
                  isPast ? 'border-[#E2DBD0] opacity-85' : 'border-[#E2DBD0] hover:border-[#b5cebe]'
                }`}
              >
                {/* Event Photo Header */}
                <div className="h-44 relative overflow-hidden bg-[#E2DBD0]">
                  {plan.imageUrl ? (
                    <img
                      src={plan.imageUrl}
                      alt={plan.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#eaf3ed] to-[#F0EAE0] flex items-center justify-center text-4xl">
                      {CATEGORY_ICONS[plan.category || 'Social'] || '🌿'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/95 text-[#2D5A3D] backdrop-blur-md shadow-xs flex items-center gap-1">
                      <span>{CATEGORY_ICONS[plan.category || 'Social'] || '📅'}</span>
                      <span>{plan.category || 'Gathering'}</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-xs">
                      Hosting
                    </span>
                  </div>

                  {badge && (
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs ${
                          isPast ? 'bg-[#fdf0eb] text-[#C47B5A]' : 'bg-[#eaf3ed] text-[#2D5A3D]'
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
                  )}

                  {/* Host Label */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-xl px-2.5 py-1 shadow-xs">
                    <div className="w-4 h-4 rounded-full bg-[#2D5A3D] flex items-center justify-center text-[9px] text-white font-bold">
                      {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <span className="text-[11px] font-bold text-[#2C2C2C]">Created by you</span>
                  </div>
                </div>

                {/* Event Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#2C2C2C] mb-1.5 leading-snug line-clamp-1" style={{ fontFamily: SERIF }}>
                      {plan.title}
                    </h3>
                    <p className="text-xs text-stone-600 line-clamp-2 mb-3 leading-relaxed">
                      {plan.description || 'Intimate gathering hosted on Havens.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-stone-500 mb-4">
                      <div className="flex items-center gap-2 font-semibold text-[#2C2C2C]">
                        <svg className="w-3.5 h-3.5 text-[#2D5A3D] shrink-0" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                        <span>{label}</span>
                        {time && (
                          <>
                            <span>·</span>
                            <span>{time}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 truncate">
                        <svg className="w-3.5 h-3.5 text-stone-400 shrink-0" viewBox="0 0 16 16" fill="none">
                          <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.4" />
                          <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.4" />
                        </svg>
                        <span className="truncate">{plan.locationName || 'Location specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Manage Actions with Delete Event Button */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E2DBD0]/60">
                    <span className="text-xs font-semibold text-stone-700">
                      {plan.going || 1} confirmed guests
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDeletePlan(plan)}
                        className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer border border-red-200 flex items-center gap-1.5 shadow-2xs"
                        title="Delete this plan"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M2 4h12M5 4V2.5A1.5 1.5 0 016.5 1h3A1.5 1.5 0 0111 2.5V4M13.5 4v9.5a1.5 1.5 0 01-1.5 1.5h-8a1.5 1.5 0 01-1.5-1.5V4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{t('deleteEvent')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && myCreatedPlans.length === 0 && (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-[#E2DBD0] shadow-2xs space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center text-3xl mx-auto shadow-2xs">
            ✨
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
    </div>
  )
}
