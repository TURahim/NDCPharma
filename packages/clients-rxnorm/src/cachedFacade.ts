/**
 * Cached RxNorm Client Façade
 * Implements cache-aside pattern for drug normalization
 * 
 * NOTE: This requires Firestore to be initialized in the calling application.
 * See integration instructions in README.md
 */

import { USE_ENHANCED_NORMALIZATION } from '@core-config';
import { drugNormalizer } from './internal/normalizer';
import { rxnormService } from './internal/rxnormService';
import { extractRxCUIsFromSearch } from './internal/rxnormMapper';
import { createLogger } from '@core-guardrails';
import type { NormalizationOptions, RxCuiResult, NdcInfo, FetchOptions } from './facade';

// Cache service interface (to avoid circular dependency)
interface ICacheService {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}

const logger = createLogger({ service: 'RxNormCachedFacade' });

// TTL constants
const DRUG_NORMALIZATION_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RXCUI_DETAILS_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cache service instance (initialized externally)
let cacheService: ICacheService | null = null;

/**
 * Initialize the cache service for RxNorm client
 * Must be called before using cached functions
 * 
 * @param cache Cache service instance
 */
export function initRxNormCache(cache: ICacheService): void {
  cacheService = cache;
  logger.info('RxNorm cache initialized');
}

/**
 * Check if cache is available
 */
function isCacheAvailable(): boolean {
  return cacheService !== null;
}

/**
 * Create cache key for drug normalization
 */
function createDrugNormalizationKey(drugName: string): string {
  return `drug:norm:${drugName.toLowerCase().trim()}`;
}

/**
 * Create cache key for RxCUI details
 */
function createRxCUIDetailsKey(rxcui: string): string {
  return `rxcui:details:${rxcui}`;
}

/**
 * Normalize drug name to RxCUI with caching
 * 
 * Cache-aside pattern:
 * 1. Check cache first
 * 2. If miss, call API
 * 3. Store result in cache
 * 4. Return result
 * 
 * @param name - Drug name to normalize
 * @param opts - Normalization options
 * @returns RxCUI result with confidence score
 */
export async function nameToRxCuiCached(
  name: string,
  opts?: NormalizationOptions & { skipCache?: boolean }
): Promise<RxCuiResult> {
  const cacheKey = createDrugNormalizationKey(name);
  const startTime = Date.now();

  // Try cache first (if available and not skipped)
  if (isCacheAvailable() && !opts?.skipCache) {
    try {
      const cached = await cacheService!.get<RxCuiResult>(cacheKey);
      if (cached) {
        const cacheLatency = Date.now() - startTime;
        logger.debug('Cache hit for drug normalization', {
          drugName: name,
          rxcui: cached.rxcui,
          cacheLatency,
        });
        return cached;
      }
    } catch (error) {
      // Cache failure - log and continue to API
      logger.warn('Cache get failed, falling back to API', {
        error: error as Error,
        drugName: name,
      });
    }
  }

  // Cache miss or unavailable - call API
  logger.debug('Cache miss for drug normalization', { drugName: name });

  let result: RxCuiResult;

  if (USE_ENHANCED_NORMALIZATION) {
    // Use sophisticated 3-strategy pipeline
    const normResult = await drugNormalizer.normalizeDrug(name);

    if (!normResult.success || !normResult.drug) {
      throw new Error(`Failed to normalize drug: ${name}`);
    }

    result = {
      rxcui: normResult.drug.rxcui,
      name: normResult.drug.name,
      confidence: normResult.drug.confidence,
      dosageForm: normResult.drug.dosageForm,
      strength: normResult.drug.strength,
      alternatives: normResult.alternatives?.slice(0, opts?.maxResults || 3).map(alt => ({
        rxcui: alt.rxcui,
        name: alt.name,
        confidence: alt.confidence,
      })),
    };
  } else {
    // Use basic RxNorm lookup only
    const response = await rxnormService.searchByName({
      name,
      maxEntries: opts?.maxResults || 5,
    });

    const rxcuis = extractRxCUIsFromSearch(response);
    if (rxcuis.length === 0) {
      throw new Error(`No RxCUI found for drug: ${name}`);
    }

    const rxcui = rxcuis[0];
    const properties = await rxnormService.getRxCUIProperties(rxcui);

    if (!properties.properties) {
      throw new Error(`Failed to get properties for RxCUI: ${rxcui}`);
    }

    result = {
      rxcui: properties.properties.rxcui,
      name: properties.properties.name,
      confidence: 1.0, // Basic lookup has high confidence if found
    };
  }

  // Store in cache (if available)
  if (isCacheAvailable()) {
    try {
      await cacheService!.set(cacheKey, result, DRUG_NORMALIZATION_TTL);
      logger.debug('Stored drug normalization in cache', {
        drugName: name,
        rxcui: result.rxcui,
        ttl: DRUG_NORMALIZATION_TTL,
      });
    } catch (error) {
      // Cache failure - log but don't throw
      logger.warn('Cache set failed', {
        error: error as Error,
        drugName: name,
      });
    }
  }

  const totalLatency = Date.now() - startTime;
  logger.info('Drug normalization completed', {
    drugName: name,
    rxcui: result.rxcui,
    confidence: result.confidence,
    totalLatency,
    cacheUsed: false,
  });

  return result;
}

/**
 * Get NDCs for a given RxCUI with caching
 * 
 * @param rxcui - RxNorm Concept Unique Identifier
 * @param opts - Fetch options
 * @returns Array of NDC information
 */
export async function rxcuiToNdcsCached(
  rxcui: string,
  opts?: FetchOptions & { skipCache?: boolean }
): Promise<NdcInfo[]> {
  const cacheKey = createRxCUIDetailsKey(rxcui);
  const startTime = Date.now();

  // Try cache first (if available and not skipped)
  if (isCacheAvailable() && !opts?.skipCache) {
    try {
      const cached = await cacheService!.get<NdcInfo[]>(cacheKey);
      if (cached) {
        const cacheLatency = Date.now() - startTime;
        logger.debug('Cache hit for RxCUI details', {
          rxcui,
          ndcCount: cached.length,
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
  logger.debug('Cache miss for RxCUI details', { rxcui });

  // Get related drug products (SCD/SBD level which have NDCs)
  const related = await rxnormService.getRelatedConcepts(rxcui, ['SCD', 'SBD']);

  if (!related.relatedGroup?.conceptGroup) {
    return [];
  }

  const ndcs: NdcInfo[] = [];

  for (const group of related.relatedGroup.conceptGroup) {
    if (!group.conceptProperties) continue;

    for (const concept of group.conceptProperties) {
      // In a full implementation, we'd query RxNorm's RxCUI to NDC mapping here
      // For now, return the concept information
      // The actual NDC mapping would come from RxNorm's getNDCProperties endpoint
      ndcs.push({
        ndc: concept.rxcui, // Placeholder: actual implementation needs NDC lookup
        packageDescription: concept.name,
        dosageForm: undefined, // Will be enriched by openFDA
        strength: undefined, // Will be enriched by openFDA
      });

      if (opts?.maxResults && ndcs.length >= opts.maxResults) {
        break;
      }
    }

    if (opts?.maxResults && ndcs.length >= opts.maxResults) {
      break;
    }
  }

  // Store in cache (if available)
  if (isCacheAvailable()) {
    try {
      await cacheService!.set(cacheKey, ndcs, RXCUI_DETAILS_TTL);
      logger.debug('Stored RxCUI details in cache', {
        rxcui,
        ndcCount: ndcs.length,
        ttl: RXCUI_DETAILS_TTL,
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
  logger.info('RxCUI details fetch completed', {
    rxcui,
    ndcCount: ndcs.length,
    totalLatency,
    cacheUsed: false,
  });

  return ndcs;
}

/**
 * Invalidate cache for a specific drug name
 * 
 * @param drugName Drug name to invalidate
 */
export async function invalidateDrugCache(drugName: string): Promise<void> {
  if (!isCacheAvailable()) {
    logger.warn('Cache not available, cannot invalidate');
    return;
  }

  const cacheKey = createDrugNormalizationKey(drugName);
  try {
    await cacheService!.invalidate(cacheKey);
    logger.info('Invalidated drug normalization cache', { drugName });
  } catch (error) {
    logger.error('Failed to invalidate cache', error as Error, { drugName });
  }
}

/**
 * Invalidate cache for a specific RxCUI
 * 
 * @param rxcui RxCUI to invalidate
 */
export async function invalidateRxCUICache(rxcui: string): Promise<void> {
  if (!isCacheAvailable()) {
    logger.warn('Cache not available, cannot invalidate');
    return;
  }

  const cacheKey = createRxCUIDetailsKey(rxcui);
  try {
    await cacheService!.invalidate(cacheKey);
    logger.info('Invalidated RxCUI details cache', { rxcui });
  } catch (error) {
    logger.error('Failed to invalidate cache', error as Error, { rxcui });
  }
}

