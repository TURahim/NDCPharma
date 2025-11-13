"use client"

/**
 * AI Insights Card
 * Provides intelligent tips and recommendations based on calculation
 * Phase 1: Rule-based insights
 * TODO: Phase 2: Integrate OpenAI API for richer insights
 */

import { Sparkles, Lightbulb } from 'lucide-react';
import { CalculateResponse } from '@/types/api';
import { cn } from '@/lib/utils';

interface AIInsightsProps {
  result: CalculateResponse | null;
  daysSupply: number;
  className?: string;
}

export function AIInsights({ result, daysSupply, className }: AIInsightsProps) {
  if (!result || !result.success || !result.data) {
    return null;
  }

  const insight = generateRuleBasedInsight(result.data, daysSupply);

  if (!insight) {
    return null;
  }

  return (
    <div className={cn(
      "bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">AI Insight</h4>
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
              Beta
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
        </div>
      </div>

      {/* TODO: Future enhancement */}
      {/* <button className="mt-3 text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
        <Lightbulb className="w-3 h-3" />
        Get more insights
      </button> */}
    </div>
  );
}

/**
 * Generate rule-based insights based on calculation data
 * These are simple heuristics that provide helpful tips
 */
function generateRuleBasedInsight(
  data: NonNullable<CalculateResponse['data']>,
  daysSupply: number
): string | null {
  const totalQuantity = data.totalQuantity;
  const dailyDose = totalQuantity / daysSupply;
  const fillPrecision = data.recommendedPackages[0]?.fillPrecision;
  const dosageForm = data.drug.dosageForm?.toLowerCase() || '';

  // High quantity detection
  if (totalQuantity > 100) {
    return `High quantity prescription (${totalQuantity} units). Consider verifying patient compliance and discussing storage requirements. Multi-pack options may offer better pricing.`;
  }

  // Frequent dosing schedule
  if (dailyDose > 4) {
    return `This medication requires frequent dosing (${dailyDose.toFixed(1)} times per day). Ensure patient understands the schedule and consider compliance aids if needed.`;
  }

  // Long-term prescription
  if (daysSupply > 90) {
    return `Long-term prescription (${daysSupply} days). Verify insurance coverage for extended supply and ensure proper storage instructions are provided.`;
  }

  // Liquid formulation
  if (dosageForm.includes('solution') || dosageForm.includes('suspension') || dosageForm.includes('syrup')) {
    return `Liquid formulation detected. Remember to provide oral syringe or measuring device and shake-well instructions if applicable.`;
  }

  // Injection/Injectable
  if (dosageForm.includes('injection') || dosageForm.includes('injectable')) {
    return `Injectable medication. Ensure proper storage (refrigeration if needed), disposal instructions for sharps, and patient administration counseling.`;
  }

  // Inhaler
  if (dosageForm.includes('inhaler') || dosageForm.includes('aerosol')) {
    return `Inhaler medication. Demonstrate proper inhaler technique and discuss spacer use if appropriate. Remind patient to rinse mouth after use if steroid.`;
  }

  // Overfill situation
  if (fillPrecision === 'overfill' && data.overfillPercentage > 10) {
    return `Significant overfill (${data.overfillPercentage.toFixed(1)}%). Patient will have leftover medication. Discuss proper disposal and avoiding medication hoarding.`;
  }

  // Underfill situation
  if (fillPrecision === 'underfill' && data.underfillPercentage > 5) {
    return `Package slightly underfills the prescribed amount. Patient may need to schedule early refill to avoid running out. Consider setting refill reminder.`;
  }

  // Short-term antibiotic-like pattern
  if (daysSupply <= 14 && dailyDose >= 2 && dailyDose <= 4) {
    return `Short-term therapy detected (${daysSupply} days). Emphasize importance of completing full course even if symptoms improve. Set up completion reminder.`;
  }

  // Generic positive reinforcement
  if (fillPrecision === 'exact') {
    return `Perfect package match! The dispensed quantity exactly meets the prescription requirements with no waste or shortage.`;
  }

  // Default insight
  return `Standard dosing: ${dailyDose.toFixed(1)} ${data.drug.dosageForm || 'units'} per day for ${daysSupply} days. Total quantity: ${totalQuantity}.`;
}

/**
 * TODO: Future OpenAI Integration
 * 
 * async function generateAIInsight(
 *   drugName: string,
 *   sig: string,
 *   daysSupply: number,
 *   result: CalculateResponse['data']
 * ): Promise<string> {
 *   // Call OpenAI API with prompt:
 *   // "You are a clinical pharmacist. Provide a brief, actionable insight..."
 *   // Return AI-generated recommendation
 * }
 */

