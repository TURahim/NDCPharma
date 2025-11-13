"use client"

/**
 * Excluded NDCs Modal
 * Displays a list of NDCs that were excluded from recommendations
 */

import { X } from 'lucide-react';
import { ExcludedNDC } from '@/types/api';
import { Button } from '@/components/ui/button';

interface ExcludedNDCsModalProps {
  excluded: ExcludedNDC[];
  onClose: () => void;
}

export function ExcludedNDCsModal({ excluded, onClose }: ExcludedNDCsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Excluded NDCs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {excluded.length} NDC{excluded.length !== 1 ? 's' : ''} excluded from recommendations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {excluded.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-mono font-semibold text-gray-900 mb-1">
                      {item.ndc}
                    </p>
                    <p className="text-sm text-gray-600">
                      {item.reason}
                    </p>
                  </div>
                  {item.marketingStatus && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {item.marketingStatus}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

