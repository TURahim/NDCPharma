"use strict";
/**
 * RxNorm Client Façade
 * Simple public API for drug normalization
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameToRxCui = nameToRxCui;
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
 * Get NDCs for a given RxCUI
 *
 * Note: RxNorm provides the primary NDC mapping.
 * Use openFDA enrichNdcs() separately to add marketing status and packaging details.
 *
 * @param rxcui - RxNorm Concept Unique Identifier
 * @param opts - Fetch options
 * @returns Array of NDC information
 */
async function rxcuiToNdcs(rxcui, opts) {
    // Get related drug products (SCD/SBD level which have NDCs)
    const related = await rxnormService_1.rxnormService.getRelatedConcepts(rxcui, ["SCD", "SBD"]);
    if (!related.relatedGroup?.conceptGroup) {
        return [];
    }
    const ndcs = [];
    for (const group of related.relatedGroup.conceptGroup) {
        if (!group.conceptProperties)
            continue;
        for (const concept of group.conceptProperties) {
            // In a full implementation, we'd query RxNorm's RxCUI to NDC mapping here
            // For now, return the concept information
            // The actual NDC mapping would come from RxNorm's getNDCProperties endpoint
            ndcs.push({
                ndc: concept.rxcui, // Placeholder: actual implementation needs NDC lookup
                packageDescription: concept.name,
                dosageForm: undefined, // Will be enriched by openFDA
                strength: undefined, // Will be enriched by openFDA
            });
            if (opts?.maxResults && ndcs.length >= opts.maxResults) {
                break;
            }
        }
        if (opts?.maxResults && ndcs.length >= opts.maxResults) {
            break;
        }
    }
    return ndcs;
}
//# sourceMappingURL=facade.js.map