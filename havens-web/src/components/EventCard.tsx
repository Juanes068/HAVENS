import React from 'react'

export interface DiscoverPlan {
  id: number
  title: string
  host: string
  date: string
  time: string
  location: string
  category: string
  going: number
  mutualsFriends: number
  img: string
  tags: string[]
}

interface EventCardProps {
  plan: DiscoverPlan
  isSaved: boolean
  onToggleSave: (id: number) => void
}

export const EventCard: React.FC<EventCardProps> = ({ plan, isSaved, onToggleSave }) => {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-white group cursor-pointer hover:shadow-md transition-shadow duration-200">
      <div className="h-40 relative overflow-hidden bg-sand">
        <img
          src={plan.img}
          alt={plan.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSave(plan.id)
            }}
            className={`p-1.5 rounded-lg backdrop-blur-sm transition-colors ${
              isSaved ? 'bg-white/90' : 'bg-black/20 hover:bg-black/30'
            }`}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill={isSaved ? '#2D5A3D' : 'none'}
              stroke={isSaved ? '#2D5A3D' : 'white'}
              strokeWidth="1.4"
            >
              <path d="M3 2h10v12l-5-3-5 3V2z" />
            </svg>
          </button>
        </div>
        {plan.mutualsFriends > 0 && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="flex -space-x-1">
              {['#2D5A3D', '#7aaa8a']
                .slice(0, plan.mutualsFriends > 1 ? 2 : 1)
                .map((c, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: c }}
                  />
                ))}
            </div>
            <span className="text-[10px] font-medium text-charcoal">
              {plan.mutualsFriends} friends going
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sand text-[#5a5450]">
            {plan.category}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-charcoal mb-1.5 leading-snug font-serif">
          {plan.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-muted mb-3">
          <span>{plan.date}</span>
          <span>·</span>
          <span>{plan.location}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{plan.going} going</span>
          <button className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-medium hover:bg-forest-light transition-colors">
            I'm in
          </button>
        </div>
      </div>
    </div>
  )
}
