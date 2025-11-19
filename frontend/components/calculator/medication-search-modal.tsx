/**
 * Medication Search Modal
 * Main search interface for finding medications
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  AlertCircle,
  Filter,
  LayoutGrid,
  Table,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDrugSearch, useSearchMode, useSearchFilters } from '@/hooks/use-drug-search';
import type { DrugSearchResult } from '@/lib/search-client';
import { getAvailabilityStateMessage } from '@/lib/search-client';
import { SimpleSearchResults, SimpleSearchResultsSkeleton } from './simple-search-results';
import { AdvancedSearchTable, AdvancedSearchTableSkeleton } from './advanced-search-table';
import { EnhancedAdvancedTable, EnhancedAdvancedTableSkeleton } from './enhanced-advanced-table';
import { SearchErrorBoundary } from './search-error-boundary';
import { SearchErrorDisplay, AvailabilityMessageDisplay } from './search-error-display';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface MedicationSearchModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when modal is closed
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Callback when a drug is selected
   */
  onSelectDrug: (drug: DrugSearchResult) => void;
  /**
   * Initial search query
   */
  initialQuery?: string;
  /**
   * Initial search mode
   */
  initialMode?: 'simple' | 'advanced';
}

/**
 * Search Filters Panel
 */
function SearchFiltersPanel({
  filters,
  updateFilter,
  resetFilters,
  hasActiveFilters,
}: ReturnType<typeof useSearchFilters>) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={hasActiveFilters ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
              !
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Search Filters</h4>
            <p className="text-sm text-muted-foreground">
              Refine your medication search
            </p>
          </div>

          <Separator />

          {/* Active Only Filter */}
          <div className="flex items-center justify-between">
            <Label htmlFor="active-only" className="text-sm">
              Active medications only
            </Label>
            <Switch
              id="active-only"
              checked={filters.activeOnly ?? true}
              onCheckedChange={(checked) => updateFilter('activeOnly', checked)}
            />
          </div>

          {/* Dosage Form Filter */}
          <div className="space-y-2">
            <Label htmlFor="dosage-form" className="text-sm">
              Dosage Form
            </Label>
            <Input
              id="dosage-form"
              placeholder="e.g., Tablet, Injection"
              value={filters.dosageForm || ''}
              onChange={(e) => updateFilter('dosageForm', e.target.value || undefined)}
            />
          </div>

          {/* Strength Filter */}
          <div className="space-y-2">
            <Label htmlFor="strength" className="text-sm">
              Strength
            </Label>
            <Input
              id="strength"
              placeholder="e.g., 500 MG"
              value={filters.strength || ''}
              onChange={(e) => updateFilter('strength', e.target.value || undefined)}
            />
          </div>

          {/* Manufacturer Filter */}
          <div className="space-y-2">
            <Label htmlFor="manufacturer" className="text-sm">
              Manufacturer
            </Label>
            <Input
              id="manufacturer"
              placeholder="e.g., Pfizer"
              value={filters.manufacturer || ''}
              onChange={(e) => updateFilter('manufacturer', e.target.value || undefined)}
            />
          </div>

          <Separator />

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Reset Filters
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Medication Search Modal - Main Component
 */
export function MedicationSearchModal({
  open,
  onOpenChange,
  onSelectDrug,
  initialQuery = '',
  initialMode = 'simple',
}: MedicationSearchModalProps) {
  const { mode, setMode, isSimple } = useSearchMode(initialMode);
  const filterState = useSearchFilters();
  const { filters } = filterState;

  const searchOptions = useMemo(
    () => ({
      mode,
      filters,
    }),
    [mode, filters]
  );

  const {
    query,
    setQuery,
    results,
    loading,
    error,
    search,
    clearResults,
    clearError,
    selectedDrug,
    selectDrug,
  } = useDrugSearch({
    debounceMs: 500,
    minLength: 2,
    searchOptions,
    autoSearch: true,
  });

  // Local state for input
  const [inputValue, setInputValue] = useState(initialQuery);

  // Sync input with query on mount
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
      setInputValue(initialQuery);
    }
  }, [initialQuery, query, setQuery]);

  // Handle input change
  const handleInputChange = (value: string) => {
    setInputValue(value);
    setQuery(value);
  };

  // Handle drug selection
  const handleSelectDrug = (drug: DrugSearchResult) => {
    selectDrug(drug);
    onSelectDrug(drug);
    onOpenChange(false);
  };

  // Clear search
  const handleClear = () => {
    setInputValue('');
    setQuery('');
    clearResults();
    selectDrug(null);
  };

  // Handle mode change
  const handleModeChange = (newMode: 'simple' | 'advanced') => {
    setMode(newMode);
    // Re-trigger search with new mode if we have results
    if (query.length >= 2) {
      search();
    }
  };

  // Show results
  const showResults = results && query.length >= 2;
  const showLoading = loading && query.length >= 2;
  const showEmpty = !loading && !results && query.length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-7xl overflow-hidden p-0">
        <SearchErrorBoundary onReset={clearResults}>
          <div className="flex h-full flex-col">
          {/* Header */}
          <DialogHeader className="space-y-3 border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <DialogTitle>Search Medications</DialogTitle>
            </div>
            <DialogDescription>
              Search for medications by name, brand, or generic name
            </DialogDescription>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search medications (e.g., Lisinopril, Metformin)..."
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                className="pl-10 pr-10"
                autoFocus
              />
              {inputValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mode Toggle & Filters */}
            <div className="flex items-center justify-between">
              <Tabs value={mode} onValueChange={(v) => handleModeChange(v as any)}>
                <TabsList className="grid w-[300px] grid-cols-2">
                  <TabsTrigger value="simple" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Simple
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="gap-2">
                    <Table className="h-4 w-4" />
                    Advanced
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <SearchFiltersPanel {...filterState} />
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Error State */}
            {error && (
              <SearchErrorDisplay
                error={error}
                onRetry={() => search(query)}
                onClearError={clearError}
                className="mb-4"
              />
            )}

            {/* Availability State Message */}
            {results && results.availabilityState !== 'ACTIVE_FOUND' && (
              <AvailabilityMessageDisplay
                state={results.availabilityState}
                drugName={query}
                onSwitchFilter={() => {
                  filterState.updateFilter('activeOnly', false);
                  search(query);
                }}
                className="mb-4"
              />
            )}

            {/* Loading State - Simple Mode */}
            {showLoading && isSimple && <SimpleSearchResultsSkeleton />}

            {/* Loading State - Advanced Mode */}
            {showLoading && !isSimple && <EnhancedAdvancedTableSkeleton />}

            {/* Empty State */}
            {showEmpty && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Start Searching</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Enter at least 2 characters to search for medications
                </p>
              </div>
            )}

            {/* Results - Simple Mode */}
            {showResults && isSimple && (
              <SimpleSearchResults
                results={results}
                onSelectDrug={handleSelectDrug}
                selectedDrug={selectedDrug}
              />
            )}

            {/* Results - Advanced Mode (Enhanced Pharmacy-Grade View) */}
            {showResults && !isSimple && (
              <EnhancedAdvancedTable
                results={results}
                onSelectPackage={(pkg) => {
                  // Convert enhanced package back to DrugSearchResult for selection
                  // TODO: Update parent components to work with EnhancedDrugPackage
                  const legacyResult: DrugSearchResult = {
                    rxcui: pkg.rxcui,
                    name: pkg.genericName,
                    strength: pkg.strength,
                    dosageForm: pkg.dosageForm,
                    dosageFormFamily: pkg.dosageFormFamily,
                    hasActiveNDCs: pkg.marketingStatus.isActive,
                    ndcCount: 1, // Single package
                    commonUsageScore: pkg.commonUsageScore || 0,
                    badges: [],
                    tty: pkg.tty,
                    description: pkg.packageDescription,
                  };
                  handleSelectDrug(legacyResult);
                }}
                selectedPackage={undefined}
              />
            )}
          </div>
        </div>
        </SearchErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}

