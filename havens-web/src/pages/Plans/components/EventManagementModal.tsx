import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { LocationInput, LocationData } from '../../../components/LocationInput'
import { Avatar } from '../../../components/Avatar'
import {
  GET_ALL_EVENTS,
  GET_MY_CREATED_EVENTS,
  GET_EVENT_RSVPS,
  UPDATE_EVENT,
  GENERATE_CLOUDINARY_SIGNATURE,
} from '../../../graphql/operations'
import {
  SERIF,
  CATEGORIES,
  AGE_RANGE_OPTIONS,
  CLOUDINARY_CLOUD_NAME,
  Visibility,
  PlanItem,
} from '../types'
import { HavensDatePicker } from '../../../components/ui/HavensDatePicker'
import { HavensTimePicker } from '../../../components/ui/HavensTimePicker'
import { AgeRangeSelector } from '../../../components/ui/AgeRangeSelector'
import {
  Users,
  CheckCircle2,
  HelpCircle,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  Edit3,
  Share2,
  X,
  Sparkles,
  Trash2,
} from 'lucide-react'

interface EventManagementModalProps {
  plan: PlanItem | null
  isOpen: boolean
  onClose: () => void
  onDelete?: (plan: PlanItem) => void
  onEventUpdated?: (updatedEvent: any) => void
}

export const EventManagementModal: React.FC<EventManagementModalProps> = ({
  plan,
  isOpen,
  onClose,
  onDelete,
  onEventUpdated,
}) => {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Tabs: 'rsvps' | 'edit'
  const [activeTab, setActiveTab] = useState<'rsvps' | 'edit'>('rsvps')
  const [rsvpFilter, setRsvpFilter] = useState<'all' | 'going' | 'maybe'>('all')

  // Form State for editing
  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [visibility, setVis] = useState<Visibility>('public')
  const [category, setCategory] = useState('Outdoors')
  const [ageRange, setAgeRange] = useState('All Ages')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Fetch real-time RSVPs for the target event
  const { data: rsvpsData, loading: loadingRsvps, refetch: refetchRsvps } = useQuery(GET_EVENT_RSVPS, {
    variables: { eventId: plan ? Number(plan.id) : 0 },
    skip: !plan || !isOpen,
    fetchPolicy: 'cache-and-network',
  })

  // Populate form fields when plan changes
  useEffect(() => {
    if (plan) {
      setTitle(plan.title || '')
      setDesc(plan.description || '')
      setVis((plan.visibility as Visibility) || 'public')
      setCategory(plan.category || 'Outdoors')
      setAgeRange(plan.ageRange || 'All Ages')
      setUploadedUrl(plan.imageUrl || '')
      setImagePreview(plan.imageUrl || null)
      setImageFile(null)
      setErrorMsg('')
      setSuccessMsg('')

      if (plan.scheduledDate) {
        const d = new Date(plan.scheduledDate)
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          setDate(`${yyyy}-${mm}-${dd}`)

          const hh = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          setTime(`${hh}:${min}`)
        }
      }

      if (plan.latitude && plan.longitude) {
        setSelectedLocation({
          name: plan.locationName || 'Venue Location',
          address: plan.locationName || 'Venue Location',
          latitude: plan.latitude,
          longitude: plan.longitude,
        })
      }
    }
  }, [plan, isOpen])

  // Cloudinary signature mutation
  const [getSignatureMutation] = useMutation(GENERATE_CLOUDINARY_SIGNATURE)

  // Update Event Mutation
  const [updateEventMutation, { loading: isSubmitting }] = useMutation(UPDATE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }, { query: GET_MY_CREATED_EVENTS }],
    onCompleted: (data) => {
      if (data?.updateEvent?.success) {
        setSuccessMsg('Event details updated successfully!')
        setErrorMsg('')
        if (onEventUpdated) {
          onEventUpdated(data.updateEvent.event)
        }
        refetchRsvps()
        setTimeout(() => {
          setSuccessMsg('')
        }, 3000)
      } else {
        setErrorMsg(data?.updateEvent?.message || 'Failed to update event.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error communicating with GraphQL server.')
    },
  })

  // Combine and categorize RSVPs
  const rsvpsList = useMemo(() => {
    const raw: any[] = rsvpsData?.eventRsvps || plan?.rsvps || []
    return raw.filter((r) => r.response === 'going' || r.response === 'maybe')
  }, [rsvpsData, plan])

  const goingAttendees = useMemo(() => {
    return rsvpsList.filter((r) => r.response === 'going')
  }, [rsvpsList])

  const maybeAttendees = useMemo(() => {
    return rsvpsList.filter((r) => r.response === 'maybe')
  }, [rsvpsList])

  const filteredAttendees = useMemo(() => {
    if (rsvpFilter === 'going') return goingAttendees
    if (rsvpFilter === 'maybe') return maybeAttendees
    return rsvpsList
  }, [rsvpFilter, goingAttendees, maybeAttendees, rsvpsList])

  if (!isOpen || !plan) return null

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
      reader.onerror = () => resolve(uploadedUrl || '')
      reader.readAsDataURL(file)
    })
  }

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setErrorMsg('Please provide a title for your event.')
      return
    }
    if (!selectedLocation) {
      setErrorMsg('Please select a valid location.')
      return
    }
    if (!date) {
      setErrorMsg('Please select a scheduled date.')
      return
    }

    setErrorMsg('')
    setSuccessMsg('')
    try {
      let finalImageUrl = uploadedUrl
      if (imageFile) {
        finalImageUrl = await uploadToCloudinary(imageFile)
        setUploadedUrl(finalImageUrl)
      }

      const scheduledDateTime = time ? `${date}T${time}:00` : `${date}T12:00:00`

      await updateEventMutation({
        variables: {
          id: Number(plan.id),
          title: title.trim(),
          description: description.trim(),
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          locationName: selectedLocation.address || selectedLocation.name,
          scheduledDate: new Date(scheduledDateTime).toISOString(),
          visibility,
          ageRange: ageRange.trim() || 'All Ages',
          imageUrl: finalImageUrl || null,
        },
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating event.')
    }
  }

  const handleShareEvent = async () => {
    const url = `${window.location.origin}/discover?event=${plan.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.title,
          text: `Join me for ${plan.title} on Havens!`,
          url,
        })
      } catch {
        // user aborted
      }
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url)
      setSuccessMsg('Event link copied to clipboard!')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'friends_only', label: 'Friends Only', desc: 'Only your confirmed friends see this plan' },
    { value: 'community_only', label: 'Community', desc: 'Members of your circle can discover it' },
    { value: 'public', label: 'Public', desc: 'Anyone on Havens can find and RSVP' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E2DBD0] rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Modal Top Header Bar */}
        <div className="p-6 pb-4 border-b border-[#E2DBD0]/70 flex items-start justify-between gap-4 bg-[#FAF8F5]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#2D5A3D] text-white">
                Organizer Dashboard
              </span>
              {plan.ageRange && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                  🎂 {plan.ageRange}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 truncate" style={{ fontFamily: SERIF }}>
              {plan.title}
            </h2>
            <p className="text-xs text-[#8a8278] mt-0.5">
              Manage details, age restrictions, and monitor guest RSVP attendance.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleShareEvent}
              className="p-2 rounded-xl border border-[#E2DBD0] bg-white hover:bg-[#F4EEE2] text-stone-700 transition-colors cursor-pointer"
              title="Share event link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[#E2DBD0] bg-white hover:bg-[#F4EEE2] text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 pt-4 pb-2 border-b border-[#E2DBD0]/50 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-1.5 bg-[#F0EAE0] p-1 rounded-2xl border border-[#E2DBD0]/60">
            <button
              type="button"
              onClick={() => setActiveTab('rsvps')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'rsvps'
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>RSVP Directory</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                  activeTab === 'rsvps' ? 'bg-white/20 text-white' : 'bg-[#E2DBD0] text-stone-700'
                }`}
              >
                {rsvpsList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'edit'
                  ? 'bg-[#2D5A3D] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onDelete(plan)
              }}
              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete Plan</span>
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-[#eaf3ed] border border-[#2D5A3D]/40 text-[#2D5A3D] text-xs font-semibold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>✓</span>
              <span>{successMsg}</span>
            </span>
            <button type="button" onClick={() => setSuccessMsg('')} className="font-bold text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg('')} className="font-bold text-xs cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Modal Scrollable Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 1: RSVP TRACKING DIRECTORY                      */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === 'rsvps' && (
            <div className="space-y-6">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => setRsvpFilter('all')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    rsvpFilter === 'all'
                      ? 'bg-[#FAF8F5] border-[#2D5A3D] ring-1 ring-[#2D5A3D]/30 shadow-2xs'
                      : 'bg-white border-[#E2DBD0] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <p className="text-[11px] font-bold text-[#8a8278] uppercase">Total Responses</p>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{rsvpsList.length}</p>
                </div>

                <div
                  onClick={() => setRsvpFilter('going')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    rsvpFilter === 'going'
                      ? 'bg-[#eaf3ed] border-[#2D5A3D] ring-1 ring-[#2D5A3D]/40 shadow-2xs'
                      : 'bg-white border-[#E2DBD0] hover:bg-[#eaf3ed]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#2D5A3D] uppercase">Confirmed (Going)</p>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A3D]" />
                  </div>
                  <p className="text-2xl font-bold text-[#2D5A3D] mt-1">{goingAttendees.length}</p>
                </div>

                <div
                  onClick={() => setRsvpFilter('maybe')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    rsvpFilter === 'maybe'
                      ? 'bg-[#fdf6ed] border-[#C47B5A] ring-1 ring-[#C47B5A]/40 shadow-2xs'
                      : 'bg-white border-[#E2DBD0] hover:bg-[#fdf6ed]/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold text-[#C47B5A] uppercase">Interested (Maybe)</p>
                    <HelpCircle className="w-3.5 h-3.5 text-[#C47B5A]" />
                  </div>
                  <p className="text-2xl font-bold text-[#C47B5A] mt-1">{maybeAttendees.length}</p>
                </div>
              </div>

              {/* Filter Sub-Tabs */}
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DBD0]/60">
                <h3 className="text-sm font-bold text-stone-900 font-serif">
                  {rsvpFilter === 'all' && `All Guests Directory (${rsvpsList.length})`}
                  {rsvpFilter === 'going' && `Confirmed Attendees (${goingAttendees.length})`}
                  {rsvpFilter === 'maybe' && `Tentative / Interested (${maybeAttendees.length})`}
                </h3>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setRsvpFilter('all')}
                    className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                      rsvpFilter === 'all' ? 'bg-[#2D5A3D] text-white' : 'text-[#8a8278] hover:bg-[#F0EAE0]'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpFilter('going')}
                    className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                      rsvpFilter === 'going' ? 'bg-[#2D5A3D] text-white' : 'text-[#8a8278] hover:bg-[#F0EAE0]'
                    }`}
                  >
                    Going
                  </button>
                  <button
                    type="button"
                    onClick={() => setRsvpFilter('maybe')}
                    className={`px-3 py-1 rounded-xl font-semibold transition-all cursor-pointer ${
                      rsvpFilter === 'maybe' ? 'bg-[#2D5A3D] text-white' : 'text-[#8a8278] hover:bg-[#F0EAE0]'
                    }`}
                  >
                    Maybe
                  </button>
                </div>
              </div>

              {/* Directory List */}
              {loadingRsvps ? (
                <div className="py-12 text-center text-xs text-stone-500 animate-pulse">
                  Loading attendee list...
                </div>
              ) : filteredAttendees.length === 0 ? (
                <div className="bg-[#FAF8F5] border border-[#E2DBD0] rounded-3xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mx-auto shadow-2xs text-[#8a8278]">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-800">
                      {rsvpFilter === 'all'
                        ? 'No RSVPs yet'
                        : `No members currently marked as "${rsvpFilter}"`}
                    </h4>
                    <p className="text-xs text-[#8a8278] max-w-sm mx-auto mt-1 leading-relaxed">
                      Share your event link with local circles or nearby connections to start gathering attendees!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleShareEvent}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Copy Event Link</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredAttendees.map((rsvp: any) => {
                    const attendee = rsvp.user
                    const isGoing = rsvp.response === 'going'

                    return (
                      <div
                        key={rsvp.id}
                        className="p-4 rounded-2xl border border-[#E2DBD0] bg-white hover:border-[#2D5A3D]/40 transition-all flex flex-col justify-between gap-3 shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar
                            name={attendee?.username || 'Guest'}
                            photoUrl={attendee?.photoUrl}
                            color="#2D5A3D"
                            size="md"
                            className="w-11 h-11 border border-white shadow-2xs rounded-full shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-semibold text-stone-900 truncate">
                                @{attendee?.username || 'member'}
                              </h4>
                              {attendee?.age ? (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 shadow-2xs">
                                  {attendee.age} yrs
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-[#8a8278] truncate mt-0.5">
                              📍 {attendee?.neighbourhood || attendee?.cityName || 'Havens Member'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#E2DBD0]/60 text-[11px]">
                          <span
                            className={`font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              isGoing
                                ? 'bg-[#eaf3ed] text-[#2D5A3D] border border-[#7aaa8a]/30'
                                : 'bg-[#fdf6ed] text-[#C47B5A] border border-[#C47B5A]/30'
                            }`}
                          >
                            {isGoing ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Confirmed Going</span>
                              </>
                            ) : (
                              <>
                                <HelpCircle className="w-3 h-3" />
                                <span>Maybe Interested</span>
                              </>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              navigate('/chat')
                            }}
                            className="text-[#2D5A3D] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════ */}
          {/* TAB 2: EDIT EVENT DETAILS                           */}
          {/* ═══════════════════════════════════════════════════ */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveChanges} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Event Title <span className="text-[#C47B5A]">*</span>
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Saturday Morning Run & Coffee"
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
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
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        category === cat
                          ? 'bg-[#2D5A3D] text-white shadow-xs'
                          : 'bg-[#F0EAE0] text-[#5a5450] hover:bg-[#e4dcd2]'
                      }`}
                    >
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range Configuration */}
              <AgeRangeSelector
                value={ageRange}
                onChange={(val) => setAgeRange(val)}
                label="Age Range Configuration"
                description="Ensure attendees match the group dynamic or choose All Ages"
              />

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Description & Details
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Provide essential details, agenda, and expectations..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#E2DBD0] bg-white text-[#2C2C2C] text-sm focus:outline-none focus:border-[#2D5A3D] transition-colors resize-none shadow-2xs"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <HavensDatePicker
                    label="Scheduled Date"
                    required
                    value={date}
                    placeholder="Select date"
                    onChange={(dStr) => setDate(dStr)}
                  />
                </div>
                <div>
                  <HavensTimePicker
                    label="Start Time"
                    value={time}
                    placeholder="Select time"
                    onChange={(tStr) => setTime(tStr)}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Location & Map Coordinates <span className="text-[#C47B5A]">*</span>
                </label>
                <LocationInput
                  onSelectLocation={(loc) => setSelectedLocation(loc)}
                  onLocationSelect={(loc) => setSelectedLocation(loc)}
                  initialLocation={selectedLocation}
                />
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Update Cover Photo (Cloudinary)
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

              {/* Visibility */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
                  Event Visibility
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {visOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setVis(opt.value)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
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

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E2DBD0]/60">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-[#E2DBD0] text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !title.trim() || !date || !selectedLocation}
                  className="px-6 py-2.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? 'Uploading Image...' : isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventManagementModal
