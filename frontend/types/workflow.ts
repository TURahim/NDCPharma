/**
 * Workflow State Types
 * Defines the multi-step workflow structure and state management
 */

import { NDCPackage } from "./api";

/**
 * Workflow step enumeration
 */
export enum WorkflowStep {
  DRUG_SEARCH = 1,
  CHOOSE_PACKAGE = 2,
  SIG_ENTRY = 3,
  QUANTITY_REVIEW = 4,
  CONFIRMATION = 5,
}

/**
 * Step metadata
 */
export interface StepMetadata {
  id: WorkflowStep;
  title: string;
  description: string;
  isComplete: boolean;
  isValid: boolean;
}

/**
 * Drug search data
 */
export interface DrugSearchData {
  searchTerm: string;
  rxcui?: string;
  drugName?: string;
  strength?: string;
  dosageForm?: string;
  timestamp: number;
}

/**
 * Selected package data
 */
export interface SelectedPackageData {
  package: NDCPackage;
  selectedAt: number;
  quantityFromPackage?: number; // For multi-package: quantity to dispense from this specific package
}

/**
 * Package recommendation for multi-package combinations
 */
export interface PackageRecommendation {
  id: string;
  packages: Array<{
    package: NDCPackage;
    quantity: number; // Number of units from this package
    packagesNeeded: number; // Number of this package to dispense
  }>;
  totalQuantity: number;
  totalPackages: number;
  overfillPercentage: number;
  score: number; // Optimization score (lower overfill = higher score)
  reasoning: string;
}

/**
 * SIG (prescription directions) data
 */
export interface SIGData {
  mode: "structured" | "freetext";
  structured?: {
    dose: number;
    frequency: number;
    unit: string;
  };
  freetext?: string;
  parsed?: {
    dose: number;
    frequency: number;
    unit: string;
    route?: string;
    duration?: number;
    prn?: string;
    additionalInstructions?: string;
    confidence?: number;
  };
  parsingWarnings?: string[];
  daysSupply: number;
}

/**
 * Quantity calculation data
 */
export interface QuantityData {
  totalQuantity: number;
  packagesNeeded: number;
  overfillPercentage: number;
  underfillPercentage: number;
  manualOverride?: {
    quantity: number;
    reason: string;
  };
  // Multi-package specific data
  isMultiPackage?: boolean;
  packageBreakdown?: Array<{
    packageNDC: string;
    packageSize: number;
    packagesNeeded: number;
    quantityFromPackage: number;
  }>;
}

/**
 * Complete workflow state
 */
export interface WorkflowState {
  // Current step
  currentStep: WorkflowStep;

  // Step completion status
  steps: Record<WorkflowStep, StepMetadata>;

  // Workflow data
  drugSearch?: DrugSearchData;
  availablePackages?: NDCPackage[];
  selectedPackage?: SelectedPackageData; // Single package mode
  selectedPackages?: SelectedPackageData[]; // Multi-package mode
  multiPackageMode?: boolean; // Toggle for multi-package selection
  packageRecommendations?: PackageRecommendation[]; // System recommendations
  sig?: SIGData;
  quantity?: QuantityData;

  // Metadata
  startedAt: number;
  lastUpdatedAt: number;
  sessionId: string;
}

/**
 * Workflow actions
 */
export type WorkflowAction =
  | { type: "NEXT_STEP" }
  | { type: "PREVIOUS_STEP" }
  | { type: "GO_TO_STEP"; payload: WorkflowStep }
  | { type: "SET_DRUG_SEARCH"; payload: DrugSearchData }
  | { type: "SET_AVAILABLE_PACKAGES"; payload: NDCPackage[] }
  | { type: "SELECT_PACKAGE"; payload: NDCPackage }
  | { type: "DESELECT_PACKAGE" }
  | { type: "TOGGLE_MULTI_PACKAGE_MODE"; payload: boolean }
  | { type: "ADD_PACKAGE_TO_SELECTION"; payload: NDCPackage }
  | { type: "REMOVE_PACKAGE_FROM_SELECTION"; payload: string } // NDC
  | { type: "CLEAR_PACKAGE_SELECTION" }
  | { type: "SET_PACKAGE_RECOMMENDATIONS"; payload: PackageRecommendation[] }
  | { type: "APPLY_PACKAGE_RECOMMENDATION"; payload: PackageRecommendation }
  | { type: "SET_SIG"; payload: SIGData }
  | { type: "SET_QUANTITY"; payload: QuantityData }
  | { type: "COMPLETE_STEP"; payload: WorkflowStep }
  | { type: "INVALIDATE_STEP"; payload: WorkflowStep }
  | { type: "RESET_WORKFLOW" }
  | { type: "RESTORE_WORKFLOW"; payload: WorkflowState };

/**
 * Workflow validation rules
 */
export interface StepValidationRules {
  [WorkflowStep.DRUG_SEARCH]: (state: WorkflowState) => boolean;
  [WorkflowStep.CHOOSE_PACKAGE]: (state: WorkflowState) => boolean;
  [WorkflowStep.SIG_ENTRY]: (state: WorkflowState) => boolean;
  [WorkflowStep.QUANTITY_REVIEW]: (state: WorkflowState) => boolean;
  [WorkflowStep.CONFIRMATION]: (state: WorkflowState) => boolean;
}

/**
 * Workflow context value
 */
export interface WorkflowContextValue {
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;

  // Navigation helpers
  canGoNext: boolean;
  canGoPrevious: boolean;
  goNext: () => void;
  goPrevious: () => void;
  goToStep: (step: WorkflowStep) => void;

  // State helpers
  completeCurrentStep: () => void;
  resetWorkflow: () => void;

  // Persistence helpers
  saveToSession: () => void;
  loadFromSession: () => void;

  // Navigation interception helpers
  registerNextInterceptor: (
    handler: (() => Promise<boolean | void> | boolean | void) | null,
  ) => void;
  navigationState: {
    isLoading: boolean;
  };
  setNavigationState: (state: { isLoading: boolean }) => void;
}
