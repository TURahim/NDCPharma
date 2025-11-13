"use client"

/**
 * Help & Documentation Popover
 * Quick reference for how the calculator works
 */

import { HelpCircle, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function HelpPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
          <HelpCircle className="w-4 h-4" />
          <span className="font-medium">How it works</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4">
          <h4 className="font-semibold text-gray-900 mb-3 text-base">
            NDC Calculator Guide
          </h4>

          <div className="space-y-4">
            {/* How it works */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                How it works
              </h5>
              <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                <li>Enter the drug name or NDC code</li>
                <li>Specify dosing instructions (SIG)</li>
                <li>Set the days' supply duration</li>
                <li>Click Calculate to get optimal NDC package matches</li>
              </ol>
            </div>

            {/* Tips */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                Tips for best results
              </h5>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Use autocomplete suggestions for accurate drug names</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Recent calculations are automatically saved</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Click frequent meds for quick shortcuts</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Check status indicators for warnings</span>
                </li>
              </ul>
            </div>

            {/* External resources */}
            <div className="pt-3 border-t border-gray-200">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                Learn more
              </h5>
              <div className="space-y-1.5">
                <a
                  href="https://rxnav.nlm.nih.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>RxNorm API Documentation</span>
                </a>
                <a
                  href="https://open.fda.gov/apis/drug/ndc/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>FDA NDC Directory</span>
                </a>
                <a
                  href="https://www.fda.gov/drugs/drug-approvals-and-databases/national-drug-code-directory"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>About NDC Codes</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Need help?</span> Contact your system administrator for technical support.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

