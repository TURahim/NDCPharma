/**
 * Drug Search Endpoint
 * POST /v1/search/drugs
 * 
 * Intelligent drug search with smart ranking, grouping, and filtering
 */

import type { Request, Response } from 'express';
import { logger, toAppError } from '@core-guardrails';
import { ERROR_CODES } from '@core-config';
import type {
  DrugSearchRequest,
  DrugSearchResponse,
  DrugSearchResult,
} from '@api-contracts';
import { DrugSearchRequestSchema } from '@api-contracts';
import {
  nameToRxCui,
  type RxCuiResult,
} from '@clients-rxnorm';
import { fdaClient, type NDCPackage } from '@clients-openfda';
import {
  rankSearchResults,
  applyBadgesToResults,
  groupByDosageForm,
  sortDosageFormGroups,
  limitResultsPerGroup,
  detectAvailabilityState,
  getAvailabilityMessage,
  applyMultipleFilters,
  DosageFormType,
} from '@domain-ndc';
import { FirestoreCacheService, createDrugSearchKey } from '@data-cache';
import { getFirestore } from 'firebase-admin/firestore';

// Cache configuration
const SEARCH_CACHE_TTL = 300 * 1000; // 5 minutes in milliseconds
let cacheService: FirestoreCacheService | null = null;

/**
 * Get or initialize cache service
 */
function getCacheService(): FirestoreCacheService {
  if (!cacheService) {
    cacheService = new FirestoreCacheService(
      getFirestore(),
      'searchCache',
      {
        defaultTTL: SEARCH_CACHE_TTL,
        maxSize: 5000,
        cleanupInterval: 60 * 60 * 1000, // 1 hour
      }
    );
  }
  return cacheService;
}

/**
 * Search for drugs
 * Supports both simple (grouped) and advanced (flat list) modes
 */
export async function searchDrugs(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const correlationId = (req as any).correlationId || 'unknown';

  try {
    // 1. Validate request
    const request: DrugSearchRequest = DrugSearchRequestSchema.parse(req.body);
    const { query, mode, filters, pagination } = request;

    logger.info('Drug search requested', {
      correlationId,
      query,
      mode,
      filters,
      userId: (req as any).user?.uid,
    });

    // 2. Check cache
    const cache = getCacheService();
    const cacheKey = createDrugSearchKey(query, mode, filters);

    const respondWithNotFound = async () => {
      const response: DrugSearchResponse = {
        results: [],
        pagination: {
          page: pagination?.page || 1,
          limit: pagination?.limit || 20,
          total: 0,
          hasMore: false,
        },
        availabilityState: 'NOT_FOUND',
        message: getAvailabilityMessage('NOT_FOUND'),
        searchDuration: Date.now() - startTime,
      };

      try {
        await cache.set(cacheKey, response, SEARCH_CACHE_TTL / 2); // 2.5 minutes
        logger.debug('NOT_FOUND result cached', { correlationId, cacheKey });
      } catch (error) {
        logger.warn('Failed to cache NOT_FOUND result', {
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      res.json(response);
    };
    
    try {
      const cachedResponse = await cache.get<DrugSearchResponse>(cacheKey);
      if (cachedResponse) {
        logger.info('Cache hit for drug search', {
          correlationId,
          query,
          cacheKey,
        });
        
        // Update search duration for accuracy
        cachedResponse.searchDuration = Date.now() - startTime;
        res.json(cachedResponse);
        return;
      }
    } catch (error) {
      // Log cache error but continue with search
      logger.warn('Cache check failed, continuing with search', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 3. Search RxNorm for drug candidates
    logger.debug('Searching RxNorm', { correlationId, query });
    let rxnormNormalization: RxCuiResult | null = null;
    try {
      rxnormNormalization = await nameToRxCui(query);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === ERROR_CODES.RXCUI_NOT_FOUND) {
        await respondWithNotFound();
        return;
      }
      throw appError;
    }

    const drugCandidates =
      rxnormNormalization
        ? [
            {
              rxcui: rxnormNormalization.rxcui,
              name: rxnormNormalization.name,
              confidence: rxnormNormalization.confidence,
            },
            ...(rxnormNormalization.alternatives?.map((alt) => ({
              rxcui: alt.rxcui,
              name: alt.name,
              confidence: alt.confidence,
            })) ?? []),
          ]
        : [];

    if (drugCandidates.length === 0) {
      logger.info('No RxNorm matches found', { correlationId, query });
      await respondWithNotFound();
      return;
    }

    logger.debug('RxNorm matches found', {
      correlationId,
      count: drugCandidates.length,
      candidates: drugCandidates.map(d => ({
        rxcui: d.rxcui,
        name: d.name,
        confidence: d.confidence,
      })),
    });

    // 4. For each RxNorm result, fetch FDA packages
    // NOTE: RxNorm may return ingredient-level RxCUIs (tty="IN") like "metformin" (6809),
    // but FDA's NDC database only indexes product-level RxCUIs (tty="SCD"/"SBD") like
    // "metformin 500mg tablet" (861753). We implement a fallback to generic name search
    // when RxCUI lookups fail or return no results.
    logger.debug('Fetching FDA packages', { correlationId });
    const fdaResults = await Promise.allSettled(
      drugCandidates.slice(0, 20).map(async (drug) => {
        try {
          // Try searching by RxCUI first
          const packages = await fdaClient.getNDCsByRxCUI(drug.rxcui, {
            activeOnly: filters?.activeOnly ?? true,
          });
          
          // If RxCUI search returns no results, fall back to generic name search
          if (packages.length === 0) {
            logger.debug('RxCUI search returned no results, falling back to generic name', {
              correlationId,
              rxcui: drug.rxcui,
              name: drug.name,
            });
            
            const fallbackPackages = await fdaClient.searchByGenericName(drug.name, {
              activeOnly: filters?.activeOnly ?? true,
              limit: 100,
            });
            
            return {
              drug,
              packages: fallbackPackages,
            };
          }
          
          return {
            drug,
            packages,
          };
        } catch (error) {
          // If RxCUI search fails, try generic name as fallback
          logger.warn('RxCUI search failed, trying generic name fallback', {
            correlationId,
            rxcui: drug.rxcui,
            name: drug.name,
            error: error instanceof Error ? error.message : String(error),
          });
          
          try {
            const fallbackPackages = await fdaClient.searchByGenericName(drug.name, {
              activeOnly: filters?.activeOnly ?? true,
              limit: 100,
            });
            
            return {
              drug,
              packages: fallbackPackages,
            };
          } catch (fallbackError) {
            // Both methods failed, return empty
            logger.error('Both RxCUI and generic name searches failed', {
              correlationId,
              rxcui: drug.rxcui,
              name: drug.name,
              fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
            });
            
            return {
              drug,
              packages: [],
            };
          }
        }
      })
    );

    // 5. Build DrugSearchResult objects
    const searchResults: DrugSearchResult[] = [];
    
    for (const result of fdaResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { drug, packages } = result.value;
        
        logger.debug('FDA result for drug', {
          correlationId,
          rxcui: drug.rxcui,
          name: drug.name,
          packageCount: packages.length,
          packages: packages.slice(0, 3).map(p => ({
            ndc: p.ndc,
            dosageForm: p.dosageForm,
            isActive: p.marketingStatus.isActive,
          })),
        });
        
        // Group packages by unique formulation (genericName + strength + dosageForm)
        // This creates separate results for "metformin 500mg tablet", "metformin 850mg tablet", etc.
        const formulationGroups = new Map<string, typeof packages>();
        
        for (const pkg of packages) {
          // Get strength from first active ingredient
          const strength = pkg.activeIngredients?.[0]?.strength || '';
          
          // Create a unique key for this formulation
          const formulationKey = `${pkg.genericName}|${strength}|${pkg.dosageForm}`;
          
          if (!formulationGroups.has(formulationKey)) {
            formulationGroups.set(formulationKey, []);
          }
          formulationGroups.get(formulationKey)!.push(pkg);
        }
        
        logger.debug('Formulation groups created', {
          correlationId,
          rxcui: drug.rxcui,
          formulationCount: formulationGroups.size,
          formulations: Array.from(formulationGroups.keys()).slice(0, 5),
        });
        
        // Create one DrugSearchResult per unique formulation
        for (const formulationPackages of formulationGroups.values()) {
          const firstPackage = formulationPackages[0];
          const strength = firstPackage.activeIngredients?.[0]?.strength || '';
          
          // Build display name: "Metformin Hydrochloride 500 MG Oral Tablet"
          const displayName = firstPackage.brandName || 
                             `${firstPackage.genericName}${strength ? ' ' + strength : ''} ${firstPackage.dosageForm}`;
          
          const searchResult: DrugSearchResult = {
            rxcui: drug.rxcui,
            name: displayName,
            strength: strength,
            dosageForm: firstPackage.dosageForm,
            dosageFormFamily: determineDosageFormFamily(formulationPackages),
            hasActiveNDCs: formulationPackages.some((p) => p.marketingStatus.isActive),
            ndcCount: formulationPackages.length,
            commonUsageScore: 0, // Will be calculated by rankSearchResults
            badges: [],
            description: displayName,
          };

          searchResults.push(searchResult);
        }
      } else if (result.status === 'rejected') {
        logger.warn('FDA result rejected', {
          correlationId,
          reason: result.reason,
        });
      }
    }

    logger.debug('Search results built', {
      correlationId,
      count: searchResults.length,
    });

    // 6. Detect availability state
    const availabilityState = detectAvailabilityState(
      searchResults,
      drugCandidates.length > 0
    );

    // 7. Apply smart ranking
    logger.debug('Applying smart ranking', { correlationId });
    const rankedResults = rankSearchResults(searchResults);

    // 8. Apply badges
    const resultsWithBadges = applyBadgesToResults(rankedResults);

    // 9. Apply domain-level filters
    // NOTE: activeOnly filtering is NOT applied here. It was already applied at the FDA Client level.
    // This prevents the "double-filtering bug" where activeOnly=true could remove valid results.
    // FDA Client is the single source of truth for active/inactive filtering.
    let filteredResults = resultsWithBadges;
    
    logger.debug('Before domain-level filtering (activeOnly already applied at FDA level)', {
      correlationId,
      count: resultsWithBadges.length,
      activeOnlyFilteredUpstream: filters?.activeOnly ?? true,
      results: resultsWithBadges.map(r => ({
        name: r.name,
        rxcui: r.rxcui,
        hasActiveNDCs: r.hasActiveNDCs,  // Informational flag, not used for filtering
        ndcCount: r.ndcCount,
      })),
      filters,
    });
    
    if (filters) {
      // Apply only domain-level filters (strength, dosageForm, etc.)
      // activeOnly is intentionally omitted - already handled by FDA Client
      filteredResults = applyMultipleFilters(resultsWithBadges, {
        activeOnly: filters.activeOnly,  // Passed but ignored by applyMultipleFilters
        strength: filters.strength,
        dosageForm: filters.dosageForm,
        // Note: manufacturer filter would require additional FDA data
      });
    }

    logger.debug('Domain-level filters applied (strength, dosageForm only)', {
      correlationId,
      beforeCount: resultsWithBadges.length,
      afterCount: filteredResults.length,
      removedCount: resultsWithBadges.length - filteredResults.length,
      filtersApplied: {
        strength: filters?.strength || null,
        dosageForm: filters?.dosageForm || null,
        activeOnly: 'N/A - filtered at FDA Client level',
      },
    });

    // 10. Mode-specific formatting
    const response: DrugSearchResponse = {
      results: [],
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 20,
        total: filteredResults.length,
        hasMore: false,
      },
      availabilityState,
      message: getAvailabilityMessage(availabilityState),
      searchDuration: Date.now() - startTime,
    };

    if (mode === 'simple') {
      // Simple mode: Group by dosage form and limit results
      logger.debug('Formatting for simple mode', { correlationId });
      
      const grouped = groupByDosageForm(filteredResults);
      const sortedGroups = {
        ...grouped,
        dosageFormGroups: sortDosageFormGroups(grouped.dosageFormGroups),
      };
      const limited = limitResultsPerGroup(sortedGroups, 3);

      response.grouped = limited;
      response.results = []; // Empty for simple mode

      logger.info('Simple mode search completed', {
        correlationId,
        groups: limited.dosageFormGroups.length,
        totalResults: limited.totalResults,
      });
    } else {
      // Advanced mode: Flat paginated list
      logger.debug('Formatting for advanced mode', { correlationId });

      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      response.results = filteredResults.slice(startIndex, endIndex);
      response.pagination = {
        page,
        limit,
        total: filteredResults.length,
        hasMore: endIndex < filteredResults.length,
      };

      logger.info('Advanced mode search completed', {
        correlationId,
        page,
        limit,
        total: filteredResults.length,
      });
    }

    // 11. Cache the response
    try {
      await cache.set(cacheKey, response, SEARCH_CACHE_TTL);
      logger.debug('Search results cached', {
        correlationId,
        cacheKey,
        ttl: SEARCH_CACHE_TTL,
      });
    } catch (error) {
      // Log cache error but still return results
      logger.warn('Failed to cache search results', {
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 12. Return response
    res.json(response);

  } catch (error) {
    const appError = toAppError(error);

    logger.error('Drug search failed', {
      correlationId,
      error: appError,
      query: req.body?.query,
    });

    res.status(appError.statusCode).json({
      error: appError.message,
      code: appError.code,
      ...(process.env.NODE_ENV === 'development' && appError.details
        ? { details: appError.details }
        : {}),
    });
  }
}

/**
 * Extract strength from drug name
 * Example: "Amoxicillin 500 MG Oral Capsule" → "500 MG"
 * Note: Currently unused as we extract strength from FDA packages directly
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractStrength(drugName: string): string {
  // Match patterns like "500 MG", "10 MG/ML", "250 MG/5 ML", etc.
  const strengthMatch = drugName.match(/(\d+(?:\.\d+)?\s*(?:MG|MCG|G|ML|UNITS?)(?:\s*\/\s*\d+(?:\.\d+)?\s*(?:MG|MCG|G|ML|UNITS?))?)/i);
  return strengthMatch ? strengthMatch[1] : '';
}

/**
 * Extract dosage form from drug name and packages
 * Example: "Amoxicillin 500 MG Oral Capsule" → "CAPSULE"
 * Note: Currently unused as we extract dosage form from FDA packages directly
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractDosageForm(drugName: string, packages: NDCPackage[]): string {
  // Try to get from first package
  if (packages.length > 0) {
    return packages[0].dosageForm;
  }

  // Fallback: extract from drug name
  const formMatch = drugName.match(/\b(TABLET|CAPSULE|SOLUTION|SUSPENSION|INJECTION|CREAM|OINTMENT|PATCH|INHALER|SYRUP|ELIXIR)\b/i);
  return formMatch ? formMatch[1].toUpperCase() : 'UNKNOWN';
}

/**
 * Determine dosage form family from packages
 */
function determineDosageFormFamily(packages: NDCPackage[]): DosageFormType {
  if (packages.length === 0) {
    return DosageFormType.SPECIAL;
  }

  const firstForm = packages[0].dosageForm.toUpperCase();

  // Solid forms
  if (firstForm.includes('TABLET') || firstForm.includes('CAPSULE')) {
    return DosageFormType.SOLID;
  }

  // Liquid forms
  if (
    firstForm.includes('SOLUTION') ||
    firstForm.includes('SUSPENSION') ||
    firstForm.includes('SYRUP') ||
    firstForm.includes('ELIXIR')
  ) {
    return DosageFormType.LIQUID;
  }

  // Injectable forms
  if (firstForm.includes('INJECTION') || firstForm.includes('INJECTABLE')) {
    return DosageFormType.INJECTABLE;
  }

  // Special forms
  return DosageFormType.SPECIAL;
}

