/**
 * Drug Search Hook
 * Manages drug search state with debouncing and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchDrugs,
  type DrugSearchResponse,
  type SearchOptions,
  type DrugSearchResult,
} from '@/lib/search-client';
import { useDebounce } from './use-debounce';

interface UseDrugSearchOptions {
  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceMs?: number;
  /**
   * Minimum query length to trigger search (default: 2)
   */
  minLength?: number;
  /**
   * Search options (mode, filters, pagination)
   */
  searchOptions?: SearchOptions;
  /**
   * Enable auto-search on query change (default: true)
   */
  autoSearch?: boolean;
}

interface UseDrugSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  results: DrugSearchResponse | null;
  loading: boolean;
  error: Error | null;

  // Actions
  search: (customQuery?: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;

  // Selection
  selectedDrug: DrugSearchResult | null;
  selectDrug: (drug: DrugSearchResult | null) => void;
}

/**
 * Hook for drug search with debouncing and state management
 */
export function useDrugSearch(
  options: UseDrugSearchOptions = {}
): UseDrugSearchReturn {
  const {
    debounceMs = 300,
    minLength = 2,
    searchOptions = {},
    autoSearch = true,
  } = options;

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DrugSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedDrug, setSelectedDrug] = useState<DrugSearchResult | null>(null);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, DrugSearchResponse>>(new Map());

  // Debounced query
  const debouncedQuery = useDebounce(query, debounceMs);

  /**
   * Perform search
   */
  const search = useCallback(
    async (customQuery?: string) => {
      const searchQuery = customQuery !== undefined ? customQuery : debouncedQuery;

      // Validate query length
      if (searchQuery.length < minLength) {
        setResults(null);
        setError(null);
        return;
      }

      // Check cache
      const cacheKey = `${searchQuery}:${JSON.stringify(searchOptions)}`;
      if (cacheRef.current.has(cacheKey)) {
        setResults(cacheRef.current.get(cacheKey)!);
        setLoading(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const response = await searchDrugs(searchQuery, searchOptions);
        
        // Cache the result
        cacheRef.current.set(cacheKey, response);
        
        // Limit cache size to 50 entries
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value;
          cacheRef.current.delete(firstKey);
        }

        setResults(response);
        setError(null);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setError(err instanceof Error ? err : new Error('Search failed'));
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery, minLength, searchOptions]
  );

  /**
   * Auto-search when debounced query changes
   */
  useEffect(() => {
    if (autoSearch && debouncedQuery.length >= minLength) {
      search();
    }
  }, [debouncedQuery, autoSearch, minLength, search]);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Select a drug
   */
  const selectDrug = useCallback((drug: DrugSearchResult | null) => {
    setSelectedDrug(drug);
  }, []);

  return {
    // Search state
    query,
    setQuery,
    results,
    loading,
    error,

    // Actions
    search,
    clearResults,
    clearError,

    // Selection
    selectedDrug,
    selectDrug,
  };
}

/**
 * Hook for managing search mode (simple vs advanced)
 */
export function useSearchMode(initialMode: 'simple' | 'advanced' = 'simple') {
  const [mode, setMode] = useState<'simple' | 'advanced'>(initialMode);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'simple' ? 'advanced' : 'simple'));
  }, []);

  return {
    mode,
    setMode,
    toggleMode,
    isSimple: mode === 'simple',
    isAdvanced: mode === 'advanced',
  };
}

/**
 * Hook for managing search filters
 */
export function useSearchFilters(initialFilters: Partial<SearchOptions['filters']> = {}) {
  const [filters, setFilters] = useState<SearchOptions['filters']>({
    activeOnly: true,
    ...initialFilters,
  });

  const updateFilter = useCallback(
    <K extends keyof NonNullable<SearchOptions['filters']>>(
      key: K,
      value: NonNullable<SearchOptions['filters']>[K]
    ) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters({ activeOnly: true });
  }, []);

  const hasActiveFilters = useCallback(() => {
    return (
      filters.dosageForm !== undefined ||
      filters.strength !== undefined ||
      filters.manufacturer !== undefined ||
      filters.activeOnly === false
    );
  }, [filters]);

  return {
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    hasActiveFilters: hasActiveFilters(),
  };
}


