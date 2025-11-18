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
import { ndcRecommender, sanitizeForAI, type NDCRecommendationRequest } from '@clients-openai';
import { createLogger } from '@core-guardrails';
import { ENABLE_OPENAI_ENHANCER } from '@core-config';
import { 
  computeTotalQuantity, 
  chooseBestPackage, 
  calculateFillPrecision,
  filterByDosageFormFamily,
  isLiquidDosageForm,
  calculateLiquidQuantity,
  selectLiquidPackages,
  type PackageCandidate,
  type LiquidCalculationInput 
} from '@domain-ndc';

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
      drugName = request.drug.name || 'Unknown Drug';
      logger.debug('Using provided RxCUI', { rxcui, drugName });
      
      // Note: dosageForm and strength will be enriched from FDA data later
      dosageForm = undefined;
      strength = undefined;
      
      explanations.push({
        step: 'normalization',
        description: `Using provided RxCUI: ${rxcui} (${drugName})`,
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
    // Strategy: Use FDA's RxCUI search as primary source (most reliable)
    // FDA automatically returns only currently-marketed NDCs with complete metadata
    
    logger.debug('Fetching NDC packages from FDA by RxCUI', { rxcui });
    
    // Primary: Query FDA directly by RxCUI (most reliable)
    logger.info('Attempting FDA RxCUI search', { rxcui, limit: 100 });
    const allPackages: NDCPackage[] = await fdaClient.getNDCsByRxCUI(rxcui, { limit: 100 });
    
    logger.info('FDA RxCUI search completed', { 
      rxcui,
      packageCount: allPackages?.length || 0,
      hasResults: !!(allPackages && allPackages.length > 0),
    });
    
    if (allPackages && allPackages.length > 0) {
      explanations.push({
        step: 'fetch_packages_fda',
        description: `Retrieved ${allPackages.length} NDC packages from FDA by RxCUI`,
        details: {
          rxcui,
          source: 'openFDA',
          method: 'RxCUI search',
        },
      });
    } else {
      // FDA returned no results - this shouldn't happen for valid drugs
      logger.error('FDA RxCUI search returned no packages', {
        rxcui,
        drugName,
      });
      throw new Error(`FDA has no NDC packages for RxCUI ${rxcui}. This may indicate an issue with the FDA API or the RxCUI.`);
    }
    
    if (!allPackages || allPackages.length === 0) {
      throw new Error(`No NDC packages found for drug (RxCUI: ${rxcui})`);
    }
    
    logger.info('Package retrieval complete', {
      rxcui,
      totalPackages: allPackages.length,
    });

    // Filter active packages
    const activePackages = allPackages.filter((pkg: NDCPackage) => 
      pkg.marketingStatus && typeof pkg.marketingStatus === 'object' 
        ? pkg.marketingStatus.isActive 
        : false
    );
    const inactiveCount = allPackages.length - activePackages.length;
    
    if (inactiveCount > 0) {
      explanations.push({
        step: 'filter_active',
        description: `Filtered out ${inactiveCount} inactive/discontinued packages`,
        details: { activeCount: activePackages.length },
      });
      
      // Track excluded NDCs
      allPackages
        .filter((pkg: NDCPackage) => 
          !pkg.marketingStatus || 
          (typeof pkg.marketingStatus === 'object' && !pkg.marketingStatus.isActive)
        )
        .forEach((pkg: NDCPackage) => {
          const status = typeof pkg.marketingStatus === 'object' 
            ? pkg.marketingStatus.status 
            : 'unknown';
          excluded.push({
            ndc: pkg.ndc,
            reason: `Inactive or discontinued (status: ${status})`,
            marketingStatus: status,
          });
        });
    }

    if (activePackages.length === 0) {
      throw new Error('No active NDC packages available for this drug');
    }

    // ==========================================
    // STEP 3: Filter by dosage form family
    // ==========================================
    let filteredPackages = activePackages;
    
    if (request.sig.unit) {
      // Use dosage form family matching (solid, liquid, other)
      filteredPackages = filterByDosageFormFamily(activePackages, request.sig.unit);
      
      if (filteredPackages.length > 0) {
        explanations.push({
          step: 'filter_dosage_form',
          description: `Filtered to ${filteredPackages.length} packages matching dosage form family for "${request.sig.unit}"`,
          details: {
            originalCount: activePackages.length,
            filteredCount: filteredPackages.length,
          },
        });
      } else {
        // If no match found, include all active packages with warning
        filteredPackages = activePackages;
        warnings.push(
          `No packages found matching dosage form "${request.sig.unit}". ` +
          `Showing all available dosage forms. Verify prescription carefully.`
        );
        
        explanations.push({
          step: 'filter_dosage_form',
          description: 'No dosage form match found - showing all active packages',
          details: {
            requestedForm: request.sig.unit,
            availableForms: Array.from(new Set(activePackages.map(p => p.dosageForm))),
          },
        });
      }
    }

    // Sort by package size for better recommendations
    const sortedPackages = [...filteredPackages].sort((a, b) => 
      (a.packageSize?.quantity || 0) - (b.packageSize?.quantity || 0)
    );

    // ==========================================
    // STEP 3.5: Detect medication type (liquid vs solid)
    // ==========================================
    const isLiquid = isLiquidMedication(sortedPackages, request.sig.unit);
    
    logger.info('Medication type detected', {
      isLiquid,
      requestedUnit: request.sig.unit,
      packageCount: sortedPackages.length,
    });
    
    explanations.push({
      step: 'medication_type_detection',
      description: `Detected as ${isLiquid ? 'liquid' : 'solid'} medication`,
      details: {
        type: isLiquid ? 'liquid' : 'solid',
        requestedUnit: request.sig.unit,
        hasConcentrationData: sortedPackages.some(pkg => pkg.concentration !== undefined),
      },
    });

    // ==========================================
    // STEP 4 & 5: Calculate quantity and select package (routes to liquid or solid logic)
    // ==========================================
    
    let totalQuantity: number;
    let overfillPercentage: number;
    let underfillPercentage: number;
    let recommendedPackages: PackageRecommendation[];
    let liquidCalculationDetails: any; // For liquid-specific details
    
    if (isLiquid) {
      // ==========================================
      // LIQUID MEDICATION PATH
      // ==========================================
      
      // Find package with concentration data
      const packageWithConcentration = sortedPackages.find(pkg => pkg.concentration !== undefined);
      
      if (!packageWithConcentration || !packageWithConcentration.concentration) {
        throw new Error('Liquid medication detected but no concentration data available. Cannot calculate liquid quantity.');
      }
      
      const concentration = packageWithConcentration.concentration;
      
      logger.info('Using concentration for liquid calculation', {
        concentration: concentration.rawString,
        ratio: concentration.ratio,
      });
      
      explanations.push({
        step: 'concentration_detection',
        description: `Found concentration: ${concentration.rawString} (${concentration.ratio} ${concentration.unit}/${concentration.perUnit})`,
        details: {
          concentration: concentration.rawString,
          ratio: concentration.ratio,
        },
      });
      
      // Calculate liquid quantity (mg -> mL conversion)
      const liquidInput: LiquidCalculationInput = {
        prescribedDoseMg: request.sig.dose,
        frequency: request.sig.frequency,
        daysSupply: request.daysSupply,
        concentration,
      };
      
      const liquidResult = calculateLiquidQuantity(liquidInput);
      
      if (!liquidResult.isValid) {
        warnings.push(`Liquid calculation generated warnings: ${liquidResult.warnings.join('; ')}`);
      }
      
      totalQuantity = liquidResult.totalML;
      liquidCalculationDetails = liquidResult;
      
      logger.info('Calculated liquid quantity', {
        prescribedDoseMg: request.sig.dose,
        mLPerDose: liquidResult.mLPerDose,
        totalML: liquidResult.totalML,
        formula: liquidResult.formula,
      });
      
      explanations.push({
        step: 'liquid_quantity_calculation',
        description: `Calculated liquid volume: ${liquidResult.totalML} mL`,
        details: {
          prescribedDoseMg: request.sig.dose,
          concentration: concentration.rawString,
          mLPerDose: liquidResult.mLPerDose,
          mLPerDay: liquidResult.mLPerDay,
          totalML: liquidResult.totalML,
          formula: liquidResult.formula,
        },
      });
      
      // Add liquid-specific warnings
      warnings.push(...liquidResult.warnings);
      
      // Select liquid package (mL-based selection)
      const packageCandidates: PackageCandidate[] = sortedPackages.map(pkg => ({
        ndc: pkg.ndc,
        packageSize: {
          quantity: pkg.packageSize.quantity,
          unit: pkg.packageSize.unit,
        },
        dosageForm: pkg.dosageForm,
        marketingStatus: typeof pkg.marketingStatus === 'object' 
          ? pkg.marketingStatus.status 
          : 'unknown',
        isActive: typeof pkg.marketingStatus === 'object' 
          ? pkg.marketingStatus.isActive 
          : false,
        labelerName: pkg.labeler,
      }));
      
      const liquidSelection = selectLiquidPackages(packageCandidates, totalQuantity);
      
      overfillPercentage = liquidSelection.overfillPercentage;
      underfillPercentage = liquidSelection.underfillPercentage;
      
      warnings.push(...liquidSelection.warnings);
      
      logger.info('Selected liquid package', {
        ndc: liquidSelection.selected.ndc,
        packageSize: liquidSelection.selected.packageSize.quantity,
        unit: liquidSelection.selected.packageSize.unit,
        overfillPercentage,
        underfillPercentage,
      });
      
      explanations.push({
        step: 'liquid_package_selection',
        description: liquidSelection.explanation,
        details: {
          ndc: liquidSelection.selected.ndc,
          packageSize: liquidSelection.selected.packageSize.quantity,
          unit: liquidSelection.selected.packageSize.unit,
          requiredML: totalQuantity,
          overfill: overfillPercentage,
          underfill: underfillPercentage,
        },
      });
      
      const fillMetrics = calculateFillPrecision(
        liquidSelection.selected.packageSize.quantity,
        totalQuantity
      );
      
      recommendedPackages = [{
        ndc: liquidSelection.selected.ndc,
        packageSize: liquidSelection.selected.packageSize.quantity,
        unit: liquidSelection.selected.packageSize.unit,
        dosageForm: liquidSelection.selected.dosageForm,
        marketingStatus: liquidSelection.selected.marketingStatus,
        isActive: liquidSelection.selected.isActive,
        quantityNeeded: liquidSelection.selected.packageSize.quantity,
        fillPrecision: fillMetrics.fillPrecision,
      }];
      
    } else {
      // ==========================================
      // SOLID MEDICATION PATH (existing logic)
      // ==========================================
      
      const quantityResult = computeTotalQuantity(
        request.sig,
        { strength, dosageForm },
        request.daysSupply
      );
      
      totalQuantity = quantityResult.totalQuantity;
      
      // Add any quantity calculation warnings
      warnings.push(...quantityResult.warnings);
      
      logger.info('Calculated total quantity', {
        dose: request.sig.dose,
        frequency: request.sig.frequency,
        daysSupply: request.daysSupply,
        totalQuantity,
        method: quantityResult.details?.method,
      });
      
      explanations.push({
        step: 'quantity_calculation',
        description: quantityResult.details?.calculation || 
          `Calculated total quantity: ${totalQuantity} ${request.sig.unit}`,
        details: {
          method: quantityResult.details?.method || 'direct',
          dose: request.sig.dose,
          frequency: request.sig.frequency,
          daysSupply: request.daysSupply,
          result: totalQuantity,
        },
      });
      
      // Convert NDCPackages to PackageCandidate format
      const packageCandidates: PackageCandidate[] = sortedPackages.map(pkg => ({
        ndc: pkg.ndc,
        packageSize: {
          quantity: pkg.packageSize.quantity,
          unit: pkg.packageSize.unit,
        },
        dosageForm: pkg.dosageForm,
        marketingStatus: typeof pkg.marketingStatus === 'object' 
          ? pkg.marketingStatus.status 
          : 'unknown',
        isActive: typeof pkg.marketingStatus === 'object' 
          ? pkg.marketingStatus.isActive 
          : false,
        labelerName: pkg.labeler,
      }));
      
      // Use smart package selection algorithm
      const selection = chooseBestPackage(packageCandidates, totalQuantity);
      
      // Add any selection warnings
      warnings.push(...selection.warnings);
      
      overfillPercentage = selection.overfillPercentage;
      underfillPercentage = selection.underfillPercentage;
      
      logger.info('Selected package', {
        ndc: selection.selected.ndc,
        packageSize: selection.selected.packageSize.quantity,
        overfillPercentage,
        underfillPercentage,
      });
      
      explanations.push({
        step: 'package_selection',
        description: selection.explanation,
        details: {
          ndc: selection.selected.ndc,
          packageSize: selection.selected.packageSize.quantity,
          requiredQuantity: totalQuantity,
          overfill: overfillPercentage,
          underfill: underfillPercentage,
        },
      });
      
      // Calculate precise fill metrics
      const fillMetrics = calculateFillPrecision(
        selection.selected.packageSize.quantity,
        totalQuantity
      );
      
      // Format recommendation
      recommendedPackages = [{
        ndc: selection.selected.ndc,
        packageSize: selection.selected.packageSize.quantity,
        unit: selection.selected.packageSize.unit,
        dosageForm: selection.selected.dosageForm,
        marketingStatus: selection.selected.marketingStatus,
        isActive: selection.selected.isActive,
        quantityNeeded: selection.selected.packageSize.quantity,
        fillPrecision: fillMetrics.fillPrecision,
      }];
    }

    // ==========================================
    // STEP 6: AI Enhancement (Optional - Annotation Only)
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
        
        // Prepare AI request (sanitize to remove PHI/PII)
        const rawAiRequest: NDCRecommendationRequest = {
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
          availablePackages: packageCandidates.map(pkg => ({
            ndc: pkg.ndc,
            packageSize: pkg.packageSize.quantity,
            unit: pkg.packageSize.unit,
            labeler: pkg.labelerName || 'Unknown',
            isActive: pkg.isActive,
          })),
        };
        
        // Sanitize request to remove any PHI/PII before sending to AI
        const aiRequest = sanitizeForAI(rawAiRequest);

        // Get AI recommendation (for annotation only, not package selection)
        const aiResult = await ndcRecommender.getEnhancedRecommendation(aiRequest as any);
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

        // IMPORTANT: AI only annotates, never overrides package selection
        // Add AI reasoning/confidence to the selected package (if AI provided insights for it)
        if (aiResult.primary && recommendedPackages[0]) {
          // Only add annotations if AI selected the same package as our algorithm
          if (aiResult.primary.ndc === recommendedPackages[0].ndc) {
            recommendedPackages[0] = {
              ...recommendedPackages[0],
              reasoning: aiResult.primary.reasoning,
              confidenceScore: aiResult.primary.confidenceScore,
              source: 'ai' as const,
            };
          } else {
            // AI suggested different package - note this but don't change selection
            logger.info('AI suggested different package than algorithm', {
              algorithmNdc: recommendedPackages[0].ndc,
              aiNdc: aiResult.primary.ndc,
            });
            
            recommendedPackages[0] = {
              ...recommendedPackages[0],
              reasoning: `Algorithm-based selection. AI suggested ${aiResult.primary.ndc} but keeping algorithmic choice for consistency.`,
              source: 'algorithm' as const,
            };
          }
        }

        explanations.push({
          step: 'ai_enhancement',
          description: aiResult.metadata.usedAI
            ? 'AI-enhanced recommendation with reasoning (annotation only)'
            : 'Algorithm-based recommendation (AI unavailable)',
          details: {
            usedAI: aiResult.metadata.usedAI,
            executionTime: aiExecutionTime,
            note: 'AI provides annotations only; package selection is algorithm-based',
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
        metadata: {
          ...metadata,
          medicationType: isLiquid ? 'liquid' : 'solid',
        },
        // Add liquid-specific details if this is a liquid medication
        ...(isLiquid && liquidCalculationDetails ? {
          liquidCalculation: {
            concentration: liquidCalculationDetails.concentration.rawString,
            mLPerDose: liquidCalculationDetails.mLPerDose,
            mLPerDay: liquidCalculationDetails.mLPerDay,
            totalML: liquidCalculationDetails.totalML,
            formula: liquidCalculationDetails.formula,
          },
        } : {}),
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

/**
 * Detect if this is a liquid medication based on packages and dosage form
 * @param packages Available NDC packages
 * @param requestedDosageForm Dosage form from request (e.g., "ML")
 * @returns true if liquid medication
 */
function isLiquidMedication(packages: NDCPackage[], requestedDosageForm?: string): boolean {
  // Check if user explicitly requested mL unit
  if (requestedDosageForm && requestedDosageForm.toUpperCase() === 'ML') {
    return true;
  }
  
  // Check if any package has concentration data (indicates liquid)
  const hasConcentration = packages.some(pkg => pkg.concentration !== undefined);
  if (hasConcentration) {
    return true;
  }
  
  // Check if package dosage forms are liquid types
  const liquidPackageCount = packages.filter(pkg => 
    isLiquidDosageForm(pkg.dosageForm)
  ).length;
  
  // If majority of packages are liquid, treat as liquid medication
  return liquidPackageCount > packages.length / 2;
}
