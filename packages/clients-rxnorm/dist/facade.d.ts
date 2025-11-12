/**
 * RxNorm Client Façade
 * Simple public API for drug normalization
 */
/**
 * Options for drug normalization
 */
export interface NormalizationOptions {
    /**
     * Maximum number of results to return
     */
    maxResults?: number;
    /**
     * Minimum confidence threshold (0-1)
     */
    minConfidence?: number;
}
/**
 * RxCUI result with confidence score
 */
export interface RxCuiResult {
    /**
     * RxNorm Concept Unique Identifier
     */
    rxcui: string;
    /**
     * Drug name
     */
    name: string;
    /**
     * Confidence score (0-1)
     */
    confidence: number;
    /**
     * Dosage form (if available)
     */
    dosageForm?: string;
    /**
     * Strength (if available)
     */
    strength?: string;
    /**
     * Alternative suggestions
     */
    alternatives?: Array<{
        rxcui: string;
        name: string;
        confidence: number;
    }>;
}
/**
 * NDC information
 */
export interface NdcInfo {
    /**
     * National Drug Code
     */
    ndc: string;
    /**
     * Package description
     */
    packageDescription?: string;
    /**
     * Dosage form
     */
    dosageForm?: string;
    /**
     * Strength
     */
    strength?: string;
}
/**
 * Options for fetching NDCs
 */
export interface FetchOptions {
    /**
     * Maximum number of NDCs to return
     */
    maxResults?: number;
    /**
     * Include inactive NDCs
     */
    includeInactive?: boolean;
}
/**
 * Normalize drug name to RxCUI
 *
 * This is the primary entry point for drug normalization.
 * Internally uses enhanced 3-strategy approach (exact/fuzzy/spelling) if feature flag is enabled.
 *
 * @param name - Drug name to normalize
 * @param opts - Normalization options
 * @returns RxCUI result with confidence score
 */
export declare function nameToRxCui(name: string, opts?: NormalizationOptions): Promise<RxCuiResult>;
/**
 * Get NDCs for a given RxCUI
 *
 * Note: RxNorm provides the primary NDC mapping.
 * Use openFDA enrichNdcs() separately to add marketing status and packaging details.
 *
 * @param rxcui - RxNorm Concept Unique Identifier
 * @param opts - Fetch options
 * @returns Array of NDC information
 */
export declare function rxcuiToNdcs(rxcui: string, opts?: FetchOptions): Promise<NdcInfo[]>;
