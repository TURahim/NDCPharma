"use client"

/**
 * Drug Comparison View
 * Shows side-by-side comparison of original drug and alternative
 */

import { ArrowRight, X } from 'lucide-react';

interface DrugComparisonViewProps {
  originalDrug: string;
  alternativeDrug: string;
  comparisonText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DrugComparisonView({
  originalDrug,
  alternativeDrug,
  comparisonText,
  onConfirm,
  onCancel,
}: DrugComparisonViewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Drug Comparison</h2>
            <p className="text-blue-100 mt-1">
              Review the comparison before proceeding
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Drug Comparison Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* Original Drug */}
            <div className="border-2 border-red-200 bg-red-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs font-semibold text-red-700 uppercase">Original</span>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-1">{originalDrug}</h3>
              <p className="text-sm text-red-700">Not available in FDA NDC Directory</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center">
              <ArrowRight className="w-8 h-8 text-gray-400" />
            </div>

            {/* Alternative Drug */}
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 md:col-start-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs font-semibold text-green-700 uppercase">Alternative</span>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-1">{alternativeDrug}</h3>
              <p className="text-sm text-green-700">FDA Approved & Available</p>
            </div>
          </div>

          {/* AI Comparison Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-semibold">
                AI ANALYSIS
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <div className="text-gray-800 whitespace-pre-line leading-relaxed">
                {comparisonText}
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Important:</strong> This comparison is AI-generated and should be reviewed by the prescriber. 
              Verify therapeutic equivalence, patient-specific contraindications, and appropriate dosing before dispensing.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
          >
            Use {alternativeDrug.split(' ')[0]}
          </button>
        </div>
      </div>
    </div>
  );
}

