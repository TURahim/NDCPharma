"use client"

/**
 * Frequent Medications Panel
 * Quick shortcuts for commonly calculated medications
 */

import { useEffect, useState } from 'react';
import { Star, TrendingUp } from 'lucide-react';
import { CalculationStorage } from '@/lib/calculation-storage';
import { cn } from '@/lib/utils';

interface FrequentMedsProps {
  onSelect: (drugName: string, rxcui?: string) => void;
  maxItems?: number;
  className?: string;
}

interface FrequentDrug {
  name: string;
  count: number;
  lastUsed: number;
  rxcui?: string;
}

export function FrequentMedications({
  onSelect,
  maxItems = 6,
  className,
}: FrequentMedsProps) {
  const [frequentDrugs, setFrequentDrugs] = useState<FrequentDrug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFrequentDrugs = async () => {
      setIsLoading(true);
      try {
        const stats = await CalculationStorage.getStats();
        
        // Get top N drugs by frequency
        const topDrugs = stats.mostFrequentDrugs
          .slice(0, maxItems)
          .map((drug) => ({
            name: drug.name,
            count: drug.count,
            lastUsed: drug.lastUsed,
          }));

        setFrequentDrugs(topDrugs);
      } catch (error) {
        console.error('Error loading frequent medications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFrequentDrugs();

    // Listen for calculation updates
    const handleUpdate = () => {
      loadFrequentDrugs();
    };

    window.addEventListener('calculation-saved', handleUpdate);

    return () => {
      window.removeEventListener('calculation-saved', handleUpdate);
    };
  }, [maxItems]);

  if (isLoading) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Frequent Medications</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (frequentDrugs.length === 0) {
    return (
      <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Frequent Medications</h3>
        </div>
        <div className="text-center py-8">
          <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No frequent medications yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Your most-used drugs will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Frequent Medications</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {frequentDrugs.map((drug, index) => (
          <button
            key={drug.name}
            onClick={() => onSelect(drug.name, drug.rxcui)}
            className={cn(
              "relative p-3 rounded-lg border border-gray-200 text-left",
              "hover:border-blue-600 hover:bg-blue-50 hover:shadow-sm",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
              "group"
            )}
          >
            {/* Rank badge for top 3 */}
            {index < 3 && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{index + 1}</span>
              </div>
            )}

            <div className="pr-6">
              <div className="font-medium text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {drug.name}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-gray-500">
                  {drug.count}× used
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Future enhancement hint */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          Click to quickly start a new calculation
        </p>
        {/* TODO: Add pin/unpin functionality */}
      </div>
    </div>
  );
}

