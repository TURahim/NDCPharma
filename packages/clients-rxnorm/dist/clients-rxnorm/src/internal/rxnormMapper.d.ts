/**
 * RxNorm Data Mapper
 * Transforms RxNorm API responses to internal domain models
 */
import { RxCUI, RxNormSearchResponse, RxNormApproximateMatchResponse, RxNormPropertiesResponse, RxNormRelatedResponse, NormalizedDrug, RxNormCandidate, TermType } from "./rxnormTypes";
/**
 * Extract RxCUIs from search response
 */
export declare function extractRxCUIsFromSearch(response: RxNormSearchResponse): RxCUI[];
/**
 * Extract candidates from approximate match response
 */
export declare function extractCandidatesFromApproximateMatch(response: RxNormApproximateMatchResponse): RxNormCandidate[];
/**
 * Map RxNorm properties to NormalizedDrug
 */
export declare function mapPropertiesToNormalizedDrug(response: RxNormPropertiesResponse, confidence?: number): NormalizedDrug | null;
/**
 * Extract related concepts by term type
 */
export declare function extractRelatedConceptsByTermType(response: RxNormRelatedResponse, termType: TermType): RxCUI[];
/**
 * Extract all related concepts
 */
export declare function extractAllRelatedConcepts(response: RxNormRelatedResponse): Map<TermType, RxCUI[]>;
/**
 * Calculate confidence score from approximate match score
 * RxNorm scores are typically 0-100, we normalize to 0-1
 */
export declare function calculateConfidenceFromScore(score: string, rank: string): number;
/**
 * Normalize drug name for comparison
 * Removes special characters, converts to uppercase, trims whitespace
 */
export declare function normalizeDrugName(name: string): string;
/**
 * Check if two drug names are similar
 */
export declare function areDrugNamesSimilar(name1: string, name2: string): boolean;
/**
 * Extract dosage form from drug name
 * Common patterns: "TABLET", "CAPSULE", "SOLUTION", etc.
 */
export declare function extractDosageForm(drugName: string): string | undefined;
/**
 * Extract strength from drug name
 * Common patterns: "500MG", "10 MG", "2.5MG/ML", etc.
 */
export declare function extractStrength(drugName: string): string | undefined;
/**
 * Parse drug name components
 */
export interface ParsedDrugName {
    baseName: string;
    strength?: string;
    dosageForm?: string;
}
export declare function parseDrugName(drugName: string): ParsedDrugName;
/**
 * Sort normalized drugs by confidence score (descending)
 */
export declare function sortByConfidence(drugs: NormalizedDrug[]): NormalizedDrug[];
/**
 * Filter drugs by minimum confidence threshold
 */
export declare function filterByConfidence(drugs: NormalizedDrug[], minConfidence?: number): NormalizedDrug[];
/**
 * Deduplicate normalized drugs by RxCUI
 */
export declare function deduplicateDrugs(drugs: NormalizedDrug[]): NormalizedDrug[];
/**
 * Merge drug information from multiple sources
 */
export declare function mergeDrugInformation(drugs: NormalizedDrug[]): NormalizedDrug | null;
