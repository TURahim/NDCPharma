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
  quantityNeeded?: number;
  fillPrecision?: 'exact' | 'overfill' | 'underfill';
  reasoning?: string;
  confidenceScore?: number;
  source?: 'ai' | 'algorithm';
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

export interface AIInsights {
  factors: string[];
  considerations: string[];
  rationale: string;
  costEfficiency?: {
    estimatedWaste: number;
    rating: 'low' | 'medium' | 'high';
  };
}

export interface Metadata {
  usedAI: boolean;
  algorithmicFallback?: boolean;
  executionTime: number;
  aiCost?: number;
}

export interface AlternativeDrug {
  rxcui: string;
  name: string;
  comparisonText: string;
}

export interface AlternativeResponse {
  success: boolean;
  data?: {
    originalDrug: string;
    summary?: string;
    alternatives: AlternativeDrug[];
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
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
    aiInsights?: AIInsights;
    metadata?: Metadata;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

