/**
 * FDA NDC Directory API Service
 * OpenFDA Drug API: https://open.fda.gov/apis/drug/ndc/
 */
import type { FDASearchResponse, FDAServiceConfig } from './fdaTypes';
/**
 * FDA API Service
 * Handles HTTP communication with the openFDA NDC Directory API
 */
export declare class FDAService {
    private client;
    private logger;
    private config;
    constructor(config?: FDAServiceConfig);
    /**
     * Search NDCs by RxCUI
     * @param rxcui RxNorm Concept Unique Identifier
     * @param options Search options (limit, skip)
     * @returns FDA search response with NDC results
     */
    searchByRxCUI(rxcui: string, options?: {
        limit?: number;
        skip?: number;
    }): Promise<FDASearchResponse>;
    /**
     * Search NDCs by product NDC
     * @param productNdc Product NDC (5-4 or 5-3-2 format)
     * @returns FDA search response
     */
    searchByProductNDC(productNdc: string): Promise<FDASearchResponse>;
    /**
     * Search NDCs by package NDC
     * @param packageNdc Package NDC (11-digit format)
     * @returns FDA search response
     */
    searchByPackageNDC(packageNdc: string): Promise<FDASearchResponse>;
    /**
     * Search NDCs by generic name
     * @param genericName Generic drug name
     * @param options Search options
     * @returns FDA search response
     */
    searchByGenericName(genericName: string, options?: {
        limit?: number;
        skip?: number;
    }): Promise<FDASearchResponse>;
    /**
     * Execute FDA API request with retry logic
     * @param endpoint API endpoint path
     * @param request Search request parameters
     * @returns API response
     */
    private executeWithRetry;
    /**
     * Handle and transform FDA API errors
     * @param error Original error
     * @param operation Operation name
     * @param context Additional context
     * @returns Transformed error
     */
    private handleError;
    /**
     * Sleep utility for retry delays
     * @param ms Milliseconds to sleep
     */
    private sleep;
}
export declare const fdaService: FDAService;
