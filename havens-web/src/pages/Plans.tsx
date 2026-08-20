import React, { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { LocationInput, LocationData } from '../components/LocationInput'
import {
  GET_MY_CREATED_EVENTS,
  GET_ALL_EVENTS,
  CREATE_EVENT,
  DELETE_EVENT,
  GENERATE_CLOUDINARY_SIGNATURE,
} from '../graphql/operations'

const SERIF = "'Playfair Display', Georgia, serif"
const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']
const CATEGORY_ICONS: Record<string, string> = {
  'Outdoors': '🌿',
  'Food & Drink': '🍷',
  'Arts': '🎨',
  'Social': '✨',
  'Wellness': '🧘',
}
const CLOUDINARY_CLOUD_NAME = 'g8jffrmx'

type Visibility = 'friends_only' | 'community_only' | 'public'
type PlansSubTab = 'create plan' | 'my plans'

export interface EventCreator {
  id: string | number
  username: string
  photoUrl?: string
}

export interface PlanItem {
  id: string | number
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
  creator?: EventCreator
  hobbies?: { id: string | number; name: string }[]
  going?: number
}

// Date formatter helper
function formatEventDisplayDate(dateString?: string): { label: string; time: string; badge?: string } {
  if (!dateString) return { label: 'Upcoming', time: '' }
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return { label: 'Upcoming', time: '' }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((eventDay - today) / (1000 * 60 * 60 * 24))

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (diffDays === 0) return { label: 'Today', time, badge: 'Today' }
  if (diffDays === 1) return { label: 'Tomorrow', time, badge: 'Tomorrow' }
  if (diffDays === -1) return { label: 'Yesterday', time, badge: 'Past' }
  if (diffDays < -1) return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), time, badge: 'Past' }
  if (diffDays > 1 && diffDays < 7) {
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
    const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { label: `${weekday}, ${monthDay}`, time }
  }
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), time }
}

export const PlansView: React.FC = () => {
  const { user } = useAuth()
  const { t } = useApp()
  const [subTab, setSubTab] = useState<PlansSubTab>('create plan')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  // Form State for "create plan"
  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [visibility, setVis] = useState<Visibility>('public')
  const [category, setCategory] = useState('Outdoors')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)

  // Deletion Modal state
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<PlanItem | null>(null)

  // Fetch events
  const { data: createdData, loading: loadingCreated, refetch: refetchCreated } = useQuery(GET_MY_CREATED_EVENTS, {
    variables: { upcomingOnly: false },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'ignore',
  })

  const { data: allData, loading: loadingAll, refetch: refetchAll } = useQuery(GET_ALL_EVENTS, {
    variables: { upcomingOnly: false },
    fetchPolicy: 'cache-and-network',
  })

  // Cloudinary signature mutation
  const [getSignatureMutation] = useMutation(GENERATE_CLOUDINARY_SIGNATURE)

  // Event creation mutation
  const [createEventMutation, { loading: isSubmitting }] = useMutation(CREATE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }, { query: GET_MY_CREATED_EVENTS }],
    onCompleted: (data) => {
      if (data && data.createEvent && data.createEvent.success) {
        setPostSuccess(true)
        setErrorMsg('')
        // Reset form
        setTitle('')
        setDesc('')
        setDate('')
        setTime('')
        setSelectedLocation(null)
        setImageFile(null)
        setImagePreview(null)
        setUploadedUrl('')

        // Transition to "my plans" feed
        setTimeout(() => {
          setPostSuccess(false)
          setSubTab('my plans')
          refetchCreated()
          refetchAll()
        }, 800)
      } else {
        setErrorMsg(data?.createEvent?.message || 'Failed to post plan.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error communicating with GraphQL backend.')
    },
  })

  // Event deletion mutation
  const [deleteEventMutation, { loading: isDeleting }] = useMutation(DELETE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }, { query: GET_MY_CREATED_EVENTS }],
    onCompleted: (data) => {
      if (data && data.deleteEvent && data.deleteEvent.success) {
        setDeleteConfirmPlan(null)
        refetchCreated()
        refetchAll()
      } else {
        setErrorMsg(data?.deleteEvent?.message || 'Failed to delete event.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error deleting plan.')
    },
  })

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'friends_only', label: 'Friends Only', desc: 'Only your confirmed friends see this plan' },
    { value: 'community_only', label: 'Community', desc: 'Members of your circle can discover it' },
    { value: 'public', label: 'Public', desc: 'Anyone on Havens can find and RSVP' },
  ]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setErrorMsg('')
    }
  }

  const uploadToCloudinary = async (file: File): Promise<string> => {
    setIsUploading(true)
    try {
      const timestamp = Math.round(new Date().getTime() / 1000)
      const paramsToSign = JSON.stringify({ timestamp })

      const { data } = await getSignatureMutation({
        variables: { paramsToSign, folder: 'havens_plans' },
      })

      if (data?.generateCloudinarySignature?.success) {
        const { signature, apiKey } = data.generateCloudinarySignature
        const formData = new FormData()
        formData.append('file', file)
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp.toString())
        formData.append('signature', signature)
        formData.append('folder', 'havens_plans')

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        )
        const result = await response.json()
        if (result.secure_url) {
          return result.secure_url
        }
      }
    } catch (err) {
      console.warn('Cloudinary upload fallback:', err)
    } finally {
      setIsUploading(false)
    }

    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop&auto=format')
      reader.readAsDataURL(file)
    })
  }

  const handlePostPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg('Please enter a plan title.')
      return
    }
    if (!selectedLocation) {
      setErrorMsg('Please select a valid location from the search bar or map.')
      return
    }
    if (!date) {
      setErrorMsg('Please select a date for your gathering.')
      return
    }

    setErrorMsg('')
    try {
      let finalImageUrl = uploadedUrl
      if (imageFile && !finalImageUrl) {
        finalImageUrl = await uploadToCloudinary(imageFile)
        setUploadedUrl(finalImageUrl)
      }

      const scheduledDateTime = time ? `${date}T${time}:00` : `${date}T12:00:00`

      await createEventMutation({
        variables: {
          title: title.trim(),
          description: description.trim() || 'Join us for a wonderful gathering.',
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          locationName: selectedLocation.address || selectedLocation.name,
          scheduledDate: new Date(scheduledDateTime).toISOString(),
          visibility,
          imageUrl: finalImageUrl || null,
        },
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your plan.')
    }
  }

  // ─── STRICT CREATOR FILTERING ───────────────────────────────────────────────
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

  const totalMyPlansCount = useMemo(() => {
    const rawList: PlanItem[] = createdData?.myCreatedEvents || allData?.allEvents || []
    return rawList.filter((event) => {
      const currentUserId = user?.id ? String(user.id) : ''
      const currentUsername = user?.username ? user.username.toLowerCase() : ''
      const eventCreatorId = event.creator?.id ? String(event.creator.id) : ''
      const eventCreatorUsername = event.creator?.username ? event.creator.username.toLowerCase() : ''
      return (
        (currentUserId && eventCreatorId === currentUserId) ||
        (currentUsername && eventCreatorUsername === currentUsername)
      )
    }).length
  }, [createdData, allData, user])

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 antialiased text-[#2C2C2C]">
      {/* Tab Header & Internal Sub-Navigation Pill Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E2DBD0]/70">
        <div>
          <h1 className="text-3xl text-[#2C2C2C] leading-tight font-serif font-semibold">
            {t('plans')}
          </h1>
          <p className="text-sm text-[#8a8278] mt-1">
            {subTab === 'create plan'
              ? 'Organize an intimate gathering, adventure, or community plan'
              : 'All gatherings and plans created by you'}
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

      {/* ─── SUB-TAB 1: "Create Plan" ──────────── */}
      {subTab === 'create plan' && (
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          <div className="flex-1 min-w-0 max-w-2xl w-full">
            <form onSubmit={handlePostPlan} className="flex flex-col gap-6">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Plan title <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sunrise hike & pourover coffee at Runyon"
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-[#2D5A3D] focus:ring-1 focus:ring-[#2D5A3D]/20 transition-colors shadow-2xs"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                        category === cat
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'bg-[#F0EAE0] text-[#5a5450] hover:bg-[#e4dcd2]'
                      }`}
                    >
                      <span>{CATEGORY_ICONS[cat] || '✨'}</span>
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What should people expect? Any details, what to bring, vibe, or meeting spot..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-[#2D5A3D] focus:ring-1 focus:ring-[#2D5A3D]/20 transition-colors resize-none shadow-2xs"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                    Date <span className="text-[#C47B5A]">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
                  />
                </div>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Location & Map Pin <span className="text-[#C47B5A]">*</span>
                </label>
                <LocationInput
                  onSelectLocation={(loc) => setSelectedLocation(loc)}
                  onLocationSelect={(loc) => setSelectedLocation(loc)}
                  initialLocation={selectedLocation}
                />
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Cover Photo (Cloudinary Upload)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#2D5A3D] file:text-white hover:file:bg-[#3d7a55] cursor-pointer"
                />
                {imagePreview && (
                  <div className="mt-3 relative w-full h-36 rounded-2xl overflow-hidden border border-[#E2DBD0]">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Visibility Options */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {visOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVis(opt.value)}
                      className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                        visibility === opt.value
                          ? 'border-[#2D5A3D] bg-[#f0f6f2] ring-1 ring-[#2D5A3D]'
                          : 'border-[#E2DBD0] bg-white hover:border-[#b5cebe]'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                            visibility === opt.value ? 'border-[#2D5A3D]' : 'border-stone-400'
                          }`}
                        >
                          {visibility === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#2D5A3D]" />}
                        </div>
                        <p className="text-xs font-bold text-[#2C2C2C]">{opt.label}</p>
                      </div>
                      <p className="text-[11px] text-[#8a8278] leading-tight">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E2DBD0]/60">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !title.trim() || !date || !selectedLocation}
                  className={`flex-1 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
                    !isSubmitting && !isUploading && title.trim() && date && selectedLocation
                      ? 'bg-[#2D5A3D] text-white hover:bg-[#3d7a55] cursor-pointer shadow-sm'
                      : 'bg-[#E2DBD0] text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {isUploading ? 'Uploading Cover...' : isSubmitting ? 'Posting Plan...' : t('postPlan')}
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('my plans')}
                  className="px-5 py-3.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#8a8278] uppercase tracking-wider">Live Preview</p>
                <span className="text-[10px] font-semibold text-[#2D5A3D] bg-[#eaf3ed] px-2 py-0.5 rounded-full">
                  Host: You ({user?.username || 'You'})
                </span>
              </div>

              <div className="rounded-3xl border border-[#E2DBD0] bg-white overflow-hidden shadow-sm">
                <div className="h-40 bg-gradient-to-br from-[#eaf3ed] to-[#F0EAE0] flex items-center justify-center relative overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{CATEGORY_ICONS[category] || '📅'}</span>
                  )}
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#2D5A3D]">
                    {visibility.replace('_', ' ')}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D]">
                      {category}
                    </span>
                    <span className="text-[10px] font-medium text-stone-500">
                      {date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date TBD'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#2C2C2C] mb-2 leading-snug line-clamp-2" style={{ fontFamily: SERIF }}>
                    {title || <span className="text-stone-400 font-normal italic">Your plan title...</span>}
                  </h3>

                  <div className="space-y-1 text-xs text-stone-500 mb-3">
                    <p className="flex items-center gap-1.5">
                      <span>⏰</span>
                      <span>{time ? `${time}` : 'Time TBD'}</span>
                    </p>
                    <p className="flex items-center gap-1.5 truncate">
                      <span>📍</span>
                      <span className="truncate">{selectedLocation?.address || selectedLocation?.name || 'Location TBD'}</span>
                    </p>
                  </div>

                  {description && (
                    <p className="text-xs text-stone-600 leading-relaxed line-clamp-2 italic border-l-2 border-[#E2DBD0] pl-2 mb-3">
                      "{description}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SUB-TAB 2: "My Plans" ─── */}
      {subTab === 'my plans' && (
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

          {/* Loading */}
          {(loadingCreated || loadingAll) && (
            <div className="text-center py-12 text-stone-500 text-xs animate-pulse">
              Loading your created plans...
            </div>
          )}

          {/* Vertical Feed with Delete Event Buttons */}
          {myCreatedPlans.length > 0 && (
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
                            onClick={() => setDeleteConfirmPlan(plan)}
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
          {!loadingCreated && !loadingAll && myCreatedPlans.length === 0 && (
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
                  onClick={() => setSubTab('create plan')}
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
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-lg shrink-0">
                ⚠️
              </div>
              <h3 className="text-lg font-bold font-serif text-[#2C2C2C]">
                {t('confirmDeleteTitle')}
              </h3>
            </div>

            <p className="text-sm text-stone-600 leading-relaxed">
              {t('confirmDeleteMessage')}
            </p>

            <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200">
              <p className="text-xs font-bold text-stone-800 font-serif">
                {deleteConfirmPlan.title}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                📍 {deleteConfirmPlan.locationName || 'Location specified'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteEventMutation({ variables: { id: Number(deleteConfirmPlan.id) } })}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>{t('confirmDelete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlansView
