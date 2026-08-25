import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export interface HavensDatePickerProps {
  value?: string | Date | null;
  onChange: (dateStr: string, date: Date | null) => void;
  minDate?: string | Date;
  maxDate?: string | Date;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  isClearable?: boolean;
  required?: boolean;
  className?: string;
  error?: boolean | string;
  id?: string;
  name?: string;
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format Date object into English readable format: "Oct 14, 2026"
 */
function formatEnglishDate(d: Date): string {
  const monthName = MONTHS[d.getMonth()].slice(0, 3);
  const day = d.getDate();
  const year = d.getFullYear();
  return `${monthName} ${day}, ${year}`;
}

/**
 * Parse input value safely into Date object at local midnight
 */
function parseValue(val?: string | Date | null): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  const parts = String(val).split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const parsed = new Date(y, m, d);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export const HavensDatePicker: React.FC<HavensDatePickerProps> = ({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = 'Select date',
  label,
  disabled = false,
  isClearable = true,
  required = false,
  className = '',
  error,
  id,
  name,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = useMemo(() => parseValue(value), [value]);
  const minDateObj = useMemo(() => parseValue(minDate), [minDate]);
  const maxDateObj = useMemo(() => parseValue(maxDate), [maxDate]);

  // Calendar view navigation state (Year and Month)
  const [viewYear, setViewYear] = useState<number>(() => {
    return selectedDate ? selectedDate.getFullYear() : maxDateObj ? maxDateObj.getFullYear() : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    return selectedDate ? selectedDate.getMonth() : maxDateObj ? maxDateObj.getMonth() : new Date().getMonth();
  });

  // Sync view when selectedDate changes from outside
  useEffect(() => {
    if (selectedDate) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
  }, [selectedDate]);

  // Close popover on click outside
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

  // Generate Year options range (1920 to 2040)
  const yearOptions = useMemo(() => {
    const currentY = new Date().getFullYear();
    const minYear = minDateObj ? minDateObj.getFullYear() : 1920;
    const maxYear = maxDateObj ? maxDateObj.getFullYear() : currentY + 15;
    const years: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      years.push(y);
    }
    return years;
  }, [minDateObj, maxDateObj]);

  // Calendar Days Grid Calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayStr = toDateString(new Date());
    const selectedStr = selectedDate ? toDateString(selectedDate) : '';

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1, daysInPrevMonth - i);
      const dStr = toDateString(d);
      const isBeforeMin = minDateObj ? dStr < toDateString(minDateObj) : false;
      const isAfterMax = maxDateObj ? dStr > toDateString(maxDateObj) : false;

      days.push({
        date: d,
        isCurrentMonth: false,
        isDisabled: isBeforeMin || isAfterMax,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(viewYear, viewMonth, day);
      const dStr = toDateString(d);
      const isBeforeMin = minDateObj ? dStr < toDateString(minDateObj) : false;
      const isAfterMax = maxDateObj ? dStr > toDateString(maxDateObj) : false;

      days.push({
        date: d,
        isCurrentMonth: true,
        isDisabled: isBeforeMin || isAfterMax,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedStr,
      });
    }

    // Next month filler days (to complete 42 or 35 grid cells)
    const remainingCells = 42 - days.length;
    if (remainingCells > 0 && remainingCells < 7) {
      for (let nextDay = 1; nextDay <= remainingCells; nextDay++) {
        const d = new Date(viewYear, viewMonth + 1, nextDay);
        const dStr = toDateString(d);
        const isBeforeMin = minDateObj ? dStr < toDateString(minDateObj) : false;
        const isAfterMax = maxDateObj ? dStr > toDateString(maxDateObj) : false;

        days.push({
          date: d,
          isCurrentMonth: false,
          isDisabled: isBeforeMin || isAfterMax,
          isToday: dStr === todayStr,
          isSelected: dStr === selectedStr,
        });
      }
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, minDateObj, maxDateObj]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: { date: Date; isDisabled: boolean }) => {
    if (day.isDisabled || disabled) return;
    const str = toDateString(day.date);
    onChange(str, day.date);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const todayStr = toDateString(today);
    const isBeforeMin = minDateObj ? todayStr < toDateString(minDateObj) : false;
    const isAfterMax = maxDateObj ? todayStr > toDateString(maxDateObj) : false;

    if (!isBeforeMin && !isAfterMax) {
      onChange(todayStr, today);
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider mb-2 text-[#2C2C2C]">
          {label} {required && <span className="text-[#C47B5A]">*</span>}
        </label>
      )}

      {/* Trigger Input Button */}
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
            : error
            ? 'bg-white border-rose-400 ring-2 ring-rose-100'
            : 'bg-white border-[#E2DBD0] hover:border-[#2D5A3D]/60'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Calendar className={`w-4 h-4 shrink-0 ${isOpen || selectedDate ? 'text-[#2D5A3D]' : 'text-stone-400'}`} />
          {selectedDate ? (
            <span className="font-semibold text-[#2C2C2C] truncate">
              {formatEnglishDate(selectedDate)}
            </span>
          ) : (
            <span className="text-[#8a8278]">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {isClearable && selectedDate && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-[#F4EEE2] transition-colors"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden input for form submission compatibility */}
      <input type="hidden" name={name} value={selectedDate ? toDateString(selectedDate) : ''} />

      {/* Calendar Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 left-0 w-[320px] bg-white border border-[#E2DBD0] rounded-3xl p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150 font-sans">
          {/* Header Navigation & Selectors */}
          <div className="flex items-center justify-between gap-1.5 mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-[#E2DBD0] text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Month & Year Dropdowns (Strictly English) */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-stone-800 bg-[#FAF8F5] border border-[#E2DBD0] rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#2D5A3D] cursor-pointer"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="text-xs font-bold text-stone-800 bg-[#FAF8F5] border border-[#E2DBD0] rounded-xl px-2 py-1.5 focus:outline-none focus:border-[#2D5A3D] cursor-pointer max-h-48"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl border border-[#E2DBD0] text-stone-600 hover:text-stone-900 hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of the Week Header (Strictly English) */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {DAYS_SHORT.map((day) => (
              <div key={day} className="text-[11px] font-bold text-[#8a8278] uppercase py-0.5">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map((dayObj, index) => (
              <button
                key={index}
                type="button"
                disabled={dayObj.isDisabled}
                onClick={() => handleSelectDay(dayObj)}
                className={`w-9 h-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative ${
                  dayObj.isSelected
                    ? 'bg-[#2D5A3D] text-white shadow-2xs font-bold'
                    : dayObj.isDisabled
                    ? 'text-stone-300 cursor-not-allowed bg-transparent'
                    : dayObj.isCurrentMonth
                    ? 'text-stone-800 hover:bg-[#eaf3ed] hover:text-[#2D5A3D]'
                    : 'text-stone-400 hover:bg-[#F4EEE2]'
                }`}
              >
                <span>{dayObj.date.getDate()}</span>
                {dayObj.isToday && !dayObj.isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 bg-[#2D5A3D] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Popover Footer: Quick Today & Done */}
          <div className="mt-4 pt-3 border-t border-[#E2DBD0]/60 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="font-bold text-[#2D5A3D] hover:underline cursor-pointer py-1"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E2DBD0] hover:bg-[#F4EEE2] text-stone-700 font-semibold cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HavensDatePicker;
