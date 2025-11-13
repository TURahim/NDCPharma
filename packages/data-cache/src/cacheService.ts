/**
 * Firestore-based Cache Service
 * Implements cache-aside pattern with TTL support
 */

import { Firestore } from 'firebase-admin/firestore';
import {
  ICacheService,
  CacheEntry,
  CacheStats,
  CacheConfig,
} from './types';
import { createLogger } from '@core-guardrails';
import { createHash } from 'crypto';

const logger = createLogger({ service: 'CacheService' });

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  maxSize: 10000, // Maximum 10,000 entries
  cleanupInterval: 60 * 60 * 1000, // Cleanup every hour
};

/**
 * Firestore-based cache service implementation
 */
export class FirestoreCacheService implements ICacheService {
  private db: Firestore;
  private collectionName: string;
  private config: CacheConfig;
  private stats: { hits: number; misses: number; totalLatency: number; operations: number };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    db: Firestore,
    collectionName: string = 'calculationCache',
    config: Partial<CacheConfig> = {}
  ) {
    this.db = db;
    this.collectionName = collectionName;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { hits: 0, misses: 0, totalLatency: 0, operations: 0 };

    // Start periodic cleanup
    if (this.config.cleanupInterval) {
      this.startPeriodicCleanup();
    }

    logger.info('Cache service initialized', {
      collection: this.collectionName,
      defaultTTL: this.config.defaultTTL,
      maxSize: this.config.maxSize,
    });
  }

  /**
   * Generate consistent cache key
   * @param key Original key
   * @returns Hashed key for Firestore document ID
   */
  private getCacheKey(key: string): string {
    // Use SHA-256 to create a valid Firestore document ID
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Check if cache entry is expired
   * @param entry Cache entry
   * @returns True if expired
   */
  private isExpired(entry: CacheEntry<unknown>): boolean {
    return new Date() > new Date(entry.expiresAt);
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | undefined> {
    const startTime = Date.now();

    try {
      const docId = this.getCacheKey(key);
      const docRef = this.db.collection(this.collectionName).doc(docId);
      const doc = await docRef.get();

      if (!doc.exists) {
        this.stats.misses++;
        this.recordLatency(startTime);
        logger.debug('Cache miss', { key, docId });
        return undefined;
      }

      const entry = doc.data() as CacheEntry<T>;

      // Check if expired
      if (this.isExpired(entry)) {
        this.stats.misses++;
        this.recordLatency(startTime);
        logger.debug('Cache entry expired', { key, docId, expiresAt: entry.expiresAt });
        
        // Delete expired entry asynchronously
        docRef.delete().catch((err) => {
          logger.error('Failed to delete expired entry', err, { key, docId });
        });
        
        return undefined;
      }

      this.stats.hits++;
      this.recordLatency(startTime);
      logger.debug('Cache hit', { key, docId, age: Date.now() - new Date(entry.createdAt).getTime() });
      
      return entry.value;
    } catch (error) {
      logger.error('Cache get failed', error as Error, { key });
      this.stats.misses++;
      this.recordLatency(startTime);
      return undefined; // Fail gracefully
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      const docId = this.getCacheKey(key);
      const now = new Date();
      const effectiveTTL = ttl || this.config.defaultTTL;
      const expiresAt = new Date(now.getTime() + effectiveTTL);

      const entry: CacheEntry<T> = {
        key,
        value,
        expiresAt,
        createdAt: now,
        updatedAt: now,
        ttl: effectiveTTL,
      };

      await this.db.collection(this.collectionName).doc(docId).set(entry);

      this.recordLatency(startTime);
      logger.debug('Cache set', { key, docId, ttl: effectiveTTL, expiresAt });
    } catch (error) {
      logger.error('Cache set failed', error as Error, { key });
      // Fail gracefully - don't throw
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidate(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      const docId = this.getCacheKey(key);
      await this.db.collection(this.collectionName).doc(docId).delete();

      this.recordLatency(startTime);
      logger.debug('Cache invalidated', { key, docId });
    } catch (error) {
      logger.error('Cache invalidate failed', error as Error, { key });
      // Fail gracefully
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const startTime = Date.now();

    try {
      // For pattern matching, we need to query by the original key field
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('key', '>=', pattern.replace('*', ''))
        .where('key', '<', pattern.replace('*', '\uf8ff'))
        .get();

      const batch = this.db.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();

      this.recordLatency(startTime);
      logger.info('Cache pattern invalidated', { pattern, count });
    } catch (error) {
      logger.error('Cache pattern invalidate failed', error as Error, { pattern });
      // Fail gracefully
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const snapshot = await this.db.collection(this.collectionName).count().get();
      const size = snapshot.data().count;

      const totalRequests = this.stats.hits + this.stats.misses;
      const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
      const avgLatency = this.stats.operations > 0 ? this.stats.totalLatency / this.stats.operations : 0;

      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate,
        size,
        avgLatency,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error);
      return {
        hits: this.stats.hits,
        misses: this.stats.misses,
        hitRate: 0,
        size: 0,
        avgLatency: 0,
      };
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    const startTime = Date.now();

    try {
      const snapshot = await this.db.collection(this.collectionName).get();
      const batch = this.db.batch();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      this.recordLatency(startTime);
      logger.info('Cache cleared', { count: snapshot.size });
    } catch (error) {
      logger.error('Cache clear failed', error as Error);
      // Fail gracefully
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== undefined;
    } catch (error) {
      logger.error('Cache has failed', error as Error, { key });
      return false;
    }
  }

  /**
   * Record operation latency
   */
  private recordLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    this.stats.totalLatency += latency;
    this.stats.operations++;
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired().catch((err) => {
        logger.error('Periodic cleanup failed', err);
      });
    }, this.config.cleanupInterval);

    logger.info('Periodic cleanup started', { interval: this.config.cleanupInterval });
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpired(): Promise<void> {
    try {
      const now = new Date();
      const snapshot = await this.db
        .collection(this.collectionName)
        .where('expiresAt', '<', now)
        .limit(100) // Process in batches
        .get();

      if (snapshot.empty) {
        logger.debug('No expired entries to clean up');
        return;
      }

      const batch = this.db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      logger.info('Expired cache entries cleaned up', { count: snapshot.size });
    } catch (error) {
      logger.error('Failed to cleanup expired entries', error as Error);
    }
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Periodic cleanup stopped');
    }
  }
}

/**
 * Create a cache key for drug normalization
 * @param drugName Drug name
 * @returns Cache key
 */
export function createDrugNormalizationKey(drugName: string): string {
  return `drug:norm:${drugName.toLowerCase().trim()}`;
}

/**
 * Create a cache key for NDC lookup by RxCUI
 * @param rxcui RxCUI
 * @returns Cache key
 */
export function createNDCLookupKey(rxcui: string): string {
  return `ndc:lookup:${rxcui}`;
}

/**
 * Create a cache key for RxCUI details
 * @param rxcui RxCUI
 * @returns Cache key
 */
export function createRxCUIDetailsKey(rxcui: string): string {
  return `rxcui:details:${rxcui}`;
}

/**
 * Create a cache key for FDA NDC validation
 * @param ndc NDC code
 * @returns Cache key
 */
export function createFDAValidationKey(ndc: string): string {
  return `fda:validate:${ndc.replace(/-/g, '')}`;
}

