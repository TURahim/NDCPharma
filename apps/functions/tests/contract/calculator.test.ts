/**
 * Integration Tests for Calculator Endpoint
 * Tests the full calculation flow with mocked external APIs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateHandler } from '../../src/api/v1/calculate';
import type { Request, Response } from 'express';
import type { CalculateRequest, CalculateResponse } from '@api-contracts';

// Mock external clients
vi.mock('@clients-rxnorm', () => ({
  nameToRxCui: vi.fn(),
}));

vi.mock('@clients-openfda', () => ({
  fdaClient: {
    getNDCsByRxCUI: vi.fn(),
  },
}));

import { nameToRxCui } from '@clients-rxnorm';
import { fdaClient } from '@clients-openfda';

describe('Calculator Endpoint Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: statusSpy,
      json: jsonSpy,
    };
  });

  describe('Successful calculation flow', () => {
    it('should calculate NDC packages for valid drug name', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { name: 'Lisinopril' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      // Mock RxNorm response
      (nameToRxCui as any).mockResolvedValue({
        rxcui: '314076',
        name: 'Lisinopril 10 MG Oral Tablet',
        dosageForm: 'Oral Tablet',
        strength: '10 MG',
        confidence: 0.95,
      });

      // Mock FDA response
      const mockNDCPackages = [
        {
          ndc: '00071-0156-23',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 100, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
        {
          ndc: '00071-0156-13',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 30, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledOnce();

      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.drug.rxcui).toBe('314076');
      expect(response.data?.totalQuantity).toBe(30);
      expect(response.data?.recommendedPackages).toBeDefined();
      expect(response.data?.recommendedPackages.length).toBeGreaterThan(0);
      expect(response.data?.explanations).toBeDefined();
      expect(response.data?.explanations.length).toBeGreaterThan(0);
    });

    it('should use provided RxCUI when available', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '314076' },
        sig: { dose: 2, frequency: 2, unit: 'tablet' },
        daysSupply: 14,
      };

      mockRequest.body = request;

      const mockNDCPackages = [
        {
          ndc: '00071-0156-23',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 100, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(nameToRxCui).not.toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(200);

      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data?.totalQuantity).toBe(56); // 2 * 2 * 14
    });

    it('should find exact package match', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '314076' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      const mockNDCPackages = [
        {
          ndc: '00071-0156-30',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 30, unit: 'TABLET' }, // Exact match!
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data?.recommendedPackages.length).toBe(1);
      expect(response.data?.overfillPercentage).toBe(0);
      expect(response.data?.underfillPercentage).toBe(0);
    });

    it('should filter out inactive packages', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '314076' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      const allPackages = [
        {
          ndc: '00071-0156-23',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 100, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
        {
          ndc: '00071-0156-99',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 50, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'DISCONTINUED',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(allPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data?.excluded).toBeDefined();
      expect(response.data?.excluded?.length).toBe(1);
      expect(response.data?.excluded?.[0].ndc).toBe('00071-0156-99');
      expect(response.data?.excluded?.[0].reason).toContain('Inactive');
    });

    it('should add warning for low confidence drug normalization', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { name: 'Lisinop' }, // Typo / partial name
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      // Mock low confidence normalization
      (nameToRxCui as any).mockResolvedValue({
        rxcui: '314076',
        name: 'Lisinopril 10 MG Oral Tablet',
        dosageForm: 'Oral Tablet',
        strength: '10 MG',
        confidence: 0.7, // Low confidence
      });

      const mockNDCPackages = [
        {
          ndc: '00071-0156-23',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 100, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data?.warnings).toBeDefined();
      expect(response.data?.warnings.length).toBeGreaterThan(0);
      expect(response.data?.warnings.some(w => w.includes('confidence'))).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle drug not found error', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { name: 'NonexistentDrug12345' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      (nameToRxCui as any).mockRejectedValue(new Error('Drug not found: NonexistentDrug12345'));

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('Drug not found');
    });

    it('should handle no NDC packages found error', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '999999' }, // Invalid RxCUI
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue([]);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error?.message).toContain('No NDC packages found');
    });

    it('should handle no active packages error', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '314076' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      const inactivePackages = [
        {
          ndc: '00071-0156-99',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 100, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'DISCONTINUED',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(inactivePackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error?.message).toContain('No active NDC packages');
    });

    it('should handle external API failures gracefully', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { name: 'Lisinopril' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      (nameToRxCui as any).mockRejectedValue(
        new Error('RxNorm API timeout')
      );

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(500);
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Response structure validation', () => {
    it('should include all required fields in successful response', async () => {
      // Arrange
      const request: CalculateRequest = {
        drug: { rxcui: '314076' },
        sig: { dose: 1, frequency: 1, unit: 'tablet' },
        daysSupply: 30,
      };

      mockRequest.body = request;

      const mockNDCPackages = [
        {
          ndc: '00071-0156-23',
          productNdc: '00071-0156',
          genericName: 'LISINOPRIL',
          brandName: 'ZESTRIL',
          dosageForm: 'TABLET',
          route: ['ORAL'],
          packageSize: { quantity: 30, unit: 'TABLET' },
          activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
          marketingStatus: 'ACTIVE',
          pharmacyBillingUnit: 'TABLET',
          productType: 'HUMAN PRESCRIPTION DRUG',
          rxcui: '314076',
        },
      ];

      (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

      // Act
      await calculateHandler(mockRequest as Request, mockResponse as Response);

      // Assert
      const response: CalculateResponse = jsonSpy.mock.calls[0][0];
      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('drug');
      expect(response.data).toHaveProperty('totalQuantity');
      expect(response.data).toHaveProperty('recommendedPackages');
      expect(response.data).toHaveProperty('overfillPercentage');
      expect(response.data).toHaveProperty('underfillPercentage');
      expect(response.data).toHaveProperty('warnings');
      expect(response.data).toHaveProperty('explanations');
      
      // Validate drug fields
      expect(response.data?.drug).toHaveProperty('rxcui');
      expect(response.data?.drug).toHaveProperty('name');
      
      // Validate recommended packages structure
      response.data?.recommendedPackages.forEach(pkg => {
        expect(pkg).toHaveProperty('ndc');
        expect(pkg).toHaveProperty('packageSize');
        expect(pkg).toHaveProperty('unit');
        expect(pkg).toHaveProperty('dosageForm');
        expect(pkg).toHaveProperty('isActive');
      });
      
      // Validate explanations structure
      response.data?.explanations.forEach(exp => {
        expect(exp).toHaveProperty('step');
        expect(exp).toHaveProperty('description');
      });
    });
  });
});

