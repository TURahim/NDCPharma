import type { NDCPackage } from '@clients-openfda';

export type SearchErrorCode =
  | 'DRUG_NOT_FOUND'
  | 'RXNORM_LOOKUP_FAILED'
  | 'FDA_LOOKUP_FAILED'
  | 'NO_ACTIVE_PACKAGES'
  | 'ONLY_INACTIVE_PACKAGES'
  | 'NO_MATCHING_STRENGTH'
  | 'NO_MATCHING_DOSAGE_FORM'
  | 'NO_PACKAGES_FOUND';

export interface ParsedDrugQuery {
  originalQuery: string;
  baseName: string;
  strengthTokens: string[];
  dosageFormTokens: string[];
  releaseTypeTokens: string[];
}

export interface DrugConcept {
  rxcui: string;
  name: string;
  ingredientName?: string;
  clinicalName?: string;
  confidence: number;
  resolvedStrengths: string[];
  resolvedDosageForms: string[];
  source: 'rxnorm' | 'fda_generic';
  warnings: string[];
}

export interface PackageRetrievalResult {
  packages: NDCPackage[];
  activePackages: NDCPackage[];
  inactivePackages: NDCPackage[];
  totalActive: number;
  totalInactive: number;
  uniqueStrengths: string[];
  uniqueForms: string[];
}

export interface DrugSearchContext {
  requestId: string;
  correlationId: string;
}

export interface NormalizedPackage {
  ndc: string;
  formattedNdc: string;
  productNdc: string;
  brandName: string;
  genericName: string;
  strength: string;
  dosageForm: string;
  dosageFormFamily: string;
  route: string[];
  packageSize: {
    quantity: number;
    unit: string;
    display: string;
  };
  manufacturer: string;
  marketingStatus: 'active' | 'inactive';
  marketingStatusLabel: string;
  raw: NDCPackage;
}

export interface PackageFilterOptions {
  strength?: string;
  dosageFormKeywords?: string[];
}

