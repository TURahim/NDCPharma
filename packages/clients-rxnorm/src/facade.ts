/**
 * RxNorm Client Façade
 * Simple public API for drug normalization
 */

import { USE_ENHANCED_NORMALIZATION } from "@core-config";
import { drugNormalizer } from "./internal/normalizer";
import { rxnormService } from "./internal/rxnormService";
import { extractRxCUIsFromSearch } from "./internal/rxnormMapper";

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
export async function nameToRxCui(
  name: string,
  opts?: NormalizationOptions
): Promise<RxCuiResult> {
  if (USE_ENHANCED_NORMALIZATION) {
    // Use sophisticated 3-strategy pipeline
    const result = await drugNormalizer.normalizeDrug(name);
    
    if (!result.success || !result.drug) {
      throw new Error(`Failed to normalize drug: ${name}`);
    }
    
    return {
      rxcui: result.drug.rxcui,
      name: result.drug.name,
      confidence: result.drug.confidence,
      dosageForm: result.drug.dosageForm,
      strength: result.drug.strength,
      alternatives: result.alternatives?.slice(0, opts?.maxResults || 3).map(alt => ({
        rxcui: alt.rxcui,
        name: alt.name,
        confidence: alt.confidence,
      })),
    };
  } else {
    // Use basic RxNorm lookup only
    const response = await rxnormService.searchByName({
      name,
      maxEntries: opts?.maxResults || 5,
    });
    
    const rxcuis = extractRxCUIsFromSearch(response);
    if (rxcuis.length === 0) {
      throw new Error(`No RxCUI found for drug: ${name}`);
    }
    
    const rxcui = rxcuis[0];
    const properties = await rxnormService.getRxCUIProperties(rxcui);
    
    if (!properties.properties) {
      throw new Error(`Failed to get properties for RxCUI: ${rxcui}`);
    }
    
    return {
      rxcui: properties.properties.rxcui,
      name: properties.properties.name,
      confidence: 1.0, // Basic lookup has high confidence if found
    };
  }
}

/**
 * Get NDC codes for a given RxCUI
 * Returns actual NDC codes from RxNorm API
 * 
 * @param rxcui - RxNorm Concept Unique Identifier
 * @param opts - Fetch options
 * @returns Array of NDC codes
 */
export async function getNdcsForRxcui(
  rxcui: string,
  opts?: FetchOptions
): Promise<string[]> {
  try {
    // RxNorm REST API endpoint: /rxcui/{rxcui}/ndcs.json
    const response = await rxnormService.getNDCs(rxcui);
    
    if (!response.ndcGroup?.ndcList) {
      return [];
    }
    
    const ndcs = response.ndcGroup.ndcList.ndc || [];
    
    if (opts?.maxResults) {
      return ndcs.slice(0, opts.maxResults);
    }
    
    return ndcs;
  } catch (error) {
    // If direct NDC lookup fails, return empty array
    // FDA will be queried as fallback
    return [];
  }
}

/**
 * Get NDCs for a given RxCUI (legacy method for backward compatibility)
 * 
 * Note: RxNorm provides the primary NDC mapping. 
 * Use openFDA enrichNdcs() separately to add marketing status and packaging details.
 * 
 * @param rxcui - RxNorm Concept Unique Identifier
 * @param opts - Fetch options
 * @returns Array of NDC information
 * @deprecated Use getNdcsForRxcui() for simpler NDC list retrieval
 */
export async function rxcuiToNdcs(
  rxcui: string,
  opts?: FetchOptions
): Promise<NdcInfo[]> {
  const ndcCodes = await getNdcsForRxcui(rxcui, opts);
  
  return ndcCodes.map(ndc => ({
    ndc,
    packageDescription: undefined,
    dosageForm: undefined,
    strength: undefined,
  }));
}

