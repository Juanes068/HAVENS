import React, { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { SectionHeading } from '../components/SectionHeading'
import { EventCard, DiscoverPlan } from '../components/EventCard'
import { GET_ALL_EVENTS, GET_ALL_USERS, CREATE_MATCH } from '../graphql/operations'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['All', 'Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&auto=format',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop&auto=format',
]

export const DiscoverView: React.FC = () => {
  const { user: currentUser } = useAuth()
  const [activeCategory, setActiveCategory] = useState('All')
  const [savedIds, setSavedIds] = useState<number[]>([])
  const [matchedUserIds, setMatchedUserIds] = useState<number[]>([])
  const [matchStatusMsg, setMatchStatusMsg] = useState<string>('')

  // Fetch events dynamically from the Django GraphQL backend
  const { data, loading, error, refetch } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  // Fetch recommended profiles (sorted by implicit hobby affinity on backend)
  const { data: usersData, loading: usersLoading } = useQuery(GET_ALL_USERS, {
    fetchPolicy: 'cache-and-network',
  })

  // CreateMatch Mutation
  const [createMatchMutation, { loading: isMatching }] = useMutation(CREATE_MATCH, {
    onCompleted: (res) => {
      if (res?.createMatch?.success) {
        setMatchStatusMsg(res.createMatch.message || 'Match connection created successfully!')
      } else {
        setMatchStatusMsg(res?.createMatch?.message || 'Match request sent.')
      }
    },
    onError: (err) => {
      setMatchStatusMsg(`Error: ${err.message}`)
    },
  })

  const rawEvents = data?.allEvents || []
  const recommendedUsers = usersData?.allUsers || []

  // Filter out current user from recommendations
  const otherUsers = recommendedUsers.filter(
    (u: any) => u.id !== currentUser?.id && u.username !== currentUser?.username
  )

  // Adapt GraphQL backend event data into DiscoverPlan shape for UI cards
  const plans: DiscoverPlan[] = rawEvents.map((evt: any, idx: number) => ({
    id: parseInt(evt.id, 10) || idx + 1,
    title: evt.title || 'Untitled Community Event',
    host: evt.creator?.username ? `@${evt.creator.username}` : 'havens member',
    date: 'Upcoming',
    time: 'Flexible',
    location: evt.latitude && evt.longitude ? `${evt.latitude.toFixed(2)}, ${evt.longitude.toFixed(2)}` : 'Vancouver, BC',
    category: evt.visibility === 'public' ? 'Social' : 'Outdoors',
    going: (evt.trustScore || 1) * 3 + 2,
    mutualsFriends: 2,
    img: DEFAULT_IMAGES[idx % DEFAULT_IMAGES.length],
    tags: [evt.visibility || 'public'],
  }))

  const filtered =
    activeCategory === 'All'
      ? plans
      : plans.filter((p) => p.category === activeCategory)

  const toggleSave = (id: number) =>
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const handleConnectMatch = (user2IdStr: string) => {
    const user2Id = parseInt(user2IdStr, 10)
    if (!user2Id) return
    setMatchedUserIds((prev) => [...prev, user2Id])
    setMatchStatusMsg('')
    createMatchMutation({
      variables: { user2Id },
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-12">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <SectionHeading>Discover plans & circle recommendations</SectionHeading>
          <p className="text-sm text-muted mt-1">What your trusted circle and recommended members are getting up to</p>
        </div>
        <div className="flex items-center gap-2 bg-sand rounded-xl p-1">
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-charcoal shadow-sm">
            This week
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-charcoal">
            This month
          </button>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-forest hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Recommended Profiles Section (Implicit Affinity Matching) */}
      <div className="bg-[#F0EAE0]/70 border border-[#E2DBD0] rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-serif font-semibold text-[#2D5A3D]">Recommended Circle Matches</h2>
            <p className="text-xs text-[#8a8278]">Members sharing implicit hobby affinity with you</p>
          </div>
          {matchStatusMsg && (
            <span className="text-xs font-medium text-[#2D5A3D] bg-[#eaf3ed] px-3 py-1 rounded-full border border-[#7aaa8a]/40">
              {matchStatusMsg}
            </span>
          )}
        </div>

        {usersLoading ? (
          <div className="text-xs text-[#8a8278] animate-pulse py-4">Finding affinity matches...</div>
        ) : otherUsers.length === 0 ? (
          <div className="text-xs text-[#8a8278] py-2">No other members registered yet. Invite your friends!</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {otherUsers.slice(0, 4).map((usr: any) => {
              const uId = parseInt(usr.id, 10)
              const isMatched = matchedUserIds.includes(uId)
              return (
                <div key={usr.id} className="bg-white border border-[#E2DBD0] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-[#2D5A3D] text-white flex items-center justify-center font-bold text-sm">
                        {usr.username ? usr.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-charcoal">@{usr.username}</h4>
                        <span className="text-[11px] text-[#8a8278]">{usr.neighbourhood || 'Trusted Circle'}</span>
                      </div>
                    </div>

                    {usr.hobbies && usr.hobbies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {usr.hobbies.slice(0, 3).map((hb: any) => (
                          <span key={hb.id} className="text-[10px] bg-[#F4EEE2] text-[#2D5A3D] px-2 py-0.5 rounded-md font-medium">
                            {hb.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isMatched || isMatching}
                    onClick={() => handleConnectMatch(usr.id)}
                    className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isMatched
                        ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/40'
                        : 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] shadow-xs'
                    }`}
                  >
                    {isMatched ? '✓ Match Connected' : 'Connect / Match'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
              activeCategory === cat
                ? 'bg-forest text-white'
                : 'bg-sand text-[#5a5450] hover:bg-[#e4dcd2] hover:text-charcoal'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 text-muted font-normal animate-pulse text-sm">
          Fetching live events from havens backend...
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm mb-6 flex justify-between items-center">
          <span>Failed to load events: {error.message}</span>
          <button onClick={() => refetch()} className="text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Featured Card + Grid */}
      {!loading && filtered.length > 0 && (
        <>
          {/* Featured Card */}
          <div className="rounded-2xl overflow-hidden border border-border bg-white flex h-64 group cursor-pointer">
            <div className="w-2/5 relative overflow-hidden bg-border">
              <img
                src={filtered[0].img}
                alt={filtered[0].title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
            </div>
            <div className="flex-1 p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#eaf3ed] text-forest">
                    {filtered[0].category}
                  </span>
                  <span className="text-xs text-muted">Host: {filtered[0].host}</span>
                </div>
                <h2 className="text-2xl text-charcoal mb-2 font-serif font-semibold">
                  {filtered[0].title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 1v4M11 1v4M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {filtered[0].date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                    {filtered[0].location}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted">{filtered[0].going} confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSave(filtered[0].id)
                    }}
                    className={`p-2 rounded-lg border transition-colors ${
                      savedIds.includes(filtered[0].id)
                        ? 'border-forest bg-[#eaf3ed]'
                        : 'border-border hover:border-[#b5cebe]'
                    }`}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 16 16"
                      fill={savedIds.includes(filtered[0].id) ? '#2D5A3D' : 'none'}
                      stroke={savedIds.includes(filtered[0].id) ? '#2D5A3D' : '#8a8278'}
                      strokeWidth="1.3"
                    >
                      <path d="M3 2h10v12l-5-3-5 3V2z" />
                    </svg>
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-forest text-white text-sm font-medium hover:bg-forest-light transition-colors">
                    I'm in
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-4">
            {filtered.slice(1).map((plan) => (
              <EventCard
                key={plan.id}
                plan={plan}
                isSaved={savedIds.includes(plan.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        </>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-muted">
          <p className="text-lg mb-1 font-serif">No events found in backend</p>
          <p className="text-sm">Post a plan to create the first community event!</p>
        </div>
      )}
    </div>
  )
}
