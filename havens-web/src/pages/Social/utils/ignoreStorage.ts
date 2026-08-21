const IGNORE_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'havens_ignored_users';

/**
 * Retrieve the dictionary of currently ignored user IDs mapped to timestamp.
 */
export const getIgnoredUsers = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    // Prune expired entries (older than 24h)
    const active: Record<string, number> = {};
    for (const [uid, ts] of Object.entries(parsed)) {
      if (now - (ts as number) < IGNORE_COOLDOWN_MS) {
        active[uid] = ts as number;
      }
    }
    return active;
  } catch {
    return {};
  }
};

/**
 * Suppress a user from the Meet discovery suggestions for 24 hours.
 */
export const ignoreUser = (userId: string): void => {
  const current = getIgnoredUsers();
  current[userId] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
};

/**
 * Check if a user is currently within their 24-hour ignore cooldown.
 */
export const isUserIgnored = (userId: string): boolean => {
  const ignored = getIgnoredUsers();
  return userId in ignored;
};

/**
 * Client-side affinity percentage calculation based on shared hobby tags.
 */
export const computeAffinity = (myHobbies: any[], theirHobbies: any[]): number => {
  if (!myHobbies?.length || !theirHobbies?.length) return 0;
  const myIds = new Set(myHobbies.map((h: any) => h.id));
  const shared = theirHobbies.filter((h: any) => myIds.has(h.id)).length;
  const total = new Set([...myHobbies.map((h: any) => h.id), ...theirHobbies.map((h: any) => h.id)]).size;
  return total > 0 ? Math.round((shared / total) * 100) : 0;
};
