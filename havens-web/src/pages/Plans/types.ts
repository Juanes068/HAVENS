export const SERIF = "'Playfair Display', Georgia, serif"

export const CATEGORIES = ['Outdoors', 'Food & Drink', 'Arts', 'Social', 'Wellness']

export const AGE_RANGE_OPTIONS = ['All Ages', '18-25', '21-35', '25-40', '30-50', '18+', '21+']

export const CLOUDINARY_CLOUD_NAME = 'g8jffrmx'

export type Visibility = 'friends_only' | 'community_only' | 'public'
export type PlansSubTab = 'create plan' | 'my plans'

export interface EventCreator {
  id: string | number
  username: string
  photoUrl?: string
}

export interface PlanRSVPUser {
  id: string | number
  username: string
  photoUrl?: string
  age?: number
  neighbourhood?: string
  cityName?: string
}

export interface PlanRSVPItem {
  id: string | number
  response: 'going' | 'maybe' | 'pass' | string
  createdAt?: string
  updatedAt?: string
  user?: PlanRSVPUser
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
  ageRange?: string
  minAge?: number
  maxAge?: number
  creator?: EventCreator
  rsvps?: PlanRSVPItem[]
  attendees?: PlanRSVPUser[]
  hobbies?: { id: string | number; name: string }[]
  going?: number
  goingCount?: number
  userResponse?: 'going' | 'maybe' | 'pass' | 'hosting' | string
  role?: 'hosting' | 'attending'
}
import { formatEventDisplayDate as formatEventDisplayDateUtil } from '../../utils/dateUtils'

/**
 * Robust date formatting utility for event cards and badges.
 */
export const formatEventDisplayDate = formatEventDisplayDateUtil
