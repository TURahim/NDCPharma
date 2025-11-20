"use client"

/**
 * Excluded NDCs View Component
 * Displays inactive or discontinued NDCs with exclusion reasons
 */

import React, { useMemo } from 'react';
import {
  AlertTriangle, XCircle, Info, ChevronDown
} from 'lucide-react';
import { NDCPackage } from '@/types/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ExcludedNDCsViewProps {
  excludedPackages: NDCPackage[];
}

/**
 * Get exclusion reason for a package
 */
function getExclusionReason(pkg: NDCPackage): string {
  if (!pkg.marketingStatus) {
    return 'Marketing status unknown';
  }
  
  if (typeof pkg.marketingStatus === 'object') {
    if (!pkg.marketingStatus.isActive) {
      return pkg.marketingStatus.status || 'Inactive';
    }
  }
  
  return 'Excluded from active selection';
}

/**
 * Get exclusion severity
 */
function getExclusionSeverity(pkg: NDCPackage): 'warning' | 'error' {
  const reason = getExclusionReason(pkg).toLowerCase();
  
  if (reason.includes('discontinued') || reason.includes('withdrawn')) {
    return 'error';
  }
  
  return 'warning';
}

export function ExcludedNDCsView({ excludedPackages }: ExcludedNDCsViewProps) {
  // Group by exclusion reason
  const groupedExclusions = useMemo(() => {
    const groups: Record<string, NDCPackage[]> = {};
    
    excludedPackages.forEach(pkg => {
      const reason = getExclusionReason(pkg);
      if (!groups[reason]) {
        groups[reason] = [];
      }
      groups[reason].push(pkg);
    });
    
    return groups;
  }, [excludedPackages]);
  
  if (excludedPackages.length === 0) {
    return null;
  }
  
  return (
    <Card className="border-2 border-amber-200 bg-amber-50">
      <div className="p-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="excluded" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-semibold text-amber-900">
                  Excluded NDCs ({excludedPackages.length})
                </h4>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 mt-2">
                {/* Info Banner */}
                <div className="bg-amber-100 border border-amber-300 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900">
                      <p className="font-semibold mb-1">About Excluded NDCs</p>
                      <p className="text-amber-800">
                        These NDCs are excluded from the active selection list because they are inactive, 
                        discontinued, or otherwise not suitable for dispensing. They are shown here for reference only.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Grouped Exclusions */}
                {Object.entries(groupedExclusions).map(([reason, packages]) => {
                  const severity = getExclusionSeverity(packages[0]);
                  
                  return (
                    <div key={reason}>
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className={`w-4 h-4 ${
                          severity === 'error' ? 'text-red-600' : 'text-amber-600'
                        }`} />
                        <h5 className="text-sm font-semibold text-gray-900">
                          {reason} ({packages.length})
                        </h5>
                      </div>
                      
                      <div className="space-y-2">
                        {packages.map((pkg) => {
                          const strength = pkg.activeIngredients?.[0]?.strength || 'N/A';
                          
                          return (
                            <div
                              key={pkg.ndc}
                              className="bg-white rounded-lg border border-gray-300 p-3 opacity-75"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                      {pkg.brandName || pkg.genericName}
                                    </span>
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs flex-shrink-0 ${
                                        severity === 'error'
                                          ? 'bg-red-50 text-red-800 border-red-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      {reason}
                                    </Badge>
                                  </div>
                                  
                                  <div className="space-y-0.5 text-xs text-gray-600">
                                    <div>
                                      NDC: <span className="font-mono">{pkg.ndc}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span>Strength: {strength}</span>
                                      <span>Form: {pkg.dosageForm || 'N/A'}</span>
                                    </div>
                                    {pkg.labeler && (
                                      <div>Labeler: {pkg.labeler}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}

