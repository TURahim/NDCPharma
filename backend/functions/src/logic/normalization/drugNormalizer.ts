/**
 * Drug Normalization Service
 * Orchestrates RxNorm API calls to normalize drug names to RxCUI
 */

import { rxnormService, RxNormService } from "../../services/rxnorm/rxnormService";
import {
  extractRxCUIsFromSearch,
  extractCandidatesFromApproximateMatch,
  mapPropertiesToNormalizedDrug,
  calculateConfidenceFromScore,
  normalizeDrugName,
  areDrugNamesSimilar,
  parseDrugName,
  sortByConfidence,
  filterByConfidence,
  deduplicateDrugs,
  extractDosageForm,
  extractStrength,
} from "../../services/rxnorm/rxnormMapper";
import {
  RxCUI,
  NormalizedDrug,
  DrugNormalizationResult,
  RxNormSearchRequest,
  RxNormApproximateMatchRequest,
  RxNormSpellingSuggestionRequest,
} from "../../services/rxnorm/rxnormTypes";
import { createLogger } from "../../utils/logger";
import { DrugNotFoundError, RxCUINotFoundError } from "../../utils/errors";
import { BUSINESS_RULES } from "../../config/constants";

/**
 * Drug Normalizer Class
 */
export class DrugNormalizer {
  private logger = createLogger({ service: "DrugNormalizer" });
  private rxnormService: RxNormService;

  constructor(rxnormService?: RxNormService) {
    this.rxnormService = rxnormService || rxnormService;
  }

  /**
   * Normalize drug name to RxCUI with multiple fallback strategies
   */
  async normalizeDrug(drugName: string): Promise<DrugNormalizationResult> {
    const startTime = Date.now();
    const searchTerm = drugName.trim();

    this.logger.info(`Normalizing drug: ${searchTerm}`);

    // Strategy 1: Exact match
    try {
      const exactResult = await this.exactMatch(searchTerm);
      if (exactResult) {
        const executionTime = Date.now() - startTime;
        this.logger.info(`Drug normalized via exact match: ${searchTerm} → ${exactResult.rxcui}`);
        
        return {
          success: true,
          drug: exactResult,
          searchTerm,
          method: "exact",
          executionTime,
        };
      }
    } catch (error) {
      this.logger.warn(`Exact match failed for ${searchTerm}`, { error });
    }

    // Strategy 2: Approximate match (fuzzy)
    try {
      const approximateResult = await this.approximateMatch(searchTerm);
      if (approximateResult.drug) {
        const executionTime = Date.now() - startTime;
        this.logger.info(`Drug normalized via approximate match: ${searchTerm} → ${approximateResult.drug.rxcui}`);
        
        return {
          success: true,
          drug: approximateResult.drug,
          alternatives: approximateResult.alternatives,
          searchTerm,
          method: "approximate",
          executionTime,
        };
      }
    } catch (error) {
      this.logger.warn(`Approximate match failed for ${searchTerm}`, { error });
    }

    // Strategy 3: Spelling suggestions
    try {
      const spellingResult = await this.spellingMatch(searchTerm);
      if (spellingResult) {
        const executionTime = Date.now() - startTime;
        this.logger.info(`Drug normalized via spelling suggestion: ${searchTerm} → ${spellingResult.rxcui}`);
        
        return {
          success: true,
          drug: spellingResult,
          searchTerm,
          method: "spelling",
          executionTime,
        };
      }
    } catch (error) {
      this.logger.warn(`Spelling match failed for ${searchTerm}`, { error });
    }

    // All strategies failed
    const executionTime = Date.now() - startTime;
    this.logger.error(`Failed to normalize drug: ${searchTerm}`);
    
    throw new RxCUINotFoundError(searchTerm);
  }

  /**
   * Strategy 1: Exact match search
   */
  private async exactMatch(drugName: string): Promise<NormalizedDrug | null> {
    const request: RxNormSearchRequest = {
      name: drugName,
      maxEntries: 5,
    };

    const response = await this.rxnormService.searchByName(request);
    const rxcuis = extractRxCUIsFromSearch(response);

    if (rxcuis.length === 0) {
      return null;
    }

    // Get properties for the first RxCUI
    const rxcui = rxcuis[0];
    const properties = await this.rxnormService.getRxCUIProperties(rxcui);
    const normalizedDrug = mapPropertiesToNormalizedDrug(properties, 1.0);

    if (!normalizedDrug) {
      return null;
    }

    // Enrich with parsed information
    return this.enrichDrugInformation(normalizedDrug, drugName);
  }

  /**
   * Strategy 2: Approximate (fuzzy) match
   */
  private async approximateMatch(drugName: string): Promise<{
    drug: NormalizedDrug | null;
    alternatives: NormalizedDrug[];
  }> {
    const request: RxNormApproximateMatchRequest = {
      term: drugName,
      maxEntries: 10,
      option: 1, // Normalized search
    };

    const response = await this.rxnormService.getApproximateMatches(request);
    const candidates = extractCandidatesFromApproximateMatch(response);

    if (candidates.length === 0) {
      return { drug: null, alternatives: [] };
    }

    // Fetch properties for all candidates
    const drugs: NormalizedDrug[] = [];

    for (const candidate of candidates) {
      try {
        const properties = await this.rxnormService.getRxCUIProperties(candidate.rxcui);
        const confidence = calculateConfidenceFromScore(candidate.score, candidate.rank);
        const normalizedDrug = mapPropertiesToNormalizedDrug(properties, confidence);

        if (normalizedDrug) {
          const enriched = this.enrichDrugInformation(normalizedDrug, drugName);
          drugs.push(enriched);
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch properties for RxCUI ${candidate.rxcui}`, { error });
      }
    }

    // Filter and sort by confidence
    const filteredDrugs = filterByConfidence(drugs, BUSINESS_RULES.MIN_CONFIDENCE_SCORE);
    const sortedDrugs = sortByConfidence(filteredDrugs);
    const uniqueDrugs = deduplicateDrugs(sortedDrugs);

    const primaryDrug = uniqueDrugs.length > 0 ? uniqueDrugs[0] : null;
    const alternatives = uniqueDrugs.slice(1, 5); // Up to 4 alternatives

    return { drug: primaryDrug, alternatives };
  }

  /**
   * Strategy 3: Spelling suggestions
   */
  private async spellingMatch(drugName: string): Promise<NormalizedDrug | null> {
    const request: RxNormSpellingSuggestionRequest = {
      name: drugName,
      maxEntries: 5,
    };

    const response = await this.rxnormService.getSpellingSuggestions(request);
    
    if (!response.suggestionGroup?.suggestionList?.suggestion) {
      return null;
    }

    const suggestions = response.suggestionGroup.suggestionList.suggestion;
    const suggestionArray = Array.isArray(suggestions) ? suggestions : [suggestions];

    // Try each spelling suggestion
    for (const suggestion of suggestionArray) {
      try {
        const result = await this.exactMatch(suggestion);
        if (result) {
          // Reduce confidence slightly since it's a spelling correction
          result.confidence = Math.min(result.confidence * 0.9, 1.0);
          return result;
        }
      } catch (error) {
        // Continue to next suggestion
        continue;
      }
    }

    return null;
  }

  /**
   * Enrich drug information with parsed data
   */
  private enrichDrugInformation(drug: NormalizedDrug, originalName: string): NormalizedDrug {
    const parsed = parseDrugName(drug.name);
    const originalParsed = parseDrugName(originalName);

    return {
      ...drug,
      dosageForm: drug.dosageForm || parsed.dosageForm || originalParsed.dosageForm,
      strength: drug.strength || parsed.strength || originalParsed.strength,
    };
  }

  /**
   * Normalize drug by RxCUI (when RxCUI is already known)
   */
  async normalizeDrugByRxCUI(rxcui: RxCUI): Promise<NormalizedDrug> {
    try {
      const properties = await this.rxnormService.getRxCUIProperties(rxcui);
      const normalizedDrug = mapPropertiesToNormalizedDrug(properties, 1.0);

      if (!normalizedDrug) {
        throw new DrugNotFoundError(`No properties found for RxCUI: ${rxcui}`);
      }

      return this.enrichDrugInformation(normalizedDrug, normalizedDrug.name);
    } catch (error) {
      this.logger.error(`Failed to normalize drug by RxCUI: ${rxcui}`, error as Error);
      throw new DrugNotFoundError(`Failed to fetch drug information for RxCUI: ${rxcui}`);
    }
  }

  /**
   * Batch normalize multiple drugs
   */
  async normalizeDrugs(drugNames: string[]): Promise<DrugNormalizationResult[]> {
    const results: DrugNormalizationResult[] = [];

    for (const drugName of drugNames) {
      try {
        const result = await this.normalizeDrug(drugName);
        results.push(result);
      } catch (error) {
        // Log error but continue with other drugs
        this.logger.error(`Failed to normalize drug: ${drugName}`, error as Error);
        results.push({
          success: false,
          searchTerm: drugName,
          method: "failed",
          executionTime: 0,
        });
      }
    }

    return results;
  }

  /**
   * Validate if a drug name is likely to be valid
   */
  validateDrugName(drugName: string): { valid: boolean; reason?: string } {
    const trimmed = drugName.trim();

    if (trimmed.length < 2) {
      return { valid: false, reason: "Drug name too short" };
    }

    if (trimmed.length > 200) {
      return { valid: false, reason: "Drug name too long" };
    }

    // Check for valid characters
    const validPattern = /^[a-zA-Z0-9\s\-()/.%]+$/;
    if (!validPattern.test(trimmed)) {
      return { valid: false, reason: "Invalid characters in drug name" };
    }

    return { valid: true };
  }
}

/**
 * Create and export a singleton instance
 */
export const drugNormalizer = new DrugNormalizer();

