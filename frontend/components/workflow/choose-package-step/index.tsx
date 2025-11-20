"use client"

/**
 * Choose Package Step
 * Combines package browsing and selection into a single experience
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Package,
  AlertCircle,
  Pill,
  Building2,
  FlaskConical,
  Route as RouteIcon,
  Package2,
} from 'lucide-react';
import { useWorkflow } from '@/lib/workflow-context';
import { NDCPackage } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EnhancedPackageTable } from '@/components/calculator/enhanced-package-table';
import { AlternativePackagesView } from '@/components/calculator/alternative-packages-view';
import { ExcludedNDCsView } from '@/components/calculator/excluded-ndcs-view';
import { MultiPackageSelector } from '@/components/calculator/multi-package-selector';
import { findOptimalPackageCombinations } from '@/lib/package-optimizer';

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
      <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Packages Found</h3>
      <p className="text-gray-600 mb-4">
        No NDC packages are available for this medication.
      </p>
      <p className="text-sm text-gray-500">
        Please go back and try a different search or confirm the drug is available in the FDA database.
      </p>
    </div>
  );
}

function getPackageSizeDisplay(pkg: NDCPackage): string {
  if (pkg.packageSize?.display) return pkg.packageSize.display;
  if (pkg.packageSize?.quantity) {
    return `${pkg.packageSize.quantity} ${pkg.packageSize.unit || ''}`.trim();
  }
  return 'N/A';
}

function getManufacturer(pkg: NDCPackage): string {
  return pkg.labeler || pkg.manufacturer || 'N/A';
}

function isPackageActive(pkg: NDCPackage): boolean {
  if (pkg.marketingStatus && typeof pkg.marketingStatus === 'object') {
    return pkg.marketingStatus.isActive;
  }
  if (typeof pkg.marketingStatus === 'string') {
    return pkg.marketingStatus.toLowerCase() === 'active';
  }
  return true;
}

function SelectedPackageSummaryCard({
  selectedPackage,
  onDeselect,
}: {
  selectedPackage: NDCPackage;
  onDeselect: () => void;
}) {
  const strength =
    selectedPackage.activeIngredients && selectedPackage.activeIngredients.length > 0
      ? selectedPackage.activeIngredients.map((ing) => ing.strength).filter(Boolean).join(' / ')
      : 'N/A';

  const route =
    selectedPackage.route && selectedPackage.route.length > 0
      ? selectedPackage.route.join(', ')
      : 'N/A';

  return (
    <Card className="border-2 border-blue-500 bg-blue-50 shadow-lg">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-blue-900">Selected Package</p>
              <p className="text-xs text-blue-700">
                Review the details before moving to SIG entry
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDeselect}
            className="text-blue-700 hover:text-blue-900 hover:bg-blue-100"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Change
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase">NDC</p>
            <p className="font-mono text-lg font-bold text-gray-900">
              {selectedPackage.ndc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase">Brand</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPackage.brandName || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-700 uppercase">Generic</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedPackage.genericName || 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-200">
            <div>
              <Label className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-blue-600" />
                Strength
              </Label>
              <p className="text-xs text-gray-900 font-medium">{strength}</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
                <Pill className="w-3 h-3 text-blue-600" />
                Form
              </Label>
              <p className="text-xs text-gray-900 font-medium">
                {selectedPackage.dosageForm || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
                <RouteIcon className="w-3 h-3 text-blue-600" />
                Route
              </Label>
              <p className="text-xs text-gray-900 font-medium">{route}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <Label className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
              <Package className="w-3 h-3 text-blue-600" />
              Package Size
            </Label>
            <p className="text-sm text-gray-900 font-medium">
              {getPackageSizeDisplay(selectedPackage)}
            </p>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <Label className="text-xs font-semibold text-blue-700 uppercase flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-600" />
              Manufacturer / Labeler
            </Label>
            <p className="text-xs text-gray-900">{getManufacturer(selectedPackage)}</p>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <p className="text-xs font-semibold text-blue-700 uppercase mb-1">Status</p>
            <Badge
              variant={isPackageActive(selectedPackage) ? 'default' : 'secondary'}
              className={
                isPackageActive(selectedPackage)
                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-800'
              }
            >
              {isPackageActive(selectedPackage) ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface SelectableTableProps {
  packages: NDCPackage[];
  selectedNDC?: string;
  selectedNDCs?: string[];
  isMultiMode?: boolean;
  onPackageSelect: (pkg: NDCPackage) => void;
}

function SelectablePackageTable({
  packages,
  selectedNDC,
  selectedNDCs,
  isMultiMode,
  onPackageSelect,
}: SelectableTableProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <EnhancedPackageTable
        packages={packages}
        selectedNDC={isMultiMode ? undefined : selectedNDC}
        selectedNDCs={isMultiMode ? selectedNDCs : undefined}
        isMultiMode={isMultiMode}
        onPackageSelect={onPackageSelect}
      />
    </div>
  );
}

export function ChoosePackageStep() {
  const { state, dispatch, goNext, goPrevious } = useWorkflow();
  const packages = state.availablePackages || [];
  const [selectedNDC, setSelectedNDC] = useState<string | undefined>(
    state.selectedPackage?.package.ndc
  );

  const isMultiMode = state.multiPackageMode || false;
  const selectedPackages = state.selectedPackages || [];
  const selectedNDCs = useMemo(
    () => selectedPackages.map((sp) => sp.package.ndc),
    [selectedPackages]
  );

  const { activePackages, inactivePackages } = useMemo(() => {
    const active: NDCPackage[] = [];
    const inactive: NDCPackage[] = [];

    packages.forEach((pkg) => {
      if (isPackageActive(pkg)) {
        active.push(pkg);
      } else {
        inactive.push(pkg);
      }
    });

    return { activePackages: active, inactivePackages: inactive };
  }, [packages]);

  const recommendations = useMemo(() => {
    if (!isMultiMode || !state.availablePackages || !state.sig) return [];

    const targetQuantity =
      state.sig.mode === 'structured' && state.sig.structured
        ? state.sig.structured.dose * state.sig.structured.frequency * state.sig.daysSupply
        : 0;

    if (targetQuantity <= 0) return [];

    const unit = state.sig.structured?.unit || 'units';
    return findOptimalPackageCombinations(state.availablePackages, targetQuantity, unit);
  }, [isMultiMode, state.availablePackages, state.sig]);

  useEffect(() => {
    if (recommendations.length > 0) {
      dispatch({ type: 'SET_PACKAGE_RECOMMENDATIONS', payload: recommendations });
    }
  }, [recommendations, dispatch]);

  useEffect(() => {
    if (!isMultiMode && state.selectedPackage) {
      setSelectedNDC(state.selectedPackage.package.ndc);
    }
  }, [state.selectedPackage, isMultiMode]);

  const handlePackageSelect = useCallback(
    (pkg: NDCPackage) => {
      if (isMultiMode) {
        if (selectedNDCs.includes(pkg.ndc)) {
          dispatch({ type: 'REMOVE_PACKAGE_FROM_SELECTION', payload: pkg.ndc });
        } else {
          dispatch({ type: 'ADD_PACKAGE_TO_SELECTION', payload: pkg });
        }
      } else {
        setSelectedNDC(pkg.ndc);
        dispatch({ type: 'SELECT_PACKAGE', payload: pkg });
      }
    },
    [dispatch, isMultiMode, selectedNDCs]
  );

  const handleDeselect = useCallback(() => {
    setSelectedNDC(undefined);
    dispatch({ type: 'DESELECT_PACKAGE' });
  }, [dispatch]);

  const handleModeToggle = useCallback(
    (checked: boolean) => {
      dispatch({ type: 'TOGGLE_MULTI_PACKAGE_MODE', payload: checked });
    },
    [dispatch]
  );

  const handleRemovePackage = useCallback(
    (ndc: string) => {
      dispatch({ type: 'REMOVE_PACKAGE_FROM_SELECTION', payload: ndc });
    },
    [dispatch]
  );

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_PACKAGE_SELECTION' });
  }, [dispatch]);

  const handleApplyRecommendation = useCallback(
    (rec: any) => {
      dispatch({ type: 'APPLY_PACKAGE_RECOMMENDATION', payload: rec });
    },
    [dispatch]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.availablePackages || state.availablePackages.length === 0) return;

      const currentIndex = selectedNDC
        ? state.availablePackages.findIndex((pkg) => pkg.ndc === selectedNDC)
        : -1;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex =
          currentIndex < state.availablePackages.length - 1 ? currentIndex + 1 : 0;
        handlePackageSelect(state.availablePackages[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex =
          currentIndex > 0 ? currentIndex - 1 : state.availablePackages.length - 1;
        handlePackageSelect(state.availablePackages[prevIndex]);
      } else if (e.key === 'Escape' && selectedNDC) {
        e.preventDefault();
        handleDeselect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNDC, state.availablePackages, handlePackageSelect, handleDeselect]);

  const selectedPackage = state.selectedPackage?.package;

  const handleSwitchToAlternative = useCallback(
    (pkg: NDCPackage) => {
      setSelectedNDC(pkg.ndc);
      dispatch({ type: 'SELECT_PACKAGE', payload: pkg });
    },
    [dispatch]
  );

  if (packages.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl폰 font-bold text-gray-900">Choose Package</h2>
          <p className="text-gray-600 mt-1">
            Review the available packages before moving forward
          </p>
        </div>
        <EmptyState />
        <div className="flex gap-3 flex-wrap">
          <Button variant="outline" onClick={goPrevious}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Drug Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Choose Package</h2>
            <p className="text-gray-600 mt-1">
              Browse {activePackages.length} active NDC package
              {activePackages.length === 1 ? '' : 's'} for{' '}
              <span className="font-semibold">{state.drugSearch?.drugName || 'this drug'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <Package2 className="w-5 h-5 text-gray-600" />
            <div className="flex items-center gap-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Multi-package mode</p>
                <p className="text-xs text-gray-500">Combine packages when needed</p>
              </div>
              <Switch id="multi-mode" checked={isMultiMode} onCheckedChange={handleModeToggle} />
            </div>
          </div>
        </div>
        {inactivePackages.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {inactivePackages.length} inactive NDC
            {inactivePackages.length === 1 ? ' is' : 's are'} hidden from selection.
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr,1.25fr] xl:grid-cols-[4fr,1.3fr]">
        <div className="space-y-4">
          <SelectablePackageTable
            packages={packages}
            selectedNDC={selectedNDC}
            selectedNDCs={selectedNDCs}
            isMultiMode={isMultiMode}
            onPackageSelect={handlePackageSelect}
          />

          {state.selectedPackage && (
            <AlternativePackagesView
              currentPackage={state.selectedPackage.package}
              allPackages={activePackages}
              onSwitchTo={handleSwitchToAlternative}
            />
          )}

          {inactivePackages.length > 0 && (
            <ExcludedNDCsView excludedPackages={inactivePackages} />
          )}
        </div>

        <div className="space-y-4">
          {isMultiMode ? (
            <MultiPackageSelector
              selectedPackages={selectedPackages}
              recommendations={recommendations}
              targetQuantity={state.sig?.mode === 'structured' ? state.sig.structured.dose * state.sig.structured.frequency * state.sig.daysSupply : 0}
              unit={state.sig?.structured?.unit || 'units'}
              onAddPackage={(pkg) => dispatch({ type: 'ADD_PACKAGE_TO_SELECTION', payload: pkg })}
              onRemovePackage={handleRemovePackage}
              onApplyRecommendation={handleApplyRecommendation}
              onClearAll={handleClearAll}
            />
          ) : selectedPackage ? (
            <SelectedPackageSummaryCard
              selectedPackage={selectedPackage}
              onDeselect={handleDeselect}
            />
          ) : (
            <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
              <div className="p-8 text-center">
                <Package className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  Select a package from the table to view details
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button variant="outline" onClick={goPrevious} className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Button>
        <Button
          onClick={goNext}
          disabled={!state.selectedPackage && !(isMultiMode && selectedPackages.length > 0)}
          className="flex items-center gap-2 justify-center sm:min-w-[200px]"
        >
          Enter SIG
        </Button>
      </div>
    </div>
  );
}


