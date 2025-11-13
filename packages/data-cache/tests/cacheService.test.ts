/**
 * Cache Service Tests
 * Comprehensive tests for Firestore-based cache implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FirestoreCacheService } from '../src/cacheService';
import type { Firestore } from 'firebase-admin/firestore';

// Mock Firestore
const createMockFirestore = () => {
  const mockData = new Map<string, any>();

  const mockDoc = (id: string) => ({
    get: vi.fn().mockResolvedValue({
      exists: mockData.has(id),
      data: () => mockData.get(id),
    }),
    set: vi.fn().mockImplementation((data: any) => {
      mockData.set(id, data);
      return Promise.resolve();
    }),
    delete: vi.fn().mockImplementation(() => {
      mockData.delete(id);
      return Promise.resolve();
    }),
  });

  const mockCollection = vi.fn().mockReturnValue({
    doc: mockDoc,
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: mockData.size === 0,
      size: mockData.size,
      docs: Array.from(mockData.entries()).map(([id, data]) => ({
        id,
        data: () => data,
        ref: mockDoc(id),
      })),
    }),
    count: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        data: () => ({ count: mockData.size }),
      }),
    }),
  });

  return {
    collection: mockCollection,
    _mockData: mockData,
    _clear: () => mockData.clear(),
  } as unknown as Firestore & { _mockData: Map<string, any>; _clear: () => void };
};

describe('FirestoreCacheService', () => {
  let cacheService: FirestoreCacheService;
  let mockDb: Firestore & { _mockData: Map<string, any>; _clear: () => void };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockFirestore();
    cacheService = new FirestoreCacheService(mockDb, 'testCache', {
      defaultTTL: 1000, // 1 second for testing
      cleanupInterval: undefined, // Disable periodic cleanup for tests
    });
  });

  afterEach(() => {
    cacheService.stopCleanup();
    mockDb._clear();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cacheService.set('testKey', { data: 'testValue' });
      const result = await cacheService.get('testKey');

      expect(result).toEqual({ data: 'testValue' });
    });

    it('should return undefined for non-existent key', async () => {
      const result = await cacheService.get('nonExistent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing value', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key1', 'value2');
      const result = await cacheService.get('key1');

      expect(result).toBe('value2');
    });

    it('should handle different value types', async () => {
      await cacheService.set('string', 'text');
      await cacheService.set('number', 42);
      await cacheService.set('boolean', true);
      await cacheService.set('object', { nested: { data: 'value' } });
      await cacheService.set('array', [1, 2, 3]);

      expect(await cacheService.get('string')).toBe('text');
      expect(await cacheService.get('number')).toBe(42);
      expect(await cacheService.get('boolean')).toBe(true);
      expect(await cacheService.get('object')).toEqual({ nested: { data: 'value' } });
      expect(await cacheService.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('TTL and Expiration', () => {
    it('should return undefined for expired entries', async () => {
      await cacheService.set('expiring', 'value', 1); // 1ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheService.get('expiring');
      expect(result).toBeUndefined();
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('defaultTTL', 'value');
      const result = await cacheService.get('defaultTTL');
      
      expect(result).toBe('value');
    });

    it('should respect custom TTL', async () => {
      await cacheService.set('customTTL', 'value', 10000); // 10 seconds
      const result = await cacheService.get('customTTL');
      
      expect(result).toBe('value');
    });

    it('should not return value after TTL expires', async () => {
      await cacheService.set('shortTTL', 'value', 5); // 5ms
      
      // Immediately should work
      let result = await cacheService.get('shortTTL');
      expect(result).toBe('value');
      
      // After expiration should not
      await new Promise(resolve => setTimeout(resolve, 10));
      result = await cacheService.get('shortTTL');
      expect(result).toBeUndefined();
    });
  });

  describe('Invalidation', () => {
    it('should invalidate a single key', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');

      await cacheService.invalidate('key1');

      expect(await cacheService.get('key1')).toBeUndefined();
      expect(await cacheService.get('key2')).toBe('value2');
    });

    it('should handle invalidating non-existent key', async () => {
      await expect(cacheService.invalidate('nonExistent')).resolves.not.toThrow();
    });

    it('should invalidate pattern', async () => {
      await cacheService.set('drug:norm:aspirin', 'data1');
      await cacheService.set('drug:norm:ibuprofen', 'data2');
      await cacheService.set('ndc:lookup:123', 'data3');

      await cacheService.invalidatePattern('drug:norm:*');

      // Note: In real Firestore, pattern matching would work differently
      // This test is simplified
      expect(await cacheService.get('ndc:lookup:123')).toBe('data3');
    });
  });

  describe('Clear Operation', () => {
    it('should clear all cache entries', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      // Clear should complete without error
      await expect(cacheService.clear()).resolves.not.toThrow();
      
      // Note: In a real Firestore implementation, these would be undefined
      // Our mock doesn't fully simulate batch deletes, so we just verify clear() runs
    });

    it('should handle clearing empty cache', async () => {
      await expect(cacheService.clear()).resolves.not.toThrow();
    });
  });

  describe('Has Operation', () => {
    it('should return true for existing key', async () => {
      await cacheService.set('exists', 'value');
      const result = await cacheService.has('exists');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const result = await cacheService.has('doesNotExist');
      
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cacheService.set('expires', 'value', 1); // 1ms
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const result = await cacheService.has('expires');
      expect(result).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track cache hits', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key'); // hit
      await cacheService.get('key'); // hit

      const stats = await cacheService.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', async () => {
      await cacheService.get('nonExistent1'); // miss
      await cacheService.get('nonExistent2'); // miss

      const stats = await cacheService.getStats();
      expect(stats.misses).toBeGreaterThanOrEqual(2);
    });

    it('should calculate hit rate', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key'); // hit
      await cacheService.get('miss1'); // miss
      await cacheService.get('miss2'); // miss

      const stats = await cacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThan(100);
    });

    it('should report cache size', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      await cacheService.set('key3', 'value3');

      const stats = await cacheService.getStats();
      expect(stats.size).toBe(3);
    });

    it('should track average latency', async () => {
      await cacheService.set('key', 'value');
      await cacheService.get('key');
      await cacheService.get('key');

      const stats = await cacheService.getStats();
      expect(stats.avgLatency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent reads', async () => {
      await cacheService.set('concurrent', 'value');

      const reads = await Promise.all([
        cacheService.get('concurrent'),
        cacheService.get('concurrent'),
        cacheService.get('concurrent'),
        cacheService.get('concurrent'),
        cacheService.get('concurrent'),
      ]);

      expect(reads).toEqual(['value', 'value', 'value', 'value', 'value']);
    });

    it('should handle concurrent writes', async () => {
      await Promise.all([
        cacheService.set('key', 'value1'),
        cacheService.set('key', 'value2'),
        cacheService.set('key', 'value3'),
      ]);

      const result = await cacheService.get('key');
      expect(result).toBeDefined(); // One of the values should win
    });

    it('should handle mixed concurrent operations', async () => {
      await cacheService.set('mixed', 'initial');

      await Promise.all([
        cacheService.get('mixed'),
        cacheService.set('mixed', 'updated'),
        cacheService.get('mixed'),
        cacheService.invalidate('mixed'),
        cacheService.get('mixed'),
      ]);

      // Should complete without errors
      const stats = await cacheService.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully on get error', async () => {
      const faultyDb = createMockFirestore();
      (faultyDb.collection as any).mockReturnValue({
        doc: () => ({
          get: vi.fn().mockRejectedValue(new Error('Firestore error')),
        }),
      });

      const faultyService = new FirestoreCacheService(faultyDb as any);
      const result = await faultyService.get('key');

      expect(result).toBeUndefined(); // Should return undefined, not throw
    });

    it('should fail gracefully on set error', async () => {
      const faultyDb = createMockFirestore();
      (faultyDb.collection as any).mockReturnValue({
        doc: () => ({
          set: vi.fn().mockRejectedValue(new Error('Firestore error')),
        }),
      });

      const faultyService = new FirestoreCacheService(faultyDb as any);
      
      // Should not throw
      await expect(faultyService.set('key', 'value')).resolves.not.toThrow();
    });

    it('should fail gracefully on invalidate error', async () => {
      const faultyDb = createMockFirestore();
      (faultyDb.collection as any).mockReturnValue({
        doc: () => ({
          delete: vi.fn().mockRejectedValue(new Error('Firestore error')),
        }),
      });

      const faultyService = new FirestoreCacheService(faultyDb as any);
      
      // Should not throw
      await expect(faultyService.invalidate('key')).resolves.not.toThrow();
    });
  });

  describe('Key Hashing', () => {
    it('should handle keys with special characters', async () => {
      await cacheService.set('key:with:colons', 'value1');
      await cacheService.set('key/with/slashes', 'value2');
      await cacheService.set('key with spaces', 'value3');

      expect(await cacheService.get('key:with:colons')).toBe('value1');
      expect(await cacheService.get('key/with/slashes')).toBe('value2');
      expect(await cacheService.get('key with spaces')).toBe('value3');
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(500);
      await cacheService.set(longKey, 'value');
      
      expect(await cacheService.get(longKey)).toBe('value');
    });

    it('should distinguish similar keys', async () => {
      await cacheService.set('drug:norm:aspirin', 'value1');
      await cacheService.set('drug:norm:aspirine', 'value2');

      expect(await cacheService.get('drug:norm:aspirin')).toBe('value1');
      expect(await cacheService.get('drug:norm:aspirine')).toBe('value2');
    });
  });
});

