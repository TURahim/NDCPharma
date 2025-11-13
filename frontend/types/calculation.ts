/**
 * Types for calculation history and statistics
 */

export interface StoredCalculation {
  id: string;
  timestamp: number; // Unix timestamp
  drug: {
    name: string;
    rxcui?: string;
  };
  sig: string;
  daysSupply: number;
  result: {
    ndc: string;
    quantity: number;
    unit: string;
    fillPrecision: 'exact' | 'overfill' | 'underfill';
    packageSize?: number;
  };
}

export interface CalculationStats {
  totalCalculations: number;
  lastCalculationTime?: number;
  mostFrequentDrugs: Array<{
    name: string;
    count: number;
    lastUsed: number;
    rxcui?: string;
  }>;
}
