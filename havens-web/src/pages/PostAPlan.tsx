import React, { useState } from 'react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { SectionHeading } from '../components/SectionHeading'
import { CREATE_EVENT, GET_ALL_EVENTS, GENERATE_CLOUDINARY_SIGNATURE } from '../graphql/operations'

type Visibility = 'friends' | 'mutuals' | 'public'

const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']
const CLOUDINARY_CLOUD_NAME = 'g8jffrmx'

export const PostAPlanView: React.FC = () => {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [visibility, setVis] = useState<Visibility>('public')
  const [category, setCategory] = useState('Outdoors')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Signature generation mutation hook
  const [getSignatureMutation] = useMutation(GENERATE_CLOUDINARY_SIGNATURE)

  // Event creation mutation hook
  const [createEventMutation, { loading: isSubmitting }] = useMutation(CREATE_EVENT, {
    refetchQueries: [{ query: GET_ALL_EVENTS }],
    onCompleted: (data) => {
      if (data && data.createEvent && data.createEvent.success) {
        navigate('/my-plans')
      } else {
        setErrorMsg(data?.createEvent?.message || 'Failed to post plan.')
      }
    },
    onError: (err) => {
      setErrorMsg(err.message || 'Error communicating with GraphQL backend.')
    },
  })

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'friends', label: 'Friends', desc: 'Only your confirmed friends see this' },
    { value: 'mutuals', label: 'Mutuals', desc: 'Friends of friends can discover it' },
    { value: 'public', label: 'Public', desc: 'Anyone on havens can find this plan' },
  ]

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const canSubmit = title.trim() && (description.trim() || location.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setErrorMsg('')
    let finalImageUrl = uploadedUrl

    // If an image file was selected, upload to Cloudinary using backend signature
    if (imageFile && !uploadedUrl) {
      try {
        setIsUploading(true)
        const sigResult = await getSignatureMutation()
        const sigData = sigResult.data?.generateCloudinarySignature

        if (!sigData || !sigData.success) {
          throw new Error(sigData?.message || 'Could not generate upload signature.')
        }

        const formData = new FormData()
        formData.append('file', imageFile)
        formData.append('api_key', sigData.apiKey)
        formData.append('timestamp', sigData.timestamp.toString())
        formData.append('signature', sigData.signature)

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: 'POST',
            body: formData,
          }
        )

        const uploadData = await response.json()
        if (uploadData.secure_url) {
          finalImageUrl = uploadData.secure_url
          setUploadedUrl(uploadData.secure_url)
        } else {
          throw new Error(uploadData.error?.message || 'Cloudinary upload failed.')
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Image upload error.')
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    // Embed image URL into description string if present
    const payloadDescription = finalImageUrl
      ? `[IMG:${finalImageUrl}] ${description || `Event at ${location}`}`
      : description || `Event at ${location}`

    createEventMutation({
      variables: {
        title,
        description: payloadDescription,
        latitude: 49.2827,
        longitude: -123.1207,
        pointsReward: 10,
        visibility,
      },
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-10">
      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 min-w-0 max-w-2xl">
        <div className="mb-8">
          <SectionHeading>Post a Plan</SectionHeading>
          <p className="text-sm text-muted mt-1">Turn a vague idea into a real plan</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl mb-4">
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

          {/* Event Image Upload */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Event Cover Photo</label>
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
                  className="w-16 h-12 object-cover rounded-lg border border-border"
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
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What should people expect? Any details, what to bring, vibe..."
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Location</label>
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M8 1.5C5.79 1.5 4 3.29 4 5.5c0 3 4 9 4 9s4-6 4-9c0-2.21-1.79-4-4-4z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <circle cx="8" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address or place name (e.g. Kitsilano Beach, Vancouver)"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
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
                  className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 ${
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

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!canSubmit || isUploading || isSubmitting}
              className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                canSubmit && !isUploading && !isSubmitting
                  ? 'bg-forest hover:bg-forest-light text-white cursor-pointer'
                  : 'bg-border text-[#b5b0aa] cursor-not-allowed'
              }`}
            >
              {isUploading
                ? 'Uploading photo to Cloudinary...'
                : isSubmitting
                ? 'Posting plan to backend...'
                : 'Post this plan'}
            </button>
          </div>
        </div>
      </form>

      {/* Preview sidebar */}
      <div className="w-72 shrink-0">
        <div className="sticky top-24">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Preview</p>
          <div className="rounded-2xl border border-border bg-white overflow-hidden">
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
                <p>{location || 'Vancouver, BC'}</p>
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
