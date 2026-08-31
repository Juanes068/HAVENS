import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { Avatar } from '../components/Avatar'
import { Facepile, ParticipantProfile, RawRsvpItem } from '../components/Facepile'
import { EventDetailModal } from '../components/EventDetailModal'
import { GET_ALL_EVENTS, MY_RSVPS, SWIPE_EVENT } from '../graphql/operations'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { formatEventFullDate, formatEventTime } from '../utils/dateUtils'
import {
  Bookmark,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Clock,
  MapPin,
  Search,
  Trash2,
  Compass,
  Sparkles,
  XCircle,
} from 'lucide-react'

const SAVED_KEYS = 'havens_saved_ids'
const SERIF = "'Playfair Display', Georgia, serif"
const PAGE_SIZE = 6

export type SavedFilterTab = 'all' | 'going' | 'maybe' | 'bookmarked' | 'discarded'

interface UnifiedSavedPlan {
  id: number
  title: string
  description?: string
  scheduledDate?: string
  locationName?: string
  latitude?: number
  longitude?: number
  category?: string
  imageUrl?: string
  pointsReward?: number
  trustScore?: number
  visibility?: string
  ageRange?: string
  creator?: {
    id: string | number
    username: string
    photoUrl?: string
  }
  hobbies?: { id: string | number; name: string }[]
  going?: number
  attendees?: ParticipantProfile[]
  rsvps?: RawRsvpItem[]
  rsvpStatus?: 'going' | 'maybe' | 'pass' | null
  isBookmarked: boolean
  rsvpCreatedAt?: string
}

export const SavedView: React.FC = () => {
  const { user } = useAuth()
  const { t, language } = useApp()
  const locale = language === 'es' ? 'es-ES' : language === 'fr' ? 'fr-FR' : 'en-US'
  const navigate = useNavigate()

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<SavedFilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedModalPlan, setSelectedModalPlan] = useState<any | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  // Local Storage Bookmarks with safe number normalization
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(SAVED_KEYS)
      if (!saved) return []
      const parsed = JSON.parse(saved)
      return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => !isNaN(id)) : []
    } catch {
      return []
    }
  })

  const normalizedBookmarkSet = useMemo(() => {
    return new Set(bookmarkedIds.map((id) => Number(id)))
  }, [bookmarkedIds])

  // Queries
  const {
    data: eventsData,
    loading: loadingEvents,
    refetch: refetchEvents,
  } = useQuery(GET_ALL_EVENTS, {
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: rsvpsData,
    loading: loadingRsvps,
    refetch: refetchRsvps,
  } = useQuery(MY_RSVPS, {
    fetchPolicy: 'cache-and-network',
    skip: !user,
  })

  // Mutation to modify RSVP state
  const [swipeEventMutation, { loading: isMutatingRsvp }] = useMutation(SWIPE_EVENT, {
    refetchQueries: [{ query: MY_RSVPS }, { query: GET_ALL_EVENTS }],
    onCompleted: () => {
      refetchRsvps()
      refetchEvents()
    },
  })

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }

  // Toggle local bookmark
  const toggleBookmark = (id: number) => {
    const targetId = Number(id)
    let updated: number[]
    if (normalizedBookmarkSet.has(targetId)) {
      updated = Array.from(normalizedBookmarkSet).filter((x) => x !== targetId)
      showToast('Removed from bookmarks')
    } else {
      updated = [...Array.from(normalizedBookmarkSet), targetId]
      showToast('Added to bookmarks')
    }
    setBookmarkedIds(updated)
    localStorage.setItem(SAVED_KEYS, JSON.stringify(updated))
  }

  // Modify RSVP Response
  const handleModifyRsvp = async (eventId: number, newResponse: 'going' | 'maybe' | 'pass') => {
    try {
      const res = await swipeEventMutation({
        variables: {
          eventId: Number(eventId),
          response: newResponse,
        },
      })

      if (res?.data?.swipeEvent?.success) {
        if (newResponse === 'going') {
          showToast('✓ RSVP updated to Confirmed (Going)!')
        } else if (newResponse === 'maybe') {
          showToast('? RSVP updated to Maybe Interested.')
        } else {
          showToast('RSVP removed.')
        }
      }
    } catch (err: any) {
      console.error('[Modify RSVP error]', err)
      showToast(err.message || 'Failed to update RSVP.')
    }
  }

  // Build Unified Saved Plans List
  const unifiedPlans: UnifiedSavedPlan[] = useMemo(() => {
    const rawEvents: any[] = eventsData?.allEvents || []
    const rawRsvps: any[] = rsvpsData?.myRsvps || []

    const rsvpMap = new Map<number, { response: string; createdAt?: string }>()
    rawRsvps.forEach((r) => {
      if (r.event?.id && r.response) {
        rsvpMap.set(Number(r.event.id), {
          response: String(r.response).toLowerCase(),
          createdAt: r.createdAt,
        })
      }
    })

    const allCandidateIds = new Set<number>([
      ...Array.from(rsvpMap.keys()),
      ...Array.from(normalizedBookmarkSet),
    ])

    const result: UnifiedSavedPlan[] = []

    rawEvents.forEach((evt) => {
      const id = Number(evt.id)
      if (allCandidateIds.has(id)) {
        const rsvpInfo = rsvpMap.get(id)
        result.push({
          id,
          title: evt.title,
          description: evt.description,
          scheduledDate: evt.scheduledDate,
          locationName: evt.locationName,
          latitude: evt.latitude,
          longitude: evt.longitude,
          category: evt.category || 'Gathering',
          imageUrl: evt.imageUrl,
          pointsReward: evt.pointsReward,
          trustScore: evt.trustScore,
          visibility: evt.visibility,
          ageRange: evt.ageRange || 'All Ages',
          creator: evt.creator,
          hobbies: evt.hobbies,
          going: evt.going || 1,
          attendees: evt.attendees,
          rsvps: evt.rsvps,
          rsvpStatus: (rsvpInfo?.response as any) || null,
          rsvpCreatedAt: rsvpInfo?.createdAt,
          isBookmarked: normalizedBookmarkSet.has(id),
        })
      }
    })

    // Also include any RSVPs that might not be in allEvents query
    rawRsvps.forEach((r) => {
      if (r.event?.id && r.response) {
        const id = Number(r.event.id)
        if (!result.some((p) => p.id === id)) {
          const resp = String(r.response).toLowerCase()
          result.push({
            id,
            title: r.event.title || 'Gathering Plan',
            description: r.event.description,
            scheduledDate: r.event.scheduledDate,
            locationName: r.event.locationName,
            latitude: r.event.latitude,
            longitude: r.event.longitude,
            category: 'Gathering',
            imageUrl: r.event.imageUrl,
            pointsReward: r.event.pointsReward,
            trustScore: r.event.trustScore,
            visibility: r.event.visibility,
            ageRange: r.event.ageRange || 'All Ages',
            creator: r.event.creator,
            hobbies: r.event.hobbies,
            going: r.event.going || 1,
            attendees: r.event.attendees,
            rsvps: r.event.rsvps,
            rsvpStatus: resp as any,
            rsvpCreatedAt: r.createdAt,
            isBookmarked: normalizedBookmarkSet.has(id),
          })
        }
      }
    })

    return result
  }, [eventsData, rsvpsData, normalizedBookmarkSet])

  const counts = useMemo(() => {
    let goingCount = 0
    let maybeCount = 0
    let bookmarkCount = 0
    let discardedCount = 0

    unifiedPlans.forEach((p) => {
      if (p.rsvpStatus === 'going') goingCount++
      if (p.rsvpStatus === 'maybe') maybeCount++
      if (p.isBookmarked) bookmarkCount++
      if (p.rsvpStatus === 'pass') discardedCount++
    })

    const allSavedCount = unifiedPlans.filter(
      (p) => (p.rsvpStatus === 'going' || p.rsvpStatus === 'maybe' || p.isBookmarked)
    ).length

    return {
      all: allSavedCount,
      going: goingCount,
      maybe: maybeCount,
      bookmarked: bookmarkCount,
      discarded: discardedCount,
    }
  }, [unifiedPlans])

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  // Reset pagination count on tab / filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [activeTab, searchQuery, selectedCategory])

  // Filtered List based on tab, search, category
  const filteredPlans = useMemo(() => {
    return unifiedPlans.filter((plan) => {
      // Tab filter
      if (activeTab === 'all') {
        // All Saved contains active items (going, maybe, bookmarked), excluding discarded unless bookmarked
        if (plan.rsvpStatus === 'pass' && !plan.isBookmarked) return false
      }
      if (activeTab === 'going' && plan.rsvpStatus !== 'going') return false
      if (activeTab === 'maybe' && plan.rsvpStatus !== 'maybe') return false
      if (activeTab === 'bookmarked' && !plan.isBookmarked) return false
      if (activeTab === 'discarded' && plan.rsvpStatus !== 'pass') return false

      // Category filter
      if (selectedCategory !== 'all' && plan.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
        return false
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = plan.title?.toLowerCase().includes(query)
        const matchDesc = plan.description?.toLowerCase().includes(query)
        const matchLoc = plan.locationName?.toLowerCase().includes(query)
        const matchHost = plan.creator?.username?.toLowerCase().includes(query)
        const matchTags = (plan.hobbies || []).some((h) => h.name.toLowerCase().includes(query))
        if (!matchTitle && !matchDesc && !matchLoc && !matchHost && !matchTags) {
          return false
        }
      }

      return true
    })
  }, [unifiedPlans, activeTab, selectedCategory, searchQuery])

  // Paginated displayed plans (strictly limited to visibleCount, initially 6)
  const displayedPlans = useMemo(() => {
    return filteredPlans.slice(0, visibleCount)
  }, [filteredPlans, visibleCount])

  const hasMore = visibleCount < filteredPlans.length

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const loading = loadingEvents || loadingRsvps

  const categoriesList = ['all', 'Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 antialiased text-[#2C2C2C] space-y-6 pb-24">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[#2D5A3D] text-white text-xs font-semibold shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DBD0] pb-6">
        <div>
          <SectionHeading>{t('savedTitle')}</SectionHeading>
          <p className="text-sm text-[#8a8278] mt-1">
            {t('savedSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/discover')}
            className="px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('discover')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        {/* Segmented Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F0EAE0] rounded-2xl border border-[#E2DBD0] shadow-2xs">
          {(
            [
              { key: 'all', label: t('savedPlans'), count: counts.all, icon: Bookmark },
              { key: 'going', label: t('going'), count: counts.going, icon: CheckCircle2 },
              { key: 'maybe', label: t('maybe'), count: counts.maybe, icon: HelpCircle },
              { key: 'bookmarked', label: t('saved'), count: counts.bookmarked, icon: Bookmark },
              { key: 'discarded', label: t('pass'), count: counts.discarded, icon: XCircle },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[#2D5A3D] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Live Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E2DBD0] bg-white text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {categoriesList.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer shrink-0 ${
              selectedCategory === cat
                ? 'bg-[#2D5A3D] text-white shadow-2xs'
                : 'bg-[#FAF8F5] border border-[#E2DBD0] text-stone-600 hover:bg-[#F0EAE0]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-20 text-stone-500 font-normal animate-pulse text-xs">
          {t('fetchingEvents')}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPlans.length === 0 && (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-[#E2DBD0] shadow-2xs space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 rounded-2xl bg-[#eaf3ed] text-[#2D5A3D] flex items-center justify-center mx-auto shadow-2xs">
            <Bookmark className="w-8 h-8 text-[#2D5A3D]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 font-serif">
              {t('noSavedEvents')}
            </h3>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/discover')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{t('discover')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid of Saved / RSVPed Event Cards (Paginated) */}
      {!loading && filteredPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedPlans.map((plan) => {
            const isGoing = plan.rsvpStatus === 'going'
            const isMaybe = plan.rsvpStatus === 'maybe'
            const isDiscarded = plan.rsvpStatus === 'pass'
            const isBookmarked = plan.isBookmarked

            const formattedDate = formatEventFullDate(plan.scheduledDate, locale)
            const formattedTime = formatEventTime(plan.scheduledDate, locale)

            const displayHobbies = (plan.hobbies || []).slice(0, 4)

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedModalPlan(plan)}
                className={`rounded-3xl border transition-all duration-200 bg-white group overflow-hidden flex flex-col p-5 sm:p-5.5 shadow-xs hover:shadow-md cursor-pointer justify-between ${
                  isDiscarded ? 'border-rose-200/80 bg-rose-50/10' : 'border-[#E2DBD0] hover:border-[#2D5A3D]/50'
                }`}
              >
                <div>
                  {/* Cover Photo */}
                  <div className="relative w-full h-40 sm:h-44 rounded-2xl overflow-hidden mb-4 border border-[#E2DBD0]/60 bg-gradient-to-tr from-[#2D5A3D]/15 via-[#F4EEE2] to-[#C47B5A]/15 shrink-0">
                    {plan.imageUrl ? (
                      <img
                        src={plan.imageUrl}
                        alt={plan.title}
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 font-serif font-bold text-3xl">
                        {plan.title.charAt(0)}
                      </div>
                    )}

                    {/* Top Badges overlay */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#2D5A3D] shadow-2xs">
                          {plan.category || 'Gathering'}
                        </span>
                        {plan.ageRange && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-stone-700 shadow-2xs">
                            🎂 {plan.ageRange}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBookmark(plan.id)
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-xs transition-colors cursor-pointer shadow-2xs ${
                            isBookmarked
                              ? 'bg-[#2D5A3D] text-white'
                              : 'bg-white/90 text-stone-600 hover:text-[#2D5A3D]'
                          }`}
                          title={isBookmarked ? 'Bookmarked' : 'Bookmark plan'}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-white' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* RSVP Status Overlay Flag */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
                      {isGoing && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white shadow-2xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Confirmed Going</span>
                        </span>
                      )}
                      {isMaybe && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#C47B5A] text-white shadow-2xs flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          <span>Interested (Maybe)</span>
                        </span>
                      )}
                      {isDiscarded && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          <span>Discarded (Passed)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Host */}
                  <div className="space-y-1.5 mb-2.5">
                    <h3
                      className="text-lg font-bold text-stone-900 leading-snug line-clamp-2 group-hover:text-[#2D5A3D] transition-colors"
                      style={{ fontFamily: SERIF }}
                    >
                      {plan.title}
                    </h3>

                    {plan.creator && (
                      <div className="flex items-center gap-2 text-xs text-stone-600">
                        <Avatar
                          name={plan.creator.username}
                          photoUrl={plan.creator.photoUrl}
                          size="sm"
                          className="w-5 h-5 rounded-full"
                        />
                        <span>Hosted by <strong>@{plan.creator.username}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Date, Time & Location */}
                  <div className="space-y-1 text-xs text-stone-500 mb-3.5">
                    <div className="flex items-center gap-2 font-medium text-stone-700">
                      <Clock className="w-4 h-4 text-[#2D5A3D] shrink-0" />
                      <span>{formattedDate}</span>
                      {formattedTime && (
                        <>
                          <span>·</span>
                          <span>{formattedTime}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-[#C47B5A] shrink-0" />
                      <span className="truncate">{plan.locationName || 'Physical gathering location'}</span>
                    </div>
                  </div>

                  {/* Hobbies / Tags */}
                  {displayHobbies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                      {displayHobbies.map((hb) => (
                        <span
                          key={hb.id}
                          className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl bg-[#FAF8F5] text-stone-600 border border-[#E2DBD0]/70"
                        >
                          #{hb.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Card Footer: Interactive RSVP Response Modifier Bar */}
                <div
                  className="pt-3 border-t border-[#E2DBD0]/60 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-xs gap-2">
                    <Facepile
                      attendees={plan.attendees}
                      rsvps={plan.rsvps}
                      totalGoingCount={plan.going}
                      size="xs"
                      max={3}
                      showLabel={true}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/discover?event=${plan.id}`)
                      }}
                      className="text-[#2D5A3D] hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>View on Map</span>
                    </button>
                  </div>

                  {/* Interactive 1-Click RSVP State Modifier Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      disabled={isMutatingRsvp}
                      onClick={() => handleModifyRsvp(plan.id, 'going')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                        isGoing
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'bg-[#eaf3ed] text-[#2D5A3D] hover:bg-[#2D5A3D] hover:text-white border border-[#2D5A3D]/20'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isGoing ? 'Attending' : 'Going'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMutatingRsvp}
                      onClick={() => handleModifyRsvp(plan.id, 'maybe')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs ${
                        isMaybe
                          ? 'bg-[#C47B5A] text-white shadow-xs'
                          : 'bg-[#FAF8F5] text-stone-700 hover:bg-[#F0EAE0] border border-[#E2DBD0]'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{isMaybe ? 'Interested' : 'Maybe'}</span>
                    </button>

                    {(isGoing || isMaybe) && (
                      <button
                        type="button"
                        disabled={isMutatingRsvp}
                        onClick={() => handleModifyRsvp(plan.id, 'pass')}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                        title="Cancel / Remove RSVP"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination / Load More Controls */}
      {!loading && filteredPlans.length > PAGE_SIZE && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3">
          {hasMore ? (
            <button
              type="button"
              onClick={handleLoadMore}
              className="px-6 py-3 rounded-2xl bg-white border border-[#E2DBD0] hover:border-[#2D5A3D]/50 hover:bg-[#FAF8F5] text-[#2D5A3D] text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#2D5A3D]" />
              <span>Load More ({displayedPlans.length} of {filteredPlans.length} plans shown)</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 text-stone-500 text-xs py-2 px-4 rounded-full bg-[#FAF8F5] border border-[#E2DBD0]/60">
              <span>✓</span>
              <span>All {filteredPlans.length} saved plans displayed</span>
            </div>
          )}
        </div>
      )}

      {/* Event Detail Modal Popup */}
      {selectedModalPlan && (
        <EventDetailModal
          event={selectedModalPlan}
          onClose={() => setSelectedModalPlan(null)}
          onRsvpChange={(eventId, response) => handleModifyRsvp(eventId, response)}
          currentUsername={user?.username}
        />
      )}
    </div>
  )
}

export default SavedView
