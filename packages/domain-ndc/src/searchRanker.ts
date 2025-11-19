/**
 * Smart ranking algorithm for drug search results
 * Prioritizes active, commonly-used medications
 */

import type {
  DrugSearchResult,
  DrugBadge,
  SearchRankingFactors,
} from './types.js';
import { DosageFormType } from './types.js';

/**
 * Ranking weights configuration
 */
const RANKING_WEIGHTS = {
  hasActiveNDCs: 50,
  isGeneric: 20,
  strengthCommonality: 15,
  formCommonality: 10,
  recencyScore: 5,
} as const;

/**
 * Common strengths that should be prioritized (in mg)
 * Based on typical pharmacy dispensing patterns
 */
const COMMON_STRENGTHS = [
  5, 10, 20, 25, 50, 75, 100, 200, 250, 300, 400, 500, 600, 750, 800, 1000,
];

/**
 * Common dosage forms in order of preference
 */
const COMMON_DOSAGE_FORMS = [
  'TABLET',
  'CAPSULE',
  'ORAL SOLUTION',
  'ORAL SUSPENSION',
  'INJECTION',
  'CREAM',
  'OINTMENT',
];

/**
 * Calculate ranking score for a drug search result
 * 
 * @param drug - Drug search result to rank
 * @returns Ranking score (0-100)
 */
export function calculateRankingScore(drug: DrugSearchResult): number {
  const factors: SearchRankingFactors = {
    hasActiveNDCs: drug.hasActiveNDCs ? RANKING_WEIGHTS.hasActiveNDCs : 0,
    isGeneric: calculateGenericScore(drug.tty),
    strengthCommonality: calculateStrengthScore(drug.strength),
    formCommonality: calculateFormScore(drug.dosageForm),
    recencyScore: RANKING_WEIGHTS.recencyScore, // Default to full score (assume recent)
  };

  // Calculate total score
  const totalScore =
    factors.hasActiveNDCs +
    factors.isGeneric +
    factors.strengthCommonality +
    factors.formCommonality +
    factors.recencyScore;

  return Math.min(100, totalScore);
}

/**
 * Calculate generic drug score
 * 
 * @param tty - RxNorm Term Type (e.g., "SCD", "SBD")
 * @returns Score (0-20)
 */
function calculateGenericScore(tty?: string): number {
  if (!tty) return 0;

  // SCD (Semantic Clinical Drug) = Generic
  if (tty === 'SCD') return RANKING_WEIGHTS.isGeneric;

  // SBD (Semantic Branded Drug) = Brand
  if (tty === 'SBD') return 0;

  // Other term types get half score
  return RANKING_WEIGHTS.isGeneric / 2;
}

/**
 * Calculate strength commonality score
 * 
 * @param strength - Strength string (e.g., "500 MG", "10 MG/ML")
 * @returns Score (0-15)
 */
function calculateStrengthScore(strength: string): number {
  // Extract numeric value from strength
  const match = strength.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 0;

  const value = parseFloat(match[1]);

  // Check if it's a common strength
  const isCommon = COMMON_STRENGTHS.some(
    (commonValue) => Math.abs(value - commonValue) < 0.01
  );

  if (isCommon) {
    return RANKING_WEIGHTS.strengthCommonality;
  }

  // Give partial score for near-common strengths
  const nearestCommon = COMMON_STRENGTHS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

  const distance = Math.abs(value - nearestCommon);
  if (distance < 25) {
    return RANKING_WEIGHTS.strengthCommonality * 0.5;
  }

  return 0;
}

/**
 * Calculate dosage form commonality score
 * 
 * @param dosageForm - Dosage form string (e.g., "TABLET", "CAPSULE")
 * @returns Score (0-10)
 */
function calculateFormScore(dosageForm: string): number {
  const normalizedForm = dosageForm.toUpperCase();

  const index = COMMON_DOSAGE_FORMS.findIndex((form) =>
    normalizedForm.includes(form)
  );

  if (index === -1) return 0;

  // Score decreases with position in the list
  const score =
    RANKING_WEIGHTS.formCommonality *
    (1 - index / COMMON_DOSAGE_FORMS.length);

  return Math.max(0, score);
}

/**
 * Rank search results by calculated score
 * 
 * @param results - Array of drug search results
 * @returns Sorted array (highest score first)
 */
export function rankSearchResults(
  results: DrugSearchResult[]
): DrugSearchResult[] {
  return [...results]
    .map((result) => ({
      ...result,
      commonUsageScore: calculateRankingScore(result),
    }))
    .sort((a, b) => {
      // Primary sort: by score (descending)
      if (b.commonUsageScore !== a.commonUsageScore) {
        return b.commonUsageScore - a.commonUsageScore;
      }

      // Secondary sort: by NDC count (descending)
      if (b.ndcCount !== a.ndcCount) {
        return b.ndcCount - a.ndcCount;
      }

      // Tertiary sort: alphabetically by name
      return a.name.localeCompare(b.name);
    });
}

/**
 * Assign badges to a drug search result
 * 
 * @param drug - Drug search result
 * @returns Array of badges
 */
export function assignDrugBadges(drug: DrugSearchResult): DrugBadge[] {
  const badges: DrugBadge[] = [];

  // ACTIVE badge: Has active NDCs
  if (drug.hasActiveNDCs) {
    badges.push({
      type: 'ACTIVE',
      label: 'Active',
      variant: 'success',
    });
  }

  // COMMON badge: High usage score (top 20%)
  if (drug.commonUsageScore >= 80) {
    badges.push({
      type: 'COMMON',
      label: 'Common',
      variant: 'info',
    });
  }

  // PEDIATRIC badge: Liquid or low-strength formulations
  if (isPediatricFormulation(drug)) {
    badges.push({
      type: 'PEDIATRIC',
      label: 'Pediatric',
      variant: 'info',
    });
  }

  // GENERIC badge: SCD term type
  if (drug.tty === 'SCD') {
    badges.push({
      type: 'GENERIC',
      label: 'Generic',
      variant: 'info',
    });
  }

  // BRAND badge: SBD term type
  if (drug.tty === 'SBD') {
    badges.push({
      type: 'BRAND',
      label: 'Brand',
      variant: 'warning',
    });
  }

  return badges;
}

/**
 * Determine if a drug is a pediatric formulation
 * 
 * @param drug - Drug search result
 * @returns True if pediatric formulation
 */
function isPediatricFormulation(drug: DrugSearchResult): boolean {
  // Liquid formulations are often pediatric
  if (drug.dosageFormFamily === DosageFormType.LIQUID) {
    return true;
  }

  // Low strength tablets/capsules may be pediatric
  const match = drug.strength.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    const value = parseFloat(match[1]);
    // Consider < 10 mg as potentially pediatric
    if (value < 10 && drug.dosageFormFamily === DosageFormType.SOLID) {
      return true;
    }
  }

  // Check name for pediatric indicators
  const pediatricKeywords = ['PEDIATRIC', 'CHEWABLE', 'SUSPENSION'];
  return pediatricKeywords.some((keyword) =>
    drug.name.toUpperCase().includes(keyword)
  );
}

/**
 * Apply badges to all search results
 * 
 * @param results - Array of drug search results
 * @returns Array with badges assigned
 */
export function applyBadgesToResults(
  results: DrugSearchResult[]
): DrugSearchResult[] {
  return results.map((result) => ({
    ...result,
    badges: assignDrugBadges(result),
  }));
}

/**
 * Get top N results by score
 * 
 * @param results - Array of drug search results
 * @param limit - Maximum number of results
 * @returns Top N results
 */
export function getTopResults(
  results: DrugSearchResult[],
  limit: number
): DrugSearchResult[] {
  const ranked = rankSearchResults(results);
  return ranked.slice(0, limit);
}

