import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, X } from 'lucide-react';

export interface HavensTimePickerProps {
  value?: string | null;
  onChange: (time24: string, time12: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  isClearable?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

const PRESETS = [
  { label: '09:00 AM', val24: '09:00' },
  { label: '10:30 AM', val24: '10:30' },
  { label: '12:00 PM', val24: '12:00' },
  { label: '02:00 PM', val24: '14:00' },
  { label: '04:30 PM', val24: '16:30' },
  { label: '06:00 PM', val24: '18:00' },
  { label: '07:30 PM', val24: '19:30' },
  { label: '08:30 PM', val24: '20:30' },
] as const;

const HOURS_12 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as const;
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'] as const;

/**
 * Converts 24-hr time "14:30" to 12-hr English format "02:30 PM"
 */
function to12HourFormat(time24: string): { hour: string; minute: string; period: 'AM' | 'PM'; formatted: string } {
  if (!time24 || !time24.includes(':')) {
    return { hour: '12', minute: '00', period: 'PM', formatted: '' };
  }
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = String(parseInt(mStr, 10) || 0).padStart(2, '0');
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hourPadded = String(h).padStart(2, '0');
  return {
    hour: hourPadded,
    minute: m,
    period,
    formatted: `${hourPadded}:${m} ${period}`,
  };
}

/**
 * Converts 12-hr parts back to 24-hr string "14:30"
 */
function to24HourFormat(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10);
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const hPadded = String(h).padStart(2, '0');
  const mPadded = String(minute).padStart(2, '0');
  return `${hPadded}:${mPadded}`;
}

export const HavensTimePicker: React.FC<HavensTimePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select time',
  label,
  disabled = false,
  isClearable = true,
  required = false,
  className = '',
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => to12HourFormat(value || ''), [value]);

  const [selectedHour, setSelectedHour] = useState<string>(parsed.hour);
  const [selectedMinute, setSelectedMinute] = useState<string>(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(parsed.period);

  // Sync state with incoming value
  useEffect(() => {
    if (value) {
      const p = to12HourFormat(value);
      setSelectedHour(p.hour);
      setSelectedMinute(p.minute);
      setSelectedPeriod(p.period);
    }
  }, [value]);

  // Click outside and escape key handling
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleApply = (h: string, m: string, p: 'AM' | 'PM') => {
    const time24 = to24HourFormat(h, m, p);
    const time12 = `${h}:${m} ${p}`;
    onChange(time24, time12);
  };

  const handlePresetSelect = (preset: { label: string; val24: string }) => {
    const p = to12HourFormat(preset.val24);
    setSelectedHour(p.hour);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
    onChange(preset.val24, preset.label);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
          {label} {required && <span className="text-[#C47B5A]">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className={`w-full px-4 py-3 rounded-2xl border text-sm flex items-center justify-between cursor-pointer transition-all duration-150 select-none shadow-2xs ${
          disabled
            ? 'bg-stone-100 border-[#E2DBD0] text-stone-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#2D5A3D] ring-2 ring-[#eaf3ed]'
            : 'bg-white border-[#E2DBD0] hover:border-[#2D5A3D]/60'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Clock className={`w-4 h-4 shrink-0 ${isOpen || value ? 'text-[#2D5A3D]' : 'text-stone-400'}`} />
          {value ? (
            <span className="font-semibold text-[#2C2C2C] truncate">
              {parsed.formatted || value}
            </span>
          ) : (
            <span className="text-[#8a8278]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isClearable && value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-[#F4EEE2] transition-colors"
              title="Clear time"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden input for form compatibility */}
      <input type="hidden" name={name} value={value || ''} />

      {/* Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 sm:right-auto w-[290px] bg-white border border-[#E2DBD0] rounded-3xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Quick Presets */}
          <div className="mb-4">
            <span className="block text-[11px] font-bold text-[#8a8278] uppercase tracking-wider mb-2">
              Suggested Times
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => {
                const isCurrent = value === preset.val24;
                return (
                  <button
                    key={preset.val24}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                      isCurrent
                        ? 'bg-[#2D5A3D] text-white border-[#2D5A3D] shadow-2xs font-bold'
                        : 'bg-[#FAF8F5] border-[#E2DBD0] text-stone-700 hover:bg-[#eaf3ed] hover:text-[#2D5A3D] hover:border-[#7aaa8a]/40'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[#E2DBD0]/60 pt-3">
            <span className="block text-[11px] font-bold text-[#8a8278] uppercase tracking-wider mb-2">
              Custom Time (English 12-Hour)
            </span>

            {/* Custom Selectors: Hour, Minute, AM/PM */}
            <div className="flex items-center justify-between gap-1 bg-[#FAF8F5] p-2 rounded-2xl border border-[#E2DBD0]">
              {/* Hour Dropdown */}
              <div className="flex-1 text-center">
                <span className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Hour</span>
                <select
                  value={selectedHour}
                  onChange={(e) => {
                    const h = e.target.value;
                    setSelectedHour(h);
                    handleApply(h, selectedMinute, selectedPeriod);
                  }}
                  className="w-full text-center text-sm font-bold text-stone-800 bg-white border border-[#E2DBD0] rounded-xl py-1 px-1 focus:outline-none focus:border-[#2D5A3D] cursor-pointer"
                >
                  {HOURS_12.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-stone-400 font-bold text-base mt-4">:</span>

              {/* Minute Dropdown */}
              <div className="flex-1 text-center">
                <span className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Min</span>
                <select
                  value={selectedMinute}
                  onChange={(e) => {
                    const m = e.target.value;
                    setSelectedMinute(m);
                    handleApply(selectedHour, m, selectedPeriod);
                  }}
                  className="w-full text-center text-sm font-bold text-stone-800 bg-white border border-[#E2DBD0] rounded-xl py-1 px-1 focus:outline-none focus:border-[#2D5A3D] cursor-pointer"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* AM / PM Toggle */}
              <div className="flex-1 text-center">
                <span className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Period</span>
                <div className="flex rounded-xl bg-white border border-[#E2DBD0] p-0.5">
                  {(['AM', 'PM'] as const).map((p) => {
                    const isActive = selectedPeriod === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedPeriod(p);
                          handleApply(selectedHour, selectedMinute, p);
                        }}
                        className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#2D5A3D] text-white shadow-2xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-[#E2DBD0]/60 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-[#2D5A3D] hover:bg-[#3d7a55] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HavensTimePicker;
