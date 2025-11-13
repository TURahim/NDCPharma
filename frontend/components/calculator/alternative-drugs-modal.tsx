"use client"

/**
 * Alternative Drugs Modal
 * Displays FDA-approved alternatives when original drug is not available
 */

import { X } from 'lucide-react';
import { AlternativeDrug } from '@/types/api';

interface AlternativeDrugsModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalDrug: string;
  summary?: string;
  alternatives: AlternativeDrug[];
  onSelectAlternative: (rxcui: string, name: string) => void;
}

export function AlternativeDrugsModal({
  isOpen,
  onClose,
  originalDrug,
  summary,
  alternatives,
  onSelectAlternative,
}: AlternativeDrugsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">Alternative Medications Available</h2>
            <p className="text-blue-100 mt-1">
              FDA-approved alternatives for {originalDrug}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 p-2 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {summary && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-900 text-sm">{summary}</p>
            </div>
          )}

          {alternatives.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No FDA-approved alternatives found for this medication.</p>
              <p className="text-sm mt-2">Please consult with the prescriber for alternative options.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alternatives.map((alt) => (
                <div
                  key={alt.rxcui}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-gray-900">{alt.name}</h3>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      FDA Approved
                    </span>
                  </div>
                  
                  <div className="text-gray-700 text-sm mb-4 whitespace-pre-line">
                    {alt.comparisonText}
                  </div>
                  
                  <button
                    onClick={() => onSelectAlternative(alt.rxcui, alt.name)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
                  >
                    Compare & Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

