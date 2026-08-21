export const SERIF = "'Playfair Display', Georgia, serif"

export const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

export const CATEGORY_ICONS: Record<string, string> = {
  'Outdoors': '🌿',
  'Food & Drink': '🍷',
  'Arts': '🎨',
  'Social': '✨',
  'Wellness': '🧘',
}

export const CLOUDINARY_CLOUD_NAME = 'g8jffrmx'

export type Visibility = 'friends_only' | 'community_only' | 'public'
export type PlansSubTab = 'create plan' | 'my plans'

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

/**
 * Robust date formatting utility for event cards and badges.
 */
export function formatEventDisplayDate(dateString?: string): { label: string; time: string; badge?: string } {
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
