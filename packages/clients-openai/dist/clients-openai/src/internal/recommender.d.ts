/**
 * AI-Enhanced NDC Recommender
 * Combines algorithmic matching with AI recommendations
 */
import { OpenAIService } from './openaiService';
import type { NDCRecommendationRequest } from './openaiTypes';
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
export declare class NDCRecommender {
    private service;
    private logger;
    constructor(service?: OpenAIService);
    /**
     * Get enhanced NDC recommendation
     * Tries AI first, falls back to algorithm if AI fails
     *
     * @param request Recommendation request
     * @returns Enhanced recommendation
     */
    getEnhancedRecommendation(request: NDCRecommendationRequest): Promise<EnhancedRecommendationResult>;
    /**
     * Get algorithmic recommendation (deterministic)
     * Selects packages to minimize waste
     *
     * @param request Recommendation request
     * @returns Package recommendations
     */
    private getAlgorithmicRecommendation;
    /**
     * Map AI recommendation to enhanced format
     */
    private mapAIRecommendation;
    /**
     * Map algorithmic recommendation to enhanced format
     */
    private mapAlgorithmicRecommendation;
    /**
     * Generate reasoning for algorithmic recommendation
     */
    private generateAlgorithmicReasoning;
}
export declare const ndcRecommender: NDCRecommender;
//# sourceMappingURL=recommender.d.ts.map