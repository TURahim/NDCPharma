/**
 * Drug Search API Client
 * Frontend client for drug search endpoint
 */

import { APIError } from './api-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/ndcpharma-8f3c6/us-central1/api';

export interface SearchFilters {
  activeOnly?: boolean;
  dosageForm?: string;
  strength?: string;
  manufacturer?: string;
}

export interface SearchPagination {
  page: number;
  limit: number;
}

export interface SearchOptions {
  mode?: 'simple' | 'advanced';
  filters?: SearchFilters;
  pagination?: SearchPagination;
}

export type DrugBadgeType = 'ACTIVE' | 'COMMON' | 'PEDIATRIC' | 'GENERIC' | 'BRAND';
export type DrugBadgeVariant = 'success' | 'info' | 'warning';
export type DosageFormFamily = 'SOLID' | 'LIQUID' | 'INJECTABLE' | 'SPECIAL';
export type AvailabilityState = 'ACTIVE_FOUND' | 'ONLY_INACTIVE' | 'NO_FDA_NDCS' | 'NOT_FOUND';

export interface DrugBadge {
  type: DrugBadgeType;
  label: string;
  variant: DrugBadgeVariant;
}

export interface DrugSearchResult {
  rxcui: string;
  name: string;
  strength: string;
  dosageForm: string;
  dosageFormFamily: DosageFormFamily;
  hasActiveNDCs: boolean;
  ndcCount: number;
  commonUsageScore: number;
  badges: DrugBadge[];
  tty?: string;
  description?: string;
}

export interface DosageFormGroup {
  dosageForm: string;
  dosageFormFamily: DosageFormFamily;
  results: DrugSearchResult[];
  expanded: boolean;
}

export interface GroupedSearchResults {
  dosageFormGroups: DosageFormGroup[];
  totalResults: number;
  hasInactiveResults: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DrugSearchResponse {
  results: DrugSearchResult[];
  grouped?: GroupedSearchResults;
  pagination: PaginationInfo;
  availabilityState: AvailabilityState;
  message?: string;
  searchDuration?: number;
}

export interface SearchError {
  error: string;
  code: string;
  details?: Record<string, any>;
}

/**
 * Search for drugs
 * 
 * @param query - Drug name or partial name
 * @param options - Search options (mode, filters, pagination)
 * @returns Search response with results
 */
export async function searchDrugs(
  query: string,
  options: SearchOptions = {}
): Promise<DrugSearchResponse> {
  const { mode = 'simple', filters = {}, pagination } = options;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const requestBody = {
      query,
      mode,
      filters: {
        activeOnly: filters.activeOnly ?? true,
        ...filters,
      },
      pagination,
    };

    const response = await fetch(`${API_URL}/v1/search/drugs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new APIError(
        data.error?.message || 'Rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        429,
        { retryAfter: retryAfter ? parseInt(retryAfter) : null }
      );
    }

    // Handle validation errors
    if (response.status === 400) {
      throw new APIError(
        data.error?.message || 'Invalid request. Please check your input.',
        data.error?.code || 'VALIDATION_ERROR',
        400,
        data.error?.details
      );
    }

    // Handle server errors
    if (response.status === 500) {
      throw new APIError(
        data.error?.message || 'Server error. Please try again later.',
        data.error?.code || 'SERVER_ERROR',
        500
      );
    }

    // Handle network or other errors
    if (!response.ok) {
      throw new APIError(
        data.error?.message || 'An unexpected error occurred',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError(
        'Network error. Please check your connection and try again.',
        'NETWORK_ERROR',
        0
      );
    }

    // Handle other errors
    throw new APIError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      0
    );
  }
}

/**
 * Get availability state message
 * User-friendly message for each state
 */
export function getAvailabilityStateMessage(state: AvailabilityState): string {
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
 * Get badge color class for Tailwind
 */
export function getBadgeColorClass(variant: DrugBadgeVariant): string {
  switch (variant) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'info':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
}

/**
 * Format dosage form family for display
 */
export function formatDosageFormFamily(family: DosageFormFamily): string {
  switch (family) {
    case 'SOLID':
      return 'Solid Dosage';
    case 'LIQUID':
      return 'Liquid Dosage';
    case 'INJECTABLE':
      return 'Injectable';
    case 'SPECIAL':
      return 'Special Dosage';
    default:
      return family;
  }
}

