/**
 * RxNorm Data Mapper
 * Transforms RxNorm API responses to internal domain models
 */

import {
  RxCUI,
  RxNormSearchResponse,
  RxNormApproximateMatchResponse,
  RxNormPropertiesResponse,
  RxNormRelatedResponse,
  NormalizedDrug,
  RxNormCandidate,
  TermType,
} from "./rxnormTypes";
import { logger } from "@core-guardrails";

/**
 * Extract RxCUIs from search response
 */
export function extractRxCUIsFromSearch(response: RxNormSearchResponse): RxCUI[] {
  if (!response.idGroup?.rxnormId) {
    return [];
  }

  const rxnormIds = response.idGroup.rxnormId;
  
  // Handle both single string and array responses
  if (Array.isArray(rxnormIds)) {
    return rxnormIds.filter((id) => id && id.length > 0);
  }

  return rxnormIds && rxnormIds.length > 0 ? [rxnormIds] : [];
}

/**
 * Extract candidates from approximate match response
 */
export function extractCandidatesFromApproximateMatch(
  response: RxNormApproximateMatchResponse
): RxNormCandidate[] {
  if (!response.approximateGroup?.candidate) {
    return [];
  }

  const candidates = response.approximateGroup.candidate;

  // Handle both single object and array responses
  if (Array.isArray(candidates)) {
    return candidates;
  }

  return [candidates];
}

/**
 * Map RxNorm properties to NormalizedDrug
 */
export function mapPropertiesToNormalizedDrug(
  response: RxNormPropertiesResponse,
  confidence: number = 1.0
): NormalizedDrug | null {
  if (!response.properties) {
    return null;
  }

  const props = response.properties;

  return {
    rxcui: props.rxcui,
    name: props.name,
    termType: (props.tty as TermType) || "SCD",
    synonyms: props.synonym ? [props.synonym] : [],
    confidence,
  };
}

/**
 * Extract related concepts by term type
 */
export function extractRelatedConceptsByTermType(
  response: RxNormRelatedResponse,
  termType: TermType
): RxCUI[] {
  if (!response.relatedGroup?.conceptGroup) {
    return [];
  }

  const conceptGroups = response.relatedGroup.conceptGroup;
  
  // Find the concept group with the specified term type
  const targetGroup = conceptGroups.find((group) => group.tty === termType);

  if (!targetGroup?.conceptProperties) {
    return [];
  }

  return targetGroup.conceptProperties.map((concept) => concept.rxcui);
}

/**
 * Extract all related concepts
 */
export function extractAllRelatedConcepts(response: RxNormRelatedResponse): Map<TermType, RxCUI[]> {
  const conceptMap = new Map<TermType, RxCUI[]>();

  if (!response.relatedGroup?.conceptGroup) {
    return conceptMap;
  }

  for (const group of response.relatedGroup.conceptGroup) {
    if (group.tty && group.conceptProperties) {
      const rxcuis = group.conceptProperties.map((concept) => concept.rxcui);
      conceptMap.set(group.tty, rxcuis);
    }
  }

  return conceptMap;
}

/**
 * Calculate confidence score from approximate match score
 * RxNorm scores are typically 0-100, we normalize to 0-1
 */
export function calculateConfidenceFromScore(score: string, rank: string): number {
  try {
    const numericScore = parseFloat(score);
    const numericRank = parseFloat(rank);

    // Higher score is better, lower rank is better
    // Normalize score (0-100) to (0-1)
    const normalizedScore = Math.min(Math.max(numericScore / 100, 0), 1);

    // Adjust for rank (rank 1 = best, decreasing confidence as rank increases)
    const rankFactor = 1 / Math.max(numericRank, 1);

    // Combine score and rank
    const confidence = normalizedScore * Math.min(rankFactor, 1);

    return Math.min(Math.max(confidence, 0), 1);
  } catch (error) {
    logger.warn(`Failed to calculate confidence from score: ${score}, rank: ${rank}`);
    return 0.5; // Default middle confidence
  }
}

/**
 * Normalize drug name for comparison
 * Removes special characters, converts to uppercase, trims whitespace
 */
export function normalizeDrugName(name: string): string {
  return name
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Check if two drug names are similar
 */
export function areDrugNamesSimilar(name1: string, name2: string): boolean {
  const normalized1 = normalizeDrugName(name1);
  const normalized2 = normalizeDrugName(name2);

  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }

  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }

  return false;
}

/**
 * Extract dosage form from drug name
 * Common patterns: "TABLET", "CAPSULE", "SOLUTION", etc.
 */
export function extractDosageForm(drugName: string): string | undefined {
  const upperName = drugName.toUpperCase();
  
  const dosageForms = [
    "TABLET",
    "CAPSULE",
    "CAPLET",
    "SOLUTION",
    "SUSPENSION",
    "SYRUP",
    "INJECTION",
    "CREAM",
    "OINTMENT",
    "GEL",
    "LOTION",
    "PATCH",
    "SPRAY",
    "INHALER",
    "SUPPOSITORY",
    "POWDER",
  ];

  for (const form of dosageForms) {
    if (upperName.includes(form)) {
      return form;
    }
  }

  return undefined;
}

/**
 * Extract strength from drug name
 * Common patterns: "500MG", "10 MG", "2.5MG/ML", etc.
 */
export function extractStrength(drugName: string): string | undefined {
  const strengthPatterns = [
    /(\d+(?:\.\d+)?)\s*(MG|MCG|G|ML|L|%)/gi,
    /(\d+(?:\.\d+)?)\s*(MG|MCG|G)\/(\d+(?:\.\d+)?)\s*(ML|L)/gi,
    /(\d+(?:\.\d+)?)\s*UNIT/gi,
  ];

  for (const pattern of strengthPatterns) {
    const match = drugName.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return undefined;
}

/**
 * Parse drug name components
 */
export interface ParsedDrugName {
  baseName: string;
  strength?: string;
  dosageForm?: string;
}

export function parseDrugName(drugName: string): ParsedDrugName {
  const strength = extractStrength(drugName);
  const dosageForm = extractDosageForm(drugName);

  // Remove strength and dosage form to get base name
  let baseName = drugName;

  if (strength) {
    baseName = baseName.replace(strength, "").trim();
  }

  if (dosageForm) {
    baseName = baseName.replace(new RegExp(dosageForm, "gi"), "").trim();
  }

  // Clean up extra whitespace and separators
  baseName = baseName.replace(/[,\-\s]+/g, " ").trim();

  return {
    baseName,
    strength,
    dosageForm,
  };
}

/**
 * Sort normalized drugs by confidence score (descending)
 */
export function sortByConfidence(drugs: NormalizedDrug[]): NormalizedDrug[] {
  return [...drugs].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Filter drugs by minimum confidence threshold
 */
export function filterByConfidence(
  drugs: NormalizedDrug[],
  minConfidence: number = 0.5
): NormalizedDrug[] {
  return drugs.filter((drug) => drug.confidence >= minConfidence);
}

/**
 * Deduplicate normalized drugs by RxCUI
 */
export function deduplicateDrugs(drugs: NormalizedDrug[]): NormalizedDrug[] {
  const seen = new Set<RxCUI>();
  const unique: NormalizedDrug[] = [];

  for (const drug of drugs) {
    if (!seen.has(drug.rxcui)) {
      seen.add(drug.rxcui);
      unique.push(drug);
    }
  }

  return unique;
}

/**
 * Merge drug information from multiple sources
 */
export function mergeDrugInformation(drugs: NormalizedDrug[]): NormalizedDrug | null {
  if (drugs.length === 0) {
    return null;
  }

  if (drugs.length === 1) {
    return drugs[0];
  }

  // Use the first drug as base
  const merged = { ...drugs[0] };

  // Merge synonyms from all drugs
  const allSynonyms = new Set<string>();
  for (const drug of drugs) {
    if (drug.synonyms) {
      drug.synonyms.forEach((syn) => allSynonyms.add(syn));
    }
  }
  merged.synonyms = Array.from(allSynonyms);

  // Use highest confidence
  merged.confidence = Math.max(...drugs.map((d) => d.confidence));

  // Prefer values that are defined
  for (const drug of drugs) {
    if (drug.genericName && !merged.genericName) {
      merged.genericName = drug.genericName;
    }
    if (drug.brandName && !merged.brandName) {
      merged.brandName = drug.brandName;
    }
    if (drug.dosageForm && !merged.dosageForm) {
      merged.dosageForm = drug.dosageForm;
    }
    if (drug.strength && !merged.strength) {
      merged.strength = drug.strength;
    }
  }

  return merged;
}

