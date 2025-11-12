/**
 * Calculate Endpoint
 * Main API endpoint for NDC package calculation
 */

import { Request, Response } from 'express';
import { nameToRxCui } from '@clients-rxnorm';
import { calculateTotalQuantity, matchPackagesToQuantity } from '@domain-ndc';
import { 
  CalculateRequest, 
  CalculateResponse,
  Explanation 
} from '@api-contracts';
import { createLogger } from '@core-guardrails';

const logger = createLogger({ service: 'calculate-endpoint' });

/**
 * Calculate NDC packages for prescription
 */
export async function calculateHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const request = req.body as CalculateRequest;
  const explanations: Explanation[] = [];
  
  try {
    // Step 1: Normalize drug name to RxCUI
    explanations.push({
      step: 'normalization',
      description: 'Normalizing drug name to RxCUI',
      details: { input: request.drug },
    });
    
    const drugName = request.drug.name || '';
    const rxcuiResult = await nameToRxCui(drugName);
    
    explanations.push({
      step: 'normalization_complete',
      description: `Drug normalized to RxCUI ${rxcuiResult.rxcui} with ${(rxcuiResult.confidence * 100).toFixed(1)}% confidence`,
      details: {
        rxcui: rxcuiResult.rxcui,
        name: rxcuiResult.name,
        confidence: rxcuiResult.confidence,
      },
    });
    
    // Step 2: Calculate total quantity
    explanations.push({
      step: 'calculation',
      description: 'Calculating total quantity needed',
      details: {
        dose: request.sig.dose,
        frequency: request.sig.frequency,
        daysSupply: request.daysSupply,
      },
    });
    
    const totalQuantity = calculateTotalQuantity({
      dosePerAdministration: request.sig.dose,
      frequencyPerDay: request.sig.frequency,
      daysSupply: request.daysSupply,
    });
    
    explanations.push({
      step: 'calculation_complete',
      description: `Total quantity calculated: ${totalQuantity} ${request.sig.unit}(s)`,
      details: {
        totalQuantity,
        formula: `${request.sig.dose} × ${request.sig.frequency} × ${request.daysSupply} = ${totalQuantity}`,
      },
    });
    
    // Step 3: Match to packages (MVP: Mock packages for now)
    // In future PR, this will fetch real NDCs from RxNorm and enrich with openFDA
    explanations.push({
      step: 'package_matching',
      description: 'Matching quantity to available packages',
      details: { requiredQuantity: totalQuantity },
    });
    
    // Mock packages for MVP (future: fetch from rxcuiToNdcs + enrichNdcs)
    const mockPackages = [
      {
        ndc: '12345-678-90',
        packageSize: 30,
        unit: request.sig.unit.toUpperCase(),
        dosageForm: rxcuiResult.dosageForm || 'TABLET',
        isActive: true,
      },
      {
        ndc: '12345-678-91',
        packageSize: 90,
        unit: request.sig.unit.toUpperCase(),
        dosageForm: rxcuiResult.dosageForm || 'TABLET',
        isActive: true,
      },
      {
        ndc: '12345-678-92',
        packageSize: 60,
        unit: request.sig.unit.toUpperCase(),
        dosageForm: rxcuiResult.dosageForm || 'TABLET',
        isActive: true,
      },
    ];
    
    const matchResult = matchPackagesToQuantity(totalQuantity, mockPackages);
    
    explanations.push({
      step: 'package_matching_complete',
      description: matchResult.recommendedPackages.length > 0
        ? `Found ${matchResult.recommendedPackages.length} matching package(s)`
        : 'No suitable packages found',
      details: {
        recommendedCount: matchResult.recommendedPackages.length,
        overfillPercentage: matchResult.overfillPercentage,
      },
    });
    
    // Build response
    const executionTime = Date.now() - startTime;
    
    const response: CalculateResponse = {
      success: true,
      data: {
        drug: {
          rxcui: rxcuiResult.rxcui,
          name: rxcuiResult.name,
          dosageForm: rxcuiResult.dosageForm,
          strength: rxcuiResult.strength,
        },
        totalQuantity,
        recommendedPackages: matchResult.recommendedPackages,
        overfillPercentage: matchResult.overfillPercentage,
        underfillPercentage: matchResult.underfillPercentage,
        warnings: matchResult.warnings,
        explanations,
      },
    };
    
    logger.info('Calculate request completed', {
      rxcui: rxcuiResult.rxcui,
      totalQuantity,
      packagesFound: matchResult.recommendedPackages.length,
      executionTime,
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    const executionTime = Date.now() - startTime;

    const err = error instanceof Error ? error : undefined;
    const errorMessage = err ? err.message : String(error);

    logger.error('Calculate request failed', err, {
      executionTime,
      errorMessage,
    });
    
    const response: CalculateResponse = {
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Calculation failed',
        details: { explanations },
      },
    };
    
    res.status(500).json(response);
  }
}

