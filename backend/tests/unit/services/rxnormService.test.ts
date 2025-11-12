/**
 * Unit Tests for RxNorm Service
 */

import { RxNormService } from "../../../functions/src/services/rxnorm/rxnormService";
import axios from "axios";
import { RxNormAPIError } from "../../../functions/src/utils/errors";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("RxNormService", () => {
  let service: RxNormService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    // Create service instance
    service = new RxNormService({
      timeout: 2000,
      maxRetries: 3,
      retryDelay: 100,
    });
  });

  describe("searchByName", () => {
    it("should successfully search for drug by name", async () => {
      const mockResponse = {
        data: {
          idGroup: {
            name: "LISINOPRIL",
            rxnormId: ["104377"],
          },
        },
        status: 200,
        config: { url: "/rxcui.json" },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.searchByName({ name: "Lisinopril" });

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/rxcui.json", {
        params: { name: "Lisinopril" },
      });
    });

    it("should handle search with maxEntries parameter", async () => {
      const mockResponse = {
        data: {
          idGroup: {
            name: "LISINOPRIL",
            rxnormId: ["104377", "104378"],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await service.searchByName({ name: "Lisinopril", maxEntries: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/rxcui.json", {
        params: { name: "Lisinopril", maxEntries: 10 },
      });
    });

    it("should handle empty results", async () => {
      const mockResponse = {
        data: {},
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.searchByName({ name: "INVALIDDRUGNAME123" });

      expect(result).toEqual({});
    });

    it("should throw RxNormAPIError on API failure", async () => {
      const error = {
        response: {
          status: 500,
          data: "Internal Server Error",
        },
        config: { url: "/rxcui.json" },
        message: "Request failed",
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValueOnce(error);

      await expect(service.searchByName({ name: "Test" })).rejects.toThrow(RxNormAPIError);
    });
  });

  describe("getApproximateMatches", () => {
    it("should successfully get approximate matches", async () => {
      const mockResponse = {
        data: {
          approximateGroup: {
            inputTerm: "lipitor",
            candidate: [
              {
                rxcui: "617318",
                score: "100",
                rank: "1",
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getApproximateMatches({ term: "lipitor" });

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/approximateTerm.json", {
        params: { term: "lipitor" },
      });
    });

    it("should handle approximate match with options", async () => {
      const mockResponse = {
        data: {
          approximateGroup: {
            candidate: [],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await service.getApproximateMatches({
        term: "lipitor",
        maxEntries: 5,
        option: 1,
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/approximateTerm.json", {
        params: { term: "lipitor", maxEntries: 5, option: 1 },
      });
    });
  });

  describe("getSpellingSuggestions", () => {
    it("should successfully get spelling suggestions", async () => {
      const mockResponse = {
        data: {
          suggestionGroup: {
            name: "lisinipril",
            suggestionList: {
              suggestion: ["LISINOPRIL", "ENALAPRIL"],
            },
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getSpellingSuggestions({ name: "lisinipril" });

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/spellingsuggestions.json", {
        params: { name: "lisinipril" },
      });
    });

    it("should handle no spelling suggestions", async () => {
      const mockResponse = {
        data: {},
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getSpellingSuggestions({ name: "xyz123" });

      expect(result).toEqual({});
    });
  });

  describe("getRxCUIProperties", () => {
    it("should successfully get RxCUI properties", async () => {
      const mockResponse = {
        data: {
          properties: {
            rxcui: "104377",
            name: "LISINOPRIL",
            tty: "IN",
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getRxCUIProperties("104377");

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/rxcui/104377/properties.json", {});
    });
  });

  describe("getRelatedConcepts", () => {
    it("should successfully get related concepts", async () => {
      const mockResponse = {
        data: {
          relatedGroup: {
            conceptGroup: [
              {
                tty: "SCD",
                conceptProperties: [
                  {
                    rxcui: "314076",
                    name: "LISINOPRIL 10 MG ORAL TABLET",
                    tty: "SCD",
                  },
                ],
              },
            ],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getRelatedConcepts("104377", ["SCD"]);

      expect(result).toEqual(mockResponse.data);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/rxcui/104377/related.json", {
        params: { tty: "SCD" },
      });
    });

    it("should handle multiple term types", async () => {
      const mockResponse = { data: { relatedGroup: {} } };
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse);

      await service.getRelatedConcepts("104377", ["SCD", "SBD"]);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/rxcui/104377/related.json", {
        params: { tty: "SCD+SBD" },
      });
    });
  });

  describe("Retry Logic", () => {
    it("should retry on network error", async () => {
      const networkError = new Error("Network Error");

      // First two calls fail, third succeeds
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({
          data: { idGroup: { rxnormId: ["104377"] } },
        });

      const result = await service.searchByName({ name: "Lisinopril" });

      expect(result).toEqual({ idGroup: { rxnormId: ["104377"] } });
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });

    it("should not retry on 404 error", async () => {
      const notFoundError = {
        response: { status: 404, data: "Not Found" },
        config: { url: "/rxcui.json" },
        message: "Not found",
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValueOnce(notFoundError);

      await expect(service.searchByName({ name: "Invalid" })).rejects.toThrow();
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it("should throw error after max retries", async () => {
      const serverError = {
        response: { status: 500, data: "Server Error" },
        config: { url: "/rxcui.json" },
        message: "Server error",
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValue(serverError);

      await expect(service.searchByName({ name: "Test" })).rejects.toThrow(RxNormAPIError);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3); // maxRetries = 3
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed API response", async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: null });

      const result = await service.searchByName({ name: "Test" });

      expect(result).toBeNull();
    });

    it("should handle timeout errors", async () => {
      const timeoutError = {
        code: "ECONNABORTED",
        message: "timeout of 2000ms exceeded",
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(service.searchByName({ name: "Test" })).rejects.toThrow();
    });

    it("should include error details in RxNormAPIError", async () => {
      const apiError = {
        response: {
          status: 503,
          data: { error: "Service Unavailable" },
        },
        config: { url: "/rxcui.json" },
        message: "Service unavailable",
        isAxiosError: true,
      };

      mockAxiosInstance.get.mockRejectedValueOnce(apiError);

      try {
        await service.searchByName({ name: "Test" });
        fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(RxNormAPIError);
        expect((error as RxNormAPIError).details).toMatchObject({
          operation: "searchByName",
          status: 503,
        });
      }
    });
  });
});

