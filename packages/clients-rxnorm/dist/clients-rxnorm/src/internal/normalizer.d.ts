/**
 * Drug Normalization Service
 * Orchestrates RxNorm API calls to normalize drug names to RxCUI
 */
import { RxNormService } from "./rxnormService";
import { RxCUI, NormalizedDrug, DrugNormalizationResult } from "./rxnormTypes";
/**
 * Drug Normalizer Class
 */
export declare class DrugNormalizer {
    private logger;
    private rxnormService;
    constructor(service?: RxNormService);
    /**
     * Normalize drug name to RxCUI with multiple fallback strategies
     */
    normalizeDrug(drugName: string): Promise<DrugNormalizationResult>;
    /**
     * Strategy 1: Exact match search
     */
    private exactMatch;
    /**
     * Strategy 2: Approximate (fuzzy) match
     */
    private approximateMatch;
    /**
     * Strategy 3: Spelling suggestions
     */
    private spellingMatch;
    /**
     * Enrich drug information with parsed data
     */
    private enrichDrugInformation;
    /**
     * Normalize drug by RxCUI (when RxCUI is already known)
     */
    normalizeDrugByRxCUI(rxcui: RxCUI): Promise<NormalizedDrug>;
    /**
     * Batch normalize multiple drugs
     */
    normalizeDrugs(drugNames: string[]): Promise<DrugNormalizationResult[]>;
    /**
     * Validate if a drug name is likely to be valid
     */
    validateDrugName(drugName: string): {
        valid: boolean;
        reason?: string;
    };
}
/**
 * Create and export a singleton instance
 */
export declare const drugNormalizer: DrugNormalizer;
