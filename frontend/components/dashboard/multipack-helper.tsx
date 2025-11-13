"use client"

/**
 * Multi-Pack Helper Card
 * Toggle for enabling multi-pack calculations
 * TODO: Wire to backend multi-pack calculation logic
 */

import { Package, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiPackHelperProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

export function MultiPackHelper({
  enabled,
  onToggle,
  className,
}: MultiPackHelperProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200 p-4", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">Multi-Pack</h4>
        </div>
        
        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className={cn(
            "w-11 h-6 rounded-full peer",
            "bg-gray-200 peer-checked:bg-blue-600",
            "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300",
            "after:content-[''] after:absolute after:top-[2px] after:left-[2px]",
            "after:bg-white after:border-gray-300 after:border after:rounded-full",
            "after:h-5 after:w-5 after:transition-all",
            "peer-checked:after:translate-x-full peer-checked:after:border-white"
          )}></div>
        </label>
      </div>

      <p className="text-sm text-gray-600 mb-2 leading-relaxed">
        Enable multi-pack calculations for high-volume prescriptions to optimize packaging and pricing.
      </p>

      {enabled && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Multi-pack mode will consider bulk package sizes and recommend combinations for optimal fill accuracy.
            </p>
          </div>
        </div>
      )}

      {/* Implementation status notice */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="font-medium">Status:</span> Backend integration in progress. Full feature launching Q1 2026.
        </p>
      </div>

      {/* TODO: Wire to backend - Implementation plan complete (see MULTIPACK-FEATURE-PLAN.md) */}
      {/* Phase 1: Backend algorithm (3 days) - packages/domain-ndc/src/multiPackCalculator.ts */}
      {/* Phase 2: Frontend integration (2 days) - Wire multiPackEnabled flag to API */}
      {/* Target: Q1 2026 */}
    </div>
  );
}

