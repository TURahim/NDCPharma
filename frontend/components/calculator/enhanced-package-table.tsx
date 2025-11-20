"use client"

/**
 * Enhanced Package Table Component
 * Includes sorting, filtering, and pagination
 * Optimized with React.memo for performance
 */

import React, { useState, useMemo, memo } from 'react';
import { 
  ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ChevronLeft, 
  ChevronRight, CheckCircle, XCircle, SlidersHorizontal, Circle, CheckCircle2, Square 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { NDCPackage } from '@/types/api';

type SortField = 'ndc' | 'brandName' | 'genericName' | 'strength' | 'packageSize' | 'dosageForm' | 'route' | 'labeler' | 'status';
type SortDirection = 'asc' | 'desc' | null;

interface TableFilters {
  dosageForms: string[];
  manufacturers: string[];
  routes: string[];
  activeOnly: boolean;
}

interface EnhancedPackageTableProps {
  packages: NDCPackage[];
  onPackageSelect?: (pkg: NDCPackage) => void;
  selectedNDC?: string;
  selectedNDCs?: string[]; // For multi-select mode
  isMultiMode?: boolean;
}

// Helper functions
function extractStrength(pkg: NDCPackage): string {
  if (pkg.activeIngredients && pkg.activeIngredients.length > 0) {
    return pkg.activeIngredients
      .map(ing => ing.strength)
      .filter(Boolean)
      .join(' / ') || 'N/A';
  }
  return 'N/A';
}

function formatRoute(pkg: NDCPackage): string {
  if (pkg.route && pkg.route.length > 0) {
    return pkg.route.join(', ');
  }
  return 'N/A';
}

function getManufacturer(pkg: NDCPackage): string {
  return pkg.manufacturer || pkg.labeler || 'Not Specified';
}

function isActive(pkg: NDCPackage): boolean {
  if (pkg.marketingStatus && typeof pkg.marketingStatus === 'object') {
    return pkg.marketingStatus.isActive;
  }
  // Default assumption: active if no status provided
  return true;
}

// Memoized component for performance
const EnhancedPackageTableComponent = function EnhancedPackageTable({ 
  packages, 
  onPackageSelect,
  selectedNDC,
  selectedNDCs = [],
  isMultiMode = false
}: EnhancedPackageTableProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TableFilters>({
    dosageForms: [],
    manufacturers: [],
    routes: [],
    activeOnly: true, // Changed default to true - only show active by default
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  
  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const dosageForms = new Set<string>();
    const manufacturers = new Set<string>();
    const routes = new Set<string>();
    
    packages.forEach(pkg => {
      if (pkg.dosageForm) dosageForms.add(pkg.dosageForm);
      const manufacturer = getManufacturer(pkg);
      if (manufacturer && manufacturer !== 'Not Specified') {
        manufacturers.add(manufacturer);
      }
      if (pkg.route) pkg.route.forEach(r => routes.add(r));
    });
    
    return {
      dosageForms: Array.from(dosageForms).sort(),
      manufacturers: Array.from(manufacturers).sort(),
      routes: Array.from(routes).sort(),
    };
  }, [packages]);
  
  // Apply filters
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      // Active only filter
      if (filters.activeOnly && !isActive(pkg)) return false;
      
      // Dosage form filter
      if (filters.dosageForms.length > 0 && !filters.dosageForms.includes(pkg.dosageForm)) {
        return false;
      }
      
      // Manufacturer filter
      const manufacturer = getManufacturer(pkg);
      if (filters.manufacturers.length > 0 && !filters.manufacturers.includes(manufacturer)) {
        return false;
      }
      
      // Route filter
      if (filters.routes.length > 0) {
        const pkgRoutes = pkg.route || [];
        if (!filters.routes.some(r => pkgRoutes.includes(r))) {
          return false;
        }
      }
      
      return true;
    });
  }, [packages, filters]);
  
  // Apply sorting
  const sortedPackages = useMemo(() => {
    if (!sortField || !sortDirection) return filteredPackages;
    
    return [...filteredPackages].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'ndc':
          aValue = a.ndc;
          bValue = b.ndc;
          break;
        case 'brandName':
          aValue = a.brandName || '';
          bValue = b.brandName || '';
          break;
        case 'genericName':
          aValue = a.genericName || '';
          bValue = b.genericName || '';
          break;
        case 'strength':
          aValue = extractStrength(a);
          bValue = extractStrength(b);
          break;
        case 'packageSize':
          aValue = a.packageSize?.quantity || 0;
          bValue = b.packageSize?.quantity || 0;
          break;
        case 'dosageForm':
          aValue = a.dosageForm;
          bValue = b.dosageForm;
          break;
        case 'route':
          aValue = formatRoute(a);
          bValue = formatRoute(b);
          break;
        case 'labeler':
          aValue = getManufacturer(a);
          bValue = getManufacturer(b);
          break;
        case 'status':
          aValue = isActive(a) ? 1 : 0;
          bValue = isActive(b) ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredPackages, sortField, sortDirection]);
  
  // Apply pagination
  const paginatedPackages = useMemo(() => {
    if (pageSize === -1) return sortedPackages; // Show all
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedPackages.slice(start, end);
  }, [sortedPackages, currentPage, pageSize]);
  
  const totalPages = pageSize === -1 ? 1 : Math.ceil(sortedPackages.length / pageSize);
  
  // Sorting handler
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
    setCurrentPage(1); // Reset to first page
  };
  
  // Filter handlers
  const toggleFilter = (type: keyof TableFilters, value: string) => {
    setFilters(prev => {
      const current = prev[type] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [type]: updated };
    });
    setCurrentPage(1);
  };
  
  const clearFilters = () => {
    setFilters({
      dosageForms: [],
      manufacturers: [],
      routes: [],
      activeOnly: false,
    });
    setCurrentPage(1);
  };
  
  const activeFilterCount = 
    filters.dosageForms.length + 
    filters.manufacturers.length + 
    filters.routes.length +
    (filters.activeOnly ? 1 : 0);
  
  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-3 h-3 text-blue-600" />;
    }
    return <ArrowDown className="w-3 h-3 text-blue-600" />;
  };
  
  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        
        {/* Results Count */}
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{paginatedPackages.length}</span> of{' '}
          <span className="font-semibold">{sortedPackages.length}</span> packages
          {sortedPackages.length !== packages.length && (
            <span className="text-gray-500"> (filtered from {packages.length})</span>
          )}
        </div>
        
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-600">Show:</Label>
          <Select 
            value={pageSize.toString()} 
            onValueChange={(val) => {
              setPageSize(parseInt(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="-1">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Filter Panel */}
      {showFilters && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Only */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="active-only"
                  checked={filters.activeOnly}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({ ...prev, activeOnly: !!checked }));
                    setCurrentPage(1);
                  }}
                />
                <label htmlFor="active-only" className="text-sm cursor-pointer">
                  Active Only
                </label>
              </div>
            </div>
            
            {/* Dosage Form */}
            {filterOptions.dosageForms.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Dosage Form</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filterOptions.dosageForms.slice(0, 10).map(form => (
                    <div key={form} className="flex items-center space-x-2">
                      <Checkbox
                        id={`form-${form}`}
                        checked={filters.dosageForms.includes(form)}
                        onCheckedChange={() => toggleFilter('dosageForms', form)}
                      />
                      <label htmlFor={`form-${form}`} className="text-sm cursor-pointer">
                        {form}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Route */}
            {filterOptions.routes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Route</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filterOptions.routes.slice(0, 10).map(route => (
                    <div key={route} className="flex items-center space-x-2">
                      <Checkbox
                        id={`route-${route}`}
                        checked={filters.routes.includes(route)}
                        onCheckedChange={() => toggleFilter('routes', route)}
                      />
                      <label htmlFor={`route-${route}`} className="text-sm cursor-pointer">
                        {route}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Manufacturer (showing first 10) */}
            {filterOptions.manufacturers.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Manufacturer</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filterOptions.manufacturers.slice(0, 10).map(mfg => (
                    <div key={mfg} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mfg-${mfg}`}
                        checked={filters.manufacturers.includes(mfg)}
                        onCheckedChange={() => toggleFilter('manufacturers', mfg)}
                      />
                      <label htmlFor={`mfg-${mfg}`} className="text-sm cursor-pointer truncate" title={mfg}>
                        {mfg.length > 25 ? `${mfg.substring(0, 25)}...` : mfg}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 w-12 text-center text-xs font-semibold text-gray-700 uppercase">
                  Select
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('ndc')}
                >
                  <div className="flex items-center gap-2">
                    NDC
                    <SortIndicator field="ndc" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('brandName')}
                >
                  <div className="flex items-center gap-2">
                    Brand Name
                    <SortIndicator field="brandName" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('genericName')}
                >
                  <div className="flex items-center gap-2">
                    Generic Name
                    <SortIndicator field="genericName" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('strength')}
                >
                  <div className="flex items-center gap-2">
                    Strength
                    <SortIndicator field="strength" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('packageSize')}
                >
                  <div className="flex items-center gap-2">
                    Package Size
                    <SortIndicator field="packageSize" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('dosageForm')}
                >
                  <div className="flex items-center gap-2">
                    Form
                    <SortIndicator field="dosageForm" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('route')}
                >
                  <div className="flex items-center gap-2">
                    Route
                    <SortIndicator field="route" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('labeler')}
                >
                  <div className="flex items-center gap-2">
                    Manufacturer
                    <SortIndicator field="labeler" />
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-2">
                    Status
                    <SortIndicator field="status" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {paginatedPackages.map((pkg) => {
                const active = isActive(pkg);
                const strength = extractStrength(pkg);
                const route = formatRoute(pkg);
                const isSelected = isMultiMode 
                  ? selectedNDCs.includes(pkg.ndc)
                  : selectedNDC === pkg.ndc;
                
                // Visual distinction for inactive packages
                const isInactive = !active;
                const rowClassName = isInactive
                  ? 'bg-gray-100 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500 cursor-pointer'
                    : 'hover:bg-gray-50 cursor-pointer';
                
                return (
                  <tr 
                    key={pkg.ndc} 
                    className={`transition-colors ${rowClassName}`}
                    onClick={() => {
                      // Prevent selection of inactive packages
                      if (!isInactive) {
                        onPackageSelect?.(pkg);
                      }
                    }}
                    title={isInactive ? 'This NDC is inactive and cannot be selected' : undefined}
                  >
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        {isInactive ? (
                          // Disabled icon for inactive packages
                          <XCircle className="w-5 h-5 text-gray-400" />
                        ) : isMultiMode ? (
                          // Checkbox for multi-select
                          isSelected ? (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-300" />
                          )
                        ) : (
                          // Radio button for single-select
                          isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-300" />
                          )
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{pkg.ndc}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{pkg.brandName || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{pkg.genericName || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{strength}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {pkg.packageSize?.quantity} {pkg.packageSize?.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{pkg.dosageForm}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{route}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">{getManufacturer(pkg)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            
            {/* Page numbers (show first, last, and current +/- 2) */}
            <div className="hidden sm:flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 2) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  // Add ellipsis
                  if (idx > 0 && page - arr[idx - 1] > 1) {
                    return (
                      <React.Fragment key={`${page}-ellipsis`}>
                        <span className="px-2 py-1 text-gray-400">...</span>
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-9"
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    );
                  }
                  
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-9"
                    >
                      {page}
                    </Button>
                  );
                })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Export memoized version for performance optimization
export const EnhancedPackageTable = memo(EnhancedPackageTableComponent);

