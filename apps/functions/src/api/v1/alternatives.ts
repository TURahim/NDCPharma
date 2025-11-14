/**
 * Alternatives Endpoint
 * Find alternative drugs when original drug is not available in FDA database
 */

import { Request, Response } from 'express';
import { createLogger } from '@core-guardrails';
import { AlternativesRequestSchema, AlternativesResponse } from '@api-contracts';
import { getAlternativeDrugs } from '@clients-rxnorm';
import { FDAClient } from '@clients-openfda';
import { compareAlternatives } from '@clients-openai';

const logger = createLogger({ service: 'AlternativesEndpoint' });
const fdaClient = new FDAClient();

/**
 * POST /api/v1/alternatives
 * Find and compare drug alternatives
 * 
 * Requires authentication
 */
export async function alternativesHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Authentication check
    // @ts-expect-error - req.user is added by auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to access drug alternatives',
        },
      } as AlternativesResponse);
      return;
    }

    // Validate request body
    const validation = AlternativesRequestSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validation.error.flatten(),
        },
      } as AlternativesResponse);
      return;
    }

    const { drug } = validation.data;
    
    logger.info('Finding drug alternatives', {
      drugName: drug.name,
      rxcui: drug.rxcui,
      // @ts-expect-error - req.user is added by auth middleware
      userId: req.user?.uid
    });

    // Step 1: Get related drugs from RxNorm
    const relatedDrugs = await getAlternativeDrugs(drug.rxcui);
    
    if (relatedDrugs.length === 0) {
      logger.info('No related drugs found in RxNorm', { rxcui: drug.rxcui });
      res.json({
        success: true,
        data: {
          originalDrug: drug.name,
          summary: 'No alternative drugs found in the same therapeutic class.',
          alternatives: [],
        },
      } as AlternativesResponse);
      return;
    }

    logger.info(`Found ${relatedDrugs.length} related drugs in RxNorm`, {
      rxcui: drug.rxcui,
      relatedCount: relatedDrugs.length
    });

    // Step 2: Filter to only FDA-approved drugs
    const fdaApprovedAlternatives = [];
    for (const related of relatedDrugs) {
      const isAvailable = await fdaClient.checkDrugAvailability(related.rxcui);
      if (isAvailable) {
        fdaApprovedAlternatives.push({
          rxcui: related.rxcui,
          name: related.name,
        });
      }
      
      // Limit to 5 alternatives max
      if (fdaApprovedAlternatives.length >= 5) {
        break;
      }
    }

    logger.info(`Found ${fdaApprovedAlternatives.length} FDA-approved alternatives`, {
      rxcui: drug.rxcui,
      fdaApprovedCount: fdaApprovedAlternatives.length
    });

    if (fdaApprovedAlternatives.length === 0) {
      res.json({
        success: true,
        data: {
          originalDrug: drug.name,
          summary: 'Related drugs were found, but none are currently available in the FDA NDC Directory.',
          alternatives: [],
        },
      } as AlternativesResponse);
      return;
    }

    // Step 3: Use AI to compare alternatives
    const comparison = await compareAlternatives({
      originalDrug: drug.name,
      originalRxcui: drug.rxcui,
      alternatives: fdaApprovedAlternatives,
    });

    // Step 4: Format response
    const alternatives = comparison.alternatives.map(alt => ({
      rxcui: alt.rxcui,
      name: alt.name,
      comparisonText: `${alt.comparison}\n\n${alt.recommendation}`,
    }));

    const executionTime = Date.now() - startTime;
    logger.info('Alternatives search completed', {
      drugName: drug.name,
      rxcui: drug.rxcui,
      alternativeCount: alternatives.length,
      executionTime
    });

    res.json({
      success: true,
      data: {
        originalDrug: drug.name,
        summary: comparison.summary,
        alternatives,
      },
    } as AlternativesResponse);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Alternatives search failed', error as Error, {
      executionTime,
    });

    res.status(500).json({
      success: false,
      error: {
        code: 'ALTERNATIVES_ERROR',
        message: 'Failed to find drug alternatives',
        details: {
          executionTime,
        },
      },
    } as AlternativesResponse);
  }
}

