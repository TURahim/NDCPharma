"use client"

/**
 * Alternative Packages View Component
 * Displays similar packages with different dosage forms or strengths
 */

import React, { useMemo } from 'react';
import {
  Info, ArrowRight, Pill, Sparkles, AlertCircle
} from 'lucide-react';
import { NDCPackage } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface AlternativePackagesViewProps {
  currentPackage: NDCPackage;
  allPackages: NDCPackage[];
  onSwitchTo: (pkg: NDCPackage) => void;
}

/**
 * Find alternative packages (different forms or strengths of same drug)
 */
function findAlternatives(
  currentPackage: NDCPackage,
  allPackages: NDCPackage[]
): {
  differentForms: NDCPackage[];
  differentStrengths: NDCPackage[];
} {
  const currentGeneric = currentPackage.genericName?.toLowerCase();
  const currentForm = currentPackage.dosageForm?.toLowerCase();
  const currentStrength = currentPackage.activeIngredients?.[0]?.strength;
  
  const differentForms: NDCPackage[] = [];
  const differentStrengths: NDCPackage[] = [];
  
  allPackages.forEach(pkg => {
    // Skip self and inactive packages
    if (pkg.ndc === currentPackage.ndc) return;
    if (!pkg.marketingStatus || (typeof pkg.marketingStatus === 'object' && !pkg.marketingStatus.isActive)) return;
    
    // Must be same generic name
    if (pkg.genericName?.toLowerCase() !== currentGeneric) return;
    
    const pkgForm = pkg.dosageForm?.toLowerCase();
    const pkgStrength = pkg.activeIngredients?.[0]?.strength;
    
    // Different dosage form, same strength
    if (pkgForm !== currentForm && pkgStrength === currentStrength) {
      differentForms.push(pkg);
    }
    
    // Same dosage form, different strength
    if (pkgForm === currentForm && pkgStrength !== currentStrength) {
      differentStrengths.push(pkg);
    }
  });
  
  return {
    differentForms: differentForms.slice(0, 5), // Limit to 5
    differentStrengths: differentStrengths.slice(0, 5),
  };
}

/**
 * Get clinical note for alternative
 */
function getClinicalNote(
  alternative: NDCPackage,
  current: NDCPackage,
  type: 'form' | 'strength'
): string {
  if (type === 'form') {
    const altForm = alternative.dosageForm || 'alternative form';
    return `${altForm} available with same strength`;
  } else {
    const altStrength = alternative.activeIngredients?.[0]?.strength || 'different strength';
    return `Available in ${altStrength} strength`;
  }
}

export function AlternativePackagesView({
  currentPackage,
  allPackages,
  onSwitchTo,
}: AlternativePackagesViewProps) {
  const alternatives = useMemo(
    () => findAlternatives(currentPackage, allPackages),
    [currentPackage, allPackages]
  );
  
  const hasAlternatives = 
    alternatives.differentForms.length > 0 || 
    alternatives.differentStrengths.length > 0;
  
  if (!hasAlternatives) {
    return null;
  }
  
  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50">
      <div className="p-4">
        <Accordion type="single" collapsible>
          <AccordionItem value="alternatives" className="border-none">
            <AccordionTrigger className="hover:no-underline py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-indigo-900">
                  Alternative Packages Available ({alternatives.differentForms.length + alternatives.differentStrengths.length})
                </h4>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 mt-2">
                {/* Different Dosage Forms */}
                {alternatives.differentForms.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-sm font-semibold text-indigo-900">
                        Different Dosage Forms
                      </h5>
                    </div>
                    <div className="space-y-2">
                      {alternatives.differentForms.map((pkg) => (
                        <div
                          key={pkg.ndc}
                          className="bg-white rounded-lg border border-indigo-200 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {pkg.brandName || pkg.genericName}
                                </span>
                                <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200 flex-shrink-0">
                                  {pkg.dosageForm}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-600 mb-1">
                                NDC: <span className="font-mono">{pkg.ndc}</span>
                              </p>
                              <div className="flex items-start gap-1 text-xs text-indigo-700">
                                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                <span>{getClinicalNote(pkg, currentPackage, 'form')}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSwitchTo(pkg)}
                              className="flex-shrink-0"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Switch
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Different Strengths */}
                {alternatives.differentStrengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Pill className="w-4 h-4 text-indigo-600" />
                      <h5 className="text-sm font-semibold text-indigo-900">
                        Different Strengths
                      </h5>
                    </div>
                    <div className="space-y-2">
                      {alternatives.differentStrengths.map((pkg) => {
                        const strength = pkg.activeIngredients?.[0]?.strength || 'N/A';
                        return (
                          <div
                            key={pkg.ndc}
                            className="bg-white rounded-lg border border-indigo-200 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {pkg.brandName || pkg.genericName}
                                  </span>
                                  <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200 flex-shrink-0">
                                    {strength}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  NDC: <span className="font-mono">{pkg.ndc}</span>
                                </p>
                                <div className="flex items-start gap-1 text-xs text-indigo-700">
                                  <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                  <span>{getClinicalNote(pkg, currentPackage, 'strength')}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSwitchTo(pkg)}
                                className="flex-shrink-0"
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                Switch
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Card>
  );
}

