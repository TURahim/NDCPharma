/**
 * Simple Search Results Component
 * Displays drug search results grouped by dosage form
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Package2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  DrugSearchResponse,
  DrugSearchResult,
  DosageFormGroup,
} from '@/lib/search-client';
import { formatDosageFormFamily } from '@/lib/search-client';
import { DrugBadges } from '@/components/ui/drug-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimpleSearchResultsProps {
  results: DrugSearchResponse;
  onSelectDrug: (drug: DrugSearchResult) => void;
  selectedDrug?: DrugSearchResult | null;
  className?: string;
}

/**
 * Dosage Form Group Component
 */
function DosageFormGroupComponent({
  group,
  onSelectDrug,
  selectedDrug,
}: {
  group: DosageFormGroup;
  onSelectDrug: (drug: DrugSearchResult) => void;
  selectedDrug?: DrugSearchResult | null;
}) {
  const [expanded, setExpanded] = useState(group.expanded || false);

  return (
    <div className="space-y-2">
      {/* Group Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-4 py-3 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Package2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">{group.dosageForm}</p>
            <p className="text-xs text-muted-foreground">
              {formatDosageFormFamily(group.dosageFormFamily)} • {group.results.length}{' '}
              {group.results.length === 1 ? 'option' : 'options'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Group Results */}
      {expanded && (
        <div className="ml-2 space-y-1.5 border-l-2 border-muted pl-4">
          {group.results.map((drug) => (
            <DrugResultCard
              key={drug.rxcui}
              drug={drug}
              onSelect={onSelectDrug}
              isSelected={selectedDrug?.rxcui === drug.rxcui}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Drug Result Card
 */
function DrugResultCard({
  drug,
  onSelect,
  isSelected,
}: {
  drug: DrugSearchResult;
  onSelect: (drug: DrugSearchResult) => void;
  isSelected: boolean;
}) {
  return (
    <button
      onClick={() => onSelect(drug)}
      className={cn(
        'flex w-full flex-col items-start gap-2 rounded-lg border p-3 text-left transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <p className="font-medium leading-tight">{drug.name}</p>
          <p className="text-sm text-muted-foreground">
            {drug.strength} • {drug.dosageForm}
          </p>
        </div>

        {drug.commonUsageScore > 70 && (
          <div className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            <TrendingUp className="h-3 w-3" />
            Popular
          </div>
        )}
      </div>

      {/* Badges */}
      {drug.badges.length > 0 && <DrugBadges badges={drug.badges} maxVisible={4} />}

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Package2 className="h-3 w-3" />
          {drug.ndcCount} {drug.ndcCount === 1 ? 'package' : 'packages'}
        </span>
        {drug.hasActiveNDCs && (
          <span className="text-green-600 dark:text-green-400">✓ Active</span>
        )}
      </div>
    </button>
  );
}

/**
 * Simple Search Results - Main Component
 */
export function SimpleSearchResults({
  results,
  onSelectDrug,
  selectedDrug,
  className,
}: SimpleSearchResultsProps) {
  if (!results.grouped) {
    return (
      <Alert>
        <AlertDescription>No grouped results available. Try switching to advanced mode.</AlertDescription>
      </Alert>
    );
  }

  const { dosageFormGroups, totalResults, hasInactiveResults } = results.grouped;

  if (dosageFormGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Package2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">No Results Found</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {results.message || 'Try adjusting your search query or filters.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {totalResults} {totalResults === 1 ? 'result' : 'results'} found
          </p>
          <p className="text-xs text-muted-foreground">
            Grouped by dosage form • {dosageFormGroups.length}{' '}
            {dosageFormGroups.length === 1 ? 'category' : 'categories'}
          </p>
        </div>

        {hasInactiveResults && (
          <div className="rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            Some inactive results hidden
          </div>
        )}
      </div>

      <Separator />

      {/* Dosage Form Groups */}
      <div className="space-y-3">
        {dosageFormGroups.map((group, index) => (
          <DosageFormGroupComponent
            key={`${group.dosageForm}-${index}`}
            group={group}
            onSelectDrug={onSelectDrug}
            selectedDrug={selectedDrug}
          />
        ))}
      </div>

      {/* Search Duration */}
      {results.searchDuration && (
        <p className="text-center text-xs text-muted-foreground">
          Search completed in {results.searchDuration}ms
        </p>
      )}
    </div>
  );
}

/**
 * Loading skeleton for search results
 */
export function SimpleSearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      <Separator />

      {/* Group skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}


