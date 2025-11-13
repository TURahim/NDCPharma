"use client"

import { useState } from 'react';
import { calculateNDC, APIError } from '@/lib/api-client';
import { CalculateResponse } from '@/types/api';
import { Button } from '@/components/ui/button';
import { DrugAutocomplete } from '@/components/ui/drug-autocomplete';
import { Loader2 } from 'lucide-react';

export function Hero() {
  const [drugInput, setDrugInput] = useState('');
  const [selectedRxcui, setSelectedRxcui] = useState<string | undefined>(undefined);
  const [sig, setSig] = useState('');
  const [daysSupply, setDaysSupply] = useState('30');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseSig = (sigText: string) => {
    // Simple SIG parser - extracts dose, frequency, and unit
    const lower = sigText.toLowerCase();
    
    // Extract dose (numbers like "1", "2", "0.5")
    const doseMatch = lower.match(/(\d+\.?\d*)/);
    const dose = doseMatch ? parseFloat(doseMatch[1]) : 1;
    
    // Extract frequency
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
    
    // Extract unit
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
      // Parse SIG
      const parsedSig = parseSig(sig);
      
      // Prepare API request
      const apiData = {
        drug: { name: drugInput },
        sig: parsedSig,
        daysSupply: parseInt(daysSupply),
      };

      // Call backend API (no auth token needed for MVP)
      const response = await calculateNDC(apiData, null);
      setResult(response);

      // Save successful calculation to history
      if (response.success && response.data) {
        const { CalculationStorage, generateId } = await import('@/lib/calculation-storage');
        
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

        // Dispatch custom event for other components to listen
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

  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight text-balance">
            Precision Prescription Fulfillment
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed text-pretty">
            AI-powered NDC matching and quantity calculation for pharmacies. Reduce claim rejections, improve accuracy,
            and enhance patient satisfaction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => document.getElementById('calculator-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
            >
              Start Calculating
            </button>
            <button className="border-2 border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:border-blue-600 hover:text-blue-600 transition font-semibold text-lg">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12">
            <div>
              <div className="text-3xl font-bold text-blue-600">95%+</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">50%</div>
              <div className="text-gray-600">Less Rejections</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">&lt;2s</div>
              <div className="text-gray-600">Per Query</div>
            </div>
          </div>
        </div>

        {/* Right Visual - Live Calculator */}
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>

              <form id="calculator-form" onSubmit={handleCalculate} className="space-y-3">
                <div className="text-sm font-semibold text-gray-700 mb-3">NDC Calculator</div>
                <div className="space-y-2">
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
                    placeholder="Enter drug name or NDC"
                    disabled={isLoading}
                  />
                  <input
                    type="text"
                    placeholder="SIG (e.g., 1 tablet daily)"
                    value={sig}
                    onChange={(e) => setSig(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50 disabled:opacity-50"
                  />
                  <input
                    type="number"
                    placeholder="Days supply"
                    value={daysSupply}
                    onChange={(e) => setDaysSupply(e.target.value)}
                    required
                    min="1"
                    max="365"
                    disabled={isLoading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50 disabled:opacity-50"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    'Calculate'
                  )}
                </Button>
              </form>

              {/* Results or Error */}
              {error && (
                <div className="bg-red-50 rounded-lg p-4 mt-4 border border-red-200">
                  <div className="text-xs font-semibold text-red-900 mb-1">ERROR</div>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {result && result.success && result.data && (
                <div className="bg-blue-50 rounded-lg p-4 mt-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-900 mb-2">OPTIMAL MATCH</div>
                  <div className="space-y-2">
                    {result.data.recommendedPackages[0] && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">NDC: {result.data.recommendedPackages[0].ndc11}</span>
                          <span className="text-green-600 font-semibold">✓ Valid</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Qty: {result.data.recommendedPackages[0].quantityNeeded} {result.data.recommendedPackages[0].packageType}</span>
                          <span className="text-blue-600 font-semibold">
                            {result.data.recommendedPackages[0].fillPrecision === 'exact' ? 'Perfect match' : 
                             result.data.recommendedPackages[0].fillPrecision === 'underfill' ? 'Underfill' : 'Overfill'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Floating Badge */}
          <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200 max-w-xs">
            <div className="text-xs font-semibold text-blue-600 mb-1">POWERED BY AI</div>
            <p className="text-sm text-gray-700">Integrates RxNorm & FDA NDC Directory APIs</p>
          </div>
        </div>
      </div>
    </section>
  )
}
