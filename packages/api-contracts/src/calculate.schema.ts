/**
 * Calculate API Contract
 * Zod schemas for request/response validation
 */

import { z } from "zod";

/**
 * Parsed SIG Result Schema
 * Structured data extracted from SIG (either from structured input or AI parsing)
 */
export const ParsedSigSchema = z.object({
  /**
   * Dose per administration (e.g., 2 for "2 tablets")
   */
  dose: z.number().positive(),

  /**
   * Frequency per day (e.g., 2 for "twice daily")
   */
  frequency: z.number().positive(),

  /**
   * Unit (e.g., "tablet", "capsule", "mL")
   */
  unit: z.string().min(1),

  /**
   * Route of administration (e.g., "oral", "subcutaneous")
   */
  route: z.string().optional(),

  /**
   * Duration in days (if specified in SIG text)
   */
  duration: z.number().int().positive().optional(),

  /**
   * PRN (as needed) instructions
   */
  prn: z.string().optional(),

  /**
   * Additional instructions
   */
  additionalInstructions: z.string().optional(),

  /**
   * Confidence score (0-1) if parsed by AI
   */
  confidence: z.number().min(0).max(1).optional(),
});

export type ParsedSig = z.infer<typeof ParsedSigSchema>;

/**
 * Structured SIG Schema
 */
const StructuredSigSchema = z.object({
  mode: z.literal("structured"),
  dose: z.number().positive(),
  frequency: z.number().positive(),
  unit: z.string().min(1),
});

/**
 * Free-text SIG Schema
 */
const FreeTextSigSchema = z.object({
  mode: z.literal("freetext"),
  text: z.string().min(5).max(500),
  /**
   * Optional drug context to help AI parser
   */
  drugContext: z
    .object({
      dosageForm: z.string().optional(),
      strength: z.string().optional(),
      route: z.string().optional(),
    })
    .optional(),
});

/**
 * SIG Input Schema (discriminated union)
 */
const SigInputSchema = z.discriminatedUnion("mode", [
  StructuredSigSchema,
  FreeTextSigSchema,
]);

/**
 * Calculate Request Schema
 * Supports both structured and free-text SIG input
 */
export const CalculateRequestSchema = z.object({
  /**
   * Drug name or RxCUI
   */
  drug: z
    .object({
      /**
       * Drug name (e.g., "Lisinopril")
       */
      name: z.string().min(2).max(200).optional(),

      /**
       * RxCUI if already known
       */
      rxcui: z.string().optional(),
    })
    .refine((data) => data.name || data.rxcui, {
      message: "Either name or rxcui must be provided",
    }),

  /**
   * SIG (prescription directions) - structured or free-text
   */
  sig: SigInputSchema,

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
  fillPrecision: z.enum(["exact", "overfill", "underfill"]).optional(),

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
  source: z.enum(["ai", "algorithm"]).optional(),
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
  costEfficiency: z
    .object({
      estimatedWaste: z.number(),
      rating: z.enum(["low", "medium", "high"]),
    })
    .optional(),
});

export type AIInsights = z.infer<typeof AIInsightsSchema>;

/**
 * SIG Parser Metadata Schema
 */
export const SigParserMetadataSchema = z.object({
  /**
   * Whether AI was used to parse SIG
   */
  usedAI: z.boolean(),

  /**
   * Parsed SIG result
   */
  parsed: ParsedSigSchema.optional(),

  /**
   * Original free-text (if applicable)
   */
  originalText: z.string().optional(),

  /**
   * Parser warnings
   */
  warnings: z.array(z.string()).optional(),

  /**
   * Execution time for parsing (ms)
   */
  executionTime: z.number().optional(),

  /**
   * AI cost for parsing (if AI was used)
   */
  aiCost: z.number().optional(),
});

export type SigParserMetadata = z.infer<typeof SigParserMetadataSchema>;

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

  /**
   * SIG parser metadata (if free-text SIG was provided)
   */
  sigParser: SigParserMetadataSchema.optional(),
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
  data: z
    .object({
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
    })
    .optional(),

  /**
   * Error information (if failed)
   */
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
});

export type CalculateResponse = z.infer<typeof CalculateResponseSchema>;
