/**
 * Type Definitions for FDA NDC Directory API
 * OpenFDA Drug API Documentation: https://open.fda.gov/apis/drug/ndc/
 */

/**
 * FDA API Search Request Parameters
 */
export interface FDASearchRequest {
  /** Search query (e.g., "openfda.rxcui:104377" for RxCUI-based search) */
  search: string;
  /** Maximum number of results to return (default: 100, max: 1000) */
  limit?: number;
  /** Number of results to skip for pagination (default: 0) */
  skip?: number;
}

/**
 * FDA API Response Wrapper
 */
export interface FDASearchResponse {
  meta: FDAResponseMeta;
  results: FDANDCResult[];
}

/**
 * FDA API Response Metadata
 */
export interface FDAResponseMeta {
  disclaimer: string;
  terms: string;
  license: string;
  last_updated: string;
  results: {
    skip: number;
    limit: number;
    total: number;
  };
}

/**
 * FDA NDC Directory Result
 * Represents a single NDC package from the FDA database
 */
export interface FDANDCResult {
  /** Product NDC (format: 5-4 or 5-3-2) */
  product_ndc: string;
  
  /** Generic drug name */
  generic_name: string;
  
  /** Brand name (if applicable) */
  brand_name?: string;
  
  /** Brand name with base */
  brand_name_base?: string;
  
  /** Dosage form (e.g., "TABLET", "CAPSULE", "SOLUTION") */
  dosage_form: string;
  
  /** Route of administration (e.g., "ORAL", "INJECTION") */
  route?: string[];
  
  /** Product type (e.g., "HUMAN PRESCRIPTION DRUG", "OTC") */
  product_type: string;
  
  /** Marketing category (e.g., "NDA", "ANDA", "OTC") */
  marketing_category?: string;
  
  /** Active ingredients */
  active_ingredients: FDAActiveIngredient[];
  
  /** Package information */
  packaging: FDAPackaging[];
  
  /** Labeler/manufacturer name */
  labeler_name: string;
  
  /** OpenFDA metadata (includes RxCUI, UNII, etc.) */
  openfda?: FDAOpenFDAData;
  
  /** Marketing status (if available) */
  marketing_status?: string;
  
  /** Finished product indicator */
  finished?: boolean;
  
  /** Listing expiration date (YYYYMMDD format) */
  listing_expiration_date?: string;
}

/**
 * Active Ingredient Information
 */
export interface FDAActiveIngredient {
  name: string;
  strength: string;
}

/**
 * Package Information
 */
export interface FDAPackaging {
  /** Package NDC (11-digit format: 5-4-2) */
  package_ndc: string;
  
  /** Package description (e.g., "100 TABLET in 1 BOTTLE") */
  description: string;
  
  /** Marketing start date (YYYYMMDD format) */
  marketing_start_date?: string;
  
  /** Marketing end date (YYYYMMDD format, if discontinued) */
  marketing_end_date?: string;
  
  /** Sample indicator */
  sample?: boolean;
}

/**
 * OpenFDA Metadata
 * Contains cross-references to other drug databases
 */
export interface FDAOpenFDAData {
  /** RxNorm Concept Unique Identifiers */
  rxcui?: string[];
  
  /** SPL (Structured Product Labeling) Set IDs */
  spl_set_id?: string[];
  
  /** Product NDCs */
  product_ndc?: string[];
  
  /** UNII (Unique Ingredient Identifier) codes */
  unii?: string[];
  
  /** Generic names */
  generic_name?: string[];
  
  /** Brand names */
  brand_name?: string[];
  
  /** Manufacturer names */
  manufacturer_name?: string[];
  
  /** Substance names */
  substance_name?: string[];
  
  /** Product types */
  product_type?: string[];
  
  /** Routes of administration */
  route?: string[];
  
  /** Application numbers */
  application_number?: string[];
}

/**
 * Parsed NDC Package (Internal Model)
 * Normalized representation of FDA package data
 */
export interface NDCPackage {
  /** 11-digit NDC (normalized format: XXXXX-XXXX-XX) */
  ndc: string;
  
  /** Product NDC (parent) */
  productNdc: string;
  
  /** Generic drug name */
  genericName: string;
  
  /** Brand name (if applicable) */
  brandName?: string;
  
  /** Dosage form (normalized: TABLET, CAPSULE, SOLUTION, etc.) */
  dosageForm: string;
  
  /** Route of administration */
  route: string[];
  
  /** Package size (parsed quantity) */
  packageSize: PackageSize;
  
  /** Active ingredients with strengths */
  activeIngredients: ActiveIngredient[];
  
  /** Marketing status */
  marketingStatus: MarketingStatus;
  
  /** Labeler/manufacturer */
  labeler: string;
  
  /** RxCUI (if available) */
  rxcui?: string;
  
  /** Listing expiration date (ISO 8601 format) */
  listingExpirationDate?: string;
}

/**
 * Parsed Package Size
 */
export interface PackageSize {
  /** Quantity in package (e.g., 100 for "100 TABLET") */
  quantity: number;
  
  /** Unit of measure (e.g., "TABLET", "ML", "KIT") */
  unit: string;
  
  /** Original description from FDA */
  description: string;
}

/**
 * Active Ingredient (Internal Model)
 */
export interface ActiveIngredient {
  name: string;
  strength: string;
}

/**
 * Marketing Status
 */
export interface MarketingStatus {
  /** Is currently active/marketed? */
  isActive: boolean;
  
  /** Marketing start date (ISO 8601 format) */
  startDate?: string;
  
  /** Marketing end date (ISO 8601 format, if discontinued) */
  endDate?: string;
  
  /** Status description */
  status: 'active' | 'discontinued' | 'expired' | 'unknown';
}

/**
 * NDC Details (Extended Information)
 */
export interface NDCDetails extends NDCPackage {
  /** Product type (prescription, OTC, etc.) */
  productType: string;
  
  /** Marketing category (NDA, ANDA, OTC, etc.) */
  marketingCategory?: string;
  
  /** Application number (if applicable) */
  applicationNumber?: string;
  
  /** All packaging options for this product */
  allPackages: PackageSize[];
}

/**
 * NDC Validation Result
 */
export interface NDCValidationResult {
  /** Is the NDC valid and properly formatted? */
  isValid: boolean;
  
  /** Normalized NDC (11-digit format) */
  normalizedNdc?: string;
  
  /** Is the NDC currently active/marketed? */
  isActive?: boolean;
  
  /** Marketing status details */
  marketingStatus?: MarketingStatus;
  
  /** Validation errors (if any) */
  errors: string[];
  
  /** Warnings (e.g., "Listing expires soon") */
  warnings: string[];
}

/**
 * FDA API Error Response
 */
export interface FDAErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * FDA Service Configuration
 */
export interface FDAServiceConfig {
  /** Base URL for FDA API (default: https://api.fda.gov) */
  baseUrl?: string;
  
  /** API key for higher rate limits (optional) */
  apiKey?: string;
  
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
  
  /** Maximum number of retries for failed requests (default: 3) */
  maxRetries?: number;
  
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
}

