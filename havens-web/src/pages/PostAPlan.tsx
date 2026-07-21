import React, { useState } from 'react'
import { SectionHeading } from '../components/SectionHeading'
import { NavPage } from '../components/Navigation'

type Visibility = 'friends' | 'mutuals' | 'public'

const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

interface PostAPlanProps {
  onNavigate: (page: NavPage) => void
}

export const PostAPlanView: React.FC<PostAPlanProps> = ({ onNavigate }) => {
  const [title, setTitle] = useState('')
  const [description, setDesc] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [location, setLocation] = useState('')
  const [maxPeople, setMax] = useState('')
  const [visibility, setVis] = useState<Visibility>('friends')
  const [invites, setInvites] = useState<string[]>(['Maya', 'Jordan'])
  const [inviteInput, setInvInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [category, setCategory] = useState('')

  const addInvite = () => {
    const v = inviteInput.trim()
    if (v && !invites.includes(v)) setInvites((prev) => [...prev, v])
    setInvInput('')
  }

  const visOptions: { value: Visibility; label: string; desc: string }[] = [
    { value: 'friends', label: 'Friends', desc: 'Only your confirmed friends see this' },
    { value: 'mutuals', label: 'Mutuals', desc: 'Friends of friends can discover it' },
    { value: 'public', label: 'Public', desc: 'Anyone on havens can find this plan' },
  ]

  const canSubmit = title.trim() && date && location.trim()

  if (submitted) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#eaf3ed] flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-forest"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="text-2xl text-charcoal mb-2 font-serif font-semibold">Plan posted!</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">
            <strong className="text-charcoal">{title}</strong> is live. Your friends have been notified.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false)
                setTitle('')
                setDesc('')
                setDate('')
                setTime('')
                setLocation('')
                setInvites(['Maya', 'Jordan'])
                setMax('')
                setCategory('')
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-[#5a5450] hover:border-[#b5cebe] transition-colors"
            >
              Post another
            </button>
            <button
              onClick={() => onNavigate('My Plans')}
              className="px-4 py-2 rounded-lg bg-forest text-white text-sm font-medium hover:bg-forest-light transition-colors"
            >
              View My Plans
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8 flex gap-10">
      {/* Form */}
      <div className="flex-1 min-w-0 max-w-2xl">
        <div className="mb-8">
          <SectionHeading>Post a Plan</SectionHeading>
          <p className="text-sm text-muted mt-1">Turn a vague idea into a real plan</p>
        </div>

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

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat === category ? '' : cat)}
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
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Date <span className="text-terracotta">*</span>
              </label>
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
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Location <span className="text-terracotta">*</span>
            </label>
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
                placeholder="Address or place name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
              />
            </div>
          </div>

          {/* Max people */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">
              Max guests <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={maxPeople}
              onChange={(e) => setMax(e.target.value)}
              placeholder="No limit"
              className="w-40 px-4 py-3 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
            />
          </div>

          {/* Invite friends */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1.5">Invite friends</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {invites.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eaf3ed] text-forest text-sm"
                >
                  {name}
                  <button
                    onClick={() => setInvites((prev) => prev.filter((n) => n !== name))}
                    className="text-sage hover:text-forest transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={inviteInput}
                onChange={(e) => setInvInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInvite())}
                placeholder="Type a name and press Enter"
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-charcoal placeholder-[#b5b0aa] text-sm focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20 transition-colors"
              />
              <button
                onClick={addInvite}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-[#5a5450] hover:border-[#b5cebe] transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Visibility</label>
            <div className="flex flex-col gap-2">
              {visOptions.map((opt) => (
                <button
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
              onClick={() => canSubmit && setSubmitted(true)}
              disabled={!canSubmit}
              className={`flex-1 py-3.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                canSubmit
                  ? 'bg-forest text-white hover:bg-forest-light cursor-pointer'
                  : 'bg-border text-[#b5b0aa] cursor-not-allowed'
              }`}
            >
              Post this plan
            </button>
            <button className="px-5 py-3.5 rounded-xl border border-border text-sm font-medium text-[#5a5450] hover:border-[#b5cebe] transition-colors">
              Save draft
            </button>
          </div>
        </div>
      </div>

      {/* Preview sidebar */}
      <div className="w-72 shrink-0">
        <div className="sticky top-24">
          <p className="text-xs font-medium text-muted uppercase tracking-wider mb-3">Preview</p>
          <div className="rounded-2xl border border-border bg-white overflow-hidden">
            <div className="h-36 bg-gradient-to-br from-[#eaf3ed] to-sand flex items-center justify-center">
              {category ? (
                <span className="text-4xl">
                  {category === 'Outdoors'
                    ? '🌿'
                    : category === 'Food & Drink'
                    ? '🍷'
                    : category === 'Arts'
                    ? '🎨'
                    : category === 'Social'
                    ? '✨'
                    : category === 'Wellness'
                    ? '🧘'
                    : '📅'}
                </span>
              ) : (
                <svg
                  className="w-10 h-10 text-[#b5cebe]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M8 2v4M16 2v4M3 10h18" />
                </svg>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold text-charcoal mb-1 leading-snug font-serif">
                {title || <span className="text-[#b5b0aa] font-normal">Your plan title</span>}
              </h3>
              <div className="space-y-1 text-xs text-muted">
                <p>
                  {date || 'Date TBD'}
                  {time ? ` · ${time}` : ''}
                </p>
                <p>{location || 'Location TBD'}</p>
              </div>
              {description && (
                <p className="text-xs text-[#5a5450] mt-2 leading-relaxed line-clamp-3">
                  {description}
                </p>
              )}
              {invites.length > 0 && (
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="flex -space-x-1">
                    {invites.slice(0, 3).map((n, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full bg-sage border border-white flex items-center justify-center text-[9px] text-white font-medium"
                      >
                        {n[0]}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-muted">{invites.length} invited</span>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-sand flex items-center justify-between">
                <span className="text-[10px] text-[#b5b0aa]">{visibility} · havens</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#eaf3ed] text-forest">
                  {category || 'Plan'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-cream border border-border">
            <p className="text-xs font-medium text-charcoal mb-1">Tips for great plans</p>
            <ul className="text-xs text-muted space-y-1 leading-relaxed">
              <li>· Be specific about location — it helps people say yes</li>
              <li>· Add a vibe or what to bring in the description</li>
              <li>· Set a soft headcount so it stays intimate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
