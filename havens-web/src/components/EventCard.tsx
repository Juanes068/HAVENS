import React from 'react'

export interface DiscoverPlan {
  id: number
  title: string
  host: string
  date: string
  time: string
  location: string
  category: string
  ageRange?: string
  going: number
  mutualsFriends: number
  img: string
  tags: string[]
}

interface EventCardProps {
  plan: DiscoverPlan
  isSaved: boolean
  onToggleSave: (id: number) => void
  onSelect?: (plan: DiscoverPlan) => void
}

export const EventCard: React.FC<EventCardProps> = ({ plan, isSaved, onToggleSave, onSelect }) => {
  const displayTags = (plan.tags || []).slice(0, 4)
  const remainingTags = Math.max(0, (plan.tags?.length || 0) - 4)

  return (
    <div
      onClick={() => onSelect && onSelect(plan)}
      className="rounded-3xl overflow-hidden border border-[#E2DBD0] hover:border-[#2D5A3D]/50 bg-white group cursor-pointer hover:shadow-md transition-all duration-200 p-5 sm:p-5.5 flex flex-col justify-between shadow-xs"
    >
      <div>
        {/* Uniform Cover Image Banner or Fallback */}
        <div className="relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden mb-3.5 border border-[#E2DBD0]/60 bg-gradient-to-br from-[#FAF8F5] via-[#F4EEE2] to-[#EAE2D2] flex items-center justify-center shrink-0">
          {plan.img ? (
            <img
              src={plan.img}
              alt={plan.title}
              className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-xs border border-[#E2DBD0]/80 shadow-2xs flex items-center justify-center text-[#2D5A3D]">
              <span className="text-xl">🌿</span>
            </div>
          )}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-2xs border border-[#E2DBD0]/40">
                {plan.category || 'Gathering'}
              </span>
              {plan.ageRange && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-stone-700 shadow-2xs">
                  🎂 {plan.ageRange}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSave(plan.id)
              }}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer pointer-events-auto shadow-2xs ${
                isSaved ? 'bg-[#eaf3ed] border-[#2D5A3D]/40 text-[#2D5A3D]' : 'bg-white/90 border-[#E2DBD0] text-stone-500 hover:text-stone-900'
              }`}
              title={isSaved ? 'Saved' : 'Save Event'}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill={isSaved ? '#2D5A3D' : 'none'}
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M3 2h10v12l-5-3-5 3V2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1.5 leading-snug font-serif truncate group-hover:text-[#2D5A3D] transition-colors">
          {plan.title}
        </h3>

        {/* Date & Location */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-3.5 truncate">
          <span className="shrink-0 font-medium text-stone-700">{plan.date || plan.time}</span>
          <span>·</span>
          <span className="truncate">📍 {plan.location || 'Vancouver, BC'}</span>
        </div>

        {/* Tags (Strictly Max 4) */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 items-center">
            {displayTags.map((t, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium px-2.5 py-1 rounded-xl bg-[#FAF8F5] text-stone-600 border border-[#E2DBD0]/70"
              >
                #{t}
              </span>
            ))}
            {remainingTags > 0 && (
              <span className="text-[11px] text-stone-500 font-medium px-2 py-0.5 bg-[#F0EAE0] rounded-xl">
                +{remainingTags}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[#E2DBD0]/60" onClick={(e) => e.stopPropagation()}>
        <span className="text-xs text-stone-600 font-medium">👥 {plan.going || 1} going</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (onSelect) onSelect(plan)
          }}
          className="px-4 py-2 rounded-xl bg-[#2D5A3D] text-white text-xs font-bold hover:bg-[#3d7a55] transition-colors shadow-2xs hover:shadow-xs cursor-pointer"
        >
          View Details
        </button>
      </div>
    </div>
  )
}
