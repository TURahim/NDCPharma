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

  describe('Liquid Medication Integration Tests', () => {
    describe('Happy Path - Liquid Calculations', () => {
      it('should calculate Amoxicillin 400mg 3x/day for 7 days (250 MG/5 ML)', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 400, frequency: 3, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
          {
            ndc: '00093-4155-74',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(168); // 400mg -> 8mL x 3 x 7 = 168mL
        expect(response.data?.recommendedPackages[0]?.packageSize).toBe(200); // 200 mL bottle
        expect(response.data?.liquidCalculation).toBeDefined();
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(8);
        expect(response.data?.liquidCalculation?.mLPerDay).toBe(24);
        expect(response.data?.liquidCalculation?.totalML).toBe(168);
        expect(response.data?.metadata?.medicationType).toBe('liquid');
      });

      it('should calculate Azithromycin 200mg 1x/day for 5 days (100 MG/1 ML)', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'azithromycin', rxcui: '18631' },
          sig: { dose: 200, frequency: 1, unit: 'ML' },
          daysSupply: 5,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00069-3050-19',
            productNdc: '00069-3050',
            genericName: 'AZITHROMYCIN',
            brandName: 'ZITHROMAX',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 15, unit: 'ML' },
            activeIngredients: [{ name: 'AZITHROMYCIN', strength: '100 MG/1 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PFIZER LABS',
            rxcui: '18631',
            concentration: {
              value: 100,
              unit: 'MG',
              perValue: 1,
              perUnit: 'ML',
              ratio: 100,
              rawString: '100 MG/1 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(10); // 200mg -> 2mL x 1 x 5 = 10mL
        expect(response.data?.recommendedPackages[0]?.packageSize).toBe(15); // 15 mL bottle
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(2);
        expect(response.data?.liquidCalculation?.totalML).toBe(10);
      });

      it('should calculate Augmentin 600mg 2x/day for 10 days (600 MG/5 ML)', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'augmentin', rxcui: '617993' },
          sig: { dose: 600, frequency: 2, unit: 'ML' },
          daysSupply: 10,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00029-6085-46',
            productNdc: '00029-6085',
            genericName: 'AMOXICILLIN AND CLAVULANATE POTASSIUM',
            brandName: 'AUGMENTIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '600 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'GLAXOSMITHKLINE',
            rxcui: '617993',
            concentration: {
              value: 600,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 120,
              rawString: '600 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(100); // 600mg -> 5mL x 2 x 10 = 100mL
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(5);
        expect(response.data?.liquidCalculation?.totalML).toBe(100);
      });

      it('should calculate Insulin 10 units 1x/day for 30 days (100 UNIT/ML)', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'insulin glargine', rxcui: '274783' },
          sig: { dose: 10, frequency: 1, unit: 'ML' },
          daysSupply: 30,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00088-2220-33',
            productNdc: '00088-2220',
            genericName: 'INSULIN GLARGINE',
            brandName: 'LANTUS',
            dosageForm: 'INJECTION',
            route: ['SUBCUTANEOUS'],
            packageSize: { quantity: 10, unit: 'ML' },
            activeIngredients: [{ name: 'INSULIN GLARGINE', strength: '100 UNIT/ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'SANOFI-AVENTIS',
            rxcui: '274783',
            concentration: {
              value: 100,
              unit: 'UNIT',
              perValue: 1,
              perUnit: 'ML',
              ratio: 100,
              rawString: '100 UNIT/ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(3); // 10 units -> 0.1mL x 1 x 30 = 3mL
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(0.1);
        expect(response.data?.liquidCalculation?.totalML).toBe(3);
      });

      it('should calculate Cephalexin 500mg 2x/day for 7 days (250 MG/5 ML)', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'cephalexin', rxcui: '2176' },
          sig: { dose: 500, frequency: 2, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00781-3081-85',
            productNdc: '00781-3081',
            genericName: 'CEPHALEXIN',
            brandName: 'CEPHALEXIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 150, unit: 'ML' },
            activeIngredients: [{ name: 'CEPHALEXIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'SANDOZ',
            rxcui: '2176',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(140); // 500mg -> 10mL x 2 x 7 = 140mL
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(10);
        expect(response.data?.liquidCalculation?.totalML).toBe(140);
      });
    });

    describe('Error Cases - Concentration Missing', () => {
      it('should return error when liquid dosage form has no concentration', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 400, frequency: 3, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG' }], // No concentration format
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            // NO concentration field
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(500);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(false);
        expect(response.error?.message).toContain('concentration data');
      });

      it('should provide clear error message for missing concentration', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'custom liquid', rxcui: '999999' },
          sig: { dose: 100, frequency: 2, unit: 'ML' },
          daysSupply: 5,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00000-0000-00',
            productNdc: '00000-0000',
            genericName: 'TEST LIQUID',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 50, unit: 'ML' },
            activeIngredients: [{ name: 'TEST', strength: 'N/A' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEST MFG',
            rxcui: '999999',
            // NO concentration
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(500);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(false);
        expect(response.error?.code).toBe('CALCULATION_ERROR');
        expect(response.error?.message).toMatch(/concentration/i);
      });

      it('should have actionable error message for concentration missing', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { rxcui: '12345' },
          sig: { dose: 250, frequency: 2, unit: 'ML' },
          daysSupply: 10,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '11111-1111-11',
            productNdc: '11111-1111',
            genericName: 'LIQUID MED',
            dosageForm: 'SOLUTION',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'ML' },
            activeIngredients: [{ name: 'ACTIVE', strength: '50 MG' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PHARMA CO',
            rxcui: '12345',
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.error?.message).toBeTruthy();
        expect(response.error?.message).toContain('Cannot calculate');
      });
    });

    describe('Validation Warnings', () => {
      it('should warn when dose does not align with concentration', async () => {
        // Arrange - 450mg doesn't align well with 250mg/5mL
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 450, frequency: 2, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.warnings).toBeDefined();
        expect(response.data?.warnings.length).toBeGreaterThan(0);
        // 450mg / 50mg/mL = 9mL (should have warnings about non-standard dose)
      });

      it('should warn when mL per dose is unusually large', async () => {
        // Arrange - 2000mg with 250mg/5mL = 40mL per dose (very large)
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 2000, frequency: 1, unit: 'ML' },
          daysSupply: 5,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.warnings).toBeDefined();
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(40); // Very large dose
      });

      it('should warn when total volume exceeds 500mL', async () => {
        // Arrange - 500mg x 4 x 30 = high volume
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 500, frequency: 4, unit: 'ML' },
          daysSupply: 30,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        // 500mg/50mg/mL = 10mL x 4 x 30 = 1200mL
        expect(response.data?.liquidCalculation?.totalML).toBeGreaterThan(500);
      });

      it('should warn when multiple bottles needed', async () => {
        // Arrange - Need 168mL but only 100mL bottles available
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 400, frequency: 3, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(168);
        // With only 100mL bottles, will have underfill warning
        expect(response.data?.underfillPercentage).toBeGreaterThan(0);
      });

      it('should warn for mL per dose > 30mL (hard to measure)', async () => {
        // Arrange - 1500mg with 250mg/5mL = 30mL per dose
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 1500, frequency: 2, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            brandName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 500, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA PHARMACEUTICALS USA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.liquidCalculation?.mLPerDose).toBe(30);
        expect(response.data?.warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Explanations and Response Structure', () => {
      it('should include concentration parsing step in explanations', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'azithromycin', rxcui: '18631' },
          sig: { dose: 200, frequency: 1, unit: 'ML' },
          daysSupply: 5,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00069-3050-19',
            productNdc: '00069-3050',
            genericName: 'AZITHROMYCIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 15, unit: 'ML' },
            activeIngredients: [{ name: 'AZITHROMYCIN', strength: '100 MG/1 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PFIZER',
            rxcui: '18631',
            concentration: {
              value: 100,
              unit: 'MG',
              perValue: 1,
              perUnit: 'ML',
              ratio: 100,
              rawString: '100 MG/1 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        const concentrationStep = response.data?.explanations.find(
          exp => exp.step === 'concentration_detection'
        );
        expect(concentrationStep).toBeDefined();
        expect(concentrationStep?.description).toContain('100 MG/1 ML');
        expect(concentrationStep?.description).toContain('100');
      });

      it('should include mg→mL conversion step in explanations', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 400, frequency: 3, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        const liquidStep = response.data?.explanations.find(
          exp => exp.step === 'liquid_quantity_calculation'
        );
        expect(liquidStep).toBeDefined();
        expect(liquidStep?.description).toContain('168 mL');
        expect(liquidStep?.details?.mLPerDose).toBe(8);
      });

      it('should include total volume calculation step', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'azithromycin', rxcui: '18631' },
          sig: { dose: 200, frequency: 1, unit: 'ML' },
          daysSupply: 5,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00069-3050-19',
            productNdc: '00069-3050',
            genericName: 'AZITHROMYCIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 15, unit: 'ML' },
            activeIngredients: [{ name: 'AZITHROMYCIN', strength: '100 MG/1 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PFIZER',
            rxcui: '18631',
            concentration: {
              value: 100,
              unit: 'MG',
              perValue: 1,
              perUnit: 'ML',
              ratio: 100,
              rawString: '100 MG/1 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.data?.liquidCalculation?.formula).toBeDefined();
        expect(response.data?.liquidCalculation?.formula).toContain('2 mL/dose');
        expect(response.data?.liquidCalculation?.formula).toContain('1 dose/day');
        expect(response.data?.liquidCalculation?.formula).toContain('5 days');
        expect(response.data?.liquidCalculation?.formula).toContain('10 mL');
      });

      it('should include bottle selection step in explanations', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'amoxicillin', rxcui: '723' },
          sig: { dose: 400, frequency: 3, unit: 'ML' },
          daysSupply: 7,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-4155-73',
            productNdc: '00093-4155',
            genericName: 'AMOXICILLIN',
            dosageForm: 'SUSPENSION',
            route: ['ORAL'],
            packageSize: { quantity: 200, unit: 'ML' },
            activeIngredients: [{ name: 'AMOXICILLIN', strength: '250 MG/5 ML' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA',
            rxcui: '723',
            concentration: {
              value: 250,
              unit: 'MG',
              perValue: 5,
              perUnit: 'ML',
              ratio: 50,
              rawString: '250 MG/5 ML',
            },
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        const selectionStep = response.data?.explanations.find(
          exp => exp.step === 'liquid_package_selection'
        );
        expect(selectionStep).toBeDefined();
        expect(selectionStep?.details?.packageSize).toBe(200);
        expect(selectionStep?.details?.requiredML).toBe(168);
      });
    });

    describe('Backwards Compatibility - Solid Dosage', () => {
      it('should still work for solid tablets (no regression)', async () => {
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
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PFIZER',
            rxcui: '314076',
            // NO concentration for solid dosage
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(30);
        expect(response.data?.liquidCalculation).toBeUndefined(); // No liquid fields for solid
        expect(response.data?.metadata?.medicationType).toBe('solid');
      });

      it('should preserve existing test results for capsules', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { name: 'omeprazole', rxcui: '7646' },
          sig: { dose: 1, frequency: 1, unit: 'capsule' },
          daysSupply: 30,
        };

        mockRequest.body = request;

        (nameToRxCui as any).mockResolvedValue({
          rxcui: '7646',
          name: 'Omeprazole',
          confidence: 1.0,
          dosageForm: 'CAPSULE',
          strength: '20 MG',
        });

        const mockNDCPackages = [
          {
            ndc: '00093-7663-01',
            productNdc: '00093-7663',
            genericName: 'OMEPRAZOLE',
            dosageForm: 'CAPSULE',
            route: ['ORAL'],
            packageSize: { quantity: 30, unit: 'CAPSULE' },
            activeIngredients: [{ name: 'OMEPRAZOLE', strength: '20 MG' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA',
            rxcui: '7646',
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(200);
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(30);
        expect(response.data?.metadata?.medicationType).toBe('solid');
      });

      it('should not break API contract for solid dosage forms', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { rxcui: '197361' },
          sig: { dose: 2, frequency: 2, unit: 'tablet' },
          daysSupply: 30,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00093-0058-01',
            productNdc: '00093-0058',
            genericName: 'METFORMIN HYDROCHLORIDE',
            dosageForm: 'TABLET',
            route: ['ORAL'],
            packageSize: { quantity: 100, unit: 'TABLET' },
            activeIngredients: [{ name: 'METFORMIN HYDROCHLORIDE', strength: '500 MG' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'TEVA',
            rxcui: '197361',
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
        // liquidCalculation should NOT be present for solid dosage
        expect(response.data?.liquidCalculation).toBeUndefined();
      });

      it('should have unchanged response format for tablets', async () => {
        // Arrange
        const request: CalculateRequest = {
          drug: { rxcui: '314076' },
          sig: { dose: 1, frequency: 1, unit: 'tablet' },
          daysSupply: 90,
        };

        mockRequest.body = request;

        const mockNDCPackages = [
          {
            ndc: '00071-0156-23',
            productNdc: '00071-0156',
            genericName: 'LISINOPRIL',
            dosageForm: 'TABLET',
            route: ['ORAL'],
            packageSize: { quantity: 90, unit: 'TABLET' },
            activeIngredients: [{ name: 'LISINOPRIL', strength: '10 MG' }],
            marketingStatus: { isActive: true, status: 'active' },
            labeler: 'PFIZER',
            rxcui: '314076',
          },
        ];

        (fdaClient.getNDCsByRxCUI as any).mockResolvedValue(mockNDCPackages);

        // Act
        await calculateHandler(mockRequest as Request, mockResponse as Response);

        // Assert
        const response: CalculateResponse = jsonSpy.mock.calls[0][0];
        expect(response.success).toBe(true);
        expect(response.data?.totalQuantity).toBe(90);
        expect(response.data?.recommendedPackages[0]?.unit).toBe('TABLET');
        expect(response.data?.recommendedPackages[0]?.packageSize).toBe(90);
        expect(response.data?.overfillPercentage).toBe(0); // Exact match
      });
    });
  });
});

