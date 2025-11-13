"use client"

/**
 * AI Insights Panel Component
 * Displays AI-generated recommendations and reasoning
 */

import { AIInsights, Metadata } from '@/types/api';
import { Sparkles, CheckCircle2, AlertTriangle, Info, Zap, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  insights: AIInsights;
  metadata: Metadata;
  className?: string;
}

export function AIInsightsPanel({
  insights,
  metadata,
  className,
}: AIInsightsPanelProps) {
  const getCostEfficiencyColor = (rating: 'low' | 'medium' | 'high') => {
    switch (rating) {
      case 'high':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-red-700 bg-red-100 border-red-200';
    }
  };

  const getCostEfficiencyLabel = (rating: 'low' | 'medium' | 'high') => {
    switch (rating) {
      case 'high':
        return 'Excellent';
      case 'medium':
        return 'Good';
      case 'low':
        return 'Fair';
    }
  };

  return (
    <div className={cn("bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 shadow-lg", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-600 rounded-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">AI-Enhanced Recommendation</h3>
          <p className="text-sm text-gray-600">
            {metadata.usedAI ? 'Powered by GPT-4' : 'Algorithm-based recommendation'}
          </p>
        </div>
        {metadata.usedAI && (
          <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
            <Zap className="w-3 h-3" />
            AI Active
          </div>
        )}
      </div>

      {/* Rationale */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-blue-100">
        <p className="text-sm text-gray-700 leading-relaxed">
          {insights.rationale}
        </p>
      </div>

      {/* Key Factors */}
      {insights.factors.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-gray-900">Why this package?</h4>
          </div>
          <ul className="space-y-1.5">
            {insights.factors.map((factor, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Considerations */}
      {insights.considerations.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-gray-900">Important Considerations</h4>
          </div>
          <ul className="space-y-1.5">
            {insights.considerations.map((consideration, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{consideration}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cost Efficiency */}
      {insights.costEfficiency && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm font-semibold text-gray-900">Cost Efficiency</div>
                <div className="text-xs text-gray-600">
                  {insights.costEfficiency.estimatedWaste.toFixed(1)}% waste
                </div>
              </div>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border",
              getCostEfficiencyColor(insights.costEfficiency.rating)
            )}>
              {getCostEfficiencyLabel(insights.costEfficiency.rating)}
            </div>
          </div>
        </div>
      )}

      {/* Footer - Metadata */}
      <div className="pt-4 border-t border-blue-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            <span>
              {metadata.usedAI ? 'AI-enhanced' : 'Algorithm-based'}
            </span>
          </div>
          <div>
            Response time: {metadata.executionTime}ms
          </div>
        </div>
        {metadata.aiCost && (
          <div className="text-gray-400">
            AI cost: ${metadata.aiCost.toFixed(4)}
          </div>
        )}
      </div>

      {/* Fallback Warning */}
      {metadata.algorithmicFallback && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700">
              AI enhancement was unavailable. This recommendation is algorithm-based.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

