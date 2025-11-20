/**
 * AI SIG Parser Service
 * Converts free-text prescription directions into structured data using AI
 */

import OpenAI from "openai";
import { createLogger } from "@core-guardrails";
import type { SigParserRequest, SigParserResult, ParsedSig } from "./types";
import {
  SIG_PARSER_SYSTEM_PROMPT,
  generateSigParserPrompt,
  validateSigParserResponse,
} from "./prompts";
import { parseWithRegex } from "./regexFallback";

const logger = createLogger({ service: "SigParser" });

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ENABLE_SIG_AI = process.env.ENABLE_SIG_AI === "true";

if (OPENAI_API_KEY && ENABLE_SIG_AI) {
  try {
    openaiClient = new OpenAI({
      apiKey: OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });
    logger.info("OpenAI client initialized for SIG parsing");
  } catch (error) {
    logger.warn("Failed to initialize OpenAI client for SIG parsing", {
      error: error as Error,
    });
  }
} else {
  logger.info("SIG AI parsing disabled (no API key or feature flag off)");
}

/**
 * Parse free-text SIG using AI
 */
export async function parseSigWithAI(
  request: SigParserRequest,
): Promise<SigParserResult> {
  const startTime = Date.now();

  // Validate input
  const validationError = validateRequest(request);
  if (validationError) {
    return {
      success: false,
      warnings: [],
      confidence: 0,
      method: "failed",
      executionTime: Date.now() - startTime,
      error: validationError,
    };
  }

  logger.info("Parsing SIG with AI", {
    sigLength: request.sigText.length,
    hasDrugContext: !!request.drugContext,
  });

  // Check if OpenAI is available
  if (!openaiClient) {
    logger.warn("OpenAI unavailable, falling back to regex parser");
    return fallbackToRegex(request, startTime);
  }

  try {
    // Generate prompt
    const userPrompt = generateSigParserPrompt(request);

    // Call OpenAI
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for parsing
      messages: [
        { role: "system", content: SIG_PARSER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.2, // Low temperature for consistent parsing
      response_format: { type: "json_object" },
    });

    const executionTime = Date.now() - startTime;

    // Extract and parse response
    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("Empty response from OpenAI");
    }

    let aiResponse: any;
    try {
      aiResponse = JSON.parse(responseContent);
    } catch (parseError) {
      logger.error("Failed to parse AI response JSON", parseError as Error);
      return fallbackToRegex(request, startTime);
    }

    // Validate response structure
    if (!validateSigParserResponse(aiResponse)) {
      logger.error("Invalid AI response structure", { response: aiResponse });
      return fallbackToRegex(request, startTime);
    }

    // Extract parsed SIG
    const parsed: ParsedSig = {
      dose: aiResponse.parsed.dose,
      frequency: aiResponse.parsed.frequency,
      unit: aiResponse.parsed.unit,
      route: aiResponse.parsed.route,
      duration: aiResponse.parsed.duration,
      prn: aiResponse.parsed.prn,
      additionalInstructions: aiResponse.parsed.additionalInstructions,
      confidence: aiResponse.confidence,
    };

    // Apply safety checks
    const safetyWarnings = applySafetyChecks(parsed, request.sigText);
    const allWarnings = [...aiResponse.warnings, ...safetyWarnings];

    // Calculate cost
    const usage = completion.usage || {
      prompt_tokens: 0,
      completion_tokens: 0,
    };
    const aiCost = calculateCost(usage.prompt_tokens, usage.completion_tokens);

    logger.info("SIG parsed successfully with AI", {
      confidence: aiResponse.confidence,
      warningsCount: allWarnings.length,
      executionTime,
      aiCost,
    });

    // Log the reasoning for audit
    logger.debug("AI parsing reasoning", { reasoning: aiResponse.reasoning });

    return {
      success: true,
      parsed,
      warnings: allWarnings,
      confidence: aiResponse.confidence,
      method: "ai",
      executionTime,
      aiCost,
    };
  } catch (error) {
    logger.error("AI SIG parsing failed", error as Error);
    return fallbackToRegex(request, startTime);
  }
}

/**
 * Fallback to regex-based parsing
 */
function fallbackToRegex(
  request: SigParserRequest,
  startTime: number,
): SigParserResult {
  logger.info("Attempting regex fallback parsing");

  const parsed = parseWithRegex(request.sigText);
  const executionTime = Date.now() - startTime;

  if (!parsed || !parsed.dose || !parsed.frequency || !parsed.unit) {
    return {
      success: false,
      warnings: ["Unable to parse SIG automatically. Manual entry required."],
      confidence: 0,
      method: "failed",
      executionTime,
      error: {
        code: "AI_PARSING_FAILED",
        message:
          "Unable to parse SIG text. Please verify and enter quantity manually.",
      },
    };
  }

  const fullParsed: ParsedSig = {
    dose: parsed.dose,
    frequency: parsed.frequency,
    unit: parsed.unit,
    route: parsed.route,
    duration: parsed.duration,
    prn: parsed.prn,
    additionalInstructions: parsed.additionalInstructions,
    confidence: 0.6, // Lower confidence for regex parsing
  };

  const warnings = [
    "SIG parsed using basic pattern matching (AI unavailable). Please verify accuracy.",
  ];

  const safetyWarnings = applySafetyChecks(fullParsed, request.sigText);
  warnings.push(...safetyWarnings);

  logger.info("SIG parsed with regex fallback", {
    confidence: 0.6,
    warningsCount: warnings.length,
    executionTime,
  });

  return {
    success: true,
    parsed: fullParsed,
    warnings,
    confidence: 0.6,
    method: "regex_fallback",
    executionTime,
  };
}

/**
 * Validate request
 */
function validateRequest(
  request: SigParserRequest,
): { code: string; message: string } | null {
  if (!request.sigText || typeof request.sigText !== "string") {
    return {
      code: "INVALID_INPUT",
      message: "SIG text is required",
    };
  }

  if (request.sigText.trim().length < 5) {
    return {
      code: "TEXT_TOO_SHORT",
      message: "SIG text must be at least 5 characters",
    };
  }

  if (request.sigText.length > 500) {
    return {
      code: "TEXT_TOO_LONG",
      message: "SIG text must be less than 500 characters",
    };
  }

  if (!request.daysSupply || request.daysSupply <= 0) {
    return {
      code: "INVALID_INPUT",
      message: "Days supply must be a positive number",
    };
  }

  return null;
}

/**
 * Apply safety checks to parsed SIG
 */
function applySafetyChecks(parsed: ParsedSig, originalText: string): string[] {
  const warnings: string[] = [];

  // Check for unusually high doses
  if (
    parsed.dose > 10 &&
    ["tablet", "capsule"].includes(parsed.unit.toLowerCase())
  ) {
    warnings.push(
      `High dose detected: ${parsed.dose} ${parsed.unit}. Please verify.`,
    );
  }

  // Check for high frequency
  if (parsed.frequency > 8) {
    warnings.push(
      `High frequency detected: ${parsed.frequency} times per day. Please verify.`,
    );
  }

  // Check for liquid doses > 30 mL per dose (unusual)
  if (parsed.unit.toLowerCase() === "ml" && parsed.dose > 30) {
    warnings.push(
      `Large liquid dose detected: ${parsed.dose} mL. Please verify.`,
    );
  }

  // Check for insulin doses > 100 units per dose (potentially dangerous)
  if (parsed.unit.toLowerCase() === "unit" && parsed.dose > 100) {
    warnings.push(
      `⚠️ HIGH INSULIN DOSE: ${parsed.dose} units. VERIFY IMMEDIATELY.`,
    );
  }

  // Check for ambiguous text patterns
  if (originalText.match(/\d+-\d+/)) {
    warnings.push(
      "Dose range detected in original text. Calculation uses lower value.",
    );
  }

  // Low confidence warning
  if (parsed.confidence && parsed.confidence < 0.7) {
    warnings.push(
      "Parsing confidence is low. Please review and verify the calculated quantity.",
    );
  }

  return warnings;
}

/**
 * Calculate cost for OpenAI usage
 */
function calculateCost(promptTokens: number, completionTokens: number): number {
  // gpt-4o-mini pricing (per 1K tokens)
  const INPUT_COST = 0.00015;
  const OUTPUT_COST = 0.0006;

  const promptCost = (promptTokens / 1000) * INPUT_COST;
  const completionCost = (completionTokens / 1000) * OUTPUT_COST;

  return parseFloat((promptCost + completionCost).toFixed(6));
}
