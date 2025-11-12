"use strict";
/**
 * RxNorm Data Mapper
 * Transforms RxNorm API responses to internal domain models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRxCUIsFromSearch = extractRxCUIsFromSearch;
exports.extractCandidatesFromApproximateMatch = extractCandidatesFromApproximateMatch;
exports.mapPropertiesToNormalizedDrug = mapPropertiesToNormalizedDrug;
exports.extractRelatedConceptsByTermType = extractRelatedConceptsByTermType;
exports.extractAllRelatedConcepts = extractAllRelatedConcepts;
exports.calculateConfidenceFromScore = calculateConfidenceFromScore;
exports.normalizeDrugName = normalizeDrugName;
exports.areDrugNamesSimilar = areDrugNamesSimilar;
exports.extractDosageForm = extractDosageForm;
exports.extractStrength = extractStrength;
exports.parseDrugName = parseDrugName;
exports.sortByConfidence = sortByConfidence;
exports.filterByConfidence = filterByConfidence;
exports.deduplicateDrugs = deduplicateDrugs;
exports.mergeDrugInformation = mergeDrugInformation;
const _core_guardrails_1 = require("@core-guardrails");
/**
 * Extract RxCUIs from search response
 */
function extractRxCUIsFromSearch(response) {
    if (!response.idGroup?.rxnormId) {
        return [];
    }
    const rxnormIds = response.idGroup.rxnormId;
    // Handle both single string and array responses
    if (Array.isArray(rxnormIds)) {
        return rxnormIds.filter((id) => id && id.length > 0);
    }
    return rxnormIds && rxnormIds.length > 0 ? [rxnormIds] : [];
}
/**
 * Extract candidates from approximate match response
 */
function extractCandidatesFromApproximateMatch(response) {
    if (!response.approximateGroup?.candidate) {
        return [];
    }
    const candidates = response.approximateGroup.candidate;
    // Handle both single object and array responses
    if (Array.isArray(candidates)) {
        return candidates;
    }
    return [candidates];
}
/**
 * Map RxNorm properties to NormalizedDrug
 */
function mapPropertiesToNormalizedDrug(response, confidence = 1.0) {
    if (!response.properties) {
        return null;
    }
    const props = response.properties;
    return {
        rxcui: props.rxcui,
        name: props.name,
        termType: props.tty || "SCD",
        synonyms: props.synonym ? [props.synonym] : [],
        confidence,
    };
}
/**
 * Extract related concepts by term type
 */
function extractRelatedConceptsByTermType(response, termType) {
    if (!response.relatedGroup?.conceptGroup) {
        return [];
    }
    const conceptGroups = response.relatedGroup.conceptGroup;
    // Find the concept group with the specified term type
    const targetGroup = conceptGroups.find((group) => group.tty === termType);
    if (!targetGroup?.conceptProperties) {
        return [];
    }
    return targetGroup.conceptProperties.map((concept) => concept.rxcui);
}
/**
 * Extract all related concepts
 */
function extractAllRelatedConcepts(response) {
    const conceptMap = new Map();
    if (!response.relatedGroup?.conceptGroup) {
        return conceptMap;
    }
    for (const group of response.relatedGroup.conceptGroup) {
        if (group.tty && group.conceptProperties) {
            const rxcuis = group.conceptProperties.map((concept) => concept.rxcui);
            conceptMap.set(group.tty, rxcuis);
        }
    }
    return conceptMap;
}
/**
 * Calculate confidence score from approximate match score
 * RxNorm scores are typically 0-100, we normalize to 0-1
 */
function calculateConfidenceFromScore(score, rank) {
    try {
        const numericScore = parseFloat(score);
        const numericRank = parseFloat(rank);
        // Higher score is better, lower rank is better
        // Normalize score (0-100) to (0-1)
        const normalizedScore = Math.min(Math.max(numericScore / 100, 0), 1);
        // Adjust for rank (rank 1 = best, decreasing confidence as rank increases)
        const rankFactor = 1 / Math.max(numericRank, 1);
        // Combine score and rank
        const confidence = normalizedScore * Math.min(rankFactor, 1);
        return Math.min(Math.max(confidence, 0), 1);
    }
    catch (error) {
        _core_guardrails_1.logger.warn(`Failed to calculate confidence from score: ${score}, rank: ${rank}`);
        return 0.5; // Default middle confidence
    }
}
/**
 * Normalize drug name for comparison
 * Removes special characters, converts to uppercase, trims whitespace
 */
function normalizeDrugName(name) {
    return name
        .toUpperCase()
        .trim()
        .replace(/[^A-Z0-9\s]/g, "") // Remove special characters
        .replace(/\s+/g, " "); // Normalize whitespace
}
/**
 * Check if two drug names are similar
 */
function areDrugNamesSimilar(name1, name2) {
    const normalized1 = normalizeDrugName(name1);
    const normalized2 = normalizeDrugName(name2);
    // Exact match
    if (normalized1 === normalized2) {
        return true;
    }
    // Check if one contains the other
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return true;
    }
    return false;
}
/**
 * Extract dosage form from drug name
 * Common patterns: "TABLET", "CAPSULE", "SOLUTION", etc.
 */
function extractDosageForm(drugName) {
    const upperName = drugName.toUpperCase();
    const dosageForms = [
        "TABLET",
        "CAPSULE",
        "CAPLET",
        "SOLUTION",
        "SUSPENSION",
        "SYRUP",
        "INJECTION",
        "CREAM",
        "OINTMENT",
        "GEL",
        "LOTION",
        "PATCH",
        "SPRAY",
        "INHALER",
        "SUPPOSITORY",
        "POWDER",
    ];
    for (const form of dosageForms) {
        if (upperName.includes(form)) {
            return form;
        }
    }
    return undefined;
}
/**
 * Extract strength from drug name
 * Common patterns: "500MG", "10 MG", "2.5MG/ML", etc.
 */
function extractStrength(drugName) {
    const strengthPatterns = [
        /(\d+(?:\.\d+)?)\s*(MG|MCG|G|ML|L|%)/gi,
        /(\d+(?:\.\d+)?)\s*(MG|MCG|G)\/(\d+(?:\.\d+)?)\s*(ML|L)/gi,
        /(\d+(?:\.\d+)?)\s*UNIT/gi,
    ];
    for (const pattern of strengthPatterns) {
        const match = drugName.match(pattern);
        if (match) {
            return match[0].trim();
        }
    }
    return undefined;
}
function parseDrugName(drugName) {
    const strength = extractStrength(drugName);
    const dosageForm = extractDosageForm(drugName);
    // Remove strength and dosage form to get base name
    let baseName = drugName;
    if (strength) {
        baseName = baseName.replace(strength, "").trim();
    }
    if (dosageForm) {
        baseName = baseName.replace(new RegExp(dosageForm, "gi"), "").trim();
    }
    // Clean up extra whitespace and separators
    baseName = baseName.replace(/[,\-\s]+/g, " ").trim();
    return {
        baseName,
        strength,
        dosageForm,
    };
}
/**
 * Sort normalized drugs by confidence score (descending)
 */
function sortByConfidence(drugs) {
    return [...drugs].sort((a, b) => b.confidence - a.confidence);
}
/**
 * Filter drugs by minimum confidence threshold
 */
function filterByConfidence(drugs, minConfidence = 0.5) {
    return drugs.filter((drug) => drug.confidence >= minConfidence);
}
/**
 * Deduplicate normalized drugs by RxCUI
 */
function deduplicateDrugs(drugs) {
    const seen = new Set();
    const unique = [];
    for (const drug of drugs) {
        if (!seen.has(drug.rxcui)) {
            seen.add(drug.rxcui);
            unique.push(drug);
        }
    }
    return unique;
}
/**
 * Merge drug information from multiple sources
 */
function mergeDrugInformation(drugs) {
    if (drugs.length === 0) {
        return null;
    }
    if (drugs.length === 1) {
        return drugs[0];
    }
    // Use the first drug as base
    const merged = { ...drugs[0] };
    // Merge synonyms from all drugs
    const allSynonyms = new Set();
    for (const drug of drugs) {
        if (drug.synonyms) {
            drug.synonyms.forEach((syn) => allSynonyms.add(syn));
        }
    }
    merged.synonyms = Array.from(allSynonyms);
    // Use highest confidence
    merged.confidence = Math.max(...drugs.map((d) => d.confidence));
    // Prefer values that are defined
    for (const drug of drugs) {
        if (drug.genericName && !merged.genericName) {
            merged.genericName = drug.genericName;
        }
        if (drug.brandName && !merged.brandName) {
            merged.brandName = drug.brandName;
        }
        if (drug.dosageForm && !merged.dosageForm) {
            merged.dosageForm = drug.dosageForm;
        }
        if (drug.strength && !merged.strength) {
            merged.strength = drug.strength;
        }
    }
    return merged;
}
//# sourceMappingURL=rxnormMapper.js.map