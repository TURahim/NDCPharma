/**
 * Cached FDA Client
 * Implements cache-aside pattern for FDA NDC lookups
 * 
 * NOTE: This requires Firestore to be initialized in the calling application.
 * See integration instructions in README.md
 */

import { FDAClient, fdaClient as defaultFdaClient } from './index';
import { createLogger } from '@core-guardrails';
import type { NDCPackage, NDCDetails, NDCValidationResult, FDAServiceConfig } from './internal/fdaTypes';

// Cache service interface (to avoid circular dependency)
interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

const logger = createLogger({ service: 'FDACachedClient' });

// TTL constants
const NDC_LOOKUP_TTL = 60 * 60 * 1000; // 1 hour
const NDC_VALIDATION_TTL = 60 * 60 * 1000; // 1 hour

// Cache service instance (initialized externally)
let cacheService: ICacheService | null = null;

/**
 * Initialize the cache service for FDA client
 * Must be called before using cached client
 * 
 * @param cache Cache service instance
 */
export function initFDACache(cache: ICacheService): void {
  cacheService = cache;
  logger.info('FDA cache initialized');
}

/**
 * Check if cache is available
 */
function isCacheAvailable(): boolean {
  return cacheService !== null;
}

/**
 * Create cache key for NDC lookup by RxCUI
 */
function createNDCLookupKey(rxcui: string, options?: {
  activeOnly?: boolean;
  dosageForm?: string;
}): string {
  const parts = [`ndc:lookup:${rxcui}`];
  if (options?.activeOnly) parts.push('active');
  if (options?.dosageForm) parts.push(options.dosageForm.toLowerCase());
  return parts.join(':');
}

/**
 * Create cache key for NDC details
 */
function createNDCDetailsKey(ndc: string): string {
  return `ndc:details:${ndc.replace(/-/g, '')}`;
}

/**
 * Create cache key for NDC validation
 */
function createNDCValidationKey(ndc: string): string {
  return `ndc:validate:${ndc.replace(/-/g, '')}`;
}

/**
 * Cached FDA Client
 * Wraps FDAClient with cache-aside pattern
 */
export class CachedFDAClient {
  private client: FDAClient;

  constructor(config?: FDAServiceConfig) {
    this.client = config ? new FDAClient(config) : defaultFdaClient;
  }

  /**
   * Get NDC packages by RxCUI with caching
   * 
   * @param rxcui RxNorm Concept Unique Identifier
   * @param options Search options + skipCache
   * @returns Array of NDC packages
   */
  async getNDCsByRxCUI(
    rxcui: string,
    options: {
      limit?: number;
      skip?: number;
      activeOnly?: boolean;
      dosageForm?: string;
      skipCache?: boolean;
    } = {}
  ): Promise<NDCPackage[]> {
    const cacheKey = createNDCLookupKey(rxcui, {
      activeOnly: options.activeOnly,
      dosageForm: options.dosageForm,
    });
    const startTime = Date.now();

    // Try cache first (if available and not skipped)
    if (isCacheAvailable() && !options.skipCache) {
      try {
        const cached = await cacheService!.get<NDCPackage[]>(cacheKey);
        if (cached) {
          const cacheLatency = Date.now() - startTime;
          logger.debug('Cache hit for NDC lookup', {
            rxcui,
            packageCount: cached.length,
            cacheLatency,
          });
          return cached;
        }
      } catch (error) {
        // Cache failure - log and continue to API
        logger.warn('Cache get failed, falling back to API', {
          error: error as Error,
          rxcui,
        });
      }
    }

    // Cache miss or unavailable - call API
    logger.debug('Cache miss for NDC lookup', { rxcui });

    const packages = await this.client.getNDCsByRxCUI(rxcui, options);

    // Store in cache (if available)
    if (isCacheAvailable()) {
      try {
        await cacheService!.set(cacheKey, packages, NDC_LOOKUP_TTL);
        logger.debug('Stored NDC lookup in cache', {
          rxcui,
          packageCount: packages.length,
          ttl: NDC_LOOKUP_TTL,
        });
      } catch (error) {
        // Cache failure - log but don't throw
        logger.warn('Cache set failed', {
          error: error as Error,
          rxcui,
        });
      }
    }

    const totalLatency = Date.now() - startTime;
    logger.info('NDC lookup completed', {
      rxcui,
      packageCount: packages.length,
      totalLatency,
      cacheUsed: false,
    });

    return packages;
  }

  /**
   * Get NDC details with caching
   * 
   * @param packageNdc Package NDC (11-digit format)
   * @param options Options + skipCache
   * @returns NDC details or null if not found
   */
  async getNDCDetails(
    packageNdc: string,
    options?: { skipCache?: boolean }
  ): Promise<NDCDetails | null> {
    const cacheKey = createNDCDetailsKey(packageNdc);
    const startTime = Date.now();

    // Try cache first (if available and not skipped)
    if (isCacheAvailable() && !options?.skipCache) {
      try {
        const cached = await cacheService!.get<NDCDetails | null>(cacheKey);
        if (cached !== undefined) { // null is a valid cached value
          const cacheLatency = Date.now() - startTime;
          logger.debug('Cache hit for NDC details', {
            ndc: packageNdc,
            found: cached !== null,
            cacheLatency,
          });
          return cached;
        }
      } catch (error) {
        // Cache failure - log and continue to API
        logger.warn('Cache get failed, falling back to API', {
          error: error as Error,
          ndc: packageNdc,
        });
      }
    }

    // Cache miss or unavailable - call API
    logger.debug('Cache miss for NDC details', { ndc: packageNdc });

    const details = await this.client.getNDCDetails(packageNdc);

    // Store in cache (if available), including null results
    if (isCacheAvailable()) {
      try {
        await cacheService!.set(cacheKey, details, NDC_LOOKUP_TTL);
        logger.debug('Stored NDC details in cache', {
          ndc: packageNdc,
          found: details !== null,
          ttl: NDC_LOOKUP_TTL,
        });
      } catch (error) {
        // Cache failure - log but don't throw
        logger.warn('Cache set failed', {
          error: error as Error,
          ndc: packageNdc,
        });
      }
    }

    const totalLatency = Date.now() - startTime;
    logger.info('NDC details fetch completed', {
      ndc: packageNdc,
      found: details !== null,
      totalLatency,
      cacheUsed: false,
    });

    return details;
  }

  /**
   * Validate NDC with caching
   * 
   * @param ndc NDC code to validate
   * @param options Options + skipCache
   * @returns Validation result with status
   */
  async validateNDC(
    ndc: string,
    options?: { skipCache?: boolean }
  ): Promise<NDCValidationResult> {
    const cacheKey = createNDCValidationKey(ndc);
    const startTime = Date.now();

    // Try cache first (if available and not skipped)
    if (isCacheAvailable() && !options?.skipCache) {
      try {
        const cached = await cacheService!.get<NDCValidationResult>(cacheKey);
        if (cached) {
          const cacheLatency = Date.now() - startTime;
          logger.debug('Cache hit for NDC validation', {
            ndc,
            isValid: cached.isValid,
            cacheLatency,
          });
          return cached;
        }
      } catch (error) {
        // Cache failure - log and continue to API
        logger.warn('Cache get failed, falling back to API', {
          error: error as Error,
          ndc,
        });
      }
    }

    // Cache miss or unavailable - call API
    logger.debug('Cache miss for NDC validation', { ndc });

    const validation = await this.client.validateNDC(ndc);

    // Store in cache (if available)
    if (isCacheAvailable()) {
      try {
        await cacheService!.set(cacheKey, validation, NDC_VALIDATION_TTL);
        logger.debug('Stored NDC validation in cache', {
          ndc,
          isValid: validation.isValid,
          ttl: NDC_VALIDATION_TTL,
        });
      } catch (error) {
        // Cache failure - log but don't throw
        logger.warn('Cache set failed', {
          error: error as Error,
          ndc,
        });
      }
    }

    const totalLatency = Date.now() - startTime;
    logger.info('NDC validation completed', {
      ndc,
      isValid: validation.isValid,
      totalLatency,
      cacheUsed: false,
    });

    return validation;
  }

  /**
   * Passthrough methods (non-cached as they aggregate data)
   */
  async searchByGenericName(
    genericName: string,
    options: {
      limit?: number;
      skip?: number;
      activeOnly?: boolean;
      dosageForm?: string;
    } = {}
  ): Promise<NDCPackage[]> {
    return this.client.searchByGenericName(genericName, options);
  }

  async getDosageForms(rxcui: string): Promise<string[]> {
    return this.client.getDosageForms(rxcui);
  }

  async getPackageSizes(rxcui: string, dosageForm?: string): Promise<number[]> {
    return this.client.getPackageSizes(rxcui, dosageForm);
  }
}

/**
 * Invalidate NDC lookup cache for a specific RxCUI
 * 
 * @param rxcui RxCUI to invalidate
 */
export async function invalidateNDCLookupCache(rxcui: string): Promise<void> {
  if (!isCacheAvailable()) {
    logger.warn('Cache not available, cannot invalidate');
    return;
  }

  // Invalidate all variations of this RxCUI lookup
  const baseKey = `ndc:lookup:${rxcui}`;
  try {
    await cacheService!.invalidate(baseKey);
    await cacheService!.invalidate(`${baseKey}:active`);
    logger.info('Invalidated NDC lookup cache', { rxcui });
  } catch (error) {
    logger.error('Failed to invalidate cache', error as Error, { rxcui });
  }
}

/**
 * Invalidate NDC details cache for a specific NDC
 * 
 * @param ndc NDC to invalidate
 */
export async function invalidateNDCDetailsCache(ndc: string): Promise<void> {
  if (!isCacheAvailable()) {
    logger.warn('Cache not available, cannot invalidate');
    return;
  }

  const detailsKey = createNDCDetailsKey(ndc);
  const validationKey = createNDCValidationKey(ndc);
  
  try {
    await cacheService!.invalidate(detailsKey);
    await cacheService!.invalidate(validationKey);
    logger.info('Invalidated NDC details and validation cache', { ndc });
  } catch (error) {
    logger.error('Failed to invalidate cache', error as Error, { ndc });
  }
}

// Export singleton instance
export const cachedFdaClient = new CachedFDAClient();

