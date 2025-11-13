"use client"

/**
 * Enhanced Calculator Component
 * Fully featured calculator with all dashboard components
 */

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { calculateNDC, APIError } from '@/lib/api-client';
import { CalculateResponse } from '@/types/api';
import { DrugAutocomplete } from '@/components/ui/drug-autocomplete';
import { Button } from '@/components/ui/button';
import { StatusIndicators } from '@/components/dashboard/status-indicators';
import { AIInsights } from '@/components/dashboard/ai-insights';
import { MultiPackHelper } from '@/components/dashboard/multipack-helper';
import { HelpPopover } from '@/components/ui/help-popover';
import { GuidedMode } from '@/components/calculator/guided-mode';
import { CalculationStorage } from '@/lib/calculation-storage';
import { generateId } from '@/lib/calculation-storage';
import { StoredCalculation } from '@/types/calculation';

interface EnhancedCalculatorProps {
  initialData?: Partial<StoredCalculation>;
}

export function EnhancedCalculator({ initialData }: EnhancedCalculatorProps = {}) {
  const [drugInput, setDrugInput] = useState(initialData?.drug?.name || '');
  const [selectedRxcui, setSelectedRxcui] = useState<string | undefined>(initialData?.drug?.rxcui);
  const [sig, setSig] = useState(initialData?.sig || '');
  const [daysSupply, setDaysSupply] = useState(initialData?.daysSupply?.toString() || '30');
  const [multiPackEnabled, setMultiPackEnabled] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showGuidedMode, setShowGuidedMode] = useState(false);

  const parseSig = (sigText: string) => {
    const lower = sigText.toLowerCase();
    
    const doseMatch = lower.match(/(\d+\.?\d*)/);
    const dose = doseMatch ? parseFloat(doseMatch[1]) : 1;
    
    let frequency = 1;
    if (lower.includes('twice') || lower.includes('two times') || lower.includes('2 times')) {
      frequency = 2;
    } else if (lower.includes('three times') || lower.includes('3 times')) {
      frequency = 3;
    } else if (lower.includes('four times') || lower.includes('4 times')) {
      frequency = 4;
    } else if (lower.includes('every 12 hours')) {
      frequency = 2;
    } else if (lower.includes('every 8 hours')) {
      frequency = 3;
    } else if (lower.includes('every 6 hours')) {
      frequency = 4;
    }
    
    let unit = 'tablet';
    if (lower.includes('capsule')) unit = 'capsule';
    else if (lower.includes('ml')) unit = 'mL';
    else if (lower.includes('tablet')) unit = 'tablet';
    else if (lower.includes('spray')) unit = 'spray';
    else if (lower.includes('patch')) unit = 'patch';
    else if (lower.includes('drop')) unit = 'drop';
    else if (lower.includes('puff')) unit = 'puff';
    
    return { dose, frequency, unit };
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const parsedSig = parseSig(sig);
      
      const apiData = {
        drug: { name: drugInput, rxcui: selectedRxcui },
        sig: parsedSig,
        daysSupply: parseInt(daysSupply),
        // TODO: Pass multiPackEnabled to backend when implemented
      };

      const response = await calculateNDC(apiData, null);
      setResult(response);

      if (response.success && response.data) {
        await CalculationStorage.save({
          id: generateId(),
          timestamp: Date.now(),
          drug: {
            name: drugInput,
            rxcui: selectedRxcui || response.data.drug.rxcui,
          },
          sig: sig,
          daysSupply: parseInt(daysSupply),
          result: {
            ndc: response.data.recommendedPackages[0]?.ndc || '',
            quantity: response.data.recommendedPackages[0]?.quantityNeeded || 0,
            unit: response.data.recommendedPackages[0]?.unit || '',
            fillPrecision: response.data.recommendedPackages[0]?.fillPrecision || 'exact',
            packageSize: response.data.recommendedPackages[0]?.packageSize,
          },
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('calculation-saved'));
        }
      }
    } catch (err) {
      if (err instanceof APIError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuidedModeComplete = (data: {
    drugName: string;
    rxcui?: string;
    sig: string;
    daysSupply: string;
  }) => {
    setDrugInput(data.drugName);
    setSelectedRxcui(data.rxcui);
    setSig(data.sig);
    setDaysSupply(data.daysSupply);
    
    // Trigger calculation
    setTimeout(() => {
      const form = document.getElementById('calculator-form') as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
    }, 100);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Main Calculator Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Calculate NDC Package</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Enter prescription details to find optimal packaging
              </p>
            </div>
            <div className="flex items-center gap-2">
              <HelpPopover />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGuidedMode(true)}
                className="flex items-center gap-2"
              >
                <Wand2 className="w-4 h-4" />
                Guided Mode
              </Button>
            </div>
          </div>

          <form id="calculator-form" onSubmit={handleCalculate} className="p-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Drug Input */}
              <div className="md:col-span-2">
                <label htmlFor="drug" className="block text-sm font-medium text-gray-700 mb-2">
                  Medication <span className="text-red-500">*</span>
                </label>
                <DrugAutocomplete
                  value={drugInput}
                  onChange={(value, rxcui) => {
                    setDrugInput(value);
                    if (rxcui) {
                      setSelectedRxcui(rxcui);
                    }
                  }}
                  onSelect={(result) => {
                    setDrugInput(result.name);
                    setSelectedRxcui(result.rxcui);
                  }}
                  placeholder="Start typing drug name (e.g., Lisinopril, Metformin)"
                  disabled={isLoading}
                />
              </div>

              {/* SIG Input */}
              <div className="md:col-span-2">
                <label htmlFor="sig" className="block text-sm font-medium text-gray-700 mb-2">
                  Directions (SIG) <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="sig"
                  value={sig}
                  onChange={(e) => setSig(e.target.value)}
                  placeholder="e.g., Take 1 tablet by mouth twice daily"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50 disabled:opacity-50 resize-none"
                  rows={2}
                />
              </div>

              {/* Days Supply */}
              <div>
                <label htmlFor="daysSupply" className="block text-sm font-medium text-gray-700 mb-2">
                  Days Supply <span className="text-red-500">*</span>
                </label>
                <input
                  id="daysSupply"
                  type="number"
                  value={daysSupply}
                  onChange={(e) => setDaysSupply(e.target.value)}
                  required
                  min="1"
                  max="365"
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50 disabled:opacity-50"
                />
              </div>

              {/* Calculate Button */}
              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isLoading || !drugInput || !sig}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 h-[50px]"
                >
                  {isLoading ? 'Calculating...' : 'Calculate'}
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Multi-Pack Helper */}
        <MultiPackHelper enabled={multiPackEnabled} onToggle={setMultiPackEnabled} />

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-900">Error</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.success && result.data && (
          <div className="space-y-4">
            {/* Main Results Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Package</h3>
              
              {result.data.recommendedPackages.map((pkg, index) => (
                <div key={index} className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4 mb-3">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        NDC
                      </p>
                      <p className="text-base font-mono font-semibold text-gray-900">
                        {pkg.ndc11 || pkg.ndc}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Quantity
                      </p>
                      <p className="text-base font-semibold text-gray-900">
                        {pkg.quantityNeeded} {pkg.packageType}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        Fill Precision
                      </p>
                      <p className="text-base font-semibold text-gray-900 capitalize">
                        {pkg.fillPrecision}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-600">
                <p>
                  <span className="font-semibold">Total Quantity:</span> {result.data.totalQuantity} units
                </p>
              </div>
            </div>

            {/* Status Indicators */}
            <StatusIndicators result={result} />

            {/* AI Insights */}
            <AIInsights result={result} daysSupply={parseInt(daysSupply)} />
          </div>
        )}
      </div>

      {/* Guided Mode Modal */}
      {showGuidedMode && (
        <GuidedMode
          onComplete={handleGuidedModeComplete}
          onClose={() => setShowGuidedMode(false)}
        />
      )}
    </>
  );
}

