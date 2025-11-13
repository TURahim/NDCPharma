"use client"

/**
 * Recent Calculations Panel
 * Displays calculation history with click-to-reload functionality
 */

import { useEffect, useState } from 'react';
import { Clock, Pill, Calendar } from 'lucide-react';
import { StoredCalculation } from '@/types/calculation';
import { CalculationStorage, formatTimeAgo } from '@/lib/calculation-storage';
import { cn } from '@/lib/utils';

interface RecentCalculationsProps {
  onSelect: (calculation: StoredCalculation) => void;
  className?: string;
}

export function RecentCalculations({
  onSelect,
  className,
}: RecentCalculationsProps) {
  const [calculations, setCalculations] = useState<StoredCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load calculations on mount
  useEffect(() => {
    const loadCalculations = async () => {
      setIsLoading(true);
      try {
        const recent = await CalculationStorage.getRecent(10);
        setCalculations(recent);
      } catch (error) {
        console.error('Error loading recent calculations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalculations();

    // Listen for storage events (when calculation is saved in another tab/component)
    const handleStorageChange = () => {
      loadCalculations();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-tab updates
    window.addEventListener('calculation-saved', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('calculation-saved', handleStorageChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Calculations</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (calculations.length === 0) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Calculations</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No recent calculations</p>
          <p className="text-xs text-gray-400 mt-1">
            Calculations will appear here after you submit them
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Calculations</h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {calculations.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {calculations.map((calc) => (
          <button
            key={calc.id}
            onClick={() => onSelect(calc)}
            className={cn(
              "w-full text-left p-3 rounded-lg border border-gray-200",
              "hover:border-blue-600 hover:bg-blue-50 hover:shadow-sm",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            )}
          >
            {/* Header row */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-gray-900 text-sm line-clamp-1">
                  {calc.drug.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                {formatTimeAgo(calc.timestamp)}
              </span>
            </div>

            {/* Details row */}
            <div className="ml-6 space-y-1">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{calc.sig}</span>
                <span className="text-gray-400 mx-1">•</span>
                <span>{calc.daysSupply} days</span>
              </div>

              {/* Result summary */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold text-blue-600">
                    {calc.result.quantity} {calc.result.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Fill precision badge */}
                  {calc.result.fillPrecision === 'exact' ? (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                      Exact
                    </span>
                  ) : calc.result.fillPrecision === 'overfill' ? (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                      Overfill
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                      Underfill
                    </span>
                  )}
                </div>
              </div>

              {/* NDC */}
              <div className="text-xs text-gray-500 font-mono">
                NDC: {calc.result.ndc}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Click any calculation to reload it into the form
        </p>
      </div>
    </div>
  );
}

