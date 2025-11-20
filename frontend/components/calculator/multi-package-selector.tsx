"use client"

/**
 * Multi-Package Selector Component
 * Allows selection of multiple packages with recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, X, Package, Sparkles, AlertCircle,
  TrendingUp, ShoppingCart, Plus, Minus
} from 'lucide-react';
import { NDCPackage } from '@/types/api';
import { PackageRecommendation, SelectedPackageData } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface MultiPackageSelectorProps {
  selectedPackages: SelectedPackageData[];
  recommendations: PackageRecommendation[];
  targetQuantity: number;
  unit: string;
  onAddPackage: (pkg: NDCPackage) => void;
  onRemovePackage: (ndc: string) => void;
  onApplyRecommendation: (rec: PackageRecommendation) => void;
  onClearAll: () => void;
}

export function MultiPackageSelector({
  selectedPackages,
  recommendations,
  targetQuantity,
  unit,
  onAddPackage,
  onRemovePackage,
  onApplyRecommendation,
  onClearAll,
}: MultiPackageSelectorProps) {
  // Calculate totals
  const totalQuantity = useMemo(() => {
    return selectedPackages.reduce((sum, sp) => {
      const packageSize = sp.package.packageSize?.quantity || 0;
      return sum + packageSize;
    }, 0);
  }, [selectedPackages]);
  
  const totalPackages = selectedPackages.length;
  const shortfall = Math.max(0, targetQuantity - totalQuantity);
  const overfill = Math.max(0, totalQuantity - targetQuantity);
  const overfillPercent = targetQuantity > 0 ? (overfill / targetQuantity) * 100 : 0;
  const isSufficient = totalQuantity >= targetQuantity;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Multi-Package Selection</h3>
        {selectedPackages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>
      
      {/* Target Quantity Display */}
      <Card className="border-2 border-blue-300 bg-blue-50">
        <div className="p-4">
          <div className="text-sm text-blue-700 mb-1">Target Quantity Needed</div>
          <div className="text-2xl font-bold text-blue-900">
            {targetQuantity} {unit}{targetQuantity !== 1 ? 's' : ''}
          </div>
        </div>
      </Card>
      
      {/* Selected Packages List */}
      {selectedPackages.length > 0 && (
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900">Selected Packages ({totalPackages})</h4>
              <Badge variant={isSufficient ? 'default' : 'destructive'}>
                {totalQuantity} {unit}{totalQuantity !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {selectedPackages.map((sp) => {
                const pkg = sp.package;
                const packageSize = pkg.packageSize?.quantity || 0;
                
                return (
                  <div
                    key={pkg.ndc}
                    className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {pkg.brandName || pkg.genericName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-0.5">
                        <div>NDC: <span className="font-mono">{pkg.ndc}</span></div>
                        <div>Size: {packageSize} {pkg.packageSize?.unit || unit}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePackage(pkg.ndc)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-3" />
            
            {/* Quantity Status */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Selected:</span>
                <span className="font-bold text-gray-900">
                  {totalQuantity} {unit}{totalQuantity !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Target Needed:</span>
                <span className="font-medium text-gray-700">
                  {targetQuantity} {unit}{targetQuantity !== 1 ? 's' : ''}
                </span>
              </div>
              
              {!isSufficient && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>{shortfall} {unit}{shortfall !== 1 ? 's' : ''} short</strong> of target quantity
                  </span>
                </div>
              )}
              
              {isSufficient && overfill > 0 && (
                <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                  overfillPercent > 20 
                    ? 'text-amber-700 bg-amber-50' 
                    : 'text-green-700 bg-green-50'
                }`}>
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>+{overfill} {unit}{overfill !== 1 ? 's' : ''}</strong> overfill ({overfillPercent.toFixed(1)}%)
                  </span>
                </div>
              )}
              
              {isSufficient && overfill === 0 && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Perfect match - exactly {targetQuantity} {unit}{targetQuantity !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      
      {/* Empty State */}
      {selectedPackages.length === 0 && (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <div className="p-8 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600 mb-1">No packages selected</p>
            <p className="text-xs text-gray-500">
              Click the checkboxes in the table below to select packages
            </p>
          </div>
        </Card>
      )}
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-2 border-purple-300 bg-purple-50">
          <div className="p-4">
            <Accordion type="single" collapsible defaultValue="recommendations">
              <AccordionItem value="recommendations" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">
                      System Recommendations ({recommendations.length})
                    </h4>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 mt-2">
                    {recommendations.map((rec, index) => (
                      <div
                        key={rec.id}
                        className="bg-white rounded-lg border border-purple-200 p-3"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                Option {index + 1}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {rec.totalPackages} package{rec.totalPackages !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-700 mb-2">{rec.reasoning}</p>
                            <div className="space-y-1">
                              {rec.packages.map((p) => (
                                <div key={p.package.ndc} className="text-xs text-gray-600">
                                  • {p.packagesNeeded}× {p.package.brandName || p.package.genericName} 
                                  ({p.package.packageSize?.quantity} {p.package.packageSize?.unit})
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onApplyRecommendation(rec)}
                            className="flex-shrink-0"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Apply
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>
      )}
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-semibold">Multi-Package Selection Tips</p>
            <ul className="list-disc list-inside text-blue-800 space-y-0.5">
              <li>Select multiple packages by checking boxes in the table</li>
              <li>Use system recommendations for optimal combinations</li>
              <li>Ensure total selected quantity meets or exceeds target</li>
              <li>Minimize overfill when possible</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

