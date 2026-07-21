import React, { useState, useEffect } from 'react'
import { useQuery } from '@apollo/client'
import { SectionHeading } from '../components/SectionHeading'
import { GET_ALL_EVENTS } from '../graphql/operations'

const SAVED_KEYS = 'havens_saved_ids'

export const SavedView: React.FC = () => {
  const [savedIds, setSavedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEYS)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const { data, loading } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  const rawEvents = data?.allEvents || []

  // Filter backend events by saved IDs in localStorage
  const savedEvents = rawEvents.filter((evt: any) =>
    savedIds.includes(parseInt(evt.id, 10))
  )

  const unsave = (id: number) => {
    const updated = savedIds.filter((x) => x !== id)
    setSavedIds(updated)
    localStorage.setItem(SAVED_KEYS, JSON.stringify(updated))
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      <div className="mb-8">
        <SectionHeading>Saved</SectionHeading>
        <p className="text-sm text-muted mt-1">
          {loading ? 'Loading bookmarked plans...' : `${savedEvents.length} plans bookmarked`}
        </p>
      </div>

      {loading && (
        <div className="text-center py-20 text-muted font-normal animate-pulse text-sm font-serif">
          Fetching saved plans...
        </div>
      )}

      {!loading && savedEvents.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">Nothing saved yet</p>
          <p className="text-sm">Bookmark plans from Discover to find them here.</p>
        </div>
      )}

      {!loading && savedEvents.length > 0 && (
        <div className="grid grid-cols-2 gap-5">
          {savedEvents.map((plan: any) => {
            const planId = parseInt(plan.id, 10)
            return (
              <div
                key={planId}
                className="rounded-2xl border border-border bg-white overflow-hidden group hover:shadow-md transition-shadow duration-200 cursor-pointer flex"
              >
                <div className="w-40 shrink-0 relative overflow-hidden bg-border">
                  <img
                    src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop&auto=format"
                    alt={plan.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex-1 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sand text-[#5a5450]">
                        {plan.visibility || 'Public'}
                      </span>
                      <button
                        onClick={() => unsave(planId)}
                        className="p-1 rounded-md text-muted hover:text-terracotta hover:bg-[#fdf0eb] transition-colors"
                        title="Remove from saved"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="#2D5A3D" stroke="#2D5A3D" strokeWidth="1.2">
                          <path d="M3 2h10v12l-5-3-5 3V2z" />
                        </svg>
                      </button>
                    </div>
                    <h3 className="text-base font-semibold text-charcoal mb-1.5 leading-snug font-serif">
                      {plan.title}
                    </h3>
                    <p className="text-xs text-muted leading-relaxed line-clamp-2">
                      {plan.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-[#b5b0aa]">Saved in havens</span>
                    <button className="px-3 py-1.5 rounded-lg bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-medium transition-colors">
                      I'm in
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
