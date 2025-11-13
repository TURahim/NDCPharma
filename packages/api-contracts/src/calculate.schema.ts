/**
 * Calculate API Contract
 * Zod schemas for request/response validation
 */

import { z } from "zod";

/**
 * Calculate Request Schema
 * MVP: Structured input only (defer free-text SIG parsing)
 */
export const CalculateRequestSchema = z.object({
  /**
   * Drug name or RxCUI
   */
  drug: z.object({
    /**
     * Drug name (e.g., "Lisinopril")
     */
    name: z.string().min(2).max(200).optional(),
    
    /**
     * RxCUI if already known
     */
    rxcui: z.string().optional(),
  }).refine(
    (data) => data.name || data.rxcui,
    { message: "Either name or rxcui must be provided" }
  ),
  
  /**
   * Structured SIG (prescription directions)
   * MVP: Structured input only
   */
  sig: z.object({
    /**
     * Dose per administration (e.g., 2 for "2 tablets")
     */
    dose: z.number().positive(),
    
    /**
     * Frequency per day (e.g., 2 for "twice daily")
     */
    frequency: z.number().positive(),
    
    /**
     * Unit (e.g., "tablet", "capsule")
     */
    unit: z.string().min(1),
  }),
  
  /**
   * Days' supply (1-365)
   */
  daysSupply: z.number().int().min(1).max(365),
});

export type CalculateRequest = z.infer<typeof CalculateRequestSchema>;

/**
 * Package recommendation in response
 */
export const PackageRecommendationSchema = z.object({
  /**
   * National Drug Code
   */
  ndc: z.string(),
  
  /**
   * Package size (quantity per package)
   */
  packageSize: z.number(),
  
  /**
   * Unit (e.g., "TABLET")
   */
  unit: z.string(),
  
  /**
   * Dosage form
   */
  dosageForm: z.string(),
  
  /**
   * Marketing status
   */
  marketingStatus: z.string().optional(),
  
  /**
   * Whether this NDC is active
   */
  isActive: z.boolean(),
  
  /**
   * Quantity needed from this package
   */
  quantityNeeded: z.number().optional(),
  
  /**
   * Fill precision (exact, overfill, underfill)
   */
  fillPrecision: z.enum(['exact', 'overfill', 'underfill']).optional(),
  
  /**
   * AI reasoning for this recommendation (if AI was used)
   */
  reasoning: z.string().optional(),
  
  /**
   * Confidence score (if AI was used)
   */
  confidenceScore: z.number().min(0).max(1).optional(),
  
  /**
   * Source of recommendation (ai or algorithm)
   */
  source: z.enum(['ai', 'algorithm']).optional(),
});

export type PackageRecommendation = z.infer<typeof PackageRecommendationSchema>;

/**
 * Explanation entry
 */
export const ExplanationSchema = z.object({
  /**
   * Explanation step (e.g., "normalization", "calculation", "matching")
   */
  step: z.string(),
  
  /**
   * Human-readable explanation
   */
  description: z.string(),
  
  /**
   * Additional details
   */
  details: z.record(z.unknown()).optional(),
});

export type Explanation = z.infer<typeof ExplanationSchema>;

/**
 * Excluded NDC (inactive or recalled)
 */
export const ExcludedNDCSchema = z.object({
  /**
   * National Drug Code
   */
  ndc: z.string(),
  
  /**
   * Reason for exclusion
   */
  reason: z.string(),
  
  /**
   * Marketing status
   */
  marketingStatus: z.string().optional(),
});

export type ExcludedNDC = z.infer<typeof ExcludedNDCSchema>;

/**
 * AI Insights Schema (optional)
 * Provides AI-generated recommendations and reasoning
 */
export const AIInsightsSchema = z.object({
  /**
   * Key factors considered
   */
  factors: z.array(z.string()),
  
  /**
   * Important considerations
   */
  considerations: z.array(z.string()),
  
  /**
   * Overall rationale
   */
  rationale: z.string(),
  
  /**
   * Cost efficiency analysis
   */
  costEfficiency: z.object({
    estimatedWaste: z.number(),
    rating: z.enum(['low', 'medium', 'high']),
  }).optional(),
});

export type AIInsights = z.infer<typeof AIInsightsSchema>;

/**
 * Metadata Schema
 */
export const MetadataSchema = z.object({
  /**
   * Whether AI was used for recommendations
   */
  usedAI: z.boolean(),
  
  /**
   * Whether algorithm was used as fallback
   */
  algorithmicFallback: z.boolean().optional(),
  
  /**
   * Execution time in milliseconds
   */
  executionTime: z.number(),
  
  /**
   * Estimated AI cost (if AI was used)
   */
  aiCost: z.number().optional(),
});

export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Calculate Response Schema
 */
export const CalculateResponseSchema = z.object({
  /**
   * Success indicator
   */
  success: z.boolean(),
  
  /**
   * Calculation data (if successful)
   */
  data: z.object({
    /**
     * Normalized drug information
     */
    drug: z.object({
      rxcui: z.string(),
      name: z.string(),
      dosageForm: z.string().optional(),
      strength: z.string().optional(),
    }),
    
    /**
     * Total quantity calculated
     */
    totalQuantity: z.number(),
    
    /**
     * Recommended packages
     */
    recommendedPackages: z.array(PackageRecommendationSchema),
    
    /**
     * Overfill percentage
     */
    overfillPercentage: z.number(),
    
    /**
     * Underfill percentage
     */
    underfillPercentage: z.number(),
    
    /**
     * Warnings (e.g., "Overfill exceeds 10%")
     */
    warnings: z.array(z.string()),
    
    /**
     * Excluded NDCs with reasons
     */
    excluded: z.array(ExcludedNDCSchema).optional(),
    
    /**
     * Step-by-step explanations
     */
    explanations: z.array(ExplanationSchema),
    
    /**
     * AI insights (if AI enhancement was used)
     */
    aiInsights: AIInsightsSchema.optional(),
    
    /**
     * Metadata about the calculation
     */
    metadata: MetadataSchema.optional(),
  }).optional(),
  
  /**
   * Error information (if failed)
   */
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }).optional(),
});

export type CalculateResponse = z.infer<typeof CalculateResponseSchema>;

