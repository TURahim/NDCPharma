"use strict";
/**
 * Drug Normalization Service
 * Orchestrates RxNorm API calls to normalize drug names to RxCUI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.drugNormalizer = exports.DrugNormalizer = void 0;
const rxnormService_1 = require("./rxnormService");
const rxnormMapper_1 = require("./rxnormMapper");
const _core_guardrails_1 = require("@core-guardrails");
const _core_config_1 = require("@core-config");
/**
 * Drug Normalizer Class
 */
class DrugNormalizer {
    constructor(service) {
        this.logger = (0, _core_guardrails_1.createLogger)({ service: "DrugNormalizer" });
        this.rxnormService = service ?? rxnormService_1.rxnormService;
    }
    /**
     * Normalize drug name to RxCUI with multiple fallback strategies
     */
    async normalizeDrug(drugName) {
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
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Exact match failed for ${searchTerm}: ${reason}`);
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
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Approximate match failed for ${searchTerm}: ${reason}`);
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
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.warn(`Spelling match failed for ${searchTerm}: ${reason}`);
        }
        // All strategies failed
        const executionTime = Date.now() - startTime;
        this.logger.error(`Failed to normalize drug: ${searchTerm}`, undefined, { executionTime });
        throw new _core_guardrails_1.RxCUINotFoundError(searchTerm);
    }
    /**
     * Strategy 1: Exact match search
     */
    async exactMatch(drugName) {
        const request = {
            name: drugName,
            maxEntries: 5,
        };
        const response = await this.rxnormService.searchByName(request);
        const rxcuis = (0, rxnormMapper_1.extractRxCUIsFromSearch)(response);
        if (rxcuis.length === 0) {
            return null;
        }
        // Get properties for the first RxCUI
        const rxcui = rxcuis[0];
        const properties = await this.rxnormService.getRxCUIProperties(rxcui);
        const normalizedDrug = (0, rxnormMapper_1.mapPropertiesToNormalizedDrug)(properties, 1.0);
        if (!normalizedDrug) {
            return null;
        }
        // Enrich with parsed information
        return this.enrichDrugInformation(normalizedDrug, drugName);
    }
    /**
     * Strategy 2: Approximate (fuzzy) match
     */
    async approximateMatch(drugName) {
        const request = {
            term: drugName,
            maxEntries: 10,
            option: 1, // Normalized search
        };
        const response = await this.rxnormService.getApproximateMatches(request);
        const candidates = (0, rxnormMapper_1.extractCandidatesFromApproximateMatch)(response);
        if (candidates.length === 0) {
            return { drug: null, alternatives: [] };
        }
        // Fetch properties for all candidates
        const drugs = [];
        for (const candidate of candidates) {
            try {
                const properties = await this.rxnormService.getRxCUIProperties(candidate.rxcui);
                const confidence = (0, rxnormMapper_1.calculateConfidenceFromScore)(candidate.score, candidate.rank);
                const normalizedDrug = (0, rxnormMapper_1.mapPropertiesToNormalizedDrug)(properties, confidence);
                if (normalizedDrug) {
                    const enriched = this.enrichDrugInformation(normalizedDrug, drugName);
                    drugs.push(enriched);
                }
            }
            catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to fetch properties for RxCUI ${candidate.rxcui}: ${reason}`);
            }
        }
        // Filter and sort by confidence
        const filteredDrugs = (0, rxnormMapper_1.filterByConfidence)(drugs, _core_config_1.BUSINESS_RULES.MIN_CONFIDENCE_SCORE);
        const sortedDrugs = (0, rxnormMapper_1.sortByConfidence)(filteredDrugs);
        const uniqueDrugs = (0, rxnormMapper_1.deduplicateDrugs)(sortedDrugs);
        const primaryDrug = uniqueDrugs.length > 0 ? uniqueDrugs[0] : null;
        const alternatives = uniqueDrugs.slice(1, 5); // Up to 4 alternatives
        return { drug: primaryDrug, alternatives };
    }
    /**
     * Strategy 3: Spelling suggestions
     */
    async spellingMatch(drugName) {
        const request = {
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
            }
            catch (error) {
                // Continue to next suggestion
                continue;
            }
        }
        return null;
    }
    /**
     * Enrich drug information with parsed data
     */
    enrichDrugInformation(drug, originalName) {
        const parsed = (0, rxnormMapper_1.parseDrugName)(drug.name);
        const originalParsed = (0, rxnormMapper_1.parseDrugName)(originalName);
        return {
            ...drug,
            dosageForm: drug.dosageForm || parsed.dosageForm || originalParsed.dosageForm,
            strength: drug.strength || parsed.strength || originalParsed.strength,
        };
    }
    /**
     * Normalize drug by RxCUI (when RxCUI is already known)
     */
    async normalizeDrugByRxCUI(rxcui) {
        try {
            const properties = await this.rxnormService.getRxCUIProperties(rxcui);
            const normalizedDrug = (0, rxnormMapper_1.mapPropertiesToNormalizedDrug)(properties, 1.0);
            if (!normalizedDrug) {
                throw new _core_guardrails_1.DrugNotFoundError(`No properties found for RxCUI: ${rxcui}`);
            }
            return this.enrichDrugInformation(normalizedDrug, normalizedDrug.name);
        }
        catch (error) {
            this.logger.error(`Failed to normalize drug by RxCUI: ${rxcui}`, error);
            throw new _core_guardrails_1.DrugNotFoundError(`Failed to fetch drug information for RxCUI: ${rxcui}`);
        }
    }
    /**
     * Batch normalize multiple drugs
     */
    async normalizeDrugs(drugNames) {
        const results = [];
        for (const drugName of drugNames) {
            try {
                const result = await this.normalizeDrug(drugName);
                results.push(result);
            }
            catch (error) {
                // Log error but continue with other drugs
                this.logger.error(`Failed to normalize drug: ${drugName}`, error);
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
    validateDrugName(drugName) {
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
exports.DrugNormalizer = DrugNormalizer;
/**
 * Create and export a singleton instance
 */
exports.drugNormalizer = new DrugNormalizer();
//# sourceMappingURL=normalizer.js.map