"use client"

/**
 * Dashboard Page
 * Main calculator interface with sidebar panels
 */

import { useState, useEffect } from 'react';
import { EnhancedCalculator } from '@/components/calculator/enhanced-calculator';
import { RecentCalculations } from '@/components/dashboard/recent-calculations';
import { FrequentMedications } from '@/components/dashboard/frequent-medications';
import { StoredCalculation } from '@/types/calculation';

export default function DashboardPage() {
  const [selectedCalculation, setSelectedCalculation] = useState<StoredCalculation | null>(null);
  const [calculatorKey, setCalculatorKey] = useState(0);

  const handleSelectCalculation = (calc: StoredCalculation) => {
    setSelectedCalculation(calc);
    // Force re-render of calculator with new initial data
    setCalculatorKey((prev) => prev + 1);
  };

  const handleSelectFrequentMed = (drugName: string, rxcui?: string) => {
    // Create a partial calculation object for the frequent medication
    setSelectedCalculation({
      id: '',
      timestamp: Date.now(),
      drug: { name: drugName, rxcui },
      sig: '',
      daysSupply: 30,
      result: {
        ndc: '',
        quantity: 0,
        unit: '',
        fillPrecision: 'exact',
      },
    });
    setCalculatorKey((prev) => prev + 1);
  };

  // Clear selected calculation when it's been loaded
  useEffect(() => {
    if (selectedCalculation) {
      const timer = setTimeout(() => {
        setSelectedCalculation(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedCalculation]);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-b from-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            NDC Calculator Dashboard
          </h1>
          <p className="text-gray-600 text-lg">
            Precision prescription fulfillment with AI-powered recommendations
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Calculator - 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-6">
            <EnhancedCalculator
              key={calculatorKey}
              initialData={selectedCalculation || undefined}
            />
          </div>

          {/* Sidebar - 1 column on large screens */}
          <div className="space-y-6">
            {/* Frequent Medications */}
            <FrequentMedications onSelect={handleSelectFrequentMed} maxItems={6} />
            
            {/* Recent Calculations */}
            <RecentCalculations onSelect={handleSelectCalculation} />
          </div>
        </div>
      </div>
    </div>
  );
}

