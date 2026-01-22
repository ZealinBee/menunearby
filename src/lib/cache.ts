// In-memory cache with TTL support

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize = 1000;

  get<T>(key: string): { data: T; age: number } | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const isExpired = age > entry.ttl;

    if (isExpired) {
      this.store.delete(key);
      return null;
    }

    return { data: entry.data, age: Math.floor(age / 1000) };
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.store.size >= this.maxSize) {
      this.cleanup();
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  private cleanup(): void {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.store) {
      if (now - entry.timestamp > entry.ttl) {
        this.store.delete(key);
        deleted++;
      }
    }

    // If we didn't delete enough expired entries, remove oldest entries
    if (deleted < 100 && this.store.size >= this.maxSize) {
      const entries = Array.from(this.store.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, 100);
      for (const [key] of toDelete) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton instance
export const placesCache = new SimpleCache();

// Cache key generators
export function nearbySearchCacheKey(
  lat: number,
  lon: number,
  radius: number
): string {
  // Round to 3 decimal places (~100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLon = Math.round(lon * 1000) / 1000;
  return `nearby:${roundedLat}:${roundedLon}:${radius}`;
}

export function placeDetailsCacheKey(placeId: string): string {
  return `details:${placeId}`;
}

export function menuCacheKey(placeId: string): string {
  return `menu:${placeId}`;
}
