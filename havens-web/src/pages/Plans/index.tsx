import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import {
  GET_MY_CREATED_EVENTS,
  MY_RSVPS,
  GET_ALL_EVENTS,
  DELETE_EVENT,
  SWIPE_EVENT,
} from '../../graphql/operations'
import { PlansSubTab, PlanItem } from './types'
import { PlanCreateForm } from './components/PlanCreateForm'
import { PlanCardGrid } from './components/PlanCardGrid'
import { PlanDeleteModal } from './components/PlanDeleteModal'

export const PlansView: React.FC = () => {
  const { user } = useAuth()
  const { t } = useApp()
  const [subTab, setSubTab] = useState<PlansSubTab>('create plan')
  const [postSuccess, setPostSuccess] = useState(false)
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<PlanItem | null>(null)

  // 1. Fetch created events
  const {
    data: createdData,
    loading: loadingCreated,
    refetch: refetchCreated,
  } = useQuery(GET_MY_CREATED_EVENTS, {
    variables: { upcomingOnly: false },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
    skip: !user,
  })

  // 2. Fetch user RSVP records ('going', 'maybe')
  const {
    data: rsvpsData,
    loading: loadingRsvps,
    refetch: refetchRsvps,
  } = useQuery(MY_RSVPS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
    skip: !user,
  })

  // 3. Fetch all events for fallback / metadata enrichment
  const {
    data: allData,
    loading: loadingAll,
    refetch: refetchAll,
  } = useQuery(GET_ALL_EVENTS, {
    variables: { upcomingOnly: false },
    fetchPolicy: 'cache-and-network',
  })

  // Delete event mutation
  const [deleteEventMutation, { loading: isDeleting }] = useMutation(DELETE_EVENT, {
    refetchQueries: [
      { query: GET_ALL_EVENTS, variables: { upcomingOnly: false } },
      { query: GET_MY_CREATED_EVENTS, variables: { upcomingOnly: false } },
      { query: MY_RSVPS },
    ],
    onCompleted: (data) => {
      if (data && data.deleteEvent && data.deleteEvent.success) {
        setDeleteConfirmPlan(null)
        refetchCreated()
        refetchRsvps()
        refetchAll()
      }
    },
  })

  // Swipe / RSVP mutation for interactive RSVP actions on cards
  const [swipeEventMutation] = useMutation(SWIPE_EVENT, {
    refetchQueries: [
      { query: MY_RSVPS },
      { query: GET_ALL_EVENTS, variables: { upcomingOnly: false } },
      { query: GET_MY_CREATED_EVENTS, variables: { upcomingOnly: false } },
    ],
    onCompleted: () => {
      refetchRsvps()
      refetchCreated()
      refetchAll()
    },
  })

  const handleRsvpChange = async (eventId: number, response: 'going' | 'maybe' | 'pass') => {
    try {
      await swipeEventMutation({
        variables: {
          eventId,
          response,
        },
      })
    } catch (err) {
      console.error('[PlansView RSVP Mutation Error]', err)
    }
  }

  // Unified list of all user plans (Hosting + RSVP'd Going/Maybe)
  const unifiedPlans: PlanItem[] = useMemo(() => {
    const map = new Map<string, PlanItem>()
    const currentUserId = user?.id ? String(user.id) : ''
    const currentUsername = user?.username ? user.username.toLowerCase() : ''

    // 1. Ingest events created by the user (Host)
    const rawCreated: PlanItem[] = createdData?.myCreatedEvents || []
    rawCreated.forEach((ev) => {
      const idStr = String(ev.id)
      map.set(idStr, {
        ...ev,
        role: 'hosting',
        userResponse: 'hosting',
      })
    })

    // 2. Ingest events the user has RSVP'd to (Going / Maybe)
    const rawRsvps = rsvpsData?.myRsvps || []
    rawRsvps.forEach((r: any) => {
      if (r.event && r.event.id) {
        const idStr = String(r.event.id)
        const isHost =
          (currentUserId && String(r.event.creator?.id) === currentUserId) ||
          (currentUsername && r.event.creator?.username?.toLowerCase() === currentUsername)

        if (map.has(idStr)) {
          const existing = map.get(idStr)!
          map.set(idStr, {
            ...existing,
            userResponse: isHost ? 'hosting' : r.response,
            role: isHost ? 'hosting' : (r.response === 'pass' ? undefined : 'attending'),
          })
        } else if (r.response === 'going' || r.response === 'maybe') {
          map.set(idStr, {
            ...r.event,
            role: isHost ? 'hosting' : 'attending',
            userResponse: isHost ? 'hosting' : r.response,
          })
        }
      }
    })

    // 3. Ingest from allEvents if creator matches or user RSVP is present in event.rsvps
    const rawAll: PlanItem[] = allData?.allEvents || []
    rawAll.forEach((ev) => {
      const idStr = String(ev.id)
      const isHost =
        (currentUserId && String(ev.creator?.id) === currentUserId) ||
        (currentUsername && ev.creator?.username?.toLowerCase() === currentUsername)

      const userRsvp = (ev.rsvps || []).find((r: any) => {
        const rUserId = r.user?.id ? String(r.user.id) : ''
        const rUsername = r.user?.username ? r.user.username.toLowerCase() : ''
        return (
          (currentUserId && rUserId === currentUserId) ||
          (currentUsername && rUsername === currentUsername)
        )
      })

      if (isHost) {
        if (!map.has(idStr)) {
          map.set(idStr, {
            ...ev,
            role: 'hosting',
            userResponse: 'hosting',
          })
        }
      } else if (userRsvp && (userRsvp.response === 'going' || userRsvp.response === 'maybe')) {
        if (!map.has(idStr)) {
          map.set(idStr, {
            ...ev,
            role: 'attending',
            userResponse: userRsvp.response,
          })
        } else {
          const existing = map.get(idStr)!
          map.set(idStr, {
            ...existing,
            userResponse: userRsvp.response,
            role: existing.role || 'attending',
          })
        }
      }
    })

    // Return all plans that are either hosted by user or actively RSVP'd ('going' or 'maybe')
    return Array.from(map.values()).filter((p) => {
      if (p.role === 'hosting') return true
      return p.userResponse === 'going' || p.userResponse === 'maybe'
    })
  }, [createdData, rsvpsData, allData, user])

  const totalMyPlansCount = unifiedPlans.length

  const handlePlanCreated = () => {
    setPostSuccess(true)
    setTimeout(() => {
      setPostSuccess(false)
      setSubTab('my plans')
      refetchCreated()
      refetchRsvps()
      refetchAll()
    }, 800)
  }

  const handleDeleteConfirm = (planId: number) => {
    deleteEventMutation({ variables: { id: planId } })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 antialiased text-[#2C2C2C]">
      {/* Tab Header & Sub-Navigation Pill Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E2DBD0]/70">
        <div>
          <h1 className="text-3xl text-[#2C2C2C] leading-tight font-serif font-semibold">
            {t('plans')}
          </h1>
          <p className="text-sm text-[#8a8278] mt-1">
            {subTab === 'create plan'
              ? 'Organize an intimate gathering, adventure, or community plan'
              : 'All gatherings hosted by you or where you have confirmed attendance'}
          </p>
        </div>

        {/* Sub-Tab Menu: "Create Plan" vs "My Plans" */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#F0EAE0] rounded-2xl border border-[#E2DBD0] shadow-2xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('create plan')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              subTab === 'create plan'
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M8 3v10M3 8h10" strokeLinecap="round" />
            </svg>
            <span>{t('createPlan')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('my plans')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer flex items-center gap-2 ${
              subTab === 'my plans'
                ? 'bg-[#2D5A3D] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="8" cy="5" r="3" />
              <path d="M2 14c0-3 3-4.5 6-4.5s6 1.5 6 4.5" strokeLinecap="round" />
            </svg>
            <span>{t('myPlans')}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                subTab === 'my plans' ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
              }`}
            >
              {totalMyPlansCount}
            </span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {postSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/40 text-[#2D5A3D] text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>✓</span>
          <span>Your plan has been posted successfully! Redirecting to your plans...</span>
        </div>
      )}

      {/* Sub-Tab 1: Create Plan */}
      {subTab === 'create plan' && (
        <PlanCreateForm
          onSuccess={handlePlanCreated}
          onCancel={() => setSubTab('my plans')}
        />
      )}

      {/* Sub-Tab 2: My Plans Grid */}
      {subTab === 'my plans' && (
        <PlanCardGrid
          plans={unifiedPlans}
          loading={loadingCreated || loadingRsvps || loadingAll}
          onDeletePlan={(plan) => setDeleteConfirmPlan(plan)}
          onRsvpChange={handleRsvpChange}
          onSwitchToCreate={() => setSubTab('create plan')}
        />
      )}

      {/* Delete Confirmation Modal */}
      <PlanDeleteModal
        plan={deleteConfirmPlan}
        isDeleting={isDeleting}
        onClose={() => setDeleteConfirmPlan(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

export default PlansView

