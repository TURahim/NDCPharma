/**
 * Cache types and interfaces
 */

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  ttl: number; // Time to live in milliseconds
}

/**
 * Cache options for get/set operations
 */
export interface CacheOptions {
  ttl?: number; // Override default TTL in milliseconds
  skipCache?: boolean; // Skip cache lookup and force fresh data
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number; // Percentage (0-100)
  size: number; // Number of entries
  avgLatency: number; // Average cache operation latency in ms
}

/**
 * Cache service interface
 */
export interface ICacheService {
  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Invalidate (delete) cache entry
   * @param key Cache key
   */
  invalidate(key: string): Promise<void>;

  /**
   * Invalidate all cache entries matching a pattern
   * @param pattern Key pattern (e.g., "rxcui:*")
   */
  invalidatePattern(pattern: string): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  has(key: string): Promise<boolean>;
}

/**
 * Cache key types for different data
 */
export enum CacheKeyType {
  DRUG_NORMALIZATION = 'drug:norm',
  NDC_LOOKUP = 'ndc:lookup',
  RXCUI_DETAILS = 'rxcui:details',
  FDA_VALIDATION = 'fda:validate',
  CALCULATION_RESULT = 'calc:result',
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  defaultTTL: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum number of entries (optional)
  cleanupInterval?: number; // Interval for cleaning up expired entries in ms
}

/**
 * Calculation log entry for audit trail
 */
export interface CalculationLog {
  id: string;
  userId?: string;
  request: {
    drug: { name?: string; rxcui?: string };
    sig: { dose: number; frequency: number; unit: string };
    daysSupply: number;
  };
  response: {
    success: boolean;
    totalQuantity?: number;
    recommendedPackages?: number;
    executionTime: number;
  };
  timestamp: Date;
  aiUsed: boolean;
  cacheHit: boolean;
}
