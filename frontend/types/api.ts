/**
 * API Type Definitions
 * Matches backend API contracts
 */

export interface CalculateRequest {
  drug: {
    name?: string;
    rxcui?: string;
  };
  sig: {
    dose: number;
    frequency: number;
    unit: string;
  };
  daysSupply: number;
}

export interface PackageRecommendation {
  ndc: string;
  packageSize: number;
  unit: string;
  dosageForm: string;
  marketingStatus?: string;
  isActive: boolean;
}

export interface Explanation {
  step: string;
  description: string;
  details?: Record<string, unknown>;
}

export interface ExcludedNDC {
  ndc: string;
  reason: string;
  marketingStatus?: string;
}

export interface CalculateResponse {
  success: boolean;
  data?: {
    drug: {
      rxcui: string;
      name: string;
      dosageForm?: string;
      strength?: string;
    };
    totalQuantity: number;
    recommendedPackages: PackageRecommendation[];
    overfillPercentage: number;
    underfillPercentage: number;
    warnings: string[];
    excluded?: ExcludedNDC[];
    explanations: Explanation[];
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

