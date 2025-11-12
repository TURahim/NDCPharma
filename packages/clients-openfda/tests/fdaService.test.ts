import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FDAService } from '../src/internal/fdaService';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  return {
    default: {
      create: vi.fn(),
      isAxiosError: vi.fn(),
    },
  };
});

describe('FDAService', () => {
  let service: FDAService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    (axios.create as any) = vi.fn().mockReturnValue(mockAxiosInstance);

    service = new FDAService({
      timeout: 2000,
      maxRetries: 1, // Reduce retries for faster tests
      retryDelay: 10,
    });
  });

  describe('searchByRxCUI', () => {
    it('should search NDCs by RxCUI', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test disclaimer',
            terms: 'Test terms',
            license: 'Test license',
            last_updated: '2023-01-01',
            results: {
              skip: 0,
              limit: 100,
              total: 1,
            },
          },
          results: [
            {
              product_ndc: '00071-0156',
              generic_name: 'LISINOPRIL',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              product_type: 'HUMAN PRESCRIPTION DRUG',
              active_ingredients: [
                { name: 'LISINOPRIL', strength: '10 mg/1' },
              ],
              packaging: [
                {
                  package_ndc: '00071-0156-23',
                  description: '100 TABLET in 1 BOTTLE',
                },
              ],
              labeler_name: 'Test Pharma',
              openfda: {
                rxcui: ['104377'],
              },
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.searchByRxCUI('104377');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'openfda.rxcui:104377',
            limit: 100,
          }),
        })
      );

      expect(result.results).toHaveLength(1);
      expect(result.results[0].generic_name).toBe('LISINOPRIL');
    });

    it('should handle search with custom limit and skip', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 10, limit: 50, total: 100 },
          },
          results: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.searchByRxCUI('104377', { limit: 50, skip: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            limit: 50,
            skip: 10,
          }),
        })
      );
    });

    it('should include API key if configured', async () => {
      const serviceWithKey = new FDAService({
        apiKey: 'test-api-key',
        maxRetries: 1,
        retryDelay: 10,
      });

      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 100, total: 0 },
          },
          results: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await serviceWithKey.searchByRxCUI('104377');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            api_key: 'test-api-key',
          }),
        })
      );
    });
  });

  describe('searchByProductNDC', () => {
    it('should search by product NDC', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 100, total: 1 },
          },
          results: [
            {
              product_ndc: '00071-0156',
              generic_name: 'LISINOPRIL',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              product_type: 'HUMAN PRESCRIPTION DRUG',
              active_ingredients: [],
              packaging: [],
              labeler_name: 'Test',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.searchByProductNDC('00071-0156');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'product_ndc:00071-0156',
          }),
        })
      );

      expect(result.results).toHaveLength(1);
    });
  });

  describe('searchByPackageNDC', () => {
    it('should search by package NDC', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 10, total: 1 },
          },
          results: [
            {
              product_ndc: '00071-0156',
              generic_name: 'LISINOPRIL',
              dosage_form: 'TABLET',
              route: ['ORAL'],
              product_type: 'HUMAN PRESCRIPTION DRUG',
              active_ingredients: [],
              packaging: [
                {
                  package_ndc: '00071015623',
                  description: '100 TABLET in 1 BOTTLE',
                },
              ],
              labeler_name: 'Test',
            },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await service.searchByPackageNDC('00071-0156-23');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'packaging.package_ndc:00071015623',
          }),
        })
      );

      expect(result.results).toHaveLength(1);
    });

    it('should normalize package NDC (remove dashes)', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 10, total: 0 },
          },
          results: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.searchByPackageNDC('12345-6789-01');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'packaging.package_ndc:12345678901',
          }),
        })
      );
    });
  });

  describe('searchByGenericName', () => {
    it('should search by generic name', async () => {
      const mockResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 100, total: 10 },
          },
          results: [],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await service.searchByGenericName('lisinopril');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/drug/ndc.json',
        expect.objectContaining({
          params: expect.objectContaining({
            search: 'generic_name:"lisinopril"',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle 404 errors', async () => {
      const error = {
        response: {
          status: 404,
          data: {
            error: {
              code: 'NOT_FOUND',
              message: 'No results found',
            },
          },
        },
        config: { url: '/drug/ndc.json' },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.searchByRxCUI('999999')).rejects.toThrow();
    });

    it('should handle rate limiting (429)', async () => {
      const error = {
        response: {
          status: 429,
        },
        config: { url: '/drug/ndc.json' },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.searchByRxCUI('104377')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      const error = {
        code: 'ECONNABORTED',
        config: { url: '/drug/ndc.json' },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.searchByRxCUI('104377')).rejects.toThrow();
    });

    it('should retry on 5xx errors', async () => {
      const error = {
        response: {
          status: 503,
        },
        config: { url: '/drug/ndc.json' },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValueOnce(error);
      
      const successResponse = {
        data: {
          meta: {
            disclaimer: 'Test',
            terms: 'Test',
            license: 'Test',
            last_updated: '2023-01-01',
            results: { skip: 0, limit: 100, total: 0 },
          },
          results: [],
        },
      };
      
      mockAxiosInstance.get.mockResolvedValueOnce(successResponse);
      (axios.isAxiosError as any).mockReturnValue(true);

      const result = await service.searchByRxCUI('104377');
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result.results).toEqual([]);
    });

    it('should not retry on 4xx errors (except 429)', async () => {
      const error = {
        response: {
          status: 400,
        },
        config: { url: '/drug/ndc.json' },
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValue(error);
      (axios.isAxiosError as any).mockReturnValue(true);

      await expect(service.searchByRxCUI('invalid')).rejects.toThrow();
      
      // Should only be called once (no retry)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultService = new FDAService();
      expect(defaultService).toBeDefined();
    });

    it('should accept custom configuration', () => {
      const customService = new FDAService({
        baseUrl: 'https://custom-fda-api.com',
        apiKey: 'custom-key',
        timeout: 10000,
        maxRetries: 5,
        retryDelay: 2000,
      });

      expect(customService).toBeDefined();
    });
  });
});

