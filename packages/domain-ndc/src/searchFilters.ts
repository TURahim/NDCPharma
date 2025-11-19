/**
 * Search filtering logic for active/inactive drugs
 * and availability state detection
 */

import type { DrugSearchResult, AvailabilityState } from './types.js';

/**
 * Filter to only include drugs with active NDCs
 * 
 * @param results - Array of drug search results
 * @returns Filtered array with only active drugs
 */
export function filterActiveOnly(
  results: DrugSearchResult[]
): DrugSearchResult[] {
  return results.filter((result) => result.hasActiveNDCs);
}

/**
 * Separate results into active and inactive groups
 * 
 * @param results - Array of drug search results
 * @returns Object with active and inactive arrays
 */
export function separateActiveInactive(results: DrugSearchResult[]): {
  active: DrugSearchResult[];
  inactive: DrugSearchResult[];
} {
  const active: DrugSearchResult[] = [];
  const inactive: DrugSearchResult[] = [];

  for (const result of results) {
    if (result.hasActiveNDCs) {
      active.push(result);
    } else {
      inactive.push(result);
    }
  }

  return { active, inactive };
}

/**
 * Detect availability state based on search results
 * 
 * @param results - Array of drug search results
 * @param hasRxNormMatch - Whether RxNorm found a match
 * @returns Availability state
 */
export function detectAvailabilityState(
  results: DrugSearchResult[],
  hasRxNormMatch: boolean
): AvailabilityState {
  // No RxNorm match found
  if (!hasRxNormMatch || results.length === 0) {
    return 'NOT_FOUND';
  }

  // Check if any results have NDCs
  const hasAnyNDCs = results.some((r) => r.ndcCount > 0);

  // RxNorm match exists but no FDA NDCs
  if (!hasAnyNDCs) {
    return 'NO_FDA_NDCS';
  }

  // Check if any active NDCs exist
  const hasActiveNDCs = results.some((r) => r.hasActiveNDCs);

  if (hasActiveNDCs) {
    return 'ACTIVE_FOUND';
  }

  // Has NDCs but all inactive
  return 'ONLY_INACTIVE';
}

/**
 * Get user-friendly message for availability state
 * 
 * @param state - Availability state
 * @returns User-friendly message
 */
export function getAvailabilityMessage(state: AvailabilityState): string {
  switch (state) {
    case 'ACTIVE_FOUND':
      return 'Active medications found';

    case 'ONLY_INACTIVE':
      return 'This medication exists but has no active NDCs. It may be discontinued.';

    case 'NO_FDA_NDCS':
      return 'This medication is recognized clinically but has no FDA-listed NDCs.';

    case 'NOT_FOUND':
      return 'No matching medications found. Try a different spelling or brand name.';

    default:
      return 'Unknown availability state';
  }
}

/**
 * Get suggested actions for availability state
 * 
 * @param state - Availability state
 * @returns Array of suggested actions
 */
export function getSuggestedActions(state: AvailabilityState): string[] {
  switch (state) {
    case 'NOT_FOUND':
      return [
        'Check your spelling',
        'Try using a brand name (e.g., "Tylenol" instead of "acetaminophen")',
        'Try using a generic name',
        'Search for a specific strength (e.g., "amoxicillin 500mg")',
      ];

    case 'NO_FDA_NDCS':
      return [
        'The medication may not be marketed in the United States',
        'It may be a compounded or custom formulation',
        'It may be available only through special programs',
        'Try searching for a similar medication',
      ];

    case 'ONLY_INACTIVE':
      return [
        'View discontinued packages by toggling the "Active Only" filter',
        'Find active alternatives to this medication',
        'Contact your pharmacy for more information',
      ];

    case 'ACTIVE_FOUND':
      return [];

    default:
      return [];
  }
}

/**
 * Filter results by strength
 * 
 * @param results - Array of drug search results
 * @param strengthQuery - Strength to filter by (e.g., "500")
 * @returns Filtered results
 */
export function filterByStrength(
  results: DrugSearchResult[],
  strengthQuery: string
): DrugSearchResult[] {
  const normalizedQuery = strengthQuery.toLowerCase().trim();

  if (!normalizedQuery) {
    return results;
  }

  return results.filter((result) =>
    result.strength.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Filter results by dosage form
 * 
 * @param results - Array of drug search results
 * @param dosageFormQuery - Dosage form to filter by (e.g., "TABLET")
 * @returns Filtered results
 */
export function filterByDosageForm(
  results: DrugSearchResult[],
  dosageFormQuery: string
): DrugSearchResult[] {
  const normalizedQuery = dosageFormQuery.toUpperCase().trim();

  if (!normalizedQuery) {
    return results;
  }

  return results.filter((result) =>
    result.dosageForm.toUpperCase().includes(normalizedQuery)
  );
}

/**
 * Filter results by minimum NDC count
 * 
 * @param results - Array of drug search results
 * @param minCount - Minimum number of NDCs
 * @returns Filtered results
 */
export function filterByMinNDCCount(
  results: DrugSearchResult[],
  minCount: number
): DrugSearchResult[] {
  return results.filter((result) => result.ndcCount >= minCount);
}

/**
 * Filter results by minimum usage score
 * 
 * @param results - Array of drug search results
 * @param minScore - Minimum common usage score
 * @returns Filtered results
 */
export function filterByMinUsageScore(
  results: DrugSearchResult[],
  minScore: number
): DrugSearchResult[] {
  return results.filter((result) => result.commonUsageScore >= minScore);
}

/**
 * Filter results by badge type
 * 
 * @param results - Array of drug search results
 * @param badgeType - Badge type to filter by
 * @returns Filtered results
 */
export function filterByBadgeType(
  results: DrugSearchResult[],
  badgeType: 'ACTIVE' | 'COMMON' | 'PEDIATRIC' | 'GENERIC' | 'BRAND'
): DrugSearchResult[] {
  return results.filter((result) =>
    result.badges.some((badge) => badge.type === badgeType)
  );
}

/**
 * Apply multiple filters to results
 * 
 * NOTE: This function does NOT apply activeOnly filtering. 
 * The activeOnly filter is applied at the FDA Client level (single source of truth).
 * Results passed to this function are already filtered by activeOnly if that was requested.
 * 
 * @param results - Array of drug search results (already filtered by activeOnly at FDA level)
 * @param filters - Filter options
 * @returns Filtered results
 */
export function applyMultipleFilters(
  results: DrugSearchResult[],
  filters: {
    activeOnly?: boolean;  // Ignored here - filtering done at FDA Client level
    strength?: string;
    dosageForm?: string;
    minNDCCount?: number;
    minUsageScore?: number;
    badgeType?: 'ACTIVE' | 'COMMON' | 'PEDIATRIC' | 'GENERIC' | 'BRAND';
  }
): DrugSearchResult[] {
  let filtered = results;

  // NOTE: activeOnly filter is NOT applied here to prevent double-filtering.
  // FDA Client is the single source of truth for activeOnly.
  // The flag is kept in the signature for API compatibility but is intentionally ignored.

  if (filters.strength) {
    filtered = filterByStrength(filtered, filters.strength);
  }

  if (filters.dosageForm) {
    filtered = filterByDosageForm(filtered, filters.dosageForm);
  }

  if (filters.minNDCCount !== undefined) {
    filtered = filterByMinNDCCount(filtered, filters.minNDCCount);
  }

  if (filters.minUsageScore !== undefined) {
    filtered = filterByMinUsageScore(filtered, filters.minUsageScore);
  }

  if (filters.badgeType) {
    filtered = filterByBadgeType(filtered, filters.badgeType);
  }

  return filtered;
}

/**
 * Count results by availability status
 * 
 * @param results - Array of drug search results
 * @returns Count object
 */
export function countByAvailability(results: DrugSearchResult[]): {
  active: number;
  inactive: number;
  total: number;
} {
  const { active, inactive } = separateActiveInactive(results);

  return {
    active: active.length,
    inactive: inactive.length,
    total: results.length,
  };
}

/**
 * Check if results contain specific warning conditions
 * 
 * @param results - Array of drug search results
 * @returns Warning flags
 */
export function checkWarningConditions(results: DrugSearchResult[]): {
  allInactive: boolean;
  lowAvailability: boolean; // < 20% active
  highInactive: boolean; // > 50% inactive
  noResults: boolean;
} {
  if (results.length === 0) {
    return {
      allInactive: false,
      lowAvailability: false,
      highInactive: false,
      noResults: true,
    };
  }

  const { active, inactive, total } = countByAvailability(results);
  const activePercentage = (active / total) * 100;

  return {
    allInactive: active === 0,
    lowAvailability: activePercentage < 20,
    highInactive: (inactive / total) * 100 > 50,
    noResults: false,
  };
}


