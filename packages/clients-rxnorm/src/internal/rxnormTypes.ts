/**
 * RxNorm API Type Definitions
 * Types for RxNorm API requests and responses
 */

/**
 * RxNorm Concept Unique Identifier
 */
export type RxCUI = string;

/**
 * Term types in RxNorm
 */
export type TermType = "IN" | "PIN" | "MIN" | "BN" | "SCD" | "SBD" | "GPCK" | "BPCK" | "SCDG" | "SBDG" | "SCDF" | "SBDF";

/**
 * RxNorm search request parameters
 */
export interface RxNormSearchRequest {
  name: string;
  maxEntries?: number;
  sources?: string[];
  allSourcesTerm?: boolean;
}

/**
 * RxNorm approximate match search request
 */
export interface RxNormApproximateMatchRequest {
  term: string;
  maxEntries?: number;
  option?: 0 | 1 | 2; // 0 = exact, 1 = normalized, 2 = both
}

/**
 * RxNorm spelling suggestion request
 */
export interface RxNormSpellingSuggestionRequest {
  name: string;
  maxEntries?: number;
}

/**
 * Individual RxNorm concept group
 */
export interface RxNormConceptGroup {
  tty?: TermType;
  conceptProperties?: RxNormConceptProperty[];
}

/**
 * RxNorm concept property
 */
export interface RxNormConceptProperty {
  rxcui: RxCUI;
  name: string;
  synonym?: string;
  tty?: TermType;
  language?: string;
  suppress?: string;
  umlscui?: string;
}

/**
 * RxNorm approximate match candidate
 */
export interface RxNormCandidate {
  rxcui: RxCUI;
  rxaui?: string;
  score: string; // Numeric string representing match quality
  rank: string;  // Numeric string for ranking
}

/**
 * RxNorm search response from /rxcui API
 */
export interface RxNormSearchResponse {
  idGroup?: {
    name?: string;
    rxnormId?: RxCUI[] | RxCUI;
  };
}

/**
 * RxNorm approximate match response
 */
export interface RxNormApproximateMatchResponse {
  approximateGroup?: {
    inputTerm?: string;
    comment?: string;
    candidate?: RxNormCandidate[] | RxNormCandidate;
  };
}

/**
 * RxNorm spelling suggestion response
 */
export interface RxNormSpellingSuggestionResponse {
  suggestionGroup?: {
    name?: string;
    suggestionList?: {
      suggestion?: string[];
    };
  };
}

/**
 * RxNorm drug properties response
 */
export interface RxNormPropertiesResponse {
  properties?: {
    rxcui: RxCUI;
    name: string;
    synonym?: string;
    tty?: TermType;
    language?: string;
    suppress?: string;
    umlscui?: string;
  };
}

/**
 * RxNorm related concepts response
 */
export interface RxNormRelatedResponse {
  relatedGroup?: {
    conceptGroup?: RxNormConceptGroup[];
  };
}

/**
 * RxNorm NDC properties
 */
export interface RxNormNDCProperties {
  ndcItem?: {
    ndcTime?: string;
    packRxcui?: RxCUI;
    packDesc?: string;
    ndc9?: string;
    ndc10?: string;
    ndcStatus?: string;
  }[];
}

/**
 * RxNorm NDC status response
 */
export interface RxNormNDCStatusResponse {
  ndcStatus?: {
    ndcItem?: {
      ndc?: string;
      rxcui?: RxCUI;
      startDate?: string;
      endDate?: string;
      status?: string;
      comment?: string;
    }[];
  };
}

/**
 * Normalized drug information (internal representation)
 */
export interface NormalizedDrug {
  rxcui: RxCUI;
  name: string;
  genericName?: string;
  brandName?: string;
  dosageForm?: string;
  strength?: string;
  termType: TermType;
  synonyms?: string[];
  confidence: number; // 0-1 score for match confidence
}

/**
 * Drug normalization result
 */
export interface DrugNormalizationResult {
  success: boolean;
  drug?: NormalizedDrug;
  alternatives?: NormalizedDrug[];
  searchTerm: string;
  method: "exact" | "approximate" | "spelling" | "failed";
  executionTime: number;
}

/**
 * RxNorm API error response
 */
export interface RxNormErrorResponse {
  error?: string;
  message?: string;
}

/**
 * RxNorm service configuration
 */
export interface RxNormServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

