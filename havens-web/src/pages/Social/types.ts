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
  imageUrl?: string;
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
