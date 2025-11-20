"use client";

/**
 * Pharmacist Workflow Container
 * Main orchestrator for the guided workflow
 */

import React from "react";
import { WorkflowProvider, useWorkflow } from "@/lib/workflow-context";
import { WorkflowStepper, CompactProgress } from "./workflow-stepper";
import { WorkflowNavigation, StickyNavigation } from "./workflow-navigation";
import { WorkflowStep } from "@/types/workflow";
import { Button } from "@/components/ui/button";

// Step components
import { DrugSearchStep } from "./steps/drug-search-step";
import { ChoosePackageStep } from "@/components/workflow/choose-package-step";
import { SIGEntryStep } from "./steps/sig-entry-step";
import { QuantityReviewStep } from "./steps/quantity-review-step";
import { ConfirmationStep } from "./steps/confirmation-step";

/**
 * Workflow Content Component
 * Renders the current step and navigation
 */
function WorkflowContent() {
  const {
    state,
    canGoNext,
    canGoPrevious,
    goNext,
    goPrevious,
    goToStep,
    resetWorkflow,
    navigationState,
  } = useWorkflow();

  const handleReset = () => {
    const shouldReset =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "Reset the current workflow? This will clear your selections.",
          );

    if (!shouldReset) {
      return;
    }

    resetWorkflow();
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case WorkflowStep.DRUG_SEARCH:
        return <DrugSearchStep />;
      case WorkflowStep.CHOOSE_PACKAGE:
        return <ChoosePackageStep />;
      case WorkflowStep.SIG_ENTRY:
        return <SIGEntryStep />;
      case WorkflowStep.QUANTITY_REVIEW:
        return <QuantityReviewStep />;
      case WorkflowStep.CONFIRMATION:
        return <ConfirmationStep />;
      default:
        return <div>Unknown step</div>;
    }
  };

  const isChoosePackageStep = state.currentStep === WorkflowStep.CHOOSE_PACKAGE;
  const contentWidthClass = isChoosePackageStep ? "max-w-7xl" : "max-w-4xl";
  const contentCardClass = isChoosePackageStep
    ? ""
    : "bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-200";

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with stepper */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <div className="hidden lg:flex items-start justify-between gap-6">
            <WorkflowStepper
              currentStep={state.currentStep}
              steps={state.steps}
              onStepClick={goToStep}
            />
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset Workflow
            </Button>
          </div>

          <div className="flex flex-col gap-3 lg:hidden">
            <CompactProgress currentStep={state.currentStep} />
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset Workflow
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="container mx-auto px-4 py-8">
        <div className={`${contentWidthClass} mx-auto`}>
          <div className={contentCardClass}>{renderStep()}</div>

          {!isChoosePackageStep && (
            <div className="hidden sm:block mt-6">
              <WorkflowNavigation
                currentStep={state.currentStep}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
                onNext={goNext}
                onPrevious={goPrevious}
                isLoading={navigationState?.isLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sticky navigation (mobile only) */}
      {!isChoosePackageStep && (
        <div className="block sm:hidden">
          <StickyNavigation
            currentStep={state.currentStep}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            onNext={goNext}
            onPrevious={goPrevious}
            isLoading={navigationState?.isLoading}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Pharmacist Workflow Container with Provider
 */
export function PharmacistWorkflow() {
  return (
    <WorkflowProvider persistToSession={true}>
      <WorkflowContent />
    </WorkflowProvider>
  );
}
