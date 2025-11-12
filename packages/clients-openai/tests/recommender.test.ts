import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NDCRecommender } from '../src/internal/recommender';
import { OpenAIService } from '../src/internal/openaiService';
import type { NDCRecommendationRequest, AIRecommendationResult } from '../src/internal/openaiTypes';

describe('NDCRecommender', () => {
  let recommender: NDCRecommender;
  let mockOpenAIService: OpenAIService;

  const mockRequest: NDCRecommendationRequest = {
    drug: {
      genericName: 'LISINOPRIL',
      rxcui: '104377',
      dosageForm: 'TABLET',
      strength: '10 mg',
    },
    prescription: {
      sig: '1 tablet daily',
      daysSupply: 90,
      quantityNeeded: 90,
    },
    availablePackages: [
      { ndc: '00071-0156-23', packageSize: 100, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
      { ndc: '00071-0156-30', packageSize: 30, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
      { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
    ],
  };

  beforeEach(() => {
    // Create mock OpenAI service
    mockOpenAIService = {
      isAvailable: vi.fn().mockReturnValue(true),
      getRecommendation: vi.fn(),
      getCircuitBreakerState: vi.fn(),
      resetCircuitBreaker: vi.fn(),
    } as any;

    recommender = new NDCRecommender(mockOpenAIService);
  });

  describe('getEnhancedRecommendation', () => {
    it('should use AI recommendation when available', async () => {
      const mockAIResult: AIRecommendationResult = {
        success: true,
        recommendation: {
          primaryRecommendation: {
            ndc: '00071-0156-90',
            packageSize: 90,
            unit: 'TABLET',
            quantityToDispense: 90,
            reasoning: 'Exact match with zero waste',
            confidenceScore: 0.98,
          },
          alternatives: [],
          reasoning: {
            factors: ['Exact match'],
            considerations: [],
            rationale: 'Perfect fit',
          },
          costEfficiency: {
            estimatedWaste: 0,
            rating: 'high',
          },
        },
        usage: {
          promptTokens: 500,
          completionTokens: 200,
          totalTokens: 700,
          estimatedCost: 0.01,
          latency: 1500,
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
        },
        executionTime: 1500,
        usedFallback: false,
      };

      (mockOpenAIService.getRecommendation as any).mockResolvedValue(mockAIResult);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.usedAI).toBe(true);
      expect(result.metadata.algorithmicFallback).toBe(false);
      expect(result.primary.source).toBe('ai');
      expect(result.primary.ndc).toBe('00071-0156-90');
      expect(result.primary.confidenceScore).toBe(0.98);
      expect(result.aiInsights).toBeDefined();
    });

    it('should fallback to algorithm when AI fails', async () => {
      const mockAIResult: AIRecommendationResult = {
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'OpenAI API error',
          type: 'api_error',
        },
        executionTime: 100,
        usedFallback: false,
      };

      (mockOpenAIService.getRecommendation as any).mockResolvedValue(mockAIResult);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.usedAI).toBe(false);
      expect(result.metadata.algorithmicFallback).toBe(true);
      expect(result.primary.source).toBe('algorithm');
      expect(result.primary.ndc).toBe('00071-0156-90'); // Exact match
    });

    it('should use algorithm when AI is unavailable', async () => {
      (mockOpenAIService.isAvailable as any).mockReturnValue(false);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.usedAI).toBe(false);
      expect(result.metadata.algorithmicFallback).toBe(true);
      expect(result.primary.source).toBe('algorithm');
      expect(mockOpenAIService.getRecommendation).not.toHaveBeenCalled();
    });
  });

  describe('algorithmic recommendation', () => {
    beforeEach(() => {
      (mockOpenAIService.isAvailable as any).mockReturnValue(false);
    });

    it('should find exact match', async () => {
      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.primary.ndc).toBe('00071-0156-90');
      expect(result.primary.packageSize).toBe(90);
      expect(result.primary.quantityToDispense).toBe(90);
      expect(result.primary.reasoning).toContain('Exact match');
      expect(result.primary.reasoning).toContain('Zero waste');
    });

    it('should minimize waste when no exact match', async () => {
      const modifiedRequest = {
        ...mockRequest,
        prescription: {
          ...mockRequest.prescription,
          quantityNeeded: 85,
        },
        availablePackages: [
          { ndc: '00071-0156-23', packageSize: 100, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
          { ndc: '00071-0156-30', packageSize: 30, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      };

      const result = await recommender.getEnhancedRecommendation(modifiedRequest);

      expect(result.primary.ndc).toBe('00071-0156-23');
      expect(result.primary.quantityToDispense).toBe(100);
      expect(result.alternatives.length).toBeGreaterThan(0);
    });

    it('should handle multiple packages when necessary', async () => {
      const modifiedRequest = {
        ...mockRequest,
        prescription: {
          ...mockRequest.prescription,
          quantityNeeded: 200,
        },
        availablePackages: [
          { ndc: '00071-0156-23', packageSize: 100, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
          { ndc: '00071-0156-30', packageSize: 30, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      };

      const result = await recommender.getEnhancedRecommendation(modifiedRequest);

      expect(result.primary.packageSize).toBe(100);
      expect(result.primary.quantityToDispense).toBe(200); // 2 packages
    });

    it('should filter out inactive packages', async () => {
      const modifiedRequest = {
        ...mockRequest,
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: false },
          { ndc: '00071-0156-23', packageSize: 100, unit: 'TABLET', labeler: 'Pfizer', isActive: true },
        ],
      };

      const result = await recommender.getEnhancedRecommendation(modifiedRequest);

      expect(result.primary.ndc).toBe('00071-0156-23'); // Active package
      expect(result.primary.ndc).not.toBe('00071-0156-90'); // Inactive package
    });

    it('should throw error when no active packages available', async () => {
      const modifiedRequest = {
        ...mockRequest,
        availablePackages: [
          { ndc: '00071-0156-90', packageSize: 90, unit: 'TABLET', labeler: 'Pfizer', isActive: false },
        ],
      };

      await expect(recommender.getEnhancedRecommendation(modifiedRequest)).rejects.toThrow(
        'No active packages available'
      );
    });

    it('should provide multiple alternatives', async () => {
      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives.every((alt) => alt.source === 'algorithm')).toBe(true);
    });

    it('should generate reasoning for each recommendation', async () => {
      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.primary.reasoning).toBeDefined();
      expect(result.primary.reasoning!.length).toBeGreaterThan(0);
      result.alternatives.forEach((alt) => {
        expect(alt.reasoning).toBeDefined();
        expect(alt.reasoning!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('metadata', () => {
    it('should include execution time', async () => {
      (mockOpenAIService.isAvailable as any).mockReturnValue(false);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should include AI cost when AI is used', async () => {
      const mockAIResult: AIRecommendationResult = {
        success: true,
        recommendation: {
          primaryRecommendation: {
            ndc: '00071-0156-90',
            packageSize: 90,
            unit: 'TABLET',
            quantityToDispense: 90,
            reasoning: 'Test',
            confidenceScore: 0.9,
          },
          alternatives: [],
          reasoning: { factors: [], considerations: [], rationale: 'Test' },
        },
        usage: {
          promptTokens: 500,
          completionTokens: 200,
          totalTokens: 700,
          estimatedCost: 0.015,
          latency: 1500,
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
        },
        executionTime: 1500,
        usedFallback: false,
      };

      (mockOpenAIService.getRecommendation as any).mockResolvedValue(mockAIResult);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.aiCost).toBe(0.015);
    });

    it('should not include AI cost when algorithm is used', async () => {
      (mockOpenAIService.isAvailable as any).mockReturnValue(false);

      const result = await recommender.getEnhancedRecommendation(mockRequest);

      expect(result.metadata.aiCost).toBeUndefined();
    });
  });
});

