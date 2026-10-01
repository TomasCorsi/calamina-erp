/**
 * useOfflineCache - Persists reference data (obras, maquinarias, personal) in localStorage.
 * When a query fails due to no network, serves cached data transparently.
 */

const CACHE_PREFIX = 'offline_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

export function saveToOfflineCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, savedAt: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch (e) {
    // localStorage full or unavailable - ignore silently
    console.warn('Failed to save to offline cache:', e);
  }
}

export function loadFromOfflineCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    // Serve even expired data when offline (better than nothing)
    return entry.data;
  } catch (e) {
    return null;
  }
}

export function isCacheStale(key: string): boolean {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return true;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.savedAt > CACHE_TTL_MS;
  } catch {
    return true;
  }
}
