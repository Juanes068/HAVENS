import React, { useState, useEffect, useMemo } from 'react'

interface AgeRangeSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  description?: string
}

export const AgeRangeSelector: React.FC<AgeRangeSelectorProps> = ({
  value = 'All Ages',
  onChange,
  label = 'Target Age Range',
  description = 'Specify who this gathering or circle is designed for',
}) => {
  const parseInitialState = (str: string) => {
    if (!str || str.toLowerCase() === 'all ages') {
      return { isAllAges: true, from: '18', to: '35' }
    }
    const match = str.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (match) {
      return { isAllAges: false, from: match[1], to: match[2] }
    }
    const plusMatch = str.match(/(\d+)\+/)
    if (plusMatch) {
      return { isAllAges: false, from: plusMatch[1], to: '' }
    }
    const upToMatch = str.match(/up to\s*(\d+)/i)
    if (upToMatch) {
      return { isAllAges: false, from: '14', to: upToMatch[1] }
    }
    return { isAllAges: false, from: '18', to: '35' }
  }

  const initial = useMemo(() => parseInitialState(value), [])
  const [isAllAges, setIsAllAges] = useState<boolean>(initial.isAllAges)
  const [fromAge, setFromAge] = useState<string>(initial.from)
  const [toAge, setToAge] = useState<string>(initial.to)

  useEffect(() => {
    if (isAllAges) {
      onChange('All Ages')
    } else {
      const min = parseInt(fromAge, 10)
      const max = parseInt(toAge, 10)
      if (!isNaN(min) && !isNaN(max) && min && max) {
        onChange(`${min}-${max}`)
      } else if (!isNaN(min) && min) {
        onChange(`${min}+`)
      } else if (!isNaN(max) && max) {
        onChange(`Up to ${max}`)
      } else {
        onChange('All Ages')
      }
    }
  }, [isAllAges, fromAge, toAge])

  const computedDisplay = useMemo(() => {
    if (isAllAges) return 'All Ages (No Restriction)'
    const min = parseInt(fromAge, 10)
    const max = parseInt(toAge, 10)
    if (!isNaN(min) && !isNaN(max) && min && max) {
      return `${min} - ${max} yrs`
    } else if (!isNaN(min) && min) {
      return `${min}+ yrs`
    } else if (!isNaN(max) && max) {
      return `Up to ${max} yrs`
    }
    return 'All Ages'
  }, [isAllAges, fromAge, toAge])

  return (
    <div className="p-4 rounded-2xl bg-[#F0EAE0]/70 border border-[#E2DBD0] space-y-3">
      {/* Header & All Ages Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-900">
            {label}
          </label>
          {description && (
            <p className="text-[11px] text-[#8a8278] mt-0.5">{description}</p>
          )}
        </div>

        {/* All Ages Checkbox Option */}
        <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E2DBD0] text-xs font-bold text-[#2D5A3D] cursor-pointer shadow-2xs hover:bg-[#FAF8F5] transition-colors self-start sm:self-auto">
          <input
            type="checkbox"
            checked={isAllAges}
            onChange={(e) => setIsAllAges(e.target.checked)}
            className="rounded border-[#E2DBD0] text-[#2D5A3D] focus:ring-[#2D5A3D] w-4 h-4 cursor-pointer"
          />
          <span>All Ages</span>
        </label>
      </div>

      {/* Two Input Boxes: "From [Age] to [Age]" */}
      {!isAllAges && (
        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 animate-in fade-in">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              From Age (Min: 14)
            </label>
            <input
              type="number"
              min={14}
              max={99}
              value={fromAge}
              onChange={(e) => setFromAge(e.target.value)}
              placeholder="18"
              className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] bg-white text-xs font-bold text-stone-900 focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
            />
          </div>

          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">
              To Age
            </label>
            <input
              type="number"
              min={14}
              max={99}
              value={toAge}
              onChange={(e) => setToAge(e.target.value)}
              placeholder="35"
              className="w-full px-3 py-2 rounded-xl border border-[#E2DBD0] bg-white text-xs font-bold text-stone-900 focus:outline-none focus:border-[#2D5A3D] transition-colors shadow-2xs"
            />
          </div>

          <div className="sm:self-end pb-1 shrink-0 flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-2 rounded-xl bg-[#2D5A3D] text-white shadow-2xs flex items-center gap-1.5">
              <span>🎂</span>
              <span>{computedDisplay}</span>
            </span>
          </div>
        </div>
      )}

      {isAllAges && (
        <div className="text-[11px] text-[#2D5A3D] font-medium flex items-center gap-1.5 bg-[#eaf3ed] px-3 py-1.5 rounded-xl border border-[#2D5A3D]/20">
          <span>✓</span>
          <span>Open to all community members (14+ verified)</span>
        </div>
      )}
    </div>
  )
}
