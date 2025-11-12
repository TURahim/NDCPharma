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
}, "strip", z.ZodTypeAny, {
    unit: string;
    ndc: string;
    packageSize: number;
    dosageForm: string;
    isActive: boolean;
    marketingStatus?: string | undefined;
}, {
    unit: string;
    ndc: string;
    packageSize: number;
    dosageForm: string;
    isActive: boolean;
    marketingStatus?: string | undefined;
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
        }, "strip", z.ZodTypeAny, {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
        }, {
            unit: string;
            ndc: string;
            packageSize: number;
            dosageForm: string;
            isActive: boolean;
            marketingStatus?: string | undefined;
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
    } | undefined;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    } | undefined;
}>;
export type CalculateResponse = z.infer<typeof CalculateResponseSchema>;
/**
 * AI Enhancement Info Schema (optional)
 */
export declare const AIEnhancementSchema: z.ZodObject<{
    /**
     * Whether AI was used
     */
    used: z.ZodBoolean;
    /**
     * AI confidence score
     */
    confidence: z.ZodOptional<z.ZodNumber>;
    /**
     * AI reasoning
     */
    reasoning: z.ZodOptional<z.ZodString>;
    /**
     * Estimated API cost
     */
    cost: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    used: boolean;
    confidence?: number | undefined;
    reasoning?: string | undefined;
    cost?: number | undefined;
}, {
    used: boolean;
    confidence?: number | undefined;
    reasoning?: string | undefined;
    cost?: number | undefined;
}>;
export type AIEnhancement = z.infer<typeof AIEnhancementSchema>;
