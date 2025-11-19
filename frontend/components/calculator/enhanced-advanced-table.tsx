/**
 * Enhanced Advanced Search Table Component
 * Pharmacy-grade table with comprehensive NDC/FDA data
 * 
 * Displays individual medication packages with full clinical information:
 * - Brand & Generic Names
 * - Strength & Dosage Form  
 * - NDC Codes
 * - Package Sizes
 * - Manufacturer/Labeler
 * - Marketing Status (Active/Inactive)
 * - Routes of Administration
 * 
 * Based on professional pharmacy dispensing system UI patterns
 * while maintaining modern design language.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Package2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DrugSearchResponse, DrugSearchResult } from '@/lib/search-client';
import { EnhancedDrugPackage, adaptLegacyResult } from '@/lib/ndc-package-types';
import { Badge } from '@/components/ui/badge';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

type SortField = 
  | 'genericName' 
  | 'brandName' 
  | 'strength' 
  | 'dosageForm' 
  | 'labeler'
  | 'packageSize'
  | 'marketingStatus'
  | 'ndc';

type SortDirection = 'asc' | 'desc' | null;

interface EnhancedAdvancedTableProps {
  results: DrugSearchResponse;
  onSelectPackage?: (pkg: EnhancedDrugPackage) => void;
  selectedPackage?: EnhancedDrugPackage | null;
  className?: string;
}

interface ColumnFilter {
  genericName?: string;
  brandName?: string;
  strength?: string;
  dosageForm?: string;
  labeler?: string;
  ndc?: string;
}

/**
 * Sort packages by field and direction
 */
function sortPackages(
  packages: EnhancedDrugPackage[],
  field: SortField,
  direction: SortDirection
): EnhancedDrugPackage[] {
  if (!direction) return packages;

  return [...packages].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    // Handle nested fields
    if (field === 'marketingStatus') {
      aValue = a.marketingStatus.isActive ? 1 : 0;
      bValue = b.marketingStatus.isActive ? 1 : 0;
    } else if (field === 'packageSize') {
      aValue = a.packageSize.quantity;
      bValue = b.packageSize.quantity;
    } else {
      aValue = a[field as keyof EnhancedDrugPackage];
      bValue = b[field as keyof EnhancedDrugPackage];
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Filter packages by column filters
 */
function filterPackages(
  packages: EnhancedDrugPackage[],
  filters: ColumnFilter
): EnhancedDrugPackage[] {
  return packages.filter((pkg) => {
    if (filters.genericName && !pkg.genericName.toLowerCase().includes(filters.genericName.toLowerCase())) {
      return false;
    }
    if (filters.brandName && pkg.brandName && !pkg.brandName.toLowerCase().includes(filters.brandName.toLowerCase())) {
      return false;
    }
    if (filters.strength && !pkg.strength.toLowerCase().includes(filters.strength.toLowerCase())) {
      return false;
    }
    if (filters.dosageForm && !pkg.dosageForm.toLowerCase().includes(filters.dosageForm.toLowerCase())) {
      return false;
    }
    if (filters.labeler && !pkg.labeler.toLowerCase().includes(filters.labeler.toLowerCase())) {
      return false;
    }
    if (filters.ndc && !pkg.ndc.includes(filters.ndc)) {
      return false;
    }
    return true;
  });
}

/**
 * Format NDC for display (add hyphens)
 */
function formatNDC(ndc: string): string {
  if (ndc === 'N/A') return ndc;
  // Format as XXXXX-XXXX-XX
  if (ndc.length === 11 && !ndc.includes('-')) {
    return `${ndc.slice(0, 5)}-${ndc.slice(5, 9)}-${ndc.slice(9)}`;
  }
  return ndc;
}

/**
 * Copyable NDC Cell Component
 */
function NDCCell({ ndc }: { ndc: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ndc === 'N/A') return;
    
    await navigator.clipboard.writeText(ndc.replace(/-/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2 font-mono text-sm group",
              ndc !== 'N/A' && "cursor-pointer hover:text-primary"
            )}
            onClick={handleCopy}
          >
            <span>{formatNDC(ndc)}</span>
            {ndc !== 'N/A' && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {ndc === 'N/A' ? 'NDC not available' : copied ? 'Copied!' : 'Click to copy NDC'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Marketing Status Badge Component  
 */
function MarketingStatusBadge({ status }: { status: EnhancedDrugPackage['marketingStatus'] }) {
  if (status.isActive) {
    return (
      <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
        Active
      </Badge>
    );
  }

  const statusText = status.status === 'discontinued' ? 'Discontinued' : 'Inactive';
  return (
    <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {statusText}
    </Badge>
  );
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
  className,
}: {
  label: string;
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentField === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent font-semibold", className)}
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
 * Expandable Package Row Component
 */
function PackageRow({
  package: pkg,
  isSelected,
  isExpanded,
  onToggleExpand,
  onSelect,
}: {
  package: EnhancedDrugPackage;
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
          !isSelected && 'hover:bg-muted/50',
          !pkg.marketingStatus.isActive && 'opacity-75'
        )}
        onClick={onSelect}
      >
        {/* Expand Button */}
        <TableCell className="w-8 p-2">
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

        {/* Brand Name */}
        <TableCell className="font-medium">
          {pkg.brandName || <span className="text-muted-foreground">—</span>}
        </TableCell>

        {/* Generic Name */}
        <TableCell className="font-medium">
          {pkg.genericName}
        </TableCell>

        {/* Strength */}
        <TableCell>
          {pkg.strength || <span className="text-muted-foreground">—</span>}
        </TableCell>

        {/* Pack Size */}
        <TableCell>
          {pkg.packageSize.quantity > 0 
            ? `${pkg.packageSize.quantity} ${pkg.packageSize.unit}` 
            : <span className="text-muted-foreground">—</span>
          }
        </TableCell>

        {/* NDC */}
        <TableCell>
          <NDCCell ndc={pkg.ndc} />
        </TableCell>

        {/* Dosage Form */}
        <TableCell>{pkg.dosageForm}</TableCell>

        {/* Route */}
        <TableCell>
          {pkg.route.length > 0 
            ? pkg.route.join(', ') 
            : <span className="text-muted-foreground">—</span>
          }
        </TableCell>

        {/* Manufacturer/Labeler */}
        <TableCell>{pkg.labeler}</TableCell>

        {/* Marketing Status */}
        <TableCell>
          <MarketingStatusBadge status={pkg.marketingStatus} />
        </TableCell>
      </TableRow>

      {/* Expanded Details Row */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Additional Package Information
              </p>

              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* Product NDC */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Product NDC
                  </p>
                  <p className="font-mono">{pkg.productNdc}</p>
                </div>

                {/* RxCUI */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    RxCUI
                  </p>
                  <p className="font-mono">{pkg.rxcui}</p>
                </div>

                {/* Dosage Form Family */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                    Dosage Form Family
                  </p>
                  <p>{pkg.dosageFormFamily}</p>
                </div>

                {/* Active Ingredients */}
                {pkg.activeIngredients.length > 0 && (
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Active Ingredients
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      {pkg.activeIngredients.map((ing, idx) => (
                        <li key={idx}>
                          {ing.name} {ing.strength && `- ${ing.strength}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Package Description */}
                {pkg.packageDescription && (
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Package Description
                    </p>
                    <p className="text-muted-foreground">{pkg.packageDescription}</p>
                  </div>
                )}

                {/* Marketing Dates */}
                {(pkg.marketingStatus.startDate || pkg.marketingStatus.endDate) && (
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      Marketing Period
                    </p>
                    <p className="text-muted-foreground">
                      {pkg.marketingStatus.startDate && `Start: ${new Date(pkg.marketingStatus.startDate).toLocaleDateString()}`}
                      {pkg.marketingStatus.startDate && pkg.marketingStatus.endDate && ' • '}
                      {pkg.marketingStatus.endDate && `End: ${new Date(pkg.marketingStatus.endDate).toLocaleDateString()}`}
                    </p>
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
 * Enhanced Advanced Search Table - Main Component
 */
export function EnhancedAdvancedTable({
  results,
  onSelectPackage,
  selectedPackage,
  className,
}: EnhancedAdvancedTableProps) {
  const [sortField, setSortField] = useState<SortField>('genericName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<ColumnFilter>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Convert legacy results to enhanced packages
  // TODO: Backend - return EnhancedDrugPackage directly when /v1/search/drugs mode=advanced
  const packages = useMemo(() => {
    if (!results.results) return [];
    return results.results.map(adaptLegacyResult);
  }, [results.results]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null -> asc
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField('genericName');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((ndc: string) => {
    setExpandedRows((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(ndc)) {
        newExpanded.delete(ndc);
      } else {
        newExpanded.add(ndc);
      }
      return newExpanded;
    });
  }, []);

  // Process results: filter and sort
  const processedPackages = useMemo(() => {
    let filtered = filterPackages(packages, filters);
    
    // Apply sort
    if (sortField && sortDirection) {
      filtered = sortPackages(filtered, sortField, sortDirection);
    } else {
      // Default sort: Generic Name → Strength → Brand Name
      filtered = [...filtered].sort((a, b) => {
        const genCompare = a.genericName.localeCompare(b.genericName);
        if (genCompare !== 0) return genCompare;
        
        const strCompare = a.strength.localeCompare(b.strength);
        if (strCompare !== 0) return strCompare;
        
        return (a.brandName || '').localeCompare(b.brandName || '');
      });
    }
    
    return filtered;
  }, [packages, filters, sortField, sortDirection]);

  // Empty state
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
      {/* Backend Integration Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Note:</strong> This is the enhanced pharmacy-grade view. Some fields (Brand Name, NDC, Pack Size, Manufacturer) 
          are showing placeholder data until backend integration is complete. See TODO comments in code.
        </AlertDescription>
      </Alert>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {processedPackages.length} {processedPackages.length === 1 ? 'package' : 'packages'}
            {processedPackages.length !== packages.length &&
              ` (filtered from ${packages.length})`}
          </p>
          <p className="text-xs text-muted-foreground">
            Pharmacy-grade Advanced View • All FDA/NDC fields • Sortable columns
          </p>
        </div>
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-6 gap-2">
        <Input
          placeholder="Filter generic name..."
          value={filters.genericName || ''}
          onChange={(e) => setFilters({ ...filters, genericName: e.target.value || undefined })}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Filter brand..."
          value={filters.brandName || ''}
          onChange={(e) => setFilters({ ...filters, brandName: e.target.value || undefined })}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Filter strength..."
          value={filters.strength || ''}
          onChange={(e) => setFilters({ ...filters, strength: e.target.value || undefined })}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Filter form..."
          value={filters.dosageForm || ''}
          onChange={(e) => setFilters({ ...filters, dosageForm: e.target.value || undefined })}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Filter manufacturer..."
          value={filters.labeler || ''}
          onChange={(e) => setFilters({ ...filters, labeler: e.target.value || undefined })}
          className="h-9 text-sm"
        />
        <Input
          placeholder="Filter NDC..."
          value={filters.ndc || ''}
          onChange={(e) => setFilters({ ...filters, ndc: e.target.value || undefined })}
          className="h-9 text-sm font-mono"
        />
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <ScrollArea className="h-[600px] w-full">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="min-w-[150px]">
                  <SortHeader
                    label="Brand Name"
                    field="brandName"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[200px]">
                  <SortHeader
                    label="Generic Name"
                    field="genericName"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <SortHeader
                    label="Strength"
                    field="strength"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <SortHeader
                    label="Pack Size"
                    field="packageSize"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[140px]">
                  <SortHeader
                    label="NDC"
                    field="ndc"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[150px]">
                  <SortHeader
                    label="Form"
                    field="dosageForm"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[100px]">
                  Route
                </TableHead>
                <TableHead className="min-w-[180px]">
                  <SortHeader
                    label="Manufacturer"
                    field="labeler"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
                <TableHead className="min-w-[120px]">
                  <SortHeader
                    label="Status"
                    field="marketingStatus"
                    currentField={sortField}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedPackages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No packages match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                processedPackages.map((pkg) => (
                  <PackageRow
                    key={`${pkg.ndc}-${pkg.rxcui}`}
                    package={pkg}
                    isSelected={selectedPackage?.ndc === pkg.ndc}
                    isExpanded={expandedRows.has(pkg.ndc)}
                    onToggleExpand={() => toggleRowExpansion(pkg.ndc)}
                    onSelect={() => onSelectPackage?.(pkg)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>

      {/* Search Duration */}
      {results.searchDuration && (
        <p className="text-center text-xs text-muted-foreground">
          Search completed in {results.searchDuration}ms • Showing {processedPackages.length} packages
        </p>
      )}
    </div>
  );
}

/**
 * Loading skeleton for enhanced advanced table
 */
export function EnhancedAdvancedTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Alert skeleton */}
      <Skeleton className="h-16 w-full" />

      {/* Summary skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Filter skeletons */}
      <div className="grid grid-cols-6 gap-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

