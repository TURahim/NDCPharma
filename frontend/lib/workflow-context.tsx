"use client"

/**
 * Workflow Context Provider
 * Manages state for the 6-step pharmacist workflow
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import {
  WorkflowState,
  WorkflowAction,
  WorkflowStep,
  WorkflowContextValue,
  StepMetadata,
  StepValidationRules,
} from '@/types/workflow';

// Session storage key
const WORKFLOW_SESSION_KEY = 'ndc_workflow_state';

/**
 * Create initial workflow state
 */
function createInitialState(): WorkflowState {
  const sessionId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const steps: Record<WorkflowStep, StepMetadata> = {
    [WorkflowStep.DRUG_SEARCH]: {
      id: WorkflowStep.DRUG_SEARCH,
      title: 'Drug Search',
      description: 'Search for medication',
      isComplete: false,
      isValid: false,
    },
    [WorkflowStep.CHOOSE_PACKAGE]: {
      id: WorkflowStep.CHOOSE_PACKAGE,
      title: 'Choose Package',
      description: 'Browse & select an NDC package',
      isComplete: false,
      isValid: false,
    },
    [WorkflowStep.SIG_ENTRY]: {
      id: WorkflowStep.SIG_ENTRY,
      title: 'Enter SIG',
      description: 'Prescription directions',
      isComplete: false,
      isValid: false,
    },
    [WorkflowStep.QUANTITY_REVIEW]: {
      id: WorkflowStep.QUANTITY_REVIEW,
      title: 'Review Quantity',
      description: 'Verify calculated quantity',
      isComplete: false,
      isValid: false,
    },
    [WorkflowStep.CONFIRMATION]: {
      id: WorkflowStep.CONFIRMATION,
      title: 'Confirmation',
      description: 'Final review and approval',
      isComplete: false,
      isValid: false,
    },
  };
  
  return {
    currentStep: WorkflowStep.DRUG_SEARCH,
    steps,
    startedAt: Date.now(),
    lastUpdatedAt: Date.now(),
    sessionId,
  };
}

/**
 * Step validation rules
 */
const validationRules: StepValidationRules = {
  [WorkflowStep.DRUG_SEARCH]: (state) => {
    return !!(state.drugSearch?.rxcui && state.drugSearch?.drugName);
  },
  [WorkflowStep.CHOOSE_PACKAGE]: (state) => {
    return !!state.selectedPackage;
  },
  [WorkflowStep.SIG_ENTRY]: (state) => {
    if (!state.sig) return false;
    if (state.sig.mode === 'structured') {
      return !!(state.sig.structured?.dose && state.sig.structured?.frequency && state.sig.structured?.unit);
    }
    return !!(state.sig.freetext || state.sig.parsed);
  },
  [WorkflowStep.QUANTITY_REVIEW]: (state) => {
    return !!(state.quantity?.totalQuantity);
  },
  [WorkflowStep.CONFIRMATION]: (state) => {
    return validationRules[WorkflowStep.QUANTITY_REVIEW](state);
  },
};

/**
 * Workflow reducer
 */
function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  const now = Date.now();
  
  switch (action.type) {
    case 'NEXT_STEP': {
      const nextStep = Math.min(state.currentStep + 1, WorkflowStep.CONFIRMATION) as WorkflowStep;
      return {
        ...state,
        currentStep: nextStep,
        lastUpdatedAt: now,
      };
    }
    
    case 'PREVIOUS_STEP': {
      const previousStep = Math.max(state.currentStep - 1, WorkflowStep.DRUG_SEARCH) as WorkflowStep;
      
      const shouldClearSelection = previousStep === WorkflowStep.DRUG_SEARCH && state.selectedPackage;
      
      return {
        ...state,
        currentStep: previousStep,
        selectedPackage: shouldClearSelection ? undefined : state.selectedPackage,
        steps: shouldClearSelection
          ? {
              ...state.steps,
              [WorkflowStep.CHOOSE_PACKAGE]: {
                ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
                isValid: false,
                isComplete: false,
              },
            }
          : state.steps,
        lastUpdatedAt: now,
      };
    }
    
    case 'GO_TO_STEP': {
      const shouldClearSelection = action.payload === WorkflowStep.DRUG_SEARCH && state.selectedPackage;
      
      return {
        ...state,
        currentStep: action.payload,
        selectedPackage: shouldClearSelection ? undefined : state.selectedPackage,
        steps: shouldClearSelection
          ? {
              ...state.steps,
              [WorkflowStep.CHOOSE_PACKAGE]: {
                ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
                isValid: false,
                isComplete: false,
              },
            }
          : state.steps,
        lastUpdatedAt: now,
      };
    }
    
    case 'SET_DRUG_SEARCH': {
      const isValid = !!(action.payload.rxcui && action.payload.drugName);
      const isDifferentDrug = state.drugSearch?.rxcui !== action.payload.rxcui;
      
      return {
        ...state,
        drugSearch: action.payload,
        availablePackages: isDifferentDrug ? undefined : state.availablePackages,
        selectedPackage: isDifferentDrug ? undefined : state.selectedPackage,
        steps: {
          ...state.steps,
          [WorkflowStep.DRUG_SEARCH]: {
            ...state.steps[WorkflowStep.DRUG_SEARCH],
            isValid,
            isComplete: isValid,
          },
          ...(isDifferentDrug
            ? {
                [WorkflowStep.CHOOSE_PACKAGE]: {
                  ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
                  isValid: false,
                  isComplete: false,
                },
              }
            : {}),
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'SET_AVAILABLE_PACKAGES': {
      return {
        ...state,
        availablePackages: action.payload,
        selectedPackage: undefined,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: false,
            isComplete: false,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'SELECT_PACKAGE': {
      return {
        ...state,
        selectedPackage: {
          package: action.payload,
          selectedAt: now,
        },
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: true,
            isComplete: true,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'DESELECT_PACKAGE': {
      return {
        ...state,
        selectedPackage: undefined,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: false,
            isComplete: false,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'TOGGLE_MULTI_PACKAGE_MODE': {
      return {
        ...state,
        multiPackageMode: action.payload,
        // Clear selections when switching modes
        selectedPackage: action.payload ? undefined : state.selectedPackage,
        selectedPackages: action.payload ? [] : undefined,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: false,
            isComplete: false,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'ADD_PACKAGE_TO_SELECTION': {
      const currentPackages = state.selectedPackages || [];
      const alreadySelected = currentPackages.some(p => p.package.ndc === action.payload.ndc);
      
      if (alreadySelected) {
        return state; // Already selected, no change
      }
      
      const newPackages = [
        ...currentPackages,
        {
          package: action.payload,
          selectedAt: now,
        },
      ];
      
      return {
        ...state,
        selectedPackages: newPackages,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: newPackages.length > 0,
            isComplete: newPackages.length > 0,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'REMOVE_PACKAGE_FROM_SELECTION': {
      const currentPackages = state.selectedPackages || [];
      const newPackages = currentPackages.filter(p => p.package.ndc !== action.payload);
      
      return {
        ...state,
        selectedPackages: newPackages,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: newPackages.length > 0,
            isComplete: newPackages.length > 0,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'CLEAR_PACKAGE_SELECTION': {
      return {
        ...state,
        selectedPackages: [],
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: false,
            isComplete: false,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'SET_PACKAGE_RECOMMENDATIONS': {
      return {
        ...state,
        packageRecommendations: action.payload,
        lastUpdatedAt: now,
      };
    }
    
    case 'APPLY_PACKAGE_RECOMMENDATION': {
      const recommendation = action.payload;
      const selectedPackages = recommendation.packages.map(p => ({
        package: p.package,
        selectedAt: now,
        quantityFromPackage: p.quantity,
      }));
      
      return {
        ...state,
        selectedPackages,
        multiPackageMode: recommendation.packages.length > 1,
        steps: {
          ...state.steps,
          [WorkflowStep.CHOOSE_PACKAGE]: {
            ...state.steps[WorkflowStep.CHOOSE_PACKAGE],
            isValid: true,
            isComplete: true,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'SET_SIG': {
      const isValid = validationRules[WorkflowStep.SIG_ENTRY]({
        ...state,
        sig: action.payload,
      });
      return {
        ...state,
        sig: action.payload,
        steps: {
          ...state.steps,
          [WorkflowStep.SIG_ENTRY]: {
            ...state.steps[WorkflowStep.SIG_ENTRY],
            isValid,
            isComplete: isValid,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'SET_QUANTITY': {
      return {
        ...state,
        quantity: action.payload,
        steps: {
          ...state.steps,
          [WorkflowStep.QUANTITY_REVIEW]: {
            ...state.steps[WorkflowStep.QUANTITY_REVIEW],
            isValid: true,
            isComplete: true,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'COMPLETE_STEP': {
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.payload]: {
            ...state.steps[action.payload],
            isComplete: true,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'INVALIDATE_STEP': {
      return {
        ...state,
        steps: {
          ...state.steps,
          [action.payload]: {
            ...state.steps[action.payload],
            isValid: false,
            isComplete: false,
          },
        },
        lastUpdatedAt: now,
      };
    }
    
    case 'RESET_WORKFLOW': {
      return createInitialState();
    }
    
    case 'RESTORE_WORKFLOW': {
      return {
        ...action.payload,
        lastUpdatedAt: now,
      };
    }
    
    default:
      return state;
  }
}

/**
 * Workflow Context
 */
const WorkflowContext = createContext<WorkflowContextValue | undefined>(undefined);

/**
 * Workflow Provider Props
 */
interface WorkflowProviderProps {
  children: React.ReactNode;
  persistToSession?: boolean;
}

/**
 * Workflow Provider Component
 */
export function WorkflowProvider({ children, persistToSession = true }: WorkflowProviderProps) {
  const [state, dispatch] = useReducer(workflowReducer, null, () => {
    // Try to restore from session storage on mount
    if (persistToSession && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(WORKFLOW_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as WorkflowState;
          // Only restore if session is less than 1 hour old
          if (Date.now() - parsed.lastUpdatedAt < 60 * 60 * 1000) {
            return parsed;
          }
        }
      } catch (error) {
        console.warn('Failed to restore workflow from session:', error);
      }
    }
    return createInitialState();
  });
  
  // Persist to session storage on state change
  useEffect(() => {
    if (persistToSession && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(WORKFLOW_SESSION_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to persist workflow to session:', error);
      }
    }
  }, [state, persistToSession]);
  
  // Navigation helpers
  const canGoNext = useCallback(() => {
    if (state.currentStep >= WorkflowStep.CONFIRMATION) return false;
    return validationRules[state.currentStep](state);
  }, [state]);
  
  const canGoPrevious = useCallback(() => {
    return state.currentStep > WorkflowStep.DRUG_SEARCH;
  }, [state.currentStep]);
  
  const goNext = useCallback(() => {
    if (canGoNext()) {
      dispatch({ type: 'NEXT_STEP' });
    }
  }, [canGoNext]);
  
  const goPrevious = useCallback(() => {
    if (canGoPrevious()) {
      dispatch({ type: 'PREVIOUS_STEP' });
    }
  }, [canGoPrevious]);
  
  const goToStep = useCallback((step: WorkflowStep) => {
    // Only allow going to completed steps or the next step
    if (step <= state.currentStep || state.steps[step - 1 as WorkflowStep]?.isComplete) {
      dispatch({ type: 'GO_TO_STEP', payload: step });
    }
  }, [state.currentStep, state.steps]);
  
  const completeCurrentStep = useCallback(() => {
    dispatch({ type: 'COMPLETE_STEP', payload: state.currentStep });
  }, [state.currentStep]);
  
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET_WORKFLOW' });

    if (persistToSession && typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(WORKFLOW_SESSION_KEY);
      } catch (error) {
        console.warn('Failed to clear workflow session:', error);
      }
    }
  }, [persistToSession]);
  
  const saveToSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(WORKFLOW_SESSION_KEY, JSON.stringify(state));
      } catch (error) {
        console.error('Failed to save workflow to session:', error);
      }
    }
  }, [state]);
  
  const loadFromSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(WORKFLOW_SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as WorkflowState;
          dispatch({ type: 'RESTORE_WORKFLOW', payload: parsed });
        }
      } catch (error) {
        console.error('Failed to load workflow from session:', error);
      }
    }
  }, []);
  
  const value: WorkflowContextValue = {
    state,
    dispatch,
    canGoNext: canGoNext(),
    canGoPrevious: canGoPrevious(),
    goNext,
    goPrevious,
    goToStep,
    completeCurrentStep,
    resetWorkflow,
    saveToSession,
    loadFromSession,
  };
  
  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

/**
 * Hook to use workflow context
 */
export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
}

