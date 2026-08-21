export type TabType = 'meet' | 'connections' | 'circles';

export interface CircleMatch {
  id: number;
  name: string;
  description: string;
  membersCount: number;
  tags: string[];
  location: string;
  distanceKm: number;
  matchScore: number;
}

export const RECOMMENDED_CIRCLE_MATCHES: CircleMatch[] = [
  {
    id: 1,
    name: 'Kitsilano Trail Runners',
    description: 'Local neighborhood running circle exploring Pacific Spirit trails and Kits beach sunset runs.',
    membersCount: 14,
    tags: ['Running', 'Trail Running', 'Outdoors'],
    location: 'Kitsilano, Vancouver',
    distanceKm: 1.2,
    matchScore: 96,
  },
  {
    id: 2,
    name: 'Specialty Coffee & Pour Over Guild',
    description: 'Weekly pour-over tastings, micro-roaster visits, and weekend brunch meetups.',
    membersCount: 28,
    tags: ['Specialty Coffee', 'Espresso', 'Brunch'],
    location: 'Mount Pleasant, Vancouver',
    distanceKm: 2.5,
    matchScore: 92,
  },
  {
    id: 3,
    name: 'North Shore Bouldering Circle',
    description: 'Indoor bouldering sessions at the Hive and outdoor weekend bouldering trips.',
    membersCount: 9,
    tags: ['Bouldering', 'Rock Climbing'],
    location: 'North Vancouver',
    distanceKm: 4.8,
    matchScore: 88,
  },
  {
    id: 4,
    name: 'Web3 & AI Product Designers',
    description: 'Co-working sessions, UI reviews, and open-source collaboration for tech enthusiasts.',
    membersCount: 22,
    tags: ['AI', 'UX/UI Design', 'Startups'],
    location: 'Downtown Vancouver',
    distanceKm: 3.1,
    matchScore: 85,
  },
];
