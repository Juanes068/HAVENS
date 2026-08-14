import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { LocationAutocomplete, LocationResult } from '../components/LocationAutocomplete'
import { CREATE_EVENT, GET_ALL_EVENTS, GENERATE_CLOUDINARY_SIGNATURE } from '../graphql/operations'

type Visibility = 'friends_only' | 'community_only' | 'public'

const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']
const CLOUDINARY_CLOUD_NAME = 'g8jffrmx'

export const PostAPlanView: React.FC = () => {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null)
  const [visibility, setVis] = useState<Visibility>('public')
  const [category, setCategory] = useState('Outdoors')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Signature generation mutation hook
  const [getSignatureMutation] = useMutation(GENERATE_CLOUDINARY_SIGNATURE)

  // Event creation mutation hook (Refetches GET_ALL_EVENTS and redirects to Home /discover)
  const [createEventMutation, { loading: isSubmitting }] = useMutation(CREATE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }],
    onCompleted: (data) => {
      if (data && data.createEvent && data.createEvent.success) {
        // Redirection to Discover (Home) tab so newly created plan appears immediately on feed
        navigate('/discover')
      } else {
        setErrorMsg(data?.createEvent?.message || 'Failed to post plan.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error communicating with GraphQL backend.')
    },
  })

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'friends_only', label: 'Friends Only', desc: 'Only your confirmed friends see this' },
    { value: 'community_only', label: 'Community', desc: 'Members of the same community can discover it' },
    { value: 'public', label: 'Public', desc: 'Anyone on havens can find this plan' },
  ]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setErrorMsg('')
    }
  }

  const canSubmit = title.trim() && selectedLocation !== null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || !selectedLocation) {
      setErrorMsg('Please enter a title and select a valid location from the suggestions dropdown.')
      return
    }
    setErrorMsg('')
    let finalImageUrl = uploadedUrl

    // ─────────────────────────────────────────────────────────────
    // 3-STEP CLOUDINARY IMAGE UPLOAD PIPELINE (FIXES 400 BAD REQUEST)
    // ─────────────────────────────────────────────────────────────
    if (imageFile && !uploadedUrl) {
      try {
        setIsUploading(true)

        // Step A: Call generateCloudinarySignature passing folder: "havens_events"
        const sigResult = await getSignatureMutation({
          variables: { paramsToSign: '{}', folder: 'havens_events' },
        })
        const sigData = sigResult.data?.generateCloudinarySignature

        if (!sigData || !sigData.success) {
          throw new Error(sigData?.message || 'Could not generate Cloudinary upload signature.')
        }

        // Step B: Upload physical image file directly to Cloudinary via FormData POST
        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('api_key', String(sigData.apiKey))
        formData.append('timestamp', String(sigData.timestamp))
        formData.append('signature', String(sigData.signature))
        formData.append('folder', 'havens_events')

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`)
        }

        const uploadData = await response.json()

        // Step C: Extract secure_url string
        if (uploadData.secure_url) {
          finalImageUrl = String(uploadData.secure_url).trim()
          setUploadedUrl(finalImageUrl)
        } else {
          throw new Error('Cloudinary response missing secure_url field.')
        }
      } catch (err: any) {
        console.error('[Post Plan Image Upload Error]', err)
        setErrorMsg(err.message || 'Image upload error.')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // Build scheduled date from date + time inputs
    let scheduledDate: string | undefined
    if (date) {
      const timeStr = time || '12:00'
      scheduledDate = new Date(`${date}T${timeStr}:00`).toISOString()
    }

    // Step D: ONLY THEN, call createEvent GraphQL mutation with all fields
    createEventMutation({
      variables: {
        title: title.trim(),
        description: description.trim() || `Event hosted in ${selectedLocation.cityName}`,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        pointsReward: 10,
        visibility,
        imageUrl: finalImageUrl || undefined,
        locationName: selectedLocation.formattedAddress || selectedLocation.cityName || '',
        scheduledDate: scheduledDate || undefined,
      },
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex flex-col md:flex-row gap-10 antialiased">
      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-2xl">
        <div className="mb-8">
          <SectionHeading>Post a Plan</SectionHeading>
          <p className="text-sm text-muted mt-1">Turn a vague idea into a real plan for local members</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-4 font-medium">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col gap-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Plan title <span className="text-terracotta">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunset picnic at Griffith Park"
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
            />
          </div>

          {/* Event Cover Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Event Cover Photo (Optional)</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-sand file:text-charcoal hover:file:bg-[#e4dcd2] transition-colors cursor-pointer"
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-16 h-12 object-cover rounded-lg border border-border shadow-xs"
                />
              )}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 cursor-pointer ${
                    category === cat
                      ? 'bg-forest text-white'
                      : 'bg-sand text-[#5a5450] hover:bg-[#e4dcd2]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Location Autocomplete */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Location / Neighbourhood <span className="text-terracotta">*</span>
            </label>
            <LocationAutocomplete
              onSelectLocation={(loc) => {
                setSelectedLocation(loc)
                if (loc) setErrorMsg('')
              }}
              placeholder="Search address or neighbourhood (e.g. Kitsilano Beach, Vancouver)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What should people expect? Details, vibe, what to bring..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors resize-none"
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-charcoal text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-white text-charcoal text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Visibility</label>
            <div className="flex flex-col gap-2">
              {visOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setVis(opt.value)}
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                    visibility === opt.value
                      ? 'border-forest bg-[#f0f6f2]'
                      : 'border-border bg-white hover:border-[#b5cebe]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      visibility === opt.value ? 'border-forest' : 'border-[#c5bfb8]'
                    }`}
                  >
                    {visibility === opt.value && <div className="w-2 h-2 rounded-full bg-forest" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{opt.label}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || isUploading || isSubmitting}
              className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                canSubmit && !isUploading && !isSubmitting
                  ? 'bg-forest hover:bg-forest-light text-white cursor-pointer shadow-xs'
                  : 'bg-border text-[#b5b0aa] cursor-not-allowed'
              }`}
            >
              {isUploading
                ? 'Saving...'
                : isSubmitting
                ? 'Creating event...'
                : 'Post this plan'}
            </button>
          </div>
        </div>
      </form>

      {/* Preview Sidebar */}
      <div className="w-full md:w-72 shrink-0">
        <div className="sticky top-24">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Live Plan Preview</p>
          <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-xs">
            <div className="h-36 bg-gradient-to-br from-[#eaf3ed] to-sand flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🌿</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold text-charcoal mb-1 leading-snug font-serif">
                {title || <span className="text-[#b5b0aa] font-normal">Your plan title</span>}
              </h3>
              <div className="space-y-1 text-xs text-muted">
                <p>{date || 'Date TBD'}{time ? ` · ${time}` : ''}</p>
                <p>📍 {selectedLocation ? selectedLocation.cityName : 'Select a location'}</p>
              </div>
              {description && (
                <p className="text-xs text-[#5a5450] mt-2 leading-relaxed line-clamp-3">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
