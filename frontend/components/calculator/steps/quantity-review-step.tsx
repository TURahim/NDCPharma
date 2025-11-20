"use client";

/**
 * Step 5: Quantity Review & Calculation
 * Displays calculated dispensing quantity with breakdown, overfill/underfill analysis,
 * and manual override options
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Info,
  Package,
  Pill,
  Calendar,
  TrendingUp,
  TrendingDown,
  Edit3,
  X,
  Save,
  Sparkles,
} from "lucide-react";
import { useWorkflow } from "@/lib/workflow-context";
import { QuantityData } from "@/types/workflow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { computeQuantityFromSig } from "@/lib/dosage-calculations";

/**
 * Override reason options
 */
const OVERRIDE_REASONS = [
  "Patient request",
  "Insurance limitation",
  "Clinical judgment",
  "Partial fill",
  "Trial dose",
  "Package availability",
  "Cost consideration",
  "Other (specify below)",
];

/**
 * Calculate packages needed
 */
function calculatePackagesNeeded(
  totalQuantity: number,
  packageQuantity: number,
): number {
  return Math.ceil(totalQuantity / packageQuantity);
}

/**
 * Calculate overfill/underfill
 */
function calculateFillVariance(
  totalQuantity: number,
  packagesNeeded: number,
  packageQuantity: number,
): {
  actualDispensed: number;
  variance: number;
  variancePercentage: number;
  isOverfill: boolean;
} {
  const actualDispensed = packagesNeeded * packageQuantity;
  const variance = actualDispensed - totalQuantity;
  const variancePercentage = (variance / totalQuantity) * 100;
  const isOverfill = variance > 0;

  return {
    actualDispensed,
    variance: Math.abs(variance),
    variancePercentage: Math.abs(variancePercentage),
    isOverfill,
  };
}

/**
 * Quantity Review Step Component
 */
export function QuantityReviewStep() {
  const { state, dispatch } = useWorkflow();

  // Manual override state
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideQuantity, setOverrideQuantity] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedPackage = state.selectedPackage?.package;
  const selectedPackages = state.selectedPackages || [];
  const isMultiPackage = state.multiPackageMode && selectedPackages.length > 0;
  const sig = state.sig;

  /**
   * Calculate multi-package quantity data
   */
  const multiPackageData = useMemo(() => {
    if (!isMultiPackage || selectedPackages.length === 0 || !sig) return null;

    // Calculate total from all selected packages
    const totalQuantity = selectedPackages.reduce((sum, sp) => {
      const packageSize = sp.package.packageSize?.quantity || 0;
      return sum + packageSize;
    }, 0);

    const unit = sig.structured?.unit || "units";
    const targetQuantity =
      sig.mode === "structured" && sig.structured
        ? sig.structured.dose * sig.structured.frequency * sig.daysSupply
        : 0;

    if (targetQuantity === 0) return null;

    const breakdown = selectedPackages
      .map((sp) => {
        const pkg = sp.package;
        const packageSize = pkg.packageSize?.quantity || 0;
        return `1× ${pkg.brandName || pkg.genericName} (${packageSize} ${
          pkg.packageSize?.unit || unit
        })`;
      })
      .join(" + ");

    const packagesNeeded = selectedPackages.length;
    const variance = calculateFillVariance(targetQuantity, 1, totalQuantity);

    return {
      totalQuantity,
      unit,
      breakdown,
      packageQuantity: totalQuantity,
      packagesNeeded,
      ...variance,
      packageBreakdown: selectedPackages.map((sp) => ({
        packageNDC: sp.package.ndc,
        packageName: sp.package.brandName || sp.package.genericName || "",
        packageSize: sp.package.packageSize?.quantity || 0,
        packageUnit: sp.package.packageSize?.unit || unit,
      })),
    };
  }, [isMultiPackage, selectedPackages, sig]);

  /**
   * Calculate quantity data (single package)
   */
  const calculatedData = useMemo(() => {
    if (isMultiPackage) return multiPackageData;
    if (!selectedPackage || !sig) return null;

    // Calculate base quantity from SIG
    const calculation = computeQuantityFromSig(sig, selectedPackage);

    if (!calculation) {
      // Free-text SIG without parser - need manual entry
      return null;
    }

    const { totalQuantity, unit, breakdown, warnings } = calculation;
    const packageQuantity = selectedPackage.packageSize?.quantity || 1;

    // Calculate packages needed
    const packagesNeeded = calculatePackagesNeeded(
      totalQuantity,
      packageQuantity,
    );

    // Calculate overfill/underfill
    const variance = calculateFillVariance(
      totalQuantity,
      packagesNeeded,
      packageQuantity,
    );

    return {
      totalQuantity,
      unit,
      breakdown,
      packageQuantity,
      packagesNeeded,
      ...variance,
      warnings,
    };
  }, [selectedPackage, sig]);

  /**
   * Get effective quantity (override or calculated)
   */
  const effectiveQuantity = useMemo(() => {
    if (state.quantity?.manualOverride) {
      return state.quantity.manualOverride.quantity;
    }
    return calculatedData?.totalQuantity || 0;
  }, [state.quantity, calculatedData]);

  /**
   * Save quantity data to workflow
   */
  const saveQuantityData = useCallback(
    (data: QuantityData) => {
      dispatch({ type: "SET_QUANTITY", payload: data });
    },
    [dispatch],
  );

  /**
   * Auto-save calculated quantity
   */
  useEffect(() => {
    if (calculatedData && !state.quantity?.manualOverride) {
      const quantityData: QuantityData = {
        totalQuantity: calculatedData.totalQuantity,
        packagesNeeded: calculatedData.packagesNeeded,
        overfillPercentage: calculatedData.isOverfill
          ? calculatedData.variancePercentage
          : 0,
        underfillPercentage: !calculatedData.isOverfill
          ? calculatedData.variancePercentage
          : 0,
      };

      saveQuantityData(quantityData);
    }
  }, [calculatedData, state.quantity?.manualOverride, saveQuantityData]);

  /**
   * Validate override form
   */
  const validateOverride = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const qty = parseFloat(overrideQuantity);
    if (!overrideQuantity || isNaN(qty) || qty <= 0) {
      newErrors.overrideQuantity = "Quantity must be greater than 0";
    }

    if (!overrideReason) {
      newErrors.overrideReason = "Reason is required";
    }

    if (overrideReason === "Other (specify below)" && !overrideNotes.trim()) {
      newErrors.overrideNotes = "Please specify the reason";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [overrideQuantity, overrideReason, overrideNotes]);

  /**
   * Apply manual override
   */
  const applyOverride = useCallback(() => {
    if (!validateOverride() || !selectedPackage) return;

    const qty = parseFloat(overrideQuantity);
    const packageQuantity = selectedPackage.packageSize?.quantity || 1;
    const packagesNeeded = calculatePackagesNeeded(qty, packageQuantity);
    const variance = calculateFillVariance(
      qty,
      packagesNeeded,
      packageQuantity,
    );

    const quantityData: QuantityData = {
      totalQuantity: qty,
      packagesNeeded,
      overfillPercentage: variance.isOverfill ? variance.variancePercentage : 0,
      underfillPercentage: !variance.isOverfill
        ? variance.variancePercentage
        : 0,
      manualOverride: {
        quantity: qty,
        reason: overrideReason + (overrideNotes ? `: ${overrideNotes}` : ""),
      },
    };

    saveQuantityData(quantityData);
    setIsOverriding(false);
  }, [
    validateOverride,
    overrideQuantity,
    overrideReason,
    overrideNotes,
    selectedPackage,
    saveQuantityData,
  ]);

  /**
   * Cancel override
   */
  const cancelOverride = useCallback(() => {
    setIsOverriding(false);
    setOverrideQuantity("");
    setOverrideReason("");
    setOverrideNotes("");
    setErrors({});
  }, []);

  /**
   * Remove override and restore calculated quantity
   */
  const removeOverride = useCallback(() => {
    if (calculatedData) {
      const quantityData: QuantityData = {
        totalQuantity: calculatedData.totalQuantity,
        packagesNeeded: calculatedData.packagesNeeded,
        overfillPercentage: calculatedData.isOverfill
          ? calculatedData.variancePercentage
          : 0,
        underfillPercentage: !calculatedData.isOverfill
          ? calculatedData.variancePercentage
          : 0,
      };

      saveQuantityData(quantityData);
    }
  }, [calculatedData, saveQuantityData]);

  /**
   * Start override with calculated quantity as default
   */
  const startOverride = useCallback(() => {
    setOverrideQuantity(effectiveQuantity.toString());
    setIsOverriding(true);
  }, [effectiveQuantity]);

  // Check if required data is present
  if (!selectedPackage || !sig) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Quantity</h2>
          <p className="text-gray-600 mt-1">
            Verify the calculated dispensing quantity
          </p>
        </div>

        <Card className="border-2 border-amber-300 bg-amber-50">
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-amber-900 font-medium mb-2">
              Missing Required Information
            </p>
            <p className="text-sm text-amber-800">
              Please complete the previous steps before reviewing quantity
            </p>
            <div className="flex gap-2 justify-center mt-4">
              {!selectedPackage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: "GO_TO_STEP", payload: 3 })}
                >
                  Select Package
                </Button>
              )}
              {!sig && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch({ type: "GO_TO_STEP", payload: 4 })}
                >
                  Enter SIG
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Handle free-text SIG without calculation
  if (!calculatedData && sig.mode === "freetext" && !sig.parsed) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Quantity</h2>
          <p className="text-gray-600 mt-1">
            {sig.parsed
              ? "Verify AI-parsed SIG and calculated quantity"
              : "Enter the quantity to dispense"}
          </p>
        </div>

        {/* Show parsed SIG information if available */}
        {sig.parsed && (
          <Card className="border-2 border-purple-300 bg-purple-50">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">AI Parsed SIG</p>
                  <p className="text-purple-700 italic mb-3">
                    Original: "{sig.freetext}"
                  </p>
                  <div className="grid grid-cols-2 gap-2 bg-white rounded p-3 text-xs">
                    <div>
                      <span className="text-gray-600">Dose:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {sig.parsed.dose} {sig.parsed.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Frequency:</span>
                      <span className="ml-2 font-semibold text-gray-900">
                        {sig.parsed.frequency}x daily
                      </span>
                    </div>
                    {sig.parsed.route && (
                      <div>
                        <span className="text-gray-600">Route:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {sig.parsed.route}
                        </span>
                      </div>
                    )}
                    {sig.parsed.confidence && (
                      <div>
                        <span className="text-gray-600">Confidence:</span>
                        <span className="ml-2 font-semibold text-gray-900">
                          {(sig.parsed.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                  {sig.parsingWarnings && sig.parsingWarnings.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {sig.parsingWarnings.map((warning, idx) => (
                        <p
                          key={idx}
                          className="text-xs text-amber-700 flex items-start gap-1"
                        >
                          <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="border-2 border-blue-300 bg-blue-50">
          <div className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">
                  {sig.parsed ? "Verify Quantity" : "Manual Entry Required"}
                </p>
                <p className="text-blue-800">
                  {sig.parsed
                    ? "The quantity has been calculated based on the parsed SIG. Please verify and adjust if needed."
                    : "The SIG could not be automatically parsed. Please manually enter the quantity to dispense."}
                </p>
              </div>
            </div>

            <div className="space-y-4 bg-white rounded-lg p-4">
              <div>
                <Label htmlFor="manualQty">
                  Quantity to Dispense <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="manualQty"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter quantity"
                  value={overrideQuantity}
                  onChange={(e) => setOverrideQuantity(e.target.value)}
                  className={errors.overrideQuantity ? "border-red-500" : ""}
                />
                {errors.overrideQuantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.overrideQuantity}
                  </p>
                )}
              </div>

              <Button onClick={applyOverride} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Confirm Quantity
              </Button>
            </div>
          </div>
        </Card>

        {state.quantity && (
          <Card className="border-2 border-green-500 bg-green-50">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">
                  Quantity Confirmed
                </span>
              </div>
              <p className="text-sm text-green-800">
                {state.quantity.totalQuantity}{" "}
                {sig.parsed?.unit || sig.structured?.unit || "units"} to be
                dispensed in {state.quantity.packagesNeeded} package(s)
              </p>
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (!calculatedData) return null;

  const hasOverride = !!state.quantity?.manualOverride;
  const varianceThreshold = 20; // 20% threshold for warnings
  const isSignificantVariance =
    calculatedData.variancePercentage > varianceThreshold;
  const parserWarnings = sig?.parsingWarnings || [];
  const specialWarnings = [
    ...parserWarnings,
    ...(calculatedData.warnings || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review Quantity</h2>
        <p className="text-gray-600 mt-1">
          Verify the calculated dispensing quantity
        </p>
      </div>

      {/* Main Calculation Card */}
      <Card className="border-2 border-gray-300">
        <div className="p-6 space-y-6">
          {/* Calculation Breakdown */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Calculation
              </h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Formula</span>
                <span className="text-sm font-mono text-gray-900">
                  {calculatedData.breakdown}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-700">
                  Total Quantity Needed
                </span>
                <span className="text-2xl font-bold text-gray-900">
                  {calculatedData.totalQuantity} {calculatedData.unit}
                  {calculatedData.totalQuantity !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>

          {specialWarnings.length > 0 && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-900 text-sm space-y-1">
                {specialWarnings.map((warning, index) => (
                  <p key={index}>{warning}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          {/* Package Information */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {isMultiPackage ? "Package Combination" : "Package Details"}
              </h3>
            </div>

            {isMultiPackage && multiPackageData?.packageBreakdown ? (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-700 uppercase mb-2">
                    Selected Packages (
                    {multiPackageData.packageBreakdown.length})
                  </p>
                  <div className="space-y-2">
                    {multiPackageData.packageBreakdown.map((pkg) => (
                      <div
                        key={pkg.packageNDC}
                        className="flex items-center justify-between text-sm bg-white rounded p-2"
                      >
                        <span className="text-gray-900">{pkg.packageName}</span>
                        <Badge variant="secondary">
                          {pkg.packageSize} {pkg.packageUnit}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Total Combined
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {multiPackageData.totalQuantity} {multiPackageData.unit}
                    {multiPackageData.totalQuantity !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Package Size
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedPackage!.packageSize?.quantity}{" "}
                    {selectedPackage!.packageSize?.unit}
                  </p>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase mb-1">
                    Packages Needed
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {calculatedData.packagesNeeded}{" "}
                    {calculatedData.packagesNeeded === 1
                      ? "package"
                      : "packages"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actual Dispensed & Variance */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {calculatedData.isOverfill ? (
                <TrendingUp className="w-5 h-5 text-amber-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-amber-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                Dispensing Analysis
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-4">
                <span className="text-sm font-medium text-green-700">
                  Will Be Dispensed
                </span>
                <span className="text-xl font-bold text-green-900">
                  {calculatedData.actualDispensed} {calculatedData.unit}
                  {calculatedData.actualDispensed !== 1 ? "s" : ""}
                </span>
              </div>

              <Card
                className={`${
                  isSignificantVariance
                    ? "border-2 border-amber-500 bg-amber-50"
                    : "border-2 border-gray-200 bg-gray-50"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {isSignificantVariance ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {calculatedData.isOverfill
                            ? "Overfill"
                            : "Exact Match"}
                        </span>
                        <Badge
                          variant={
                            isSignificantVariance ? "destructive" : "secondary"
                          }
                        >
                          {calculatedData.variance > 0 ? "+" : ""}
                          {calculatedData.variance} {calculatedData.unit}
                          {calculatedData.variance !== 1 ? "s" : ""} (
                          {calculatedData.variancePercentage.toFixed(1)}%)
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">
                        {calculatedData.isOverfill ? (
                          <>
                            The dispensed quantity will be{" "}
                            <strong>
                              {calculatedData.variance} {calculatedData.unit}
                              {calculatedData.variance !== 1 ? "s" : ""} more
                            </strong>{" "}
                            than required.
                            {isSignificantVariance &&
                              " This is a significant overfill."}
                          </>
                        ) : (
                          "The package size exactly matches the required quantity."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Card>

      {/* Manual Override Section */}
      {!isOverriding && !hasOverride && (
        <Card className="border-2 border-dashed border-gray-300">
          <div className="p-4">
            <Button
              variant="outline"
              onClick={startOverride}
              className="w-full gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Override Quantity
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Use this if you need to dispense a different quantity than
              calculated
            </p>
          </div>
        </Card>
      )}

      {/* Override Form */}
      {isOverriding && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-blue-900">
                Manual Quantity Override
              </h3>
              <Button variant="ghost" size="sm" onClick={cancelOverride}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4 bg-white rounded-lg p-4">
              <div>
                <Label htmlFor="overrideQty">
                  Override Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="overrideQty"
                  type="number"
                  min="0.1"
                  step="0.5"
                  placeholder="Enter new quantity"
                  value={overrideQuantity}
                  onChange={(e) => setOverrideQuantity(e.target.value)}
                  className={errors.overrideQuantity ? "border-red-500" : ""}
                />
                {errors.overrideQuantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.overrideQuantity}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="overrideReason">
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={overrideReason}
                  onValueChange={setOverrideReason}
                >
                  <SelectTrigger
                    id="overrideReason"
                    className={errors.overrideReason ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.overrideReason && (
                  <p className="text-xs text-red-600 mt-1">
                    {errors.overrideReason}
                  </p>
                )}
              </div>

              {overrideReason === "Other (specify below)" && (
                <div>
                  <Label htmlFor="overrideNotes">Additional Notes</Label>
                  <Textarea
                    id="overrideNotes"
                    rows={3}
                    placeholder="Please specify the reason for override..."
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                    className={errors.overrideNotes ? "border-red-500" : ""}
                  />
                  {errors.overrideNotes && (
                    <p className="text-xs text-red-600 mt-1">
                      {errors.overrideNotes}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={applyOverride} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Apply Override
                </Button>
                <Button variant="outline" onClick={cancelOverride}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Active Override Display */}
      {hasOverride && state.quantity && (
        <Card className="border-2 border-purple-500 bg-purple-50">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">
                  Manual Override Active
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeOverride}
                className="text-purple-700 hover:text-purple-900 hover:bg-purple-100"
              >
                <X className="w-4 h-4 mr-1" />
                Remove Override
              </Button>
            </div>

            <div className="space-y-2 bg-white rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Original Calculated:
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {calculatedData.totalQuantity} {calculatedData.unit}
                  {calculatedData.totalQuantity !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  Override Quantity:
                </span>
                <span className="text-lg font-bold text-purple-900">
                  {state.quantity.totalQuantity} {calculatedData.unit}
                  {state.quantity.totalQuantity !== 1 ? "s" : ""}
                </span>
              </div>
              <Separator />
              <div>
                <span className="text-xs font-semibold text-gray-600">
                  Reason:
                </span>
                <p className="text-sm text-gray-900 mt-1">
                  {state.quantity.manualOverride.reason}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 space-y-2">
            <p className="font-semibold">Quantity Review Tips</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
              <li>Review the calculation breakdown to ensure accuracy</li>
              <li>Check for significant overfill/underfill warnings</li>
              <li>Use manual override only when clinically necessary</li>
              <li>Document the reason for any overrides</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
