/**
 * Type Definitions for OpenAI Integration
 * AI-enhanced NDC matching and recommendation
 */

/**
 * NDC Recommendation Request
 * Input provided to the AI for matching
 */
export interface NDCRecommendationRequest {
  /** Normalized drug information */
  drug: {
    /** Generic drug name */
    genericName: string;
    /** RxCUI identifier */
    rxcui: string;
    /** Brand name (if available) */
    brandName?: string;
    /** Dosage form (e.g., TABLET, CAPSULE) */
    dosageForm?: string;
    /** Strength (e.g., "10 mg") */
    strength?: string;
  };

  /** Prescription details */
  prescription: {
    /** SIG (e.g., "1 tablet daily") */
    sig: string;
    /** Days' supply */
    daysSupply: number;
    /** Calculated total quantity needed */
    quantityNeeded: number;
  };

  /** Available NDC packages from FDA */
  availablePackages: Array<{
    ndc: string;
    packageSize: number;
    unit: string;
    labeler: string;
    isActive: boolean;
  }>;

  /** Additional context */
  context?: {
    /** Patient preferences (if any) */
    preferences?: string;
    /** Specific clinical considerations */
    clinicalNotes?: string;
  };
}

/**
 * AI NDC Recommendation Response
 * Structured output from the AI
 */
export interface NDCRecommendationResponse {
  /** Primary recommended NDC */
  primaryRecommendation: {
    ndc: string;
    packageSize: number;
    unit: string;
    quantityToDispense: number;
    reasoning: string;
    confidenceScore: number; // 0-1
  };

  /** Alternative recommendations */
  alternatives: Array<{
    ndc: string;
    packageSize: number;
    unit: string;
    quantityToDispense: number;
    reasoning: string;
    confidenceScore: number;
  }>;

  /** AI's reasoning process */
  reasoning: {
    /** Key factors considered */
    factors: string[];
    /** Potential risks or considerations */
    considerations: string[];
    /** Why this recommendation over others */
    rationale: string;
  };

  /** Cost efficiency analysis */
  costEfficiency?: {
    /** Estimated waste percentage */
    estimatedWaste: number;
    /** Cost-effectiveness rating (low/medium/high) */
    rating: 'low' | 'medium' | 'high';
  };
}

/**
 * OpenAI Service Configuration
 */
export interface OpenAIServiceConfig {
  /** OpenAI API key (optional, falls back to env var) */
  apiKey?: string;

  /** Model to use (default: gpt-4o) */
  model?: string;

  /** Maximum tokens for completion */
  maxTokens?: number;

  /** Temperature for creativity (0-2) */
  temperature?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum number of retries */
  maxRetries?: number;

  /** Retry delay in milliseconds */
  retryDelay?: number;
}

/**
 * OpenAI API Usage Metrics
 */
export interface OpenAIUsageMetrics {
  /** Prompt tokens used */
  promptTokens: number;

  /** Completion tokens used */
  completionTokens: number;

  /** Total tokens used */
  totalTokens: number;

  /** Estimated cost in USD */
  estimatedCost: number;

  /** Latency in milliseconds */
  latency: number;

  /** Model used */
  model: string;

  /** Timestamp */
  timestamp: string;
}

/**
 * OpenAI Error Response
 */
export interface OpenAIError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error type */
  type: 'api_error' | 'rate_limit' | 'invalid_request' | 'authentication' | 'timeout';

  /** HTTP status code */
  statusCode?: number;
}

/**
 * Circuit Breaker State
 */
export interface CircuitBreakerState {
  /** Current state: open, closed, half-open */
  state: 'open' | 'closed' | 'half-open';

  /** Number of consecutive failures */
  failures: number;

  /** Timestamp of last failure */
  lastFailure?: string;

  /** Timestamp when circuit can retry */
  nextRetryAt?: string;
}

/**
 * AI Recommendation Result
 * Wrapper with metadata
 */
export interface AIRecommendationResult {
  /** Success status */
  success: boolean;

  /** Recommendation data (if successful) */
  recommendation?: NDCRecommendationResponse;

  /** Error (if failed) */
  error?: OpenAIError;

  /** Usage metrics */
  usage?: OpenAIUsageMetrics;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Whether fallback was used */
  usedFallback: boolean;
}

