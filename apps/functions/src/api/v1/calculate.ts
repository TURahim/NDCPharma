/**
 * Main Calculator Endpoint
 * Orchestrates all services to deliver NDC calculation results
 */

import { Request, Response } from 'express';
import {
  CalculateRequest,
  CalculateResponse,
  PackageRecommendation,
  Explanation,
  ExcludedNDC,
  AIInsights,
  Metadata,
} from '@api-contracts';
import { nameToRxCui } from '@clients-rxnorm';
import { fdaClient, type NDCPackage } from '@clients-openfda';
import { ndcRecommender, type NDCRecommendationRequest } from '@clients-openai';
import { createLogger } from '@core-guardrails';
import { ENABLE_OPENAI_ENHANCER } from '@core-config';

const logger = createLogger({ service: 'CalculateEndpoint' });

/**
 * POST /api/v1/calculate
 * Main calculation endpoint
 */
export async function calculateHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const request = req.body as CalculateRequest;
  
  const explanations: Explanation[] = [];
  const warnings: string[] = [];
  const excluded: ExcludedNDC[] = [];

  try {
    logger.info('Starting NDC calculation', {
      drug: request.drug,
      daysSupply: request.daysSupply,
    });

    // ==========================================
    // STEP 1: Normalize drug name to RxCUI
    // ==========================================
    let rxcui: string;
    let drugName: string;
    let dosageForm: string | undefined;
    let strength: string | undefined;

    if (request.drug.rxcui) {
      // RxCUI provided, use directly
      rxcui = request.drug.rxcui;
      logger.debug('Using provided RxCUI', { rxcui });
      
      explanations.push({
        step: 'normalization',
        description: `Using provided RxCUI: ${rxcui}`,
        details: { source: 'user_provided' },
      });
    } else if (request.drug.name) {
      // Normalize drug name to RxCUI
      logger.debug('Normalizing drug name', { drugName: request.drug.name });
      
      const normalizationResult = await nameToRxCui(request.drug.name);
      
      if (!normalizationResult.rxcui) {
        throw new Error(`Drug not found: ${request.drug.name}`);
      }
      
      rxcui = normalizationResult.rxcui;
      drugName = normalizationResult.name;
      dosageForm = normalizationResult.dosageForm;
      strength = normalizationResult.strength;
      
      logger.info('Drug normalized successfully', {
        originalName: request.drug.name,
        normalizedName: drugName,
        rxcui,
        confidence: normalizationResult.confidence,
      });
      
      explanations.push({
        step: 'normalization',
        description: `Normalized "${request.drug.name}" to RxCUI ${rxcui} (${drugName})`,
        details: {
          confidence: normalizationResult.confidence,
          dosageForm,
          strength,
        },
      });

      if (normalizationResult.confidence < 0.8) {
        warnings.push(
          `Drug name confidence is ${(normalizationResult.confidence * 100).toFixed(0)}%. ` +
          `Please verify: ${drugName}`
        );
      }
    } else {
      throw new Error('Either drug name or RxCUI must be provided');
    }

    // ==========================================
    // STEP 2: Fetch NDC packages from FDA
    // ==========================================
    logger.debug('Fetching NDC packages from FDA', { rxcui });
    
    const allPackages = await fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 });
    
    if (!allPackages || allPackages.length === 0) {
      throw new Error(`No NDC packages found for RxCUI: ${rxcui}`);
    }
    
    logger.info('Retrieved NDC packages from FDA', {
      rxcui,
      totalPackages: allPackages.length,
    });
    
    explanations.push({
      step: 'fetch_ndcs',
      description: `Retrieved ${allPackages.length} NDC packages from FDA database`,
      details: {
        rxcui,
        source: 'openFDA',
      },
    });

    // Filter active packages
    const activePackages = allPackages.filter((pkg: NDCPackage) => pkg.marketingStatus === 'ACTIVE' as any);
    const inactiveCount = allPackages.length - activePackages.length;
    
    if (inactiveCount > 0) {
      explanations.push({
        step: 'filter_active',
        description: `Filtered out ${inactiveCount} inactive/discontinued packages`,
        details: { activeCount: activePackages.length },
      });
      
      // Track excluded NDCs
      allPackages
        .filter((pkg: NDCPackage) => pkg.marketingStatus !== 'ACTIVE' as any)
        .forEach((pkg: NDCPackage) => {
          excluded.push({
            ndc: pkg.ndc,
            reason: `Inactive or discontinued (status: ${String(pkg.marketingStatus)})`,
            marketingStatus: String(pkg.marketingStatus),
          });
        });
    }

    if (activePackages.length === 0) {
      throw new Error('No active NDC packages available for this drug');
    }

    // Filter by dosage form if specified
    let filteredPackages = activePackages;
    if (dosageForm && request.sig.unit) {
      const normalizedUnit = request.sig.unit.toUpperCase();
      filteredPackages = activePackages.filter(
        pkg => pkg.dosageForm.toUpperCase() === normalizedUnit || 
               pkg.packageSize.unit.toUpperCase() === normalizedUnit
      );
      
      if (filteredPackages.length > 0) {
        explanations.push({
          step: 'filter_dosage_form',
          description: `Filtered to ${filteredPackages.length} packages matching dosage form: ${normalizedUnit}`,
        });
      } else {
        // If no exact match, use all active packages
        filteredPackages = activePackages;
        warnings.push(
          `No packages found matching dosage form "${request.sig.unit}". ` +
          `Showing all available dosage forms.`
        );
      }
    }

    // Sort by package size for better recommendations
    const sortedPackages = [...filteredPackages].sort((a, b) => 
      (a.packageSize?.quantity || 0) - (b.packageSize?.quantity || 0)
    );

    // ==========================================
    // STEP 3: Calculate total quantity needed
    // ==========================================
    const totalQuantity = request.sig.dose * request.sig.frequency * request.daysSupply;
    
    logger.info('Calculated total quantity', {
      dose: request.sig.dose,
      frequency: request.sig.frequency,
      daysSupply: request.daysSupply,
      totalQuantity,
    });
    
    explanations.push({
      step: 'calculation',
      description: `Calculated total quantity: ${totalQuantity} ${request.sig.unit}`,
      details: {
        formula: `${request.sig.dose} ${request.sig.unit} × ${request.sig.frequency} times/day × ${request.daysSupply} days`,
        result: totalQuantity,
      },
    });

    // ==========================================
    // STEP 4: Select optimal package(s)
    // ==========================================
    let recommendedPackages: PackageRecommendation[] = [];
    let overfillPercentage = 0;
    let underfillPercentage = 0;

    // Simple package selection algorithm (can be enhanced with AI)
    let remainingQuantity = totalQuantity;
    const selectedPackages: NDCPackage[] = [];

    // Try to find exact match first
    const exactMatch = sortedPackages.find(
      (pkg: NDCPackage) => pkg.packageSize.quantity === totalQuantity
    );

    if (exactMatch) {
      selectedPackages.push(exactMatch);
      remainingQuantity = 0;
      
      explanations.push({
        step: 'package_selection',
        description: `Found exact match: ${exactMatch.packageSize.quantity} ${exactMatch.packageSize.unit} package`,
        details: { ndc: exactMatch.ndc },
      });
    } else {
      // Use largest packages that don't exceed total by more than 20%
      const sortedDesc = [...sortedPackages].sort(
        (a: NDCPackage, b: NDCPackage) => b.packageSize.quantity - a.packageSize.quantity
      );

      for (const pkg of sortedDesc) {
        if (remainingQuantity <= 0) break;
        
        // Add package if it helps fulfill the prescription
        if (pkg.packageSize.quantity <= remainingQuantity * 1.2) {
          selectedPackages.push(pkg);
          remainingQuantity -= pkg.packageSize.quantity;
        }
      }

      // If still not enough, add smallest package to fulfill
      if (remainingQuantity > 0) {
        const smallestPackage = sortedPackages[0];
        if (smallestPackage) {
          selectedPackages.push(smallestPackage);
          remainingQuantity -= smallestPackage.packageSize.quantity;
        }
      }
      
      explanations.push({
        step: 'package_selection',
        description: `Selected ${selectedPackages.length} package(s) to fulfill prescription`,
        details: {
          packages: selectedPackages.map((p: NDCPackage) => ({
            ndc: p.ndc,
            size: p.packageSize.quantity,
          })),
        },
      });
    }

    // Calculate total dispensed quantity
    const totalDispensed = selectedPackages.reduce(
      (sum: number, pkg: NDCPackage) => sum + pkg.packageSize.quantity,
      0
    );

    // Calculate overfill/underfill
    if (totalDispensed > totalQuantity) {
      overfillPercentage = ((totalDispensed - totalQuantity) / totalQuantity) * 100;
    } else if (totalDispensed < totalQuantity) {
      underfillPercentage = ((totalQuantity - totalDispensed) / totalQuantity) * 100;
    }

    // Add warnings for significant over/underfill
    if (overfillPercentage > 10) {
      warnings.push(
        `Overfill of ${overfillPercentage.toFixed(1)}% (dispensing ${totalDispensed} vs ${totalQuantity} needed)`
      );
    }
    if (underfillPercentage > 5) {
      warnings.push(
        `Underfill of ${underfillPercentage.toFixed(1)}% (dispensing ${totalDispensed} vs ${totalQuantity} needed)`
      );
    }

    // Format recommendations
    recommendedPackages = selectedPackages.map((pkg: NDCPackage) => ({
      ndc: pkg.ndc,
      packageSize: pkg.packageSize.quantity,
      unit: pkg.packageSize.unit,
      dosageForm: pkg.dosageForm,
      marketingStatus: String(pkg.marketingStatus),
      isActive: pkg.marketingStatus === 'ACTIVE' as any,
      quantityNeeded: pkg.packageSize.quantity,
      fillPrecision: (overfillPercentage === 0 && underfillPercentage === 0) ? 'exact' as const :
                     overfillPercentage > 0 ? 'overfill' as const : 'underfill' as const,
    }));

    // ==========================================
    // STEP 5: AI Enhancement (Optional)
    // ==========================================
    let aiInsights: AIInsights | undefined;
    let metadata: Metadata = {
      usedAI: false,
      executionTime: 0, // Will be set at the end
    };

    if (ENABLE_OPENAI_ENHANCER) {
      logger.info('AI enhancement enabled, calling OpenAI recommender', { rxcui });
      
      try {
        const aiStartTime = Date.now();
        
        // Prepare AI request
        const aiRequest: NDCRecommendationRequest = {
          drug: {
            genericName: drugName || 'Unknown',
            rxcui,
            dosageForm,
            strength,
          },
          prescription: {
            sig: `${request.sig.dose} ${request.sig.unit} ${request.sig.frequency} times daily`,
            daysSupply: request.daysSupply,
            quantityNeeded: totalQuantity,
          },
          availablePackages: activePackages.map((pkg: NDCPackage) => ({
            ndc: pkg.ndc,
            packageSize: pkg.packageSize.quantity,
            unit: pkg.packageSize.unit,
            labeler: pkg.labelerName || 'Unknown',
            isActive: pkg.marketingStatus === 'ACTIVE' as any,
          })),
        };

        // Get AI recommendation
        const aiResult = await ndcRecommender.getEnhancedRecommendation(aiRequest);
        const aiExecutionTime = Date.now() - aiStartTime;

        logger.info('AI recommendation received', {
          usedAI: aiResult.metadata.usedAI,
          algorithmicFallback: aiResult.metadata.algorithmicFallback,
          executionTime: aiExecutionTime,
        });

        // Extract AI insights
        if (aiResult.aiInsights) {
          aiInsights = {
            factors: aiResult.aiInsights.factors,
            considerations: aiResult.aiInsights.considerations,
            rationale: aiResult.aiInsights.rationale,
            costEfficiency: aiResult.aiInsights.costEfficiency,
          };
        }

        // Update metadata
        metadata = {
          usedAI: aiResult.metadata.usedAI,
          algorithmicFallback: aiResult.metadata.algorithmicFallback,
          executionTime: 0, // Will be set at the end
          aiCost: aiResult.metadata.aiCost,
        };

        // Update recommendations with AI insights
        if (aiResult.primary) {
          const primaryNdc = aiResult.primary.ndc;
          const primaryIdx = recommendedPackages.findIndex(pkg => pkg.ndc === primaryNdc);
          
          if (primaryIdx !== -1) {
            recommendedPackages[primaryIdx] = {
              ...recommendedPackages[primaryIdx],
              reasoning: aiResult.primary.reasoning,
              confidenceScore: aiResult.primary.confidenceScore,
              source: aiResult.primary.source,
            };
          }
        }

        explanations.push({
          step: 'ai_enhancement',
          description: aiResult.metadata.usedAI
            ? 'AI-enhanced recommendation with reasoning'
            : 'Algorithm-based recommendation (AI unavailable)',
          details: {
            usedAI: aiResult.metadata.usedAI,
            executionTime: aiExecutionTime,
          },
        });
      } catch (aiError) {
        logger.warn('AI enhancement failed, using algorithmic results', {
          error: aiError as Error,
        });
        
        metadata = {
          usedAI: false,
          algorithmicFallback: true,
          executionTime: 0, // Will be set at the end
        };
        
        warnings.push(
          'AI enhancement unavailable. Recommendations are algorithm-based only.'
        );
      }
    }

    // ==========================================
    // STEP 6: Format and return response
    // ==========================================
    const executionTime = Date.now() - startTime;
    metadata.executionTime = executionTime;
    
    logger.info('Calculation completed successfully', {
      rxcui,
      totalQuantity,
      recommendedPackages: recommendedPackages.length,
      executionTime,
    });

    const response: CalculateResponse = {
      success: true,
      data: {
        drug: {
          rxcui,
          name: drugName!,
          dosageForm,
          strength,
        },
        totalQuantity,
        recommendedPackages,
        overfillPercentage: parseFloat(overfillPercentage.toFixed(2)),
        underfillPercentage: parseFloat(underfillPercentage.toFixed(2)),
        warnings,
        excluded: excluded.length > 0 ? excluded : undefined,
        explanations,
        aiInsights,
        metadata,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logger.error('Calculation failed', error as Error, {
      request,
      executionTime,
    });

    const response: CalculateResponse = {
      success: false,
      error: {
        code: (error as any).code || 'CALCULATION_ERROR',
        message: (error as Error).message || 'Failed to calculate NDC packages',
        details: { executionTime },
      },
    };

    res.status(500).json(response);
  }
}
