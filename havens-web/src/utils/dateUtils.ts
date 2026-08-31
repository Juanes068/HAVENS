/**
 * Date & Time Parsing and Formatting Utilities for Havens
 * Ensures event wall-clock times (as scheduled at the physical venue) are rendered
 * strictly without unwanted browser timezone offset shifts.
 */

/**
 * Safely parses an event ISO datetime string into a local Date object matching
 * the exact scheduled wall-clock time without browser timezone offset shifts.
 */
export function parseEventDate(dateString?: string | null): Date | null {
  if (!dateString) return null
  if (typeof dateString !== 'string') {
    const d = new Date(dateString)
    return isNaN(d.getTime()) ? null : d
  }

  // Regex matches YYYY-MM-DDTHH:MM(:SS)? or YYYY-MM-DD HH:MM(:SS)?
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (match) {
    const year = parseInt(match[1], 10)
    const month = parseInt(match[2], 10) - 1 // 0-indexed
    const day = parseInt(match[3], 10)
    const hours = match[4] !== undefined ? parseInt(match[4], 10) : 12
    const minutes = match[5] !== undefined ? parseInt(match[5], 10) : 0
    const seconds = match[6] !== undefined ? parseInt(match[6], 10) : 0
    return new Date(year, month, day, hours, minutes, seconds)
  }

  const fallback = new Date(dateString)
  return isNaN(fallback.getTime()) ? null : fallback
}

/**
 * Formats the event's start time (e.g. "2:00 PM" or "14:00")
 */
export function formatEventTime(dateString?: string | null, locale: string = 'en-US'): string {
  const d = parseEventDate(dateString)
  if (!d) return ''
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Formats the event's full date (e.g. "Sat, Sep 5, 2026")
 */
export function formatEventFullDate(dateString?: string | null, locale: string = 'en-US'): string {
  const d = parseEventDate(dateString)
  if (!d) return 'Date TBD'
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Formats the event's short date (e.g. "Sep 5")
 */
export function formatEventShortDate(dateString?: string | null, locale: string = 'en-US'): string {
  const d = parseEventDate(dateString)
  if (!d) return 'Date TBD'
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * Formats relative date display for cards & badges ("Today", "Tomorrow", "Sat, Sep 5")
 */
export function formatEventDisplayDate(
  dateString?: string,
  locale: string = 'en-US'
): { label: string; time: string; badge?: string } {
  if (!dateString) return { label: 'Upcoming', time: '' }
  const d = parseEventDate(dateString)
  if (!d) return { label: 'Upcoming', time: '' }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((eventDay - today) / (1000 * 60 * 60 * 24))

  const time = formatEventTime(dateString, locale)

  if (diffDays === 0) return { label: 'Today', time, badge: 'Today' }
  if (diffDays === 1) return { label: 'Tomorrow', time, badge: 'Tomorrow' }
  if (diffDays === -1) return { label: 'Yesterday', time, badge: 'Past' }
  if (diffDays < -1) return { label: formatEventShortDate(dateString, locale), time, badge: 'Past' }
  if (diffDays > 1 && diffDays < 7) {
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d)
    const monthDay = formatEventShortDate(dateString, locale)
    return { label: `${weekday}, ${monthDay}`, time }
  }
  return { label: formatEventShortDate(dateString, locale), time }
}
