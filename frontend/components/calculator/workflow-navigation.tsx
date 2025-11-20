"use client"

/**
 * Workflow Navigation Component
 * Back/Next buttons for workflow step navigation
 */

import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { WorkflowStep } from '@/types/workflow';

interface WorkflowNavigationProps {
  currentStep: WorkflowStep;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
  nextLabel?: string;
  previousLabel?: string;
  className?: string;
}

export function WorkflowNavigation({
  currentStep,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  isLoading = false,
  nextLabel,
  previousLabel = 'Back',
  className,
}: WorkflowNavigationProps) {
  // Determine next button label based on current step
  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    
    switch (currentStep) {
      case WorkflowStep.DRUG_SEARCH:
        return 'Choose Package';
      case WorkflowStep.CHOOSE_PACKAGE:
        return 'Enter SIG';
      case WorkflowStep.SIG_ENTRY:
        return 'Calculate Quantity';
      case WorkflowStep.QUANTITY_REVIEW:
        return 'Review Summary';
      case WorkflowStep.CONFIRMATION:
        return 'Confirm & Dispense';
      default:
        return 'Next';
    }
  };
  
  const isConfirmationStep = currentStep === WorkflowStep.CONFIRMATION;
  
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      {/* Back button */}
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        {previousLabel}
      </Button>
      
      {/* Next/Confirm button */}
      <Button
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className={cn(
          'flex items-center gap-2',
          isConfirmationStep && 'bg-green-600 hover:bg-green-700'
        )}
      >
        {isConfirmationStep ? (
          <>
            <CheckCircle className="w-4 h-4" />
            {getNextLabel()}
          </>
        ) : (
          <>
            {getNextLabel()}
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Sticky navigation footer
 */
interface StickyNavigationProps extends WorkflowNavigationProps {
  show?: boolean;
}

export function StickyNavigation({
  show = true,
  ...props
}: StickyNavigationProps) {
  if (!show) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <WorkflowNavigation {...props} />
      </div>
    </div>
  );
}

