/**
 * RxNorm API Service
 * Integrates with the National Library of Medicine's RxNorm API
 * API Documentation: https://rxnav.nlm.nih.gov/APIs.html
 */
import { RxCUI, RxNormSearchRequest, RxNormSearchResponse, RxNormApproximateMatchRequest, RxNormApproximateMatchResponse, RxNormSpellingSuggestionRequest, RxNormSpellingSuggestionResponse, RxNormPropertiesResponse, RxNormRelatedResponse, RxNormServiceConfig } from "./rxnormTypes";
/**
 * RxNorm API Service Class
 */
export declare class RxNormService {
    private client;
    private logger;
    private config;
    constructor(config?: Partial<RxNormServiceConfig>);
    /**
     * Search for RxCUI by drug name (exact match)
     * GET /rxcui?name={drugName}
     */
    searchByName(request: RxNormSearchRequest): Promise<RxNormSearchResponse>;
    /**
     * Get approximate matches for a drug name (fuzzy search)
     * GET /approximateTerm?term={term}
     */
    getApproximateMatches(request: RxNormApproximateMatchRequest): Promise<RxNormApproximateMatchResponse>;
    /**
     * Get spelling suggestions for a drug name
     * GET /spellingsuggestions?name={name}
     */
    getSpellingSuggestions(request: RxNormSpellingSuggestionRequest): Promise<RxNormSpellingSuggestionResponse>;
    /**
     * Get drug properties by RxCUI
     * GET /rxcui/{rxcui}/properties
     */
    getRxCUIProperties(rxcui: RxCUI): Promise<RxNormPropertiesResponse>;
    /**
     * Get related concepts for an RxCUI
     * GET /rxcui/{rxcui}/related?tty={tty}
     */
    getRelatedConcepts(rxcui: RxCUI, termTypes?: string[]): Promise<RxNormRelatedResponse>;
    /**
     * Execute API request with retry logic
     */
    private executeWithRetry;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
    /**
     * Handle and transform errors
     */
    private handleError;
}
/**
 * Create and export a singleton instance
 */
export declare const rxnormService: RxNormService;
