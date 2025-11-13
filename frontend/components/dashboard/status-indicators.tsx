"use client"

/**
 * Status & Alert Indicators
 * Shows warnings and status information about calculation results
 */

import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { CalculateResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { ExcludedNDCsModal } from './excluded-ndcs-modal';

interface StatusIndicatorsProps {
  result: CalculateResponse | null;
  className?: string;
}

export function StatusIndicators({ result, className }: StatusIndicatorsProps) {
  const [showExcludedModal, setShowExcludedModal] = useState(false);

  if (!result || !result.success || !result.data) {
    return null;
  }

  const { data } = result;

  // Check for various status conditions
  const hasInactiveNDCs = data.excluded?.some(
    (e) => e.reason.toLowerCase().includes('inactive')
  ) || false;

  const hasOverfill = data.overfillPercentage > 5;
  const hasUnderfill = data.underfillPercentage > 5;
  const isExactMatch = data.recommendedPackages[0]?.fillPrecision === 'exact';
  const hasWarnings = data.warnings && data.warnings.length > 0;

  // If everything is perfect, show success indicator
  if (isExactMatch && !hasInactiveNDCs && !hasWarnings && !hasOverfill && !hasUnderfill) {
    return (
      <div className={cn("bg-green-50 border border-green-200 rounded-lg p-4", className)}>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-green-900">Perfect Match</h4>
            <p className="text-sm text-green-700 mt-0.5">
              Exact quantity match with active NDC
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Inactive NDCs Warning */}
      {hasInactiveNDCs && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-orange-900">Inactive NDCs Detected</h4>
              <p className="text-sm text-orange-700 mt-0.5">
                Some NDCs for this medication are inactive. The recommended package is active.
              </p>
              {data.excluded && data.excluded.length > 0 && (
                <button
                  className="text-xs text-orange-600 hover:text-orange-700 font-medium mt-2 underline"
                  onClick={() => setShowExcludedModal(true)}
                >
                  View {data.excluded.length} excluded NDC{data.excluded.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overfill Notice */}
      {hasOverfill && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900">Overfill Notice</h4>
              <p className="text-sm text-blue-700 mt-0.5">
                Package provides {data.overfillPercentage.toFixed(1)}% more than required.
                Patient will have excess medication.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Underfill Warning */}
      {hasUnderfill && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900">Underfill Warning</h4>
              <p className="text-sm text-yellow-700 mt-0.5">
                Package provides {data.underfillPercentage.toFixed(1)}% less than required.
                Patient may run out before end of days supply.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Warnings */}
      {hasWarnings && data.warnings.map((warning, index) => (
        <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-900">{warning}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Excluded NDCs Modal */}
      {showExcludedModal && data.excluded && (
        <ExcludedNDCsModal
          excluded={data.excluded}
          onClose={() => setShowExcludedModal(false)}
        />
      )}
    </div>
  );
}

