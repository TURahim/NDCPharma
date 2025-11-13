"use strict";
/**
 * RxNorm Client Façade
 * Simple public API for drug normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameToRxCui = nameToRxCui;
exports.getNdcsForRxcui = getNdcsForRxcui;
exports.rxcuiToNdcs = rxcuiToNdcs;
const _core_config_1 = require("@core-config");
const normalizer_1 = require("./internal/normalizer");
const rxnormService_1 = require("./internal/rxnormService");
const rxnormMapper_1 = require("./internal/rxnormMapper");
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
async function nameToRxCui(name, opts) {
    if (_core_config_1.USE_ENHANCED_NORMALIZATION) {
        // Use sophisticated 3-strategy pipeline
        const result = await normalizer_1.drugNormalizer.normalizeDrug(name);
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
    }
    else {
        // Use basic RxNorm lookup only
        const response = await rxnormService_1.rxnormService.searchByName({
            name,
            maxEntries: opts?.maxResults || 5,
        });
        const rxcuis = (0, rxnormMapper_1.extractRxCUIsFromSearch)(response);
        if (rxcuis.length === 0) {
            throw new Error(`No RxCUI found for drug: ${name}`);
        }
        const rxcui = rxcuis[0];
        const properties = await rxnormService_1.rxnormService.getRxCUIProperties(rxcui);
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
async function getNdcsForRxcui(rxcui, opts) {
    try {
        // RxNorm REST API endpoint: /rxcui/{rxcui}/ndcs.json
        const response = await rxnormService_1.rxnormService.getNDCs(rxcui);
        if (!response.ndcGroup?.ndcList) {
            return [];
        }
        const ndcs = response.ndcGroup.ndcList.ndc || [];
        if (opts?.maxResults) {
            return ndcs.slice(0, opts.maxResults);
        }
        return ndcs;
    }
    catch (error) {
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
async function rxcuiToNdcs(rxcui, opts) {
    const ndcCodes = await getNdcsForRxcui(rxcui, opts);
    return ndcCodes.map(ndc => ({
        ndc,
        packageDescription: undefined,
        dosageForm: undefined,
        strength: undefined,
    }));
}
