/**
 * Extended NDC Package Types for Advanced View
 * Pharmacy-grade medication package information
 * 
 * TODO: Backend Integration Required
 * These types represent the full FDA data that should be returned
 * for Advanced View. Backend needs to be updated to include this data.
 */

export interface ActiveIngredient {
  name: string;
  strength: string;
}

export interface PackageSize {
  quantity: number;
  unit: string;
  description: string;
}

export interface MarketingStatus {
  isActive: boolean;
  status: 'active' | 'discontinued' | 'expired' | 'unknown';
  startDate?: string;
  endDate?: string;
}

/**
 * Enhanced Drug Search Result with Package-Level Data
 * This extends the basic DrugSearchResult with individual NDC package information
 */
export interface EnhancedDrugPackage {
  // Identification
  ndc: string;                    // 11-digit NDC code (formatted)
  productNdc: string;             // Product-level NDC
  rxcui: string;                  // RxNorm identifier
  
  // Names
  genericName: string;            // Generic drug name
  brandName?: string;             // Brand name (if applicable)
  
  // Formulation
  strength: string;               // e.g., "500 MG"
  activeIngredients: ActiveIngredient[];
  dosageForm: string;             // e.g., "TABLET", "CAPSULE"
  route: string[];                // e.g., ["ORAL"]
  
  // Packaging
  packageSize: PackageSize;       // Size and unit information
  packageDescription: string;     // FDA package description
  
  // Manufacturer/Labeler
  labeler: string;                // Manufacturer/labeler name
  labelerCode?: string;           // Labeler code from NDC
  
  // Status
  marketingStatus: MarketingStatus;
  listingExpirationDate?: string;
  
  // Metadata
  dosageFormFamily: 'SOLID' | 'LIQUID' | 'INJECTABLE' | 'SPECIAL';
  tty?: string;                   // RxNorm term type
  commonUsageScore?: number;      // 0-100 score
}

/**
 * Temporary adapter function until backend is updated
 * Converts current DrugSearchResult to EnhancedDrugPackage format
 * with placeholder data for missing fields
 */
export function adaptLegacyResult(result: any): EnhancedDrugPackage {
  return {
    // TODO: Backend - return actual NDC from packages
    ndc: 'N/A',
    productNdc: 'N/A',
    rxcui: result.rxcui,
    
    // TODO: Backend - distinguish generic vs brand name
    genericName: result.name,
    brandName: undefined,
    
    strength: result.strength,
    // TODO: Backend - return activeIngredients array
    activeIngredients: result.strength ? [{ name: result.name, strength: result.strength }] : [],
    dosageForm: result.dosageForm,
    // TODO: Backend - return route array
    route: [],
    
    // TODO: Backend - return packageSize from FDA
    packageSize: {
      quantity: 0,
      unit: 'UNKNOWN',
      description: `${result.ndcCount} packages available`
    },
    packageDescription: result.description || '',
    
    // TODO: Backend - return labeler from FDA
    labeler: 'Unknown',
    labelerCode: undefined,
    
    marketingStatus: {
      isActive: result.hasActiveNDCs,
      status: result.hasActiveNDCs ? 'active' : 'unknown',
    },
    listingExpirationDate: undefined,
    
    dosageFormFamily: result.dosageFormFamily,
    tty: result.tty,
    commonUsageScore: result.commonUsageScore,
  };
}

