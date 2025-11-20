/**
 * SIG Parser Endpoint
 * Standalone endpoint for parsing free-text SIG to structured format
 */

import { Request, Response } from "express";
import {
  parseSigWithAI,
  type SigParserRequest,
} from "../../services/sig-parser";
import { createLogger } from "@core-guardrails";

const logger = createLogger({ service: "ParseSigEndpoint" });

/**
 * POST /api/v1/sig/parse
 * Parse free-text SIG directions
 */
export async function parseSigHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const startTime = Date.now();

  try {
    const request = req.body as SigParserRequest;

    logger.info("Parsing SIG request received", {
      sigLength: request.sigText?.length,
      daysSupply: request.daysSupply,
      hasDrugContext: !!request.drugContext,
    });

    // Parse the SIG
    const result = await parseSigWithAI(request);

    const executionTime = Date.now() - startTime;

    if (!result.success) {
      // Return 400 for parsing failures
      res.status(400).json({
        success: false,
        error: {
          code: result.error?.code || "SIG_PARSING_FAILED",
          message: result.error?.message || "Unable to parse SIG directions",
          details: {
            method: result.method,
            warnings: result.warnings,
            executionTime,
          },
        },
      });
      return;
    }

    // Return parsed SIG
    res.status(200).json({
      success: true,
      data: {
        parsed: result.parsed!,
        warnings: result.warnings,
        confidence: result.confidence,
        method: result.method,
      },
      metadata: {
        executionTime,
        usedAI: result.method === "ai",
        aiCost: result.aiCost,
      },
    });

    logger.info("SIG parsed successfully", {
      method: result.method,
      confidence: result.confidence,
      warningsCount: result.warnings.length,
      executionTime,
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error("SIG parsing failed", error as Error, {
      executionTime,
    });

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while parsing the SIG",
        details: { executionTime },
      },
    });
  }
}
