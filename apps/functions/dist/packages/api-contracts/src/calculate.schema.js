"use strict";
/**
 * Calculate API Contract
 * Zod schemas for request/response validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIEnhancementSchema = exports.CalculateResponseSchema = exports.ExcludedNDCSchema = exports.ExplanationSchema = exports.PackageRecommendationSchema = exports.CalculateRequestSchema = void 0;
const zod_1 = require("zod");
/**
 * Calculate Request Schema
 * MVP: Structured input only (defer free-text SIG parsing)
 */
exports.CalculateRequestSchema = zod_1.z.object({
    /**
     * Drug name or RxCUI
     */
    drug: zod_1.z.object({
        /**
         * Drug name (e.g., "Lisinopril")
         */
        name: zod_1.z.string().min(2).max(200).optional(),
        /**
         * RxCUI if already known
         */
        rxcui: zod_1.z.string().optional(),
    }).refine((data) => data.name || data.rxcui, { message: "Either name or rxcui must be provided" }),
    /**
     * Structured SIG (prescription directions)
     * MVP: Structured input only
     */
    sig: zod_1.z.object({
        /**
         * Dose per administration (e.g., 2 for "2 tablets")
         */
        dose: zod_1.z.number().positive(),
        /**
         * Frequency per day (e.g., 2 for "twice daily")
         */
        frequency: zod_1.z.number().positive(),
        /**
         * Unit (e.g., "tablet", "capsule")
         */
        unit: zod_1.z.string().min(1),
    }),
    /**
     * Days' supply (1-365)
     */
    daysSupply: zod_1.z.number().int().min(1).max(365),
});
/**
 * Package recommendation in response
 */
exports.PackageRecommendationSchema = zod_1.z.object({
    /**
     * National Drug Code
     */
    ndc: zod_1.z.string(),
    /**
     * Package size (quantity per package)
     */
    packageSize: zod_1.z.number(),
    /**
     * Unit (e.g., "TABLET")
     */
    unit: zod_1.z.string(),
    /**
     * Dosage form
     */
    dosageForm: zod_1.z.string(),
    /**
     * Marketing status
     */
    marketingStatus: zod_1.z.string().optional(),
    /**
     * Whether this NDC is active
     */
    isActive: zod_1.z.boolean(),
});
/**
 * Explanation entry
 */
exports.ExplanationSchema = zod_1.z.object({
    /**
     * Explanation step (e.g., "normalization", "calculation", "matching")
     */
    step: zod_1.z.string(),
    /**
     * Human-readable explanation
     */
    description: zod_1.z.string(),
    /**
     * Additional details
     */
    details: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Excluded NDC (inactive or recalled)
 */
exports.ExcludedNDCSchema = zod_1.z.object({
    /**
     * National Drug Code
     */
    ndc: zod_1.z.string(),
    /**
     * Reason for exclusion
     */
    reason: zod_1.z.string(),
    /**
     * Marketing status
     */
    marketingStatus: zod_1.z.string().optional(),
});
/**
 * Calculate Response Schema
 */
exports.CalculateResponseSchema = zod_1.z.object({
    /**
     * Success indicator
     */
    success: zod_1.z.boolean(),
    /**
     * Calculation data (if successful)
     */
    data: zod_1.z.object({
        /**
         * Normalized drug information
         */
        drug: zod_1.z.object({
            rxcui: zod_1.z.string(),
            name: zod_1.z.string(),
            dosageForm: zod_1.z.string().optional(),
            strength: zod_1.z.string().optional(),
        }),
        /**
         * Total quantity calculated
         */
        totalQuantity: zod_1.z.number(),
        /**
         * Recommended packages
         */
        recommendedPackages: zod_1.z.array(exports.PackageRecommendationSchema),
        /**
         * Overfill percentage
         */
        overfillPercentage: zod_1.z.number(),
        /**
         * Underfill percentage
         */
        underfillPercentage: zod_1.z.number(),
        /**
         * Warnings (e.g., "Overfill exceeds 10%")
         */
        warnings: zod_1.z.array(zod_1.z.string()),
        /**
         * Excluded NDCs with reasons
         */
        excluded: zod_1.z.array(exports.ExcludedNDCSchema).optional(),
        /**
         * Step-by-step explanations
         */
        explanations: zod_1.z.array(exports.ExplanationSchema),
    }).optional(),
    /**
     * Error information (if failed)
     */
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.unknown().optional(),
    }).optional(),
});
/**
 * AI Enhancement Info Schema (optional)
 */
exports.AIEnhancementSchema = zod_1.z.object({
    /**
     * Whether AI was used
     */
    used: zod_1.z.boolean(),
    /**
     * AI confidence score
     */
    confidence: zod_1.z.number().min(0).max(1).optional(),
    /**
     * AI reasoning
     */
    reasoning: zod_1.z.string().optional(),
    /**
     * Estimated API cost
     */
    cost: zod_1.z.number().optional(),
});
//# sourceMappingURL=calculate.schema.js.map