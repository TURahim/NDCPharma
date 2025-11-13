"use strict";
/**
 * Calculate API Contract
 * Zod schemas for request/response validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculateResponseSchema = exports.MetadataSchema = exports.AIInsightsSchema = exports.ExcludedNDCSchema = exports.ExplanationSchema = exports.PackageRecommendationSchema = exports.CalculateRequestSchema = void 0;
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
    /**
     * Quantity needed from this package
     */
    quantityNeeded: zod_1.z.number().optional(),
    /**
     * Fill precision (exact, overfill, underfill)
     */
    fillPrecision: zod_1.z.enum(['exact', 'overfill', 'underfill']).optional(),
    /**
     * AI reasoning for this recommendation (if AI was used)
     */
    reasoning: zod_1.z.string().optional(),
    /**
     * Confidence score (if AI was used)
     */
    confidenceScore: zod_1.z.number().min(0).max(1).optional(),
    /**
     * Source of recommendation (ai or algorithm)
     */
    source: zod_1.z.enum(['ai', 'algorithm']).optional(),
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
 * AI Insights Schema (optional)
 * Provides AI-generated recommendations and reasoning
 */
exports.AIInsightsSchema = zod_1.z.object({
    /**
     * Key factors considered
     */
    factors: zod_1.z.array(zod_1.z.string()),
    /**
     * Important considerations
     */
    considerations: zod_1.z.array(zod_1.z.string()),
    /**
     * Overall rationale
     */
    rationale: zod_1.z.string(),
    /**
     * Cost efficiency analysis
     */
    costEfficiency: zod_1.z.object({
        estimatedWaste: zod_1.z.number(),
        rating: zod_1.z.enum(['low', 'medium', 'high']),
    }).optional(),
});
/**
 * Metadata Schema
 */
exports.MetadataSchema = zod_1.z.object({
    /**
     * Whether AI was used for recommendations
     */
    usedAI: zod_1.z.boolean(),
    /**
     * Whether algorithm was used as fallback
     */
    algorithmicFallback: zod_1.z.boolean().optional(),
    /**
     * Execution time in milliseconds
     */
    executionTime: zod_1.z.number(),
    /**
     * Estimated AI cost (if AI was used)
     */
    aiCost: zod_1.z.number().optional(),
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
        /**
         * AI insights (if AI enhancement was used)
         */
        aiInsights: exports.AIInsightsSchema.optional(),
        /**
         * Metadata about the calculation
         */
        metadata: exports.MetadataSchema.optional(),
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
