/**
 * AI-Enhanced NDC Recommender
 * Combines algorithmic matching with AI recommendations
 */

import { openaiService, OpenAIService } from './openaiService';
import { createLogger } from '@core-guardrails';
import type {
  NDCRecommendationRequest,
  AIRecommendationResult,
} from './openaiTypes';

/**
 * Package Recommendation
 * Algorithmic recommendation format
 */
export interface PackageRecommendation {
  ndc: string;
  packageSize: number;
  unit: string;
  quantityToDispense: number;
  numberOfPackages: number;
  totalQuantity: number;
  waste: number;
  wastePercentage: number;
}

/**
 * Enhanced Recommendation Result
 * Combines AI and algorithmic recommendations
 */
export interface EnhancedRecommendationResult {
  /** Primary recommendation (from AI or algorithm) */
  primary: {
    ndc: string;
    packageSize: number;
    unit: string;
    quantityToDispense: number;
    reasoning?: string;
    source: 'ai' | 'algorithm';
    confidenceScore?: number;
  };

  /** Alternative recommendations */
  alternatives: Array<{
    ndc: string;
    packageSize: number;
    unit: string;
    quantityToDispense: number;
    reasoning?: string;
    source: 'ai' | 'algorithm';
  }>;

  /** AI insights (if AI was used) */
  aiInsights?: {
    factors: string[];
    considerations: string[];
    rationale: string;
    costEfficiency?: {
      estimatedWaste: number;
      rating: 'low' | 'medium' | 'high';
    };
  };

  /** Metadata */
  metadata: {
    usedAI: boolean;
    algorithmicFallback: boolean;
    executionTime: number;
    aiCost?: number;
  };
}

/**
 * AI-Enhanced NDC Recommender
 * Provides intelligent NDC package selection
 */
export class NDCRecommender {
  private service: OpenAIService;
  private logger = createLogger({ service: 'NDCRecommender' });

  constructor(service?: OpenAIService) {
    this.service = service || openaiService;
  }

  /**
   * Get enhanced NDC recommendation
   * Tries AI first, falls back to algorithm if AI fails
   * 
   * @param request Recommendation request
   * @returns Enhanced recommendation
   */
  async getEnhancedRecommendation(
    request: NDCRecommendationRequest
  ): Promise<EnhancedRecommendationResult> {
    const startTime = Date.now();

    // Try AI recommendation first
    if (this.service.isAvailable()) {
      this.logger.info('Attempting AI-enhanced recommendation', {
        drug: request.drug.genericName,
        quantityNeeded: request.prescription.quantityNeeded,
      });

      const aiResult = await this.service.getRecommendation(request);

      if (aiResult.success && aiResult.recommendation) {
        this.logger.info('AI recommendation successful', {
          primaryNdc: aiResult.recommendation.primaryRecommendation.ndc,
          confidenceScore: aiResult.recommendation.primaryRecommendation.confidenceScore,
        });

        return this.mapAIRecommendation(aiResult, Date.now() - startTime);
      } else {
        this.logger.warn('AI recommendation failed, falling back to algorithm', {
          error: aiResult.error ? (aiResult.error as any as Error) : new Error('Unknown AI error'),
        });
      }
    }

    // Fallback to algorithmic recommendation
    this.logger.info('Using algorithmic recommendation', {
      drug: request.drug.genericName,
    });

    const algorithmicResult = this.getAlgorithmicRecommendation(request);
    return this.mapAlgorithmicRecommendation(algorithmicResult, Date.now() - startTime);
  }

  /**
   * Get algorithmic recommendation (deterministic)
   * Selects packages to minimize waste
   * 
   * @param request Recommendation request
   * @returns Package recommendations
   */
  private getAlgorithmicRecommendation(
    request: NDCRecommendationRequest
  ): PackageRecommendation[] {
    const { quantityNeeded } = request.prescription;
    const packages = request.availablePackages
      .filter((pkg) => pkg.isActive)
      .sort((a, b) => b.packageSize - a.packageSize); // Sort largest first

    if (packages.length === 0) {
      throw new Error('No active packages available');
    }

    const recommendations: PackageRecommendation[] = [];

    // Strategy 1: Find exact match
    const exactMatch = packages.find((pkg) => pkg.packageSize === quantityNeeded);
    if (exactMatch) {
      recommendations.push({
        ndc: exactMatch.ndc,
        packageSize: exactMatch.packageSize,
        unit: exactMatch.unit,
        quantityToDispense: exactMatch.packageSize,
        numberOfPackages: 1,
        totalQuantity: exactMatch.packageSize,
        waste: 0,
        wastePercentage: 0,
      });
    }

    // Strategy 2: Find best fit with minimal waste
    for (const pkg of packages) {
      const numPackages = Math.ceil(quantityNeeded / pkg.packageSize);
      const totalQuantity = numPackages * pkg.packageSize;
      const waste = totalQuantity - quantityNeeded;
      const wastePercentage = (waste / totalQuantity) * 100;

      // Only consider if waste is < 20%
      if (wastePercentage < 20) {
        recommendations.push({
          ndc: pkg.ndc,
          packageSize: pkg.packageSize,
          unit: pkg.unit,
          quantityToDispense: totalQuantity,
          numberOfPackages: numPackages,
          totalQuantity,
          waste,
          wastePercentage,
        });
      }
    }

    // Strategy 3: If no good fit, use largest package
    if (recommendations.length === 0) {
      const largest = packages[0];
      const numPackages = Math.ceil(quantityNeeded / largest.packageSize);
      const totalQuantity = numPackages * largest.packageSize;
      const waste = totalQuantity - quantityNeeded;
      const wastePercentage = (waste / totalQuantity) * 100;

      recommendations.push({
        ndc: largest.ndc,
        packageSize: largest.packageSize,
        unit: largest.unit,
        quantityToDispense: totalQuantity,
        numberOfPackages: numPackages,
        totalQuantity,
        waste,
        wastePercentage,
      });
    }

    // Sort by waste percentage (ascending)
    return recommendations.sort((a, b) => a.wastePercentage - b.wastePercentage);
  }

  /**
   * Map AI recommendation to enhanced format
   */
  private mapAIRecommendation(
    aiResult: AIRecommendationResult,
    executionTime: number
  ): EnhancedRecommendationResult {
    const rec = aiResult.recommendation!;

    return {
      primary: {
        ndc: rec.primaryRecommendation.ndc,
        packageSize: rec.primaryRecommendation.packageSize,
        unit: rec.primaryRecommendation.unit,
        quantityToDispense: rec.primaryRecommendation.quantityToDispense,
        reasoning: rec.primaryRecommendation.reasoning,
        source: 'ai',
        confidenceScore: rec.primaryRecommendation.confidenceScore,
      },
      alternatives: rec.alternatives.map((alt) => ({
        ndc: alt.ndc,
        packageSize: alt.packageSize,
        unit: alt.unit,
        quantityToDispense: alt.quantityToDispense,
        reasoning: alt.reasoning,
        source: 'ai' as const,
      })),
      aiInsights: {
        factors: rec.reasoning.factors,
        considerations: rec.reasoning.considerations,
        rationale: rec.reasoning.rationale,
        costEfficiency: rec.costEfficiency,
      },
      metadata: {
        usedAI: true,
        algorithmicFallback: false,
        executionTime,
        aiCost: aiResult.usage?.estimatedCost,
      },
    };
  }

  /**
   * Map algorithmic recommendation to enhanced format
   */
  private mapAlgorithmicRecommendation(
    recommendations: PackageRecommendation[],
    executionTime: number
  ): EnhancedRecommendationResult {
    const primary = recommendations[0];

    return {
      primary: {
        ndc: primary.ndc,
        packageSize: primary.packageSize,
        unit: primary.unit,
        quantityToDispense: primary.quantityToDispense,
        reasoning: this.generateAlgorithmicReasoning(primary),
        source: 'algorithm',
      },
      alternatives: recommendations.slice(1, 4).map((alt) => ({
        ndc: alt.ndc,
        packageSize: alt.packageSize,
        unit: alt.unit,
        quantityToDispense: alt.quantityToDispense,
        reasoning: this.generateAlgorithmicReasoning(alt),
        source: 'algorithm' as const,
      })),
      metadata: {
        usedAI: false,
        algorithmicFallback: true,
        executionTime,
      },
    };
  }

  /**
   * Generate reasoning for algorithmic recommendation
   */
  private generateAlgorithmicReasoning(rec: PackageRecommendation): string {
    if (rec.waste === 0) {
      return `Exact match with ${rec.packageSize} ${rec.unit} package. Zero waste, optimal selection.`;
    }

    if (rec.numberOfPackages === 1) {
      return `Single ${rec.packageSize} ${rec.unit} package provides ${rec.quantityToDispense} units with ${rec.waste} units (${rec.wastePercentage.toFixed(1)}%) waste. Minimizes containers and handling.`;
    }

    return `${rec.numberOfPackages} packages of ${rec.packageSize} ${rec.unit} each provide ${rec.totalQuantity} units total with ${rec.waste} units (${rec.wastePercentage.toFixed(1)}%) waste. Best available option to minimize waste.`;
  }
}

// Export singleton instance
export const ndcRecommender = new NDCRecommender();

