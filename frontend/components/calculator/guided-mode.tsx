"use client"

/**
 * Guided Mode Wizard
 * Step-by-step guided calculation flow for new users
 */

import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrugAutocomplete } from '@/components/ui/drug-autocomplete';
import { cn } from '@/lib/utils';

interface GuidedModeProps {
  onComplete: (data: {
    drugName: string;
    rxcui?: string;
    sig: string;
    daysSupply: string;
  }) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function GuidedMode({ onComplete, onClose }: GuidedModeProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Form state
  const [drugName, setDrugName] = useState('');
  const [rxcui, setRxcui] = useState<string | undefined>(undefined);
  const [sig, setSig] = useState('');
  const [daysSupply, setDaysSupply] = useState('30');

  const totalSteps = 4;

  const canProceedFromStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        return drugName.trim().length >= 2;
      case 2:
        return sig.trim().length >= 3;
      case 3:
        return parseInt(daysSupply) > 0 && parseInt(daysSupply) <= 365;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps && canProceedFromStep(currentStep)) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleFinish = () => {
    onComplete({
      drugName,
      rxcui,
      sig,
      daysSupply,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Guided Calculator</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 h-2">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="min-h-[320px]">
            {/* Step 1: Pick Medication */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">1</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Select Medication
                    </h3>
                    <p className="text-sm text-gray-600">
                      Start typing the drug name or NDC code
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drug Name or NDC
                  </label>
                  <DrugAutocomplete
                    value={drugName}
                    onChange={(value, rxcuiValue) => {
                      setDrugName(value);
                      if (rxcuiValue) setRxcui(rxcuiValue);
                    }}
                    onSelect={(result) => {
                      setDrugName(result.name);
                      setRxcui(result.rxcui);
                    }}
                    placeholder="e.g., Lisinopril, Metformin, Amoxicillin"
                  />
                  {drugName.length > 0 && drugName.length < 2 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Please enter at least 2 characters
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Tip:</span> Use the autocomplete suggestions to ensure you select the correct medication formulation.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Enter SIG */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">2</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Enter Dosing Instructions
                    </h3>
                    <p className="text-sm text-gray-600">
                      How should the patient take this medication?
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SIG (Directions)
                  </label>
                  <textarea
                    value={sig}
                    onChange={(e) => setSig(e.target.value)}
                    placeholder="e.g., Take 1 tablet by mouth twice daily"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 resize-none"
                    rows={3}
                  />
                  {sig.length > 0 && sig.length < 3 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Please provide more detailed instructions
                    </p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900 mb-2">
                    <span className="font-semibold">Common examples:</span>
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Take 1 tablet by mouth daily</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Take 2 capsules by mouth twice daily</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-blue-600">•</span>
                      <span>Take 1 tablet by mouth every 8 hours</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Enter Days Supply */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">3</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Specify Days Supply
                    </h3>
                    <p className="text-sm text-gray-600">
                      How many days should this prescription last?
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days Supply
                  </label>
                  <input
                    type="number"
                    value={daysSupply}
                    onChange={(e) => setDaysSupply(e.target.value)}
                    min="1"
                    max="365"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 text-lg font-semibold"
                  />
                  {(parseInt(daysSupply) <= 0 || parseInt(daysSupply) > 365) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Days supply must be between 1 and 365
                    </p>
                  )}
                </div>

                {/* Quick select buttons */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Common durations:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[7, 14, 30, 90].map((days) => (
                      <button
                        key={days}
                        onClick={() => setDaysSupply(days.toString())}
                        className={cn(
                          "px-4 py-2 rounded-lg border-2 font-semibold transition-all",
                          daysSupply === days.toString()
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                        )}
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Note:</span> Most insurance plans cover 30-day or 90-day supplies. Check patient's benefit for optimal days supply.
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Review & Calculate
                    </h3>
                    <p className="text-sm text-gray-600">
                      Verify the information below
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Medication
                    </p>
                    <p className="text-base font-semibold text-gray-900">{drugName}</p>
                  </div>

                  <div className="border-t border-gray-300 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Directions
                    </p>
                    <p className="text-base text-gray-900">{sig}</p>
                  </div>

                  <div className="border-t border-gray-300 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                      Duration
                    </p>
                    <p className="text-base font-semibold text-gray-900">{daysSupply} days</p>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-green-900">
                    <span className="font-semibold">Ready!</span> Click "Calculate" to find the optimal NDC package for this prescription.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <div className="flex gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  step === currentStep
                    ? "bg-blue-600 w-8"
                    : step < currentStep
                    ? "bg-green-500"
                    : "bg-gray-300"
                )}
              />
            ))}
          </div>

          {currentStep < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromStep(currentStep)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4" />
              Calculate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

