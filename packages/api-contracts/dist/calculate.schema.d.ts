/**
 * Calculate API Contract
 * Zod schemas for request/response validation
 */
import { z } from "zod";
/**
 * Calculate Request Schema
 * MVP: Structured input only (defer free-text SIG parsing)
 */
export declare const CalculateRequestSchema: z.ZodObject<{
    /**
     * Drug name or RxCUI
     */
    drug: z.ZodEffects<z.ZodObject<{
        /**
         * Drug name (e.g., "Lisinopril")
         */
        name: z.ZodOptional<z.ZodString>;
        /**
         * RxCUI if already known
         */
        rxcui: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        rxcui?: string | undefined;
    }, {
        name?: string | undefined;
        rxcui?: string | undefined;
    }>, {
        name?: string | undefined;
        rxcui?: string | undefined;
    }, {
        name?: string | undefined;
        rxcui?: string | undefined;
    }>;
    /**
     * Structured SIG (prescription directions)
     * MVP: Structured input only
     */
    sig: z.ZodObject<{
        /**
         * Dose per administration (e.g., 2 for "2 tablets")
         */
        dose: z.ZodNumber;
        /**
         * Frequency per day (e.g., 2 for "twice daily")
         */
        frequency: z.ZodNumber;
        /**
         * Unit (e.g., "tablet", "capsule")
         */
        unit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        dose: number;
        frequency: number;
        unit: string;
    }, {
        dose: number;
        frequency: number;
        unit: string;
    }>;
    /**
     * Days' supply (1-365)
     */
    daysSupply: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    drug: {
        name?: string | undefined;
        rxcui?: string | undefined;
    };
    sig: {
        dose: number;
        frequency: number;
        unit: string;
    };
    daysSupply: number;
}, {
    drug: {
        name?: string | undefined;
        rxcui?: string | undefined;
    };
    sig: {
        dose: number;
        frequency: number;
        unit: string;
    };
    daysSupply: number;
}>;
export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;
/**
 * Package recommendation in response
 */
export declare const PackageRecommendationSchema: z.ZodObject<{
    /**
     * National Drug Code
     */
    ndc: z.ZodString;
    /**
     * Package size (quantity per package)
     */
    packageSize: z.ZodNumber;
    /**
     * Unit (e.g., "TABLET")
     */
    unit: z.ZodString;
    /**
     * Dosage form
     */
    dosageForm: z.ZodString;
    /**
     * Marketing status
     */
    marketingStatus: z.ZodOptional<z.ZodString>;
    /**
     * Whether this NDC is active
     */
    isActive: z.ZodBoolean;
    /**
     * Quantity needed from this package
     */
    quantityNeeded: z.ZodOptional<z.ZodNumber>;
    /**
     * Fill precision (exact, overfill, underfill)
     */
    fillPrecision: z.ZodOptional<z.ZodEnum<["exact", "overfill", "underfill"]>>;
    /**
     * AI reasoning for this recommendation (if AI was used)
     */
    reasoning: z.ZodOptional<z.ZodString>;
    /**
     * Confidence score (if AI was used)
     */
    confidenceScore: z.ZodOptional<z.ZodNumber>;
    /**
     * Source of recommendation (ai or algorithm)
     */
    source: z.ZodOptional<z.ZodEnum<["ai", "algorithm"]>>;
}, "strip", z.ZodTypeAny, {
    unit: string;
    ndc: string;
    packageSize: number;
    dosageForm: string;
    isActive: boolean;
    marketingStatus?: string | undefined;
    quantityNeeded?: number | undefined;
    fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
    reasoning?: string | undefined;
    confidenceScore?: number | undefined;
    source?: "ai" | "algorithm" | undefined;
}, {
    unit: string;
    ndc: string;
    packageSize: number;
    dosageForm: string;
    isActive: boolean;
    marketingStatus?: string | undefined;
    quantityNeeded?: number | undefined;
    fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
    reasoning?: string | undefined;
    confidenceScore?: number | undefined;
    source?: "ai" | "algorithm" | undefined;
}>;
export type PackageRecommendation = z.infer<typeof PackageRecommendationSchema>;
/**
 * Explanation entry
 */
export declare const ExplanationSchema: z.ZodObject<{
    /**
     * Explanation step (e.g., "normalization", "calculation", "matching")
     */
    step: z.ZodString;
    /**
     * Human-readable explanation
     */
    description: z.ZodString;
    /**
     * Additional details
     */
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    step: string;
    description: string;
    details?: Record<string, unknown> | undefined;
}, {
    step: string;
    description: string;
    details?: Record<string, unknown> | undefined;
}>;
export type Explanation = z.infer<typeof ExplanationSchema>;
/**
 * Excluded NDC (inactive or recalled)
 */
export declare const ExcludedNDCSchema: z.ZodObject<{
    /**
     * National Drug Code
     */
    ndc: z.ZodString;
    /**
     * Reason for exclusion
     */
    reason: z.ZodString;
    /**
     * Marketing status
     */
    marketingStatus: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    ndc: string;
    reason: string;
    marketingStatus?: string | undefined;
}, {
    ndc: string;
    reason: string;
    marketingStatus?: string | undefined;
}>;
export type ExcludedNDC = z.infer<typeof ExcludedNDCSchema>;
/**
 * AI Insights Schema (optional)
 * Provides AI-generated recommendations and reasoning
 */
export declare const AIInsightsSchema: z.ZodObject<{
    /**
     * Key factors considered
     */
    factors: z.ZodArray<z.ZodString, "many">;
    /**
     * Important considerations
     */
    considerations: z.ZodArray<z.ZodString, "many">;
    /**
     * Overall rationale
     */
    rationale: z.ZodString;
    /**
     * Cost efficiency analysis
     */
    costEfficiency: z.ZodOptional<z.ZodObject<{
        estimatedWaste: z.ZodNumber;
        rating: z.ZodEnum<["low", "medium", "high"]>;
    }, "strip", z.ZodTypeAny, {
        estimatedWaste: number;
        rating: "low" | "medium" | "high";
    }, {
        estimatedWaste: number;
        rating: "low" | "medium" | "high";
    }>>;
}, "strip", z.ZodTypeAny, {
    factors: string[];
    considerations: string[];
    rationale: string;
    costEfficiency?: {
        estimatedWaste: number;
        rating: "low" | "medium" | "high";
    } | undefined;
}, {
    factors: string[];
    considerations: string[];
    rationale: string;
    costEfficiency?: {
        estimatedWaste: number;
        rating: "low" | "medium" | "high";
    } | undefined;
}>;
export type AIInsights = z.infer<typeof AIInsightsSchema>;
/**
 * Metadata Schema
 */
export declare const MetadataSchema: z.ZodObject<{
    /**
     * Whether AI was used for recommendations
     */
    usedAI: z.ZodBoolean;
    /**
     * Whether algorithm was used as fallback
     */
    algorithmicFallback: z.ZodOptional<z.ZodBoolean>;
    /**
     * Execution time in milliseconds
     */
    executionTime: z.ZodNumber;
    /**
     * Estimated AI cost (if AI was used)
     */
    aiCost: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    usedAI: boolean;
    executionTime: number;
    algorithmicFallback?: boolean | undefined;
    aiCost?: number | undefined;
}, {
    usedAI: boolean;
    executionTime: number;
    algorithmicFallback?: boolean | undefined;
    aiCost?: number | undefined;
}>;
export type Metadata = z.infer<typeof MetadataSchema>;
/**
 * Calculate Response Schema
 */
export declare const CalculateResponseSchema: z.ZodObject<{
    /**
     * Success indicator
     */
    success: z.ZodBoolean;
    /**
     * Calculation data (if successful)
     */
    data: z.ZodOptional<z.ZodObject<{
        /**
         * Normalized drug information
         */
        drug: z.ZodObject<{
            rxcui: z.ZodString;
            name: z.ZodString;
            dosageForm: z.ZodOptional<z.ZodString>;
            strength: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        }, {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        }>;
        /**
         * Total quantity calculated
         */
        totalQuantity: z.ZodNumber;
        /**
         * Recommended packages
         */
        recommendedPackages: z.ZodArray<z.ZodObject<{
            /**
             * National Drug Code
             */
            ndc: z.ZodString;
            /**
             * Package size (quantity per package)
             */
            packageSize: z.ZodNumber;
            /**
             * Unit (e.g., "TABLET")
             */
            unit: z.ZodString;
            /**
             * Dosage form
             */
            dosageForm: z.ZodString;
            /**
             * Marketing status
             */
            marketingStatus: z.ZodOptional<z.ZodString>;
            /**
             * Whether this NDC is active
             */
            isActive: z.ZodBoolean;
            /**
             * Quantity needed from this package
             */
            quantityNeeded: z.ZodOptional<z.ZodNumber>;
            /**
             * Fill precision (exact, overfill, underfill)
             */
            fillPrecision: z.ZodOptional<z.ZodEnum<["exact", "overfill", "underfill"]>>;
            /**
             * AI reasoning for this recommendation (if AI was used)
             */
            reasoning: z.ZodOptional<z.ZodString>;
            /**
             * Confidence score (if AI was used)
             */
            confidenceScore: z.ZodOptional<z.ZodNumber>;
            /**
             * Source of recommendation (ai or algorithm)
             */
            source: z.ZodOptional<z.ZodEnum<["ai", "algorithm"]>>;
        }, "strip", z.ZodTypeAny, {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }, {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }>, "many">;
        /**
         * Overfill percentage
         */
        overfillPercentage: z.ZodNumber;
        /**
         * Underfill percentage
         */
        underfillPercentage: z.ZodNumber;
        /**
         * Warnings (e.g., "Overfill exceeds 10%")
         */
        warnings: z.ZodArray<z.ZodString, "many">;
        /**
         * Excluded NDCs with reasons
         */
        excluded: z.ZodOptional<z.ZodArray<z.ZodObject<{
            /**
             * National Drug Code
             */
            ndc: z.ZodString;
            /**
             * Reason for exclusion
             */
            reason: z.ZodString;
            /**
             * Marketing status
             */
            marketingStatus: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }, {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }>, "many">>;
        /**
         * Step-by-step explanations
         */
        explanations: z.ZodArray<z.ZodObject<{
            /**
             * Explanation step (e.g., "normalization", "calculation", "matching")
             */
            step: z.ZodString;
            /**
             * Human-readable explanation
             */
            description: z.ZodString;
            /**
             * Additional details
             */
            details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }, {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }>, "many">;
        /**
         * AI insights (if AI enhancement was used)
         */
        aiInsights: z.ZodOptional<z.ZodObject<{
            /**
             * Key factors considered
             */
            factors: z.ZodArray<z.ZodString, "many">;
            /**
             * Important considerations
             */
            considerations: z.ZodArray<z.ZodString, "many">;
            /**
             * Overall rationale
             */
            rationale: z.ZodString;
            /**
             * Cost efficiency analysis
             */
            costEfficiency: z.ZodOptional<z.ZodObject<{
                estimatedWaste: z.ZodNumber;
                rating: z.ZodEnum<["low", "medium", "high"]>;
            }, "strip", z.ZodTypeAny, {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            }, {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            }>>;
        }, "strip", z.ZodTypeAny, {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        }, {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        }>>;
        /**
         * Metadata about the calculation
         */
        metadata: z.ZodOptional<z.ZodObject<{
            /**
             * Whether AI was used for recommendations
             */
            usedAI: z.ZodBoolean;
            /**
             * Whether algorithm was used as fallback
             */
            algorithmicFallback: z.ZodOptional<z.ZodBoolean>;
            /**
             * Execution time in milliseconds
             */
            executionTime: z.ZodNumber;
            /**
             * Estimated AI cost (if AI was used)
             */
            aiCost: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        }, {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        drug: {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        };
        totalQuantity: number;
        recommendedPackages: {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }[];
        overfillPercentage: number;
        underfillPercentage: number;
        warnings: string[];
        explanations: {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }[];
        excluded?: {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }[] | undefined;
        aiInsights?: {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        } | undefined;
        metadata?: {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        } | undefined;
    }, {
        drug: {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        };
        totalQuantity: number;
        recommendedPackages: {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }[];
        overfillPercentage: number;
        underfillPercentage: number;
        warnings: string[];
        explanations: {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }[];
        excluded?: {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }[] | undefined;
        aiInsights?: {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        } | undefined;
        metadata?: {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        } | undefined;
    }>>;
    /**
     * Error information (if failed)
     */
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
    }, {
        code: string;
        message: string;
        details?: unknown;
    }>>;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    data?: {
        drug: {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        };
        totalQuantity: number;
        recommendedPackages: {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }[];
        overfillPercentage: number;
        underfillPercentage: number;
        warnings: string[];
        explanations: {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }[];
        excluded?: {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }[] | undefined;
        aiInsights?: {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        } | undefined;
        metadata?: {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        } | undefined;
    } | undefined;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
}, {
    success: boolean;
    data?: {
        drug: {
            name: string;
            rxcui: string;
            dosageForm?: string | undefined;
            strength?: string | undefined;
        };
        totalQuantity: number;
        recommendedPackages: {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
            quantityNeeded?: number | undefined;
            fillPrecision?: "exact" | "overfill" | "underfill" | undefined;
            reasoning?: string | undefined;
            confidenceScore?: number | undefined;
            source?: "ai" | "algorithm" | undefined;
        }[];
        overfillPercentage: number;
        underfillPercentage: number;
        warnings: string[];
        explanations: {
            step: string;
            description: string;
            details?: Record<string, unknown> | undefined;
        }[];
        excluded?: {
            ndc: string;
            reason: string;
            marketingStatus?: string | undefined;
        }[] | undefined;
        aiInsights?: {
            factors: string[];
            considerations: string[];
            rationale: string;
            costEfficiency?: {
                estimatedWaste: number;
                rating: "low" | "medium" | "high";
            } | undefined;
        } | undefined;
        metadata?: {
            usedAI: boolean;
            executionTime: number;
            algorithmicFallback?: boolean | undefined;
            aiCost?: number | undefined;
        } | undefined;
    } | undefined;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
}>;
export type CalculateResponse = z.infer<typeof CalculateResponseSchema>;
