export type TabType = 'meet' | 'connections' | 'circles';

export interface HobbyTag {
  id: string | number;
  name: string;
}

export interface Circle {
  id: string | number;
  name: string;
  subdomain?: string;
  description?: string;
  locationName?: string;
  isVirtual?: boolean;
  imageUrl?: string;
  ageRange?: string;
  minAge?: number;
  maxAge?: number;
  memberCount?: number;
  affinityScore?: number;
  distance?: number;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  creator?: {
    id: string | number;
    username: string;
  };
  hobbies?: HobbyTag[];
}

// Backwards compatibility alias for components referencing CircleMatch
export type CircleMatch = Circle;
