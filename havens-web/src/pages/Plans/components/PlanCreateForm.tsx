import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useAuth } from '../../../context/AuthContext'
import { useApp } from '../../../context/AppContext'
import { LocationInput, LocationData } from '../../../components/LocationInput'
import {
  GET_ALL_EVENTS,
  GET_MY_CREATED_EVENTS,
  CREATE_EVENT,
  GENERATE_CLOUDINARY_SIGNATURE,
} from '../../../graphql/operations'
import { Clock, Calendar } from 'lucide-react'
import { HavensDatePicker } from '../../../components/ui/HavensDatePicker'
import { HavensTimePicker } from '../../../components/ui/HavensTimePicker'
import {
  SERIF,
  CATEGORIES,
  CLOUDINARY_CLOUD_NAME,
  Visibility,
} from '../types'

interface PlanCreateFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export const PlanCreateForm: React.FC<PlanCreateFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth()
  const { t } = useApp()

  // Form State
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
  const [isUploading, setIsUploading] = useState(false)

  // Cloudinary signature mutation
  const [getSignatureMutation] = useMutation(GENERATE_CLOUDINARY_SIGNATURE)

  // Event creation mutation
  const [createEventMutation, { loading: isSubmitting }] = useMutation(CREATE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }, { query: GET_MY_CREATED_EVENTS }],
    onCompleted: (data) => {
      if (data && data.createEvent && data.createEvent.success) {
        setErrorMsg('')
        // Reset form state
        setTitle('')
        setDesc('')
        setDate('')
        setTime('')
        setSelectedLocation(null)
        setAgeRange('All Ages')
        setImageFile(null)
        setImagePreview(null)
        setUploadedUrl('')
        onSuccess()
      } else {
        setErrorMsg(data?.createEvent?.message || 'Failed to post plan.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error communicating with GraphQL backend.')
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
          ageRange: ageRange.trim() || 'All Ages',
          imageUrl: finalImageUrl || null,
        },
      })
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your plan.')
    }
  }

  const ageOptions = ['All Ages', '18-25', '21-35', '25-40', '30-50', '18+', '21+']

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start">
      {/* Form Area */}
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
                  <span>{cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Age Range Attribute */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#2C2C2C]">
                Target Age Range
              </label>
              <span className="text-[11px] text-[#8a8278]">Not all ages are suitable for every event</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ageOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAgeRange(opt)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                    ageRange === opt
                      ? 'bg-[#C47B5A] text-white shadow-xs'
                      : 'bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700 hover:bg-[#F0EAE0]'
                  }`}
                >
                  <span>{opt}</span>
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

          {/* Date & Time with Modern Havens Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <HavensDatePicker
                label="Date"
                required
                value={date}
                minDate={new Date()}
                placeholder="Choose event date"
                onChange={(dateStr) => setDate(dateStr)}
              />
            </div>
            <div>
              <HavensTimePicker
                label="Time"
                value={time}
                placeholder="Choose start time"
                onChange={(time24) => setTime(time24)}
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
              onClick={onCancel}
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
                <Calendar className="w-12 h-12 text-[#2D5A3D]/40" />
              )}
              <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[10px] font-bold text-[#2D5A3D]">
                {visibility.replace('_', ' ')}
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#eaf3ed] text-[#2D5A3D]">
                  {category}
                </span>
                {ageRange && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF8F5] border border-[#E2DBD0] text-stone-700">
                    🎂 {ageRange}
                  </span>
                )}
                <span className="text-[10px] font-medium text-stone-500">
                  {date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Date TBD'}
                </span>
              </div>

              <h3 className="text-base font-bold text-[#2C2C2C] mb-2 leading-snug line-clamp-2" style={{ fontFamily: SERIF }}>
                {title || <span className="text-stone-400 font-normal italic">Your plan title...</span>}
              </h3>

              <div className="space-y-1 text-xs text-stone-500 mb-3">
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
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
  )
}
