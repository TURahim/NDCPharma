"use client"

/**
 * Workflow Stepper Component
 * Displays progress through the 6-step pharmacist workflow
 */

import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowStep, StepMetadata } from '@/types/workflow';

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  steps: Record<WorkflowStep, StepMetadata>;
  onStepClick?: (step: WorkflowStep) => void;
  className?: string;
}

export function WorkflowStepper({
  currentStep,
  steps,
  onStepClick,
  className,
}: WorkflowStepperProps) {
  const stepOrder = [
    WorkflowStep.DRUG_SEARCH,
    WorkflowStep.CHOOSE_PACKAGE,
    WorkflowStep.SIG_ENTRY,
    WorkflowStep.QUANTITY_REVIEW,
    WorkflowStep.CONFIRMATION,
  ];
  
  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {stepOrder.map((stepId, index) => {
            const step = steps[stepId];
            const isActive = stepId === currentStep;
            const isComplete = step.isComplete;
            const isClickable = onStepClick && (isComplete || stepId <= currentStep);
            
            return (
              <React.Fragment key={stepId}>
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isClickable && onStepClick(stepId)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                      isActive && 'border-blue-600 bg-blue-600 text-white scale-110',
                      isComplete && !isActive && 'border-green-600 bg-green-600 text-white',
                      !isActive && !isComplete && 'border-gray-300 bg-white text-gray-400',
                      isClickable && 'cursor-pointer hover:scale-105',
                      !isClickable && 'cursor-not-allowed'
                    )}
                  >
                    {isActive && (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    )}
                    {isComplete && !isActive && (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                    {!isActive && !isComplete && (
                      <Circle className="w-6 h-6" />
                    )}
                  </button>
                  
                  {/* Step label */}
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isActive && 'text-blue-600',
                        isComplete && !isActive && 'text-green-600',
                        !isActive && !isComplete && 'text-gray-500'
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden lg:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                
                {/* Connector line */}
                {index < stepOrder.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-4 transition-colors',
                      stepId < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Mobile: Vertical stepper */}
      <div className="block md:hidden">
        <div className="space-y-4">
          {stepOrder.map((stepId) => {
            const step = steps[stepId];
            const isActive = stepId === currentStep;
            const isComplete = step.isComplete;
            const isClickable = onStepClick && (isComplete || stepId <= currentStep);
            
            return (
              <div key={stepId} className="flex items-start gap-3">
                {/* Step indicator column */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isClickable && onStepClick(stepId)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                      isActive && 'border-blue-600 bg-blue-600 text-white',
                      isComplete && !isActive && 'border-green-600 bg-green-600 text-white',
                      !isActive && !isComplete && 'border-gray-300 bg-white text-gray-400',
                      isClickable && 'cursor-pointer',
                      !isClickable && 'cursor-not-allowed'
                    )}
                  >
                    {isActive && (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    )}
                    {isComplete && !isActive && (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {!isActive && !isComplete && (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  
                  {/* Vertical connector */}
                  {stepId < WorkflowStep.CONFIRMATION && (
                    <div
                      className={cn(
                        'w-0.5 h-12 my-1 transition-colors',
                        stepId < currentStep ? 'bg-green-600' : 'bg-gray-300'
                      )}
                    />
                  )}
                </div>
                
                {/* Step content */}
                <div className="flex-1 pb-4">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-blue-600',
                      isComplete && !isActive && 'text-green-600',
                      !isActive && !isComplete && 'text-gray-500'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact progress indicator for sticky header
 */
interface CompactProgressProps {
  currentStep: WorkflowStep;
  totalSteps?: number;
  className?: string;
}

export function CompactProgress({
  currentStep,
  totalSteps = 5,
  className,
}: CompactProgressProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  );
}

