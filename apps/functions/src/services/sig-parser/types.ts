/**
 * SIG Parser Types
 * Types for AI-powered SIG parsing service
 */

export interface ParsedSig {
  dose: number;
  frequency: number;
  unit: string;
  route?: string;
  duration?: number;
  prn?: string;
  additionalInstructions?: string;
  confidence?: number;
}

export interface SigParserRequest {
  /** Free-text SIG from prescription */
  sigText: string;

  /** Days supply from separate field */
  daysSupply: number;

  /** Drug context to help AI parser */
  drugContext?: {
    genericName?: string;
    brandName?: string;
    dosageForm?: string;
    strength?: string;
    route?: string;
  };
}

export interface SigParserResult {
  success: boolean;
  parsed?: ParsedSig;
  warnings: string[];
  confidence: number;
  method: "ai" | "regex_fallback" | "failed";
  executionTime: number;
  aiCost?: number;
  error?: {
    code: string;
    message: string;
  };
}

export type SigParserErrorCode =
  | "INVALID_INPUT"
  | "TEXT_TOO_SHORT"
  | "TEXT_TOO_LONG"
  | "AI_SERVICE_UNAVAILABLE"
  | "AI_PARSING_FAILED"
  | "AMBIGUOUS_SIG"
  | "MISSING_REQUIRED_FIELDS"
  | "UNSAFE_DOSING";
