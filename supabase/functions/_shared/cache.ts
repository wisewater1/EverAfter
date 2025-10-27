/**
 * Production-Grade Caching System
 * In-memory caching with TTL, LRU eviction, and cache statistics
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccess: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

export class Cache<T> {
  private store: Map<string, CacheEntry<T>>;
  private hits: number = 0;
  private misses: number = 0;
  private defaultTtl: number;
  private maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.store = new Map();
    this.defaultTtl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTtl);

    this.store.set(key, {
      value,
      expiresAt,
      accessCount: 0,
      lastAccess: Date.now(),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get or compute value
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  userMetrics: (userId: string, metric: string, days: number) =>
    `user:${userId}:metrics:${metric}:${days}d`,

  providerAccount: (userId: string, provider: string) =>
    `user:${userId}:provider:${provider}`,

  connectionHealth: (userId: string) =>
    `user:${userId}:connection-health`,

  insights: (userId: string, timeframe: number) =>
    `user:${userId}:insights:${timeframe}d`,

  tokenRefresh: (providerId: string) =>
    `token-refresh:${providerId}`,

  healthSummary: (userId: string) =>
    `user:${userId}:health-summary`,

  syncStatus: (accountId: string) =>
    `sync-status:${accountId}`,
};

/**
 * Global cache instances
 */
export const UserDataCache = new Cache<any>({
  ttl: 300000, // 5 minutes
  maxSize: 500,
});

export const ConnectionCache = new Cache<any>({
  ttl: 60000, // 1 minute
  maxSize: 200,
});

export const InsightsCache = new Cache<any>({
  ttl: 900000, // 15 minutes
  maxSize: 100,
});

/**
 * Cache middleware for edge functions
 */
export async function withCache<T>(
  cache: Cache<T>,
  key: string,
  factory: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.getOrSet(key, factory, ttl);
}

/**
 * Periodic cache cleanup (run in background)
 */
export function startCacheCleanup(interval: number = 300000): NodeJS.Timeout | number {
  return setInterval(() => {
    const userDataRemoved = UserDataCache.cleanup();
    const connectionRemoved = ConnectionCache.cleanup();
    const insightsRemoved = InsightsCache.cleanup();

    console.log('Cache cleanup completed:', {
      userDataRemoved,
      connectionRemoved,
      insightsRemoved,
      timestamp: new Date().toISOString(),
    });
  }, interval);
}

/**
 * Get all cache statistics
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    userData: UserDataCache.getStats(),
    connection: ConnectionCache.getStats(),
    insights: InsightsCache.getStats(),
  };
}

/**
 * Cache warming - preload frequently accessed data
 */
export async function warmCache(
  userId: string,
  fetchFunctions: Record<string, () => Promise<any>>
): Promise<void> {
  const promises = Object.entries(fetchFunctions).map(async ([key, fetchFn]) => {
    try {
      const data = await fetchFn();
      UserDataCache.set(`${userId}:${key}`, data);
    } catch (error) {
      console.error(`Cache warming failed for ${key}:`, error);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Invalidate cache entries by pattern
 */
export function invalidatePattern(cache: Cache<any>, pattern: string): number {
  let invalidated = 0;
  const keys = cache.keys();

  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
      invalidated++;
    }
  }

  return invalidated;
}
