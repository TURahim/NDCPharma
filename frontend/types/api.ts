/**
 * API Type Definitions
 * Matches backend API contracts
 */

export interface ActiveIngredient {
  name: string;
  strength: string;
}

export interface PackageSizeDetails {
  quantity: number;
  unit: string;
  display: string;
}

export interface MarketingStatus {
  isActive: boolean;
  status: string;
  label?: string;
  startDate?: string;
  endDate?: string;
}

export interface NDCPackage {
  ndc: string;
  productNdc: string;
  brandName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  dosageFormFamily?: string;
  route?: string[];
  packageSize?: PackageSizeDetails;
  labeler?: string;
  manufacturer?: string;
  activeIngredients?: ActiveIngredient[];
  marketingStatus?: MarketingStatus;
  listingExpirationDate?: string;
}

export interface ParsedSig {
  dose: number;
  frequency: number;
  unit: string;
  route?: string;
  duration?: number;
  prn?: string;
  additionalInstructions?: string;
  confidence?: number;
}

export interface StructuredSigInput {
  mode: "structured";
  dose: number;
  frequency: number;
  unit: string;
}

export interface FreeTextSigInput {
  mode: "freetext";
  text: string;
  drugContext?: {
    dosageForm?: string;
    strength?: string;
    route?: string;
  };
}

export type SigInput = StructuredSigInput | FreeTextSigInput;

export interface CalculateRequest {
  drug: {
    name?: string;
    rxcui?: string;
  };
  sig: SigInput;
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
  fillPrecision?: "exact" | "overfill" | "underfill";
  reasoning?: string;
  confidenceScore?: number;
  source?: "ai" | "algorithm";
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
    rating: "low" | "medium" | "high";
  };
}

export interface SigParserMetadata {
  usedAI: boolean;
  parsed?: ParsedSig;
  originalText?: string;
  warnings?: string[];
  executionTime?: number;
  aiCost?: number;
}

export interface Metadata {
  usedAI: boolean;
  algorithmicFallback?: boolean;
  executionTime: number;
  aiCost?: number;
  sigParser?: SigParserMetadata;
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
