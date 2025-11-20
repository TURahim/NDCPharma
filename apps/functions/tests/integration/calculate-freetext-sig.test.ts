/**
 * Calculate Endpoint Integration Tests - Free-Text SIG
 * Tests for free-text SIG parsing integration in /v1/calculate
 */

import { calculateHandler } from "../../src/api/v1/calculate";
import { parseSigWithAI } from "../../src/services/sig-parser";
import { fdaClient } from "@clients-openfda";
import { nameToRxCui } from "@clients-rxnorm";
import type { Request, Response } from "express";
import type { CalculateRequest, CalculateResponse } from "@api-contracts";

// Mock dependencies
jest.mock("../../src/services/sig-parser");
jest.mock("@clients-openfda");
jest.mock("@clients-rxnorm");
jest.mock("@clients-openai", () => ({
  ndcRecommender: {
    getEnhancedRecommendation: jest.fn(),
  },
  sanitizeForAI: jest.fn((data) => data),
  openaiService: {
    isAvailable: jest.fn(() => false),
  },
}));

const mockParseSigWithAI = parseSigWithAI as jest.MockedFunction<
  typeof parseSigWithAI
>;
const mockGetNDCsByRxCUI = fdaClient.getNDCsByRxCUI as jest.MockedFunction<
  typeof fdaClient.getNDCsByRxCUI
>;
const mockNameToRxCui = nameToRxCui as jest.MockedFunction<typeof nameToRxCui>;

describe("Calculate Endpoint - Free-Text SIG Integration", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockResponse = {
      status: responseStatus,
      json: responseJson,
    };

    // Mock RxNorm normalization
    mockNameToRxCui.mockResolvedValue({
      rxcui: "197381",
      name: "Metformin",
      dosageForm: "Tablet",
      strength: "500 mg",
      confidence: 0.95,
    });

    // Mock FDA packages
    mockGetNDCsByRxCUI.mockResolvedValue([
      {
        ndc: "00093-7214-01",
        productNdc: "00093-7214",
        brandName: "Metformin",
        genericName: "Metformin Hydrochloride",
        dosageForm: "TABLET",
        packageSize: { quantity: 100, unit: "TABLET", display: "100 tablets" },
        marketingStatus: { isActive: true, status: "active" },
        activeIngredients: [{ name: "Metformin", strength: "500 mg" }],
      },
    ] as any);
  });

  it("should successfully parse and calculate with free-text SIG", async () => {
    // Mock successful SIG parsing
    mockParseSigWithAI.mockResolvedValue({
      success: true,
      parsed: {
        dose: 1,
        frequency: 2,
        unit: "tablet",
        route: "oral",
        confidence: 0.95,
      },
      warnings: [],
      confidence: 0.95,
      method: "ai",
      executionTime: 250,
      aiCost: 0.0012,
    });

    const request: CalculateRequest = {
      drug: { name: "metformin" },
      sig: {
        mode: "freetext",
        text: "Take 1 tablet by mouth twice daily",
      },
      daysSupply: 30,
    };

    mockRequest = { body: request };

    await calculateHandler(mockRequest as Request, mockResponse as Response);

    expect(mockParseSigWithAI).toHaveBeenCalledWith({
      sigText: "Take 1 tablet by mouth twice daily",
      daysSupply: 30,
      drugContext: expect.objectContaining({
        genericName: "Metformin",
        dosageForm: "Tablet",
        strength: "500 mg",
      }),
    });

    expect(responseStatus).toHaveBeenCalledWith(200);
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalQuantity: 60, // 1 * 2 * 30
          metadata: expect.objectContaining({
            sigParser: expect.objectContaining({
              usedAI: true,
              parsed: expect.objectContaining({
                dose: 1,
                frequency: 2,
                unit: "tablet",
              }),
              executionTime: 250,
              aiCost: 0.0012,
            }),
          }),
        }),
      }),
    );
  });

  it("should return 400 when SIG parsing fails", async () => {
    // Mock failed SIG parsing
    mockParseSigWithAI.mockResolvedValue({
      success: false,
      warnings: ["Unable to parse SIG"],
      confidence: 0,
      method: "failed",
      executionTime: 100,
      error: {
        code: "AI_PARSING_FAILED",
        message:
          "Unable to parse prescription directions. Please use structured mode.",
      },
    });

    const request: CalculateRequest = {
      drug: { name: "metformin" },
      sig: {
        mode: "freetext",
        text: "xyz invalid text",
      },
      daysSupply: 30,
    };

    mockRequest = { body: request };

    await calculateHandler(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toHaveBeenCalledWith(400);
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: "AI_PARSING_FAILED",
          message: expect.stringContaining("Unable to parse"),
        }),
      }),
    );
  });

  it("should include parsing warnings in response", async () => {
    // Mock SIG parsing with warnings
    mockParseSigWithAI.mockResolvedValue({
      success: true,
      parsed: {
        dose: 1,
        frequency: 2,
        unit: "tablet",
        confidence: 0.7,
      },
      warnings: [
        "Parsing confidence is low. Please review and verify.",
        "Dose range detected in original text.",
      ],
      confidence: 0.7,
      method: "regex_fallback",
      executionTime: 50,
    });

    const request: CalculateRequest = {
      drug: { name: "metformin" },
      sig: {
        mode: "freetext",
        text: "Take 1-2 tablets twice daily as needed",
      },
      daysSupply: 30,
    };

    mockRequest = { body: request };

    await calculateHandler(mockRequest as Request, mockResponse as Response);

    expect(responseStatus).toHaveBeenCalledWith(200);
    const response: CalculateResponse = responseJson.mock.calls[0][0];

    expect(response.data?.warnings).toContain(
      "Parsing confidence is low. Please review and verify.",
    );
    expect(response.data?.warnings).toContain(
      "Dose range detected in original text.",
    );
  });

  it("should handle structured SIG normally (no parsing)", async () => {
    const request: CalculateRequest = {
      drug: { name: "metformin" },
      sig: {
        mode: "structured",
        dose: 1,
        frequency: 2,
        unit: "tablet",
      },
      daysSupply: 30,
    };

    mockRequest = { body: request };

    await calculateHandler(mockRequest as Request, mockResponse as Response);

    // Should NOT call SIG parser
    expect(mockParseSigWithAI).not.toHaveBeenCalled();

    expect(responseStatus).toHaveBeenCalledWith(200);
    expect(responseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalQuantity: 60,
        }),
      }),
    );
  });

  it("should add parse_sig explanation step", async () => {
    mockParseSigWithAI.mockResolvedValue({
      success: true,
      parsed: {
        dose: 5,
        frequency: 2,
        unit: "mL",
        confidence: 0.98,
      },
      warnings: [],
      confidence: 0.98,
      method: "ai",
      executionTime: 300,
      aiCost: 0.0015,
    });

    const request: CalculateRequest = {
      drug: { name: "amoxicillin suspension" },
      sig: {
        mode: "freetext",
        text: "Take 5 mL by mouth twice daily for 10 days",
      },
      daysSupply: 10,
    };

    mockRequest = { body: request };

    await calculateHandler(mockRequest as Request, mockResponse as Response);

    const response: CalculateResponse = responseJson.mock.calls[0][0];

    const parseSigExplanation = response.data?.explanations.find(
      (exp) => exp.step === "parse_sig",
    );

    expect(parseSigExplanation).toBeDefined();
    expect(parseSigExplanation?.description).toContain("AI");
    expect(parseSigExplanation?.description).toContain("98%");
    expect(parseSigExplanation?.details).toMatchObject({
      method: "ai",
      confidence: 0.98,
    });
  });
});
