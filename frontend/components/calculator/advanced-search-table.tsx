/**
 * Advanced Search Table Component
 * Sortable, filterable table view for drug search results
 */

import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrugSearchResponse, DrugSearchResult } from '@/lib/search-client';
import { DrugBadges } from '@/components/ui/drug-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SortField = 'name' | 'strength' | 'dosageForm' | 'ndcCount' | 'commonUsageScore';
type SortDirection = 'asc' | 'desc' | null;

interface AdvancedSearchTableProps {
  results: DrugSearchResponse;
  onSelectDrug: (drug: DrugSearchResult) => void;
  selectedDrug?: DrugSearchResult | null;
  className?: string;
}

interface ColumnFilter {
  name?: string;
  strength?: string;
  dosageForm?: string;
}

/**
 * Sort drugs by field and direction
 */
function sortDrugs(
  drugs: DrugSearchResult[],
  field: SortField,
  direction: SortDirection
): DrugSearchResult[] {
  if (!direction) return drugs;

  return [...drugs].sort((a, b) => {
    let aValue: any = a[field];
    let bValue: any = b[field];

    // Handle string comparison
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter drugs by column filters
 */
function filterDrugs(
  drugs: DrugSearchResult[],
  filters: ColumnFilter
): DrugSearchResult[] {
  return drugs.filter((drug) => {
    if (filters.name && !drug.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    if (filters.strength && !drug.strength.toLowerCase().includes(filters.strength.toLowerCase())) {
      return false;
    }
    if (
      filters.dosageForm &&
      !drug.dosageForm.toLowerCase().includes(filters.dosageForm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Sort Header Component
 */
function SortHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
}) {
  const isActive = currentField === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSort(field)}
    >
      <span>{label}</span>
      {isActive && direction === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
      {isActive && direction === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
      {!isActive && <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />}
    </Button>
  );
}

/**
 * Expandable Row Component
 */
function ExpandableRow({
  drug,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
}: {
  drug: DrugSearchResult;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
}) {
  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer transition-colors',
          isSelected && 'bg-primary/5 border-l-4 border-l-primary',
          !isSelected && 'hover:bg-muted/50'
        )}
        onClick={onSelect}
      >
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </TableCell>
        <TableCell className="font-medium">{drug.name}</TableCell>
        <TableCell>{drug.strength}</TableCell>
        <TableCell>{drug.dosageForm}</TableCell>
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1">
            {drug.hasActiveNDCs ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
          </div>
        </TableCell>
        <TableCell className="text-center">{drug.ndcCount}</TableCell>
        <TableCell className="text-center">{drug.commonUsageScore}</TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} className="bg-muted/30 p-4">
            <div className="space-y-3">
              {/* Badges */}
              {drug.badges.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                    Status Badges
                  </p>
                  <DrugBadges badges={drug.badges} showTooltips={false} />
                </div>
              )}

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    RxCUI
                  </p>
                  <p className="font-mono">{drug.rxcui}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Dosage Form Family
                  </p>
                  <p>{drug.dosageFormFamily}</p>
                </div>
                {drug.tty && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Term Type
                    </p>
                    <p>{drug.tty}</p>
                  </div>
                )}
                {drug.description && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Description
                    </p>
                    <p className="text-muted-foreground">{drug.description}</p>
                  </div>
                )}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Advanced Search Table - Main Component
 */
export function AdvancedSearchTable({
  results,
  onSelectDrug,
  selectedDrug,
  className,
}: AdvancedSearchTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filters, setFilters] = useState<ColumnFilter>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (rxcui: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rxcui)) {
      newExpanded.delete(rxcui);
    } else {
      newExpanded.add(rxcui);
    }
    setExpandedRows(newExpanded);
  };

  // Process results: filter and sort
  const processedResults = useMemo(() => {
    let drugs = results.results || [];
    
    // Apply filters
    drugs = filterDrugs(drugs, filters);
    
    // Apply sort
    if (sortField && sortDirection) {
      drugs = sortDrugs(drugs, sortField, sortDirection);
    }
    
    return drugs;
  }, [results.results, filters, sortField, sortDirection]);

  if (!results.results || results.results.length === 0) {
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
            {processedResults.length} {processedResults.length === 1 ? 'result' : 'results'}
            {processedResults.length !== results.results.length &&
              ` (filtered from ${results.results.length})`}
          </p>
          <p className="text-xs text-muted-foreground">
            Advanced table view • Sortable columns
          </p>
        </div>
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Filter by name..."
          value={filters.name || ''}
          onChange={(e) => setFilters({ ...filters, name: e.target.value || undefined })}
          className="h-9"
        />
        <Input
          placeholder="Filter by strength..."
          value={filters.strength || ''}
          onChange={(e) => setFilters({ ...filters, strength: e.target.value || undefined })}
          className="h-9"
        />
        <Input
          placeholder="Filter by dosage form..."
          value={filters.dosageForm || ''}
          onChange={(e) => setFilters({ ...filters, dosageForm: e.target.value || undefined })}
          className="h-9"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>
                  <SortHeader
                    label="Name"
                    field="name"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Strength"
                    field="strength"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead>
                  <SortHeader
                    label="Dosage Form"
                    field="dosageForm"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">
                  <SortHeader
                    label="NDCs"
                    field="ndcCount"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="text-center">
                  <SortHeader
                    label="Usage Score"
                    field="commonUsageScore"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedResults.map((drug) => (
                <ExpandableRow
                  key={drug.rxcui}
                  drug={drug}
                  isSelected={selectedDrug?.rxcui === drug.rxcui}
                  isExpanded={expandedRows.has(drug.rxcui)}
                  onToggleExpand={() => toggleRowExpansion(drug.rxcui)}
                  onSelect={() => onSelectDrug(drug)}
                />
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
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
 * Loading skeleton for advanced table
 */
export function AdvancedSearchTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Filter skeletons */}
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}


