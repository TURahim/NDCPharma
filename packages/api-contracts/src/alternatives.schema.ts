/**
 * Alternatives API Contract
 * Zod schemas for drug alternatives request/response validation
 */

import { z } from "zod";

/**
 * Alternatives Request Schema
 * Request for drug alternatives when original drug is not available
 */
export const AlternativesRequestSchema = z.object({
  /**
   * Drug information
   */
  drug: z.object({
    /**
     * Drug name
     */
    name: z.string().min(2).max(200),
    
    /**
     * RxCUI
     */
    rxcui: z.string(),
  }),
});

export type AlternativesRequest = z.infer<typeof AlternativesRequestSchema>;

/**
 * Alternative Drug Schema
 * Single alternative drug with comparison
 */
export const AlternativeDrugSchema = z.object({
  /**
   * Alternative drug RxCUI
   */
  rxcui: z.string(),
  
  /**
   * Alternative drug name
   */
  name: z.string(),
  
  /**
   * AI-generated comparison text
   */
  comparisonText: z.string(),
});

export type AlternativeDrug = z.infer<typeof AlternativeDrugSchema>;

/**
 * Alternatives Response Schema
 */
export const AlternativesResponseSchema = z.object({
  /**
   * Success indicator
   */
  success: z.boolean(),
  
  /**
   * Response data (present on success)
   */
  data: z.object({
    /**
     * Original drug name
     */
    originalDrug: z.string(),
    
    /**
     * Summary explanation
     */
    summary: z.string().optional(),
    
    /**
     * Array of alternative drugs
     */
    alternatives: z.array(AlternativeDrugSchema),
  }).optional(),
  
  /**
   * Error information (present on failure)
   */
  error: z.object({
    /**
     * Error code
     */
    code: z.string(),
    
    /**
     * Error message
     */
    message: z.string(),
    
    /**
     * Additional error details
     */
    details: z.record(z.any()).optional(),
  }).optional(),
});

export type AlternativesResponse = z.infer<typeof AlternativesResponseSchema>;

