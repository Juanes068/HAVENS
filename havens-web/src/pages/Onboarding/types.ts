export interface Hobby {
  id: string | number;
  name: string;
  category?: {
    id: string | number;
    name: string;
  };
}

export interface HobbyCategory {
  id: string | number;
  name: string;
  hobbies: Hobby[];
}

export const MAX_PRIMARY_CATEGORIES = 3;
export const MAX_SUB_HOBBIES_PER_CATEGORY = 5;

// Spotify-inspired curated color gradients per category index
export const CATEGORY_GRADIENTS = [
  'from-emerald-800/90 to-[#2D5A3D]',
  'from-amber-700/90 to-[#C47B5A]',
  'from-indigo-800/90 to-purple-900',
  'from-rose-800/90 to-pink-900',
  'from-teal-800/90 to-cyan-900',
  'from-amber-800/90 to-[#7a4931]',
  'from-[#2D5A3D] to-slate-900',
  'from-purple-800/90 to-indigo-900',
  'from-orange-800/90 to-amber-900',
  'from-blue-800/90 to-indigo-900',
];
