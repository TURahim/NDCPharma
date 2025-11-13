"use client"

/**
 * Enhanced Calculator Component
 * Fully featured calculator with all dashboard components
 */

import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { calculateNDC, APIError, getAlternativeDrugs } from '@/lib/api-client';
import { CalculateResponse, AlternativeDrug } from '@/types/api';
import { DrugAutocomplete } from '@/components/ui/drug-autocomplete';
import { Button } from '@/components/ui/button';
import { StatusIndicators } from '@/components/dashboard/status-indicators';
import { AIInsightsPanel } from '@/components/calculator/ai-insights-panel';
import { MultiPackHelper } from '@/components/dashboard/multipack-helper';
import { HelpPopover } from '@/components/ui/help-popover';
import { GuidedMode } from '@/components/calculator/guided-mode';
import { AlternativeDrugsModal } from '@/components/calculator/alternative-drugs-modal';
import { DrugComparisonView } from '@/components/calculator/drug-comparison-view';
import { CalculationStorage } from '@/lib/calculation-storage';
import { generateId } from '@/lib/calculation-storage';
import { StoredCalculation } from '@/types/calculation';
import { useAuth } from '@/lib/auth-context';

interface EnhancedCalculatorProps {
  initialData?: Partial<StoredCalculation>;
}

export function EnhancedCalculator({ initialData }: EnhancedCalculatorProps = {}) {
  const { getIdToken, user } = useAuth();
  const [drugInput, setDrugInput] = useState(initialData?.drug?.name || '');
  const [selectedRxcui, setSelectedRxcui] = useState<string | undefined>(initialData?.drug?.rxcui);
  const [sig, setSig] = useState(initialData?.sig || '');
  const [daysSupply, setDaysSupply] = useState(initialData?.daysSupply?.toString() || '30');
  const [multiPackEnabled, setMultiPackEnabled] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [showGuidedMode, setShowGuidedMode] = useState(false);
  
  // Alternatives state
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeDrug[]>([]);
  const [alternativesSummary, setAlternativesSummary] = useState<string>();
  const [comparisonView, setComparisonView] = useState<{
    original: string;
    alternative: AlternativeDrug;
  } | null>(null);

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
        // Check if this is a "drug not found" error and user is authenticated
        if (err.code === 'CALCULATION_ERROR' && 
            (err.message.includes('No matches found') || err.message.includes('No results found')) &&
            user && selectedRxcui) {
          
          // Try to fetch alternatives
          try {
            const idToken = await getIdToken();
            const altResponse = await getAlternativeDrugs(
              { name: drugInput, rxcui: selectedRxcui },
              idToken
            );
            
            if (altResponse.success && altResponse.data && altResponse.data.alternatives.length > 0) {
              // Show alternatives modal
              setAlternatives(altResponse.data.alternatives);
              setAlternativesSummary(altResponse.data.summary);
              setShowAlternativesModal(true);
              setError(null); // Clear error since we're showing alternatives
              return; // Don't set error message
            }
          } catch (altError) {
            // If alternatives fail, continue with normal error handling
            console.error('Failed to fetch alternatives:', altError);
          }
        }
        
        // Format user-friendly error messages
        let errorMessage = err.message;
        
        // Add more context for specific error codes
        if (err.code === 'CALCULATION_ERROR') {
          if (err.message.includes('No matches found') || err.message.includes('No results found')) {
            errorMessage = `Could not find drug information in FDA database. This drug may be discontinued, not FDA-approved, or not available in the US market.`;
            if (!user) {
              errorMessage += ' Sign in to see alternative medications.';
            } else {
              errorMessage += ' No alternatives found.';
            }
          } else if (err.message.includes('No NDC packages found')) {
            errorMessage = `${err.message} This may occur if the drug is not available in the FDA NDC Directory or if it's a compound medication.`;
          }
        }
        
        setError(errorMessage);
      } else if (err instanceof Error) {
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

            {/* AI Insights - Only show if AI data is available */}
            {result.data.aiInsights && result.data.metadata && (
              <AIInsightsPanel
                insights={result.data.aiInsights}
                metadata={result.data.metadata}
              />
            )}
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

      {/* Alternatives Modal */}
      {showAlternativesModal && (
        <AlternativeDrugsModal
          isOpen={showAlternativesModal}
          onClose={() => setShowAlternativesModal(false)}
          originalDrug={drugInput}
          summary={alternativesSummary}
          alternatives={alternatives}
          onSelectAlternative={(rxcui, name) => {
            // Find the full alternative data
            const alt = alternatives.find(a => a.rxcui === rxcui);
            if (alt) {
              setComparisonView({
                original: drugInput,
                alternative: alt,
              });
            }
          }}
        />
      )}

      {/* Drug Comparison View */}
      {comparisonView && (
        <DrugComparisonView
          originalDrug={comparisonView.original}
          alternativeDrug={comparisonView.alternative.name}
          comparisonText={comparisonView.alternative.comparisonText}
          onConfirm={() => {
            // Pre-fill form with alternative drug
            setDrugInput(comparisonView.alternative.name);
            setSelectedRxcui(comparisonView.alternative.rxcui);
            
            // Close all modals
            setComparisonView(null);
            setShowAlternativesModal(false);
            
            // Clear error
            setError(null);
          }}
          onCancel={() => {
            setComparisonView(null);
          }}
        />
      )}
    </>
  );
}

